import crypto from "crypto";
import { Router, type IRouter } from "express";
import { db, chatsTable, chatMembersTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, count, isNull, ne, inArray } from "drizzle-orm";
import {
  GetChatsResponse,
  CreateChatBody,
  CreateChatResponse,
  GetChatParams,
  GetChatResponse,
  UpdateChatParams,
  UpdateChatBody,
  UpdateChatResponse,
  GetChatMembersParams,
  GetChatMembersResponse,
  AddChatMemberParams,
  AddChatMemberBody,
  AddChatMemberResponse,
  RemoveChatMemberParams,
  RemoveChatMemberResponse,
  GetChatStatsResponse,
  UpdateChatMemberSettingsParams,
  UpdateChatMemberSettingsBody,
  UpdateChatMemberSettingsResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { broadcastToChat } from "../lib/ws-hub";

const router: IRouter = Router();

router.get("/chats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userChats = await db
    .select({
      id: chatsTable.id,
      type: chatsTable.type,
      title: chatsTable.title,
      avatarFileId: chatsTable.avatarFileId,
      creatorId: chatsTable.creatorId,
      isPinned: chatMembersTable.isPinned,
      isArchived: chatMembersTable.isArchived,
      mutedUntil: chatMembersTable.mutedUntil,
      draftText: chatMembersTable.draftText,
    })
    .from(chatMembersTable)
    .innerJoin(chatsTable, eq(chatMembersTable.chatId, chatsTable.id))
    .where(eq(chatMembersTable.userId, req.userId!));

  const result = await Promise.all(
    userChats.map(async (chat) => {
      const [lastMsg] = await db
        .select({
          encryptedContent: messagesTable.encryptedContent,
          timestamp: messagesTable.timestamp,
          mediaType: messagesTable.mediaType,
          senderId: messagesTable.senderId,
        })
        .from(messagesTable)
        .where(and(eq(messagesTable.chatId, chat.id), eq(messagesTable.isDeleted, false)))
        .orderBy(desc(messagesTable.timestamp))
        .limit(1);

      const [memberCount] = await db
        .select({ count: count() })
        .from(chatMembersTable)
        .where(eq(chatMembersTable.chatId, chat.id));

      const [unreadData] = await db
        .select({ count: count() })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.chatId, chat.id),
            eq(messagesTable.isDeleted, false),
            isNull(messagesTable.readAt),
            ne(messagesTable.senderId, req.userId!)
          )
        );

      let otherUserId: number | null = null;
      let isOnline = false;
      let title = chat.title;
      let avatarFileId = chat.avatarFileId ?? null;

      if (chat.type === 1) {
        const [otherMember] = await db
          .select({ userId: chatMembersTable.userId })
          .from(chatMembersTable)
          .where(and(eq(chatMembersTable.chatId, chat.id), ne(chatMembersTable.userId, req.userId!)))
          .limit(1);

        if (otherMember) {
          otherUserId = otherMember.userId;
          const [otherUser] = await db
            .select({ username: usersTable.username, displayName: usersTable.displayName, avatarFileId: usersTable.avatarFileId, isOnline: usersTable.isOnline })
            .from(usersTable)
            .where(eq(usersTable.id, otherMember.userId));
          if (otherUser) {
            isOnline = otherUser.isOnline;
            title = otherUser.displayName || otherUser.username;
            avatarFileId = otherUser.avatarFileId ?? avatarFileId;
          }
        }
      }

      return {
        id: chat.id,
        type: chat.type,
        title,
        avatarFileId,
        lastMessage: lastMsg?.encryptedContent ?? null,
        lastMessageAt: lastMsg?.timestamp?.toISOString() ?? null,
        lastMessageMediaType: lastMsg?.mediaType ?? null,
        lastMessageSenderId: lastMsg?.senderId ?? null,
        unreadCount: Number(unreadData?.count ?? 0),
        isPinned: chat.isPinned,
        isArchived: chat.isArchived,
        mutedUntil: chat.mutedUntil?.toISOString() ?? null,
        draftText: chat.draftText ?? null,
        memberCount: Number(memberCount?.count ?? 0),
        isSecret: false,
        otherUserId,
        isOnline,
      };
    })
  );

  res.json(GetChatsResponse.parse(result));
});

