import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, lt } from "drizzle-orm";
import {
  GetMessagesQueryParams,
  GetMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  DeleteMessageParams,
  DeleteMessageResponse,
  MarkMessageReadParams,
  MarkMessageReadResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetMessagesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { chatId, before, limit = 50 } = params.data;

  let query = db
    .select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      senderUsername: usersTable.username,
      chatId: messagesTable.chatId,
      receiverId: messagesTable.receiverId,
      chatType: messagesTable.chatType,
      encryptedContent: messagesTable.encryptedContent,
      timestamp: messagesTable.timestamp,
      deliveredAt: messagesTable.deliveredAt,
      readAt: messagesTable.readAt,
      deleteAfterRead: messagesTable.deleteAfterRead,
      deleteAfterSeconds: messagesTable.deleteAfterSeconds,
      isVoice: messagesTable.isVoice,
      mediaFileId: messagesTable.mediaFileId,
      replyToId: messagesTable.replyToId,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(
      and(
        chatId != null
          ? eq(messagesTable.chatId, chatId)
          : undefined,
        eq(messagesTable.isDeleted, false),
        before != null ? lt(messagesTable.id, before) : undefined
      )
    )
    .orderBy(desc(messagesTable.timestamp))
    .limit(limit);

  const messages = await query;

  res.json(
    GetMessagesResponse.parse(
      messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderUsername: m.senderUsername,
        chatId: m.chatId ?? m.receiverId ?? 0,
        chatType: m.chatType,
        encryptedContent: m.encryptedContent,
        timestamp: m.timestamp.toISOString(),
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        readAt: m.readAt?.toISOString() ?? null,
        deleteAfterRead: m.deleteAfterRead,
        deleteAfterSeconds: m.deleteAfterSeconds ?? null,
        isVoice: m.isVoice,
        mediaFileId: m.mediaFileId ?? null,
        replyToId: m.replyToId ?? null,
      }))
    )
  );
});

router.post("/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify chat exists if chatId is provided
  if (parsed.data.chatId) {
    const { chatsTable } = await import("@workspace/db");
    const { eq: eqFn } = await import("drizzle-orm");
    const [chat] = await db.select({ id: chatsTable.id }).from(chatsTable).where(eqFn(chatsTable.id, parsed.data.chatId));
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      senderId: req.userId!,
      receiverId: parsed.data.receiverId ?? null,
      chatId: parsed.data.chatId ?? null,
      chatType: parsed.data.chatType,
      encryptedContent: parsed.data.encryptedContent,
      deleteAfterRead: parsed.data.deleteAfterRead ?? false,
      deleteAfterSeconds: parsed.data.deleteAfterSeconds ?? null,
      isVoice: parsed.data.isVoice ?? false,
      mediaFileId: parsed.data.mediaFileId ?? null,
      replyToId: parsed.data.replyToId ?? null,
    })
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json(
    SendMessageResponse.parse({
      id: msg.id,
      senderId: msg.senderId,
      senderUsername: sender.username,
      chatId: msg.chatId ?? msg.receiverId ?? 0,
      chatType: msg.chatType,
      encryptedContent: msg.encryptedContent,
      timestamp: msg.timestamp.toISOString(),
      deliveredAt: null,
      readAt: null,
      deleteAfterRead: msg.deleteAfterRead,
      deleteAfterSeconds: msg.deleteAfterSeconds ?? null,
      isVoice: msg.isVoice,
      mediaFileId: msg.mediaFileId ?? null,
      replyToId: msg.replyToId ?? null,
    })
  );
});

router.delete("/messages/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMessageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, params.data.id), eq(messagesTable.senderId, req.userId!)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ isDeleted: true })
    .where(eq(messagesTable.id, params.data.id));

  res.json(DeleteMessageResponse.parse({ success: true }));
});

router.post("/messages/:id/read", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkMessageReadParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(eq(messagesTable.id, params.data.id));

  res.json(MarkMessageReadResponse.parse({ success: true }));
});

export default router;
