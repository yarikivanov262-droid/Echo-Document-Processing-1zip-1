import { Router } from "express";
import { db } from "@workspace/db";
import { anonymousInboxesTable, anonymousInboxMessagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import crypto from "node:crypto";
import { anonInboxRateLimit } from "../middlewares/rate-limit";

const router = Router();

function nanoid(n = 12): string {
  return crypto.randomBytes(n).toString("base64url").slice(0, n);
}

router.get("/inbox/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [inbox] = await db.select().from(anonymousInboxesTable).where(eq(anonymousInboxesTable.slug, slug)).limit(1);
  if (!inbox || !inbox.isActive) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ label: inbox.label, isActive: inbox.isActive, allowFiles: inbox.allowFiles, maxLength: inbox.maxLength });
});

router.post("/inbox/:slug", anonInboxRateLimit, async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [inbox] = await db.select().from(anonymousInboxesTable).where(eq(anonymousInboxesTable.slug, slug)).limit(1);
  if (!inbox || !inbox.isActive) { res.status(404).json({ error: "Not found" }); return; }

  const { content } = req.body as { content?: string };
  if (!content || content.length > inbox.maxLength) {
    res.status(400).json({ error: "Сообщение слишком длинное или пустое" });
    return;
  }

  const ip = req.ip ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const senderHash = crypto.createHash("sha256").update(`${ip}${day}`).digest("hex");

  await db.insert(anonymousInboxMessagesTable).values({
    inboxId: inbox.id,
    content,
    senderHash,
  });

  await db
    .update(anonymousInboxesTable)
    .set({ messageCount: inbox.messageCount + 1 })
    .where(eq(anonymousInboxesTable.id, inbox.id));

  if (inbox.isOneTime) {
    await db.update(anonymousInboxesTable).set({ isActive: false }).where(eq(anonymousInboxesTable.id, inbox.id));
  }

  res.json({ success: true });
});

router.get("/inbox", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const inboxes = await db.select().from(anonymousInboxesTable).where(eq(anonymousInboxesTable.userId, userId));
  res.json(inboxes);
});

router.post("/inbox", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { label, isOneTime, allowFiles, maxLength } = req.body as {
    label?: string; isOneTime?: boolean; allowFiles?: boolean; maxLength?: number;
  };
  const slug = nanoid(12);
  const [created] = await db.insert(anonymousInboxesTable).values({
    userId,
    slug,
    label: label ?? null,
    isOneTime: isOneTime ?? false,
    allowFiles: allowFiles ?? false,
    maxLength: maxLength ?? 500,
  }).returning();
  res.json({ id: created.id, slug: created.slug, link: `/ask/${created.slug}` });
});

router.patch("/inbox/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const userId = req.userId!;
  const { isActive } = req.body as { isActive?: boolean };
  await db.update(anonymousInboxesTable)
    .set({ isActive: isActive ?? true })
    .where(and(eq(anonymousInboxesTable.id, id), eq(anonymousInboxesTable.userId, userId)));
  res.json({ success: true });
});

router.delete("/inbox/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const userId = req.userId!;
  await db.delete(anonymousInboxesTable)
    .where(and(eq(anonymousInboxesTable.id, id), eq(anonymousInboxesTable.userId, userId)));
  res.json({ success: true });
});

router.get("/inbox/:id/messages", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const userId = req.userId!;
  const [inbox] = await db.select().from(anonymousInboxesTable)
    .where(and(eq(anonymousInboxesTable.id, id), eq(anonymousInboxesTable.userId, userId))).limit(1);
  if (!inbox) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(anonymousInboxMessagesTable)
    .where(eq(anonymousInboxMessagesTable.inboxId, id));
  res.json(msgs);
});

export default router;