router.patch("/chats/:id/member-settings", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateChatMemberSettingsParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateChatMemberSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned;
  if (parsed.data.isArchived !== undefined) updates.isArchived = parsed.data.isArchived;
  if (parsed.data.mutedUntil !== undefined) updates.mutedUntil = parsed.data.mutedUntil ? new Date(parsed.data.mutedUntil) : null;
  if (parsed.data.draftText !== undefined) updates.draftText = parsed.data.draftText;

  await db
    .update(chatMembersTable)
    .set(updates)
    .where(and(eq(chatMembersTable.chatId, params.data.id), eq(chatMembersTable.userId, req.userId!)));

  res.json(UpdateChatMemberSettingsResponse.parse({ success: true }));
});

router.delete("/chats/:id/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const chatId = parseInt(rawId, 10);
  if (isNaN(chatId)) {
    res.status(400).json({ error: "Invalid chat id" });
    return;
  }

  const [membership] = await db
    .select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, req.userId!)));

  if (!membership) {
    res.status(403).json({ error: "Not a member of this chat" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ isDeleted: true })
    .where(eq(messagesTable.chatId, chatId));

  await db
    .update(chatsTable)
    .set({ pinnedMessageId: null })
    .where(eq(chatsTable.id, chatId));

  const memberIds = await db
    .select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chatId));
  broadcastToChat(memberIds.map((m) => m.userId), { type: "chat_history_cleared", chatId }, req.userId!);

  res.json({ success: true });
});

router.post("/chats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const requestedMemberIds = (parsed.data.memberIds ?? []).filter((id) => id !== req.userId);

  if (requestedMemberIds.length > 0) {
    const existingUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.id, requestedMemberIds));
    const existingIds = new Set(existingUsers.map((u) => u.id));
    const missing = requestedMemberIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      res.status(400).json({ error: `Unknown user id(s): ${missing.join(", ")}` });
      return;
    }
  }

  const [chat] = await db
    .insert(chatsTable)
    .values({
      type: parsed.data.type,
      title: parsed.data.title,
      creatorId: req.userId!,
    })
    .returning();

  await db.insert(chatMembersTable).values({
    chatId: chat.id,
    userId: req.userId!,
    role: "owner",
  });

  for (const memberId of requestedMemberIds) {
    await db.insert(chatMembersTable).values({
      chatId: chat.id,
      userId: memberId,
      role: "member",
    });
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chat.id));

  res.status(201).json(
    CreateChatResponse.parse({
      id: chat.id,
      type: chat.type,
      title: chat.title,
      creatorId: chat.creatorId,
      avatarFileId: chat.avatarFileId ?? null,
      createdAt: chat.createdAt.toISOString(),
      memberCount: Number(memberCount?.count ?? 0),
      settings: chat.settings ?? undefined,
    })
  );
});

router.get("/chats/stats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [chatCount] = await db
    .select({ count: count() })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.userId, req.userId!));

  const [messageCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.senderId, req.userId!), eq(messagesTable.isDeleted, false)));

  res.json(
    GetChatStatsResponse.parse({
      totalChats: Number(chatCount?.count ?? 0),
      totalMessages: Number(messageCount?.count ?? 0),
      totalContacts: 0,
      secretChats: 0,
      unreadTotal: 0,
    })
  );
});

router.get("/chats/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetChatParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, params.data.id));
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chat.id));

  let otherUserId: number | null = null;
  let isOnline = false;
  let title = chat.title;
  let avatarFileId = chat.avatarFileId ?? null;

  if (chat.type === 1) {
    const [otherMember] = await db
      .select({ userId: chatMembersTable.userId })
      .from(chatMembersTable)
      .where(and(eq(chatMembersTable.chatId, chat.id), ne(chatMembersTable.userId, req.userId!)))
      .limit(1);

    if (otherMember) {
      otherUserId = otherMember.userId;
      const [otherUser] = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName, avatarFileId: usersTable.avatarFileId, isOnline: usersTable.isOnline })
        .from(usersTable)
        .where(eq(usersTable.id, otherMember.userId));
      if (otherUser) {
        isOnline = otherUser.isOnline;
        title = otherUser.displayName || otherUser.username;
        avatarFileId = otherUser.avatarFileId ?? avatarFileId;
      }
    }
  }

  res.json(
    GetChatResponse.parse({
      id: chat.id,
      type: chat.type,
      title,
      creatorId: chat.creatorId,
      avatarFileId,
      createdAt: chat.createdAt.toISOString(),
      memberCount: Number(memberCount?.count ?? 0),
      settings: chat.settings ?? undefined,
      isOnline,
      otherUserId,
    })
  );
});

