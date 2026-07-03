import { Router, type IRouter } from "express";
import { db, contactsTable, blockedUsersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetContactsResponse,
  AddContactBody,
  AddContactResponse,
  RemoveContactResponse,
  BlockUserResponse,
  UnblockUserResponse,
  GetBlockedUsersResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/contacts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: contactsTable.id,
      contactId: contactsTable.contactId,
      nickname: contactsTable.nickname,
      addedAt: contactsTable.addedAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarFileId: usersTable.avatarFileId,
      isOnline: usersTable.isOnline,
      lastOnline: usersTable.lastOnline,
    })
    .from(contactsTable)
    .innerJoin(usersTable, eq(contactsTable.contactId, usersTable.id))
    .where(eq(contactsTable.ownerId, req.userId!));

  res.json(
    GetContactsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        contactId: r.contactId,
        nickname: r.nickname ?? null,
        username: r.username,
        displayName: r.displayName ?? null,
        avatarFileId: r.avatarFileId ?? null,
        isOnline: r.isOnline,
        lastOnline: r.lastOnline?.toISOString() ?? null,
        addedAt: r.addedAt.toISOString(),
      }))
    )
  );
});

router.post("/contacts", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const body = AddContactBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.contactId === req.userId) {
    res.status(400).json({ error: "Cannot add yourself" });
    return;
  }

  const [existing] = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.ownerId, req.userId!), eq(contactsTable.contactId, body.data.contactId)));

  if (existing) {
    res.status(409).json({ error: "Contact already added" });
    return;
  }

  const [contact] = await db
    .insert(contactsTable)
    .values({ ownerId: req.userId!, contactId: body.data.contactId, nickname: body.data.nickname ?? null })
    .returning();

  res.status(201).json(AddContactResponse.parse({ id: contact.id, contactId: contact.contactId, nickname: contact.nickname ?? null }));
});

router.delete("/contacts/:contactId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.contactId) ? req.params.contactId[0] : req.params.contactId;
  const contactId = parseInt(raw, 10);
  if (isNaN(contactId)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }

  await db
    .delete(contactsTable)
    .where(and(eq(contactsTable.ownerId, req.userId!), eq(contactsTable.contactId, contactId)));

  res.json(RemoveContactResponse.parse({ success: true }));
});

router.post("/contacts/:contactId/block", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.contactId) ? req.params.contactId[0] : req.params.contactId;
  const blockedId = parseInt(raw, 10);
  if (isNaN(blockedId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(blockedUsersTable)
    .where(and(eq(blockedUsersTable.userId, req.userId!), eq(blockedUsersTable.blockedId, blockedId)));

  if (!existing) {
    await db.insert(blockedUsersTable).values({ userId: req.userId!, blockedId });
  }

  res.json(BlockUserResponse.parse({ success: true }));
});

router.delete("/contacts/:contactId/block", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.contactId) ? req.params.contactId[0] : req.params.contactId;
  const blockedId = parseInt(raw, 10);
  if (isNaN(blockedId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  await db
    .delete(blockedUsersTable)
    .where(and(eq(blockedUsersTable.userId, req.userId!), eq(blockedUsersTable.blockedId, blockedId)));

  res.json(UnblockUserResponse.parse({ success: true }));
});

router.get("/blocked-users", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: blockedUsersTable.id,
      blockedId: blockedUsersTable.blockedId,
      blockedAt: blockedUsersTable.blockedAt,
      username: usersTable.username,
    })
    .from(blockedUsersTable)
    .innerJoin(usersTable, eq(blockedUsersTable.blockedId, usersTable.id))
    .where(eq(blockedUsersTable.userId, req.userId!));

  res.json(
    GetBlockedUsersResponse.parse(
      rows.map((r) => ({
        id: r.id,
        blockedId: r.blockedId,
        username: r.username,
        blockedAt: r.blockedAt.toISOString(),
      }))
    )
  );
});

export default router;
