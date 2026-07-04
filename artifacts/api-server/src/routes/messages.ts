import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, chatMembersTable, pinnedMessagesTable, chatsTable } from "@workspace/db";
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
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { broadcastToChat } from "../lib/ws-hub";

const router: IRouter = Router();

async function getChatMemberIds(chatId: number): Promise<number[]> {
  const members = await db
    .select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chatId));
  return members.map((m) => m.userId);
}

router.get("/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetMessagesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { chatId, before, limit = 50 } = params.data;

  const messages = await db
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
      isEdited: messagesTable.isEdited,
      editedAt: messagesTable.editedAt,
      reactions: messagesTable.reactions,
      forwardedFromId: messagesTable.forwardedFromId,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(
      and(
        chatId != null ? eq(messagesTable.chatId, chatId) : undefined,
        eq(messagesTable.isDeleted, false),
        before != null ? lt(messagesTable.id, before) : undefined
      )
    )
    .orderBy(desc(messagesTable.timestamp))
    .limit(limit);

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
        isEdited: m.isEdited,
        editedAt: m.editedAt?.toISOString() ?? null,
        reactions: (m.reactions as Record<string, number[]>) ?? {},
        forwardedFromId: m.forwardedFromId ?? null,
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
  const chatId = msg.chatId ?? 0;

  const msgPayload = {
    id: msg.id,
    senderId: msg.senderId,
    senderUsername: sender.username,
    chatId,
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
    isEdited: false,
    editedAt: null,
    reactions: {},
    forwardedFromId: null,
  };

  if (chatId) {
    const memberIds = await getChatMemberIds(chatId);
    broadcastToChat(memberIds, {
      type: "new_message",
      chatId,
      message: msgPayload as Record<string, unknown>,
    }, req.userId!);
  }

  res.status(201).json(SendMessageResponse.parse(msgPayload));
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

  await db.update(messagesTable).set({ isDeleted: true }).where(eq(messagesTable.id, params.data.id));

  const chatId = msg.chatId ?? 0;
  if (chatId) {
    const memberIds = await getChatMemberIds(chatId);
    broadcastToChat(memberIds, { type: "delete_message", messageId: msg.id, chatId });
  }

  res.json(DeleteMessageResponse.parse({ success: true }));
});

router.post("/messages/:id/read", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkMessageReadParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.update(messagesTable).set({ readAt: new Date() }).where(eq(messagesTable.id, params.data.id));

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, params.data.id));
  if (msg?.chatId) {
    const memberIds = await getChatMemberIds(msg.chatId);
    broadcastToChat(memberIds, { type: "read_ack", messageId: msg.id, chatId: msg.chatId, userId: req.userId! });
  }

  res.json(MarkMessageReadResponse.parse({ success: true }));
});

const EditMessageBody = z.object({ encryptedContent: z.string() });
const ReactBody = z.object({ emoji: z.string() });

router.patch("/messages/:id/edit", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msgId = parseInt(rawId, 10);
  const body = EditMessageBody.safeParse(req.body);
  if (!body.success || isNaN(msgId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, msgId), eq(messagesTable.senderId, req.userId!), eq(messagesTable.isDeleted, false)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const editedAt = new Date();
  await db.update(messagesTable).set({
    encryptedContent: body.data.encryptedContent,
    isEdited: true,
    editedAt,
  }).where(eq(messagesTable.id, msgId));

  if (msg.chatId) {
    const memberIds = await getChatMemberIds(msg.chatId);
    broadcastToChat(memberIds, {
      type: "edit_message",
      messageId: msg.id,
      chatId: msg.chatId,
      encryptedContent: body.data.encryptedContent,
      editedAt: editedAt.toISOString(),
    });
  }

  res.json({ success: true });
});