router.patch("/chats/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateChatParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [chat] = await db
    .update(chatsTable)
    .set({
      title: parsed.data.title ?? undefined,
      avatarFileId: parsed.data.avatarFileId ?? undefined,
      settings: parsed.data.settings as Record<string, unknown> ?? undefined,
    })
    .where(eq(chatsTable.id, params.data.id))
    .returning();

  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const [memberCount] = await db
    .select({ count: count() })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chat.id));

  res.json(
    UpdateChatResponse.parse({
      id: chat.id,
      type: chat.type,
      title: chat.title,
      creatorId: chat.creatorId,
      avatarFileId: chat.avatarFileId ?? null,
      createdAt: chat.createdAt.toISOString(),
      memberCount: Number(memberCount?.count ?? 0),
    })
  );
});

router.get("/chats/:id/members", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetChatMembersParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const members = await db
    .select({
      userId: chatMembersTable.userId,
      username: usersTable.username,
      role: chatMembersTable.role,
      joinedAt: chatMembersTable.joinedAt,
      avatarFileId: usersTable.avatarFileId,
    })
    .from(chatMembersTable)
    .innerJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
    .where(eq(chatMembersTable.chatId, params.data.id));

  res.json(
    GetChatMembersResponse.parse(
      members.map((m) => ({
        userId: m.userId,
        username: m.username,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        avatarFileId: m.avatarFileId ?? null,
      }))
    )
  );
});

router.post("/chats/:id/members", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddChatMemberParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddChatMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(chatMembersTable).values({
    chatId: params.data.id,
    userId: parsed.data.userId,
    role: parsed.data.role ?? "member",
  });

  res.json(AddChatMemberResponse.parse({ success: true }));
});

router.delete("/chats/:id/members/:userId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = RemoveChatMemberParams.safeParse({
    id: parseInt(rawId, 10),
    userId: parseInt(rawUserId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(chatMembersTable)
    .where(
      and(
        eq(chatMembersTable.chatId, params.data.id),
        eq(chatMembersTable.userId, params.data.userId)
      )
    );

  res.json(RemoveChatMemberResponse.parse({ success: true }));
});

// POST /chats/:id/invite — generate an invite link
router.post("/chats/:id/invite", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const chatId = parseInt(rawId, 10);
  if (isNaN(chatId)) { res.status(400).json({ error: "Invalid chat id" }); return; }

  const [membership] = await db.select({ role: chatMembersTable.role })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, req.userId!)));
  if (!membership || !["admin", "owner"].includes(membership.role ?? "")) {
    res.status(403).json({ error: "Only admins can generate invite links" });
    return;
  }

  const link = crypto.randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.update(chatsTable)
    .set({ inviteLink: link, inviteLinkExpiry: expiresAt })
    .where(eq(chatsTable.id, chatId));

  res.json({ inviteLink: link, expiresAt: expiresAt.toISOString() });
});

router.post("/chats/join/:link", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const link = Array.isArray(req.params.link) ? req.params.link[0] : req.params.link;
  if (!link) {
    res.status(400).json({ error: "Invite link required" });
    return;
  }

  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.inviteLink, link))
    .limit(1);

  if (!chat) {
    res.status(404).json({ error: "Ссылка недействительна или истекла" });
    return;
  }

  if (chat.inviteLinkExpiry && chat.inviteLinkExpiry < new Date()) {
    res.status(410).json({ error: "Срок действия ссылки истёк" });
    return;
  }

  const userId = req.userId!;
  const [existing] = await db
    .select()
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, chat.id), eq(chatMembersTable.userId, userId)))
    .limit(1);

  if (!existing) {
    await db.insert(chatMembersTable).values({ chatId: chat.id, userId, role: "member" });
  }

  res.json({ chatId: chat.id });
});

export default router;
