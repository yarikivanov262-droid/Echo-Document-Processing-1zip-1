import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage, Server } from "http";
import { logger } from "./logger";

export type WsEvent =
  | { type: "new_message"; chatId: number; message: Record<string, unknown> }
  | { type: "delivery_ack"; messageId: number; chatId: number }
  | { type: "read_ack"; messageId: number; chatId: number; userId: number }
  | { type: "typing"; chatId: number; userId: number; username: string; isTyping: boolean }
  | { type: "delete_message"; messageId: number; chatId: number }
  | { type: "edit_message"; messageId: number; chatId: number; encryptedContent: string; editedAt: string }
  | { type: "reaction"; messageId: number; chatId: number; emoji: string; userId: number; delta: number }
  | { type: "pin_message"; messageId: number; chatId: number; isPinned: boolean }
  | { type: "status"; userId: number; online: boolean }
  | { type: "incoming_call"; callId: number; callUuid: string; callerId: number; callerUsername: string; callType: "audio" | "video" }
  | { type: "call_signal"; fromUserId: number; signal: Record<string, unknown> }
  | { type: "call_ended"; callId: number; status: "ended" | "declined" | "missed" }
  | { type: "security_alert"; message: string; riskLevel: "low" | "medium" | "high" };

const clients = new Map<number, Set<WebSocket>>();

export function getUserClients(userId: number): Set<WebSocket> {
  return clients.get(userId) ?? new Set();
}

export function broadcastToChat(
  chatMemberIds: number[],
  event: WsEvent,
  excludeUserId?: number
) {
  const payload = JSON.stringify(event);
  for (const uid of chatMemberIds) {
    if (uid === excludeUserId) continue;
    const sockets = clients.get(uid);
    if (!sockets) continue;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export function sendToUser(userId: number, event: WsEvent) {
  const payload = JSON.stringify(event);
  const sockets = clients.get(userId);
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function attachWsServer(httpServer: Server, validateToken: (token: string) => Promise<number | null>) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "No token");
      return;
    }

    const userId = await validateToken(token);
    if (!userId) {
      ws.close(4003, "Invalid token");
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);
    logger.info({ userId }, "WS client connected");

    ws.send(JSON.stringify({ type: "connected", userId }));

    ws.on("message", (data) => {
      void (async () => {
        try {
          const msg = JSON.parse(data.toString());
          logger.debug({ userId, type: msg.type }, "WS message from client");

          if (msg.type === "typing" && typeof msg.chatId === "number") {
            const { db, chatMembersTable } = await import("@workspace/db");
            const { eq } = await import("drizzle-orm");
            const members = await db
              .select({ userId: chatMembersTable.userId })
              .from(chatMembersTable)
              .where(eq(chatMembersTable.chatId, msg.chatId));
            broadcastToChat(
              members.map((m) => m.userId),
              {
                type: "typing",
                chatId: msg.chatId,
                userId,
                username: typeof msg.username === "string" ? msg.username : "",
                isTyping: !!msg.isTyping,
              },
              userId
            );
          }

          if (msg.type === "call_signal" && typeof msg.targetUserId === "number") {
            sendToUser(msg.targetUserId, {
              type: "call_signal",
              fromUserId: userId,
              signal: (msg.signal as Record<string, unknown>) ?? {},
            });
          }
        } catch {
          // ignore malformed
        }
      })();
    });

    ws.on("close", () => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
      }
      logger.info({ userId }, "WS client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ userId, err }, "WS error");
    });
  });

  return wss;
}