router.post("/messages/:id/react", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msgId = parseInt(rawId, 10);
  const body = ReactBody.safeParse(req.body);
  if (!body.success || isNaN(msgId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [msg] = await db
    .select({ id: messagesTable.id, chatId: messagesTable.chatId, reactions: messagesTable.reactions })
    .from(messagesTable)
    .where(and(eq(messagesTable.id, msgId), eq(messagesTable.isDeleted, false)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const emoji = body.data.emoji;
  const userId = req.userId!;
  const reactions = (msg.reactions as Record<string, number[]>) ?? {};

  const existing = reactions[emoji] ?? [];
  let delta: number;
  if (existing.includes(userId)) {
    reactions[emoji] = existing.filter((id) => id !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    delta = -1;
  } else {
    reactions[emoji] = [...existing, userId];
    delta = 1;
  }

  await db.update(messagesTable).set({ reactions }).where(eq(messagesTable.id, msgId));

  if (msg.chatId) {
    const memberIds = await getChatMemberIds(msg.chatId);
    broadcastToChat(memberIds, { type: "reaction", messageId: msg.id, chatId: msg.chatId, emoji, userId, delta });
  }

  res.json({ success: true });
});

router.post("/messages/:id/pin", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msgId = parseInt(rawId, 10);
  if (isNaN(msgId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, msgId), eq(messagesTable.isDeleted, false)));

  if (!msg || !msg.chatId) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [existingPin] = await db
    .select()
    .from(pinnedMessagesTable)
    .where(and(eq(pinnedMessagesTable.chatId, msg.chatId), eq(pinnedMessagesTable.messageId, msgId)));

  let isPinned: boolean;
  if (existingPin) {
    await db.delete(pinnedMessagesTable).where(eq(pinnedMessagesTable.id, existingPin.id));
    isPinned = false;
  } else {
    await db.insert(pinnedMessagesTable).values({
      chatId: msg.chatId,
      messageId: msgId,
      pinnedBy: req.userId!,
    });
    isPinned = true;
  }

  await db
    .update(chatsTable)
    .set({ pinnedMessageId: isPinned ? msgId : null })
    .where(eq(chatsTable.id, msg.chatId));

  const memberIds = await getChatMemberIds(msg.chatId);
  broadcastToChat(memberIds, {
    type: "pin_message",
    messageId: msgId,
    chatId: msg.chatId,
    isPinned,
  });

  res.json({ success: true, isPinned });
});

router.post("/messages/:id/forward", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const msgId = parseInt(rawId, 10);
  const body = z.object({ chatId: z.number() }).safeParse(req.body);
  if (!body.success || isNaN(msgId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [original] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, msgId), eq(messagesTable.isDeleted, false)));

  if (!original) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [targetChat] = await db.select({ id: chatsTable.id, type: chatsTable.type }).from(chatsTable).where(eq(chatsTable.id, body.data.chatId));
  if (!targetChat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const [originalSender] = await db.select().from(usersTable).where(eq(usersTable.id, original.senderId));

  const [msg] = await db
    .insert(messagesTable)
    .values({
      senderId: req.userId!,
      chatId: targetChat.id,
      chatType: targetChat.type,
      encryptedContent: original.encryptedContent,
      isVoice: original.isVoice,
      mediaFileId: original.mediaFileId ?? null,
      forwardedFromId: original.id,
      forwardedFromUsername: originalSender?.username ?? null,
    })
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const msgPayload = {
    id: msg.id,
    senderId: msg.senderId,
    senderUsername: sender.username,
    chatId: targetChat.id,
    chatType: msg.chatType,
    encryptedContent: msg.encryptedContent,
    timestamp: msg.timestamp.toISOString(),
    deliveredAt: null,
    readAt: null,
    deleteAfterRead: msg.deleteAfterRead,
    deleteAfterSeconds: msg.deleteAfterSeconds ?? null,
    isVoice: msg.isVoice,
    mediaFileId: msg.mediaFileId ?? null,
    replyToId: null,
    isEdited: false,
    editedAt: null,
    reactions: {},
    forwardedFromId: msg.forwardedFromId ?? null,
  };

  const memberIds = await getChatMemberIds(targetChat.id);
  broadcastToChat(memberIds, {
    type: "new_message",
    chatId: targetChat.id,
    message: msgPayload as Record<string, unknown>,
  }, req.userId!);

  res.status(201).json(msgPayload);
});

export default router;
