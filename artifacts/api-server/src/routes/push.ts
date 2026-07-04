import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { getVapidPublicKey } from "../lib/push";

const router: IRouter = Router();

router.get("/push/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    res.status(503).json({ error: "Push notifications are not configured on this server" });
    return;
  }
  res.json({ publicKey });
});

router.post("/push/subscribe", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { endpoint, keys } = req.body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "endpoint and keys.p256dh/auth are required" });
    return;
  }

  await db
    .insert(pushSubscriptionsTable)
    .values({
      userId: req.userId!,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers["user-agent"]?.slice(0, 512),
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: {
        userId: req.userId!,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers["user-agent"]?.slice(0, 512),
      },
    });

  res.json({ success: true, message: "Подписка на push-уведомления оформлена" });
});

router.post("/push/unsubscribe", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) {
    res.status(400).json({ error: "endpoint is required" });
    return;
  }

  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));

  res.json({ success: true, message: "Подписка отменена" });
});

export default router;
