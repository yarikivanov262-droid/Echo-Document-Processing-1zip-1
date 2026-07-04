import { Router } from "express";
import { db, activityLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import crypto from "node:crypto";
import { sendToUser } from "../lib/ws-hub";

const router = Router();

router.post("/canary", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const uuid = crypto.randomUUID();
  await db
    .update(usersTable)
    .set({ settings: { canaryToken: uuid } as Record<string, unknown> })
    .where(eq(usersTable.id, userId));
  res.json({ token: uuid, url: `/api/canary/${uuid}` });
});

router.get("/canary/:uuid", async (req, res): Promise<void> => {
  const uuid = Array.isArray(req.params.uuid) ? req.params.uuid[0] : req.params.uuid;

  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .limit(100);

  for (const user of users) {
    const [full] = await db
      .select({ settings: usersTable.settings, id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (!full) continue;
    const settings = (full.settings as Record<string, unknown> | null) ?? {};
    if (settings.canaryToken === uuid) {
      await db.insert(activityLogsTable).values({
        userId: full.id,
        action: "canary_triggered",
        ipAddress: req.ip ?? "unknown",
        metadata: {
          description: "Canary token был активирован — возможная компрометация аккаунта",
          riskLevel: "high",
        },
      });

      sendToUser(full.id, {
        type: "security_alert",
        message: "⚠️ Canary Token активирован! Кто-то мог получить доступ к вашему аккаунту.",
        riskLevel: "high",
      });
      break;
    }
  }

  res.status(200).json({ ok: true });
});

export default router;
