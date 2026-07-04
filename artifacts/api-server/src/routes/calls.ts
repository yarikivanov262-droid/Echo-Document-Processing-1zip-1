import { Router, type IRouter } from "express";
import { db, callLogsTable, usersTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { CreateCallBody, CreateCallResponse, UpdateCallBody, UpdateCallResponse, GetCallsResponse } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { logActivity } from "./activity-log";
import { sendToUser } from "../lib/ws-hub";

const router: IRouter = Router();

function serializeCall(row: typeof callLogsTable.$inferSelect) {
  return {
    id: row.id,
    callUuid: row.callUuid,
    callerId: row.callerId,
    calleeId: row.calleeId,
    chatId: row.chatId ?? null,
    type: row.type as "audio" | "video",
    status: row.status as "ringing" | "missed" | "declined" | "answered" | "ended",
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    answeredAt: row.answeredAt ? row.answeredAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    durationSeconds: row.durationSeconds ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/calls", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select()
    .from(callLogsTable)
    .where(or(eq(callLogsTable.callerId, userId), eq(callLogsTable.calleeId, userId)))
    .orderBy(desc(callLogsTable.createdAt))
    .limit(200);

  res.json(GetCallsResponse.parse(rows.map(serializeCall)));
});

router.post("/calls", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const input = CreateCallBody.parse(req.body);

  const [[callee], [caller]] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, input.calleeId)).limit(1),
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
  ]);

  if (!callee) {
    res.status(404).json({ success: false, message: "Пользователь не найден" });
    return;
  }

  const [row] = await db
    .insert(callLogsTable)
    .values({
      callerId: userId,
      calleeId: input.calleeId,
      chatId: input.chatId ?? null,
      type: input.type,
      status: "ringing",
      startedAt: new Date(),
    })
    .returning();

  sendToUser(input.calleeId, {
    type: "incoming_call",
    callId: row.id,
    callUuid: row.callUuid,
    callerId: userId,
    callerUsername: caller?.username ?? "Unknown",
    callType: input.type as "audio" | "video",
  });

  await logActivity(userId, "call_started", req);
  res.status(201).json(CreateCallResponse.parse(serializeCall(row)));
});

router.patch("/calls/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const input = UpdateCallBody.parse(req.body);

  const [existing] = await db.select().from(callLogsTable).where(eq(callLogsTable.id, id)).limit(1);
  if (!existing || (existing.callerId !== userId && existing.calleeId !== userId)) {
    res.status(404).json({ success: false, message: "Звонок не найден" });
    return;
  }

  const updates: Partial<typeof callLogsTable.$inferInsert> = { status: input.status };
  if (input.status === "answered" && !existing.answeredAt) {
    updates.answeredAt = new Date();
  }
  if (input.status === "ended" || input.status === "missed" || input.status === "declined") {
    updates.endedAt = new Date();
    if (typeof input.durationSeconds === "number") {
      updates.durationSeconds = input.durationSeconds;
    }
  }

  const [row] = await db
    .update(callLogsTable)
    .set(updates)
    .where(eq(callLogsTable.id, id))
    .returning();

  const otherUserId = existing.callerId === userId ? existing.calleeId : existing.callerId;
  if (input.status === "ended" || input.status === "declined" || input.status === "missed") {
    sendToUser(otherUserId, {
      type: "call_ended",
      callId: row.id,
      status: input.status as "ended" | "declined" | "missed",
    });
  }

  res.json(UpdateCallResponse.parse(serializeCall(row)));
});

export default router;
