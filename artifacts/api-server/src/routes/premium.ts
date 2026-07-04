import { Router, type IRouter } from "express";
import { db, usersTable, premiumSubscriptionsTable, starsTransactionsTable } from "@workspace/db";
import { eq, desc, sql, and, gt } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const PREMIUM_COSTS = { monthly: 280, yearly: 2800 } as const;
const PREMIUM_DURATIONS_MS = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

// GET /premium — current premium status
router.get("/premium", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select({ isPremium: usersTable.isPremium, premiumUntil: usersTable.premiumUntil, starsBalance: usersTable.starsBalance })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Auto-expire premium if past due
  if (user.isPremium && user.premiumUntil && user.premiumUntil.getTime() < Date.now()) {
    await db.update(usersTable)
      .set({ isPremium: false })
      .where(eq(usersTable.id, req.userId!));
    user.isPremium = false;
  }

  const subscriptions = await db
    .select()
    .from(premiumSubscriptionsTable)
    .where(eq(premiumSubscriptionsTable.userId, req.userId!))
    .orderBy(desc(premiumSubscriptionsTable.startedAt))
    .limit(5);

  res.json({
    isPremium: user.isPremium,
    premiumUntil: user.premiumUntil ? user.premiumUntil.toISOString() : null,
    starsBalance: user.starsBalance,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      plan: s.plan,
      startedAt: s.startedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  });
});

// POST /premium/subscribe — subscribe using stars (atomic debit)
router.post("/premium/subscribe", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { tier } = req.body as { tier?: "monthly" | "yearly" };
  if (!tier || !(tier in PREMIUM_COSTS)) {
    res.status(400).json({ error: "Invalid tier. Use 'monthly' or 'yearly'" });
    return;
  }

  const cost = PREMIUM_COSTS[tier];

  // Get current state for computing expiry
  const [currentUser] = await db
    .select({ isPremium: usersTable.isPremium, premiumUntil: usersTable.premiumUntil })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!currentUser) { res.status(404).json({ error: "User not found" }); return; }

  const now = Date.now();
  const base = currentUser.isPremium && currentUser.premiumUntil && currentUser.premiumUntil.getTime() > now
    ? currentUser.premiumUntil.getTime()
    : now;
  const expiresAt = new Date(base + PREMIUM_DURATIONS_MS[tier]);

  // Atomic debit — only proceeds if balance is sufficient
  const [updated] = await db
    .update(usersTable)
    .set({
      starsBalance: sql`${usersTable.starsBalance} - ${cost}`,
      isPremium: true,
      premiumUntil: expiresAt,
    })
    .where(
      sql`${usersTable.id} = ${req.userId!} AND ${usersTable.starsBalance} >= ${cost}`
    )
    .returning({ starsBalance: usersTable.starsBalance });

  if (!updated) {
    res.status(400).json({ error: `Insufficient stars. Required: ${cost}` });
    return;
  }

  // Record subscription
  await db.insert(premiumSubscriptionsTable).values({
    userId: req.userId!,
    plan: tier,
    expiresAt,
    autoRenew: "true",
    paymentMethod: "stars",
  });

  // Ledger entry
  await db.insert(starsTransactionsTable).values({
    userId: req.userId!,
    amount: -cost,
    type: "premium",
    description: `ECHO Premium (${tier === "monthly" ? "ежемесячно" : "ежегодно"})`,
  });

  res.json({
    isPremium: true,
    premiumUntil: expiresAt.toISOString(),
    newStarsBalance: updated.starsBalance,
  });
});

// DELETE /premium/subscribe — cancel auto-renewal on the latest active subscription
router.delete("/premium/subscribe", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const now = new Date();

  // Find latest active subscription
  const [active] = await db
    .select({ id: premiumSubscriptionsTable.id })
    .from(premiumSubscriptionsTable)
    .where(
      and(
        eq(premiumSubscriptionsTable.userId, req.userId!),
        gt(premiumSubscriptionsTable.expiresAt, now)
      )
    )
    .orderBy(desc(premiumSubscriptionsTable.startedAt))
    .limit(1);

  if (!active) {
    res.status(404).json({ error: "No active subscription to cancel" });
    return;
  }

  await db
    .update(premiumSubscriptionsTable)
    .set({ autoRenew: "false" })
    .where(eq(premiumSubscriptionsTable.id, active.id));

  res.json({ success: true, message: "Автопродление отменено" });
});

export default router;
