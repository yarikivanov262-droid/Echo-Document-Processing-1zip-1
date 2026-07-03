import { Router, type IRouter } from "express";
import { db, chatsTable, chatMembersTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, count, isNull, ne } from "drizzle-orm";
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
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/chats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userChats = await db
    .select({
      id: chatsTable.id,
      type: chatsTable.type,
      title: chatsTable.title,
      avatarFileId: chatsTable.avatarFileId,
      creatorId: chatsTable.creatorId,
    })
    .from(chatMembersTable)
    .innerJoin(chatsTable, eq(chatMembersTable.chatId, chatsTable.id))
    .where(eq(chatMembersTable.userId, req.userId!));

  const result = await Promise.all(
    userChats.map(async (chat) => {
      const [lastMsg] = await db
        .select({ encryptedContent: messagesTable.encryptedContent, timestamp: messagesTable.timestamp })
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

      return {
        id: chat.id,
        type: chat.type,
        title: chat.title,
        avatarFileId: chat.avatarFileId ?? null,
        lastMessage: lastMsg?.encryptedContent ?? null,
        lastMessageAt: lastMsg?.timestamp?.toISOString() ?? null,
        unreadCount: Number(unreadData?.count ?? 0),
        isPinned: false,
        memberCount: Number(memberCount?.count ?? 0),
        isSecret: false,
      };
    })
  );

  res.json(GetChatsResponse.parse(result));
});

router.post("/chats", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
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

  if (parsed.data.memberIds) {
    for (const memberId of parsed.data.memberIds) {
      if (memberId !== req.userId) {
        await db.insert(chatMembersTable).values({
          chatId: chat.id,
          userId: memberId,
          role: "member",
        });
      }
    }
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

  res.json(
    GetChatResponse.parse({
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

export default router;
