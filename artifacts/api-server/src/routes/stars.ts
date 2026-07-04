import { Router, type IRouter } from "express";
import { db, usersTable, starsTransactionsTable, messagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const STAR_PACKAGES = [100, 250, 500, 1000, 2500, 5000] as const;

// GET /stars — balance + recent transactions
router.get("/stars", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select({ starsBalance: usersTable.starsBalance })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const transactions = await db
    .select()
    .from(starsTransactionsTable)
    .where(eq(starsTransactionsTable.userId, req.userId!))
    .orderBy(sql`${starsTransactionsTable.createdAt} DESC`)
    .limit(50);

  res.json({
    balance: user.starsBalance,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description ?? null,
      relatedId: t.isAnonymousSender ? null : (t.relatedId ?? null),
      isAnonymous: t.isAnonymousSender,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

// POST /stars/purchase — add stars (demo: free) — atomic UPDATE
router.post("/stars/purchase", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { packageSize } = req.body as { packageSize?: number };
  if (!packageSize || !(STAR_PACKAGES as readonly number[]).includes(packageSize)) {
    res.status(400).json({ error: "Invalid package size" });
    return;
  }

  // Atomic: increment balance in one SQL statement
  const [updated] = await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} + ${packageSize}` })
    .where(eq(usersTable.id, req.userId!))
    .returning({ starsBalance: usersTable.starsBalance });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const [tx] = await db
    .insert(starsTransactionsTable)
    .values({
      userId: req.userId!,
      amount: packageSize,
      type: "purchase",
      description: `Пополнение: ${packageSize} Stars`,
    })
    .returning();

  res.json({
    starsBalance: updated.starsBalance,
    transaction: {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description ?? null,
      relatedId: null,
      createdAt: tx.createdAt.toISOString(),
    },
  });
});

// POST /stars/gift — gift stars to another user — atomic, race-safe
router.post("/stars/gift", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { recipientId, amount, anonymous } = req.body as { recipientId?: number; amount?: number; anonymous?: boolean };
  if (!recipientId || !amount || amount < 1 || amount > 9999) {
    res.status(400).json({ error: "Invalid recipientId or amount" });
    return;
  }
  if (recipientId === req.userId) {
    res.status(400).json({ error: "Cannot gift stars to yourself" });
    return;
  }

  // Atomic debit: only succeeds if balance is sufficient
  const [senderRow] = await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} - ${amount}` })
    .where(
      sql`${usersTable.id} = ${req.userId!} AND ${usersTable.starsBalance} >= ${amount}`
    )
    .returning({ starsBalance: usersTable.starsBalance });

  if (!senderRow) {
    res.status(400).json({ error: "Insufficient stars balance" });
    return;
  }

  // Credit recipient
  const [recipientRow] = await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} + ${amount}` })
    .where(eq(usersTable.id, recipientId))
    .returning({ starsBalance: usersTable.starsBalance, username: usersTable.username });

  if (!recipientRow) {
    // Rollback sender debit
    await db
      .update(usersTable)
      .set({ starsBalance: sql`${usersTable.starsBalance} + ${amount}` })
      .where(eq(usersTable.id, req.userId!));
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  // Ledger entries (both sides)
  await db.insert(starsTransactionsTable).values([
    {
      userId: req.userId!,
      amount: -amount,
      type: "gift_sent",
      description: `Подарок @${recipientRow.username}${anonymous ? " (анонимно)" : ""}`,
      relatedId: recipientId,
    },
    {
      userId: recipientId,
      amount,
      type: "gift_received",
      description: anonymous ? "Анонимный подарок" : `Подарок получен`,
      relatedId: anonymous ? null : req.userId!,
      isAnonymousSender: anonymous === true,
    },
  ]);

  res.json({ success: true, newBalance: senderRow.starsBalance });
});

// POST /stars/tip — tip on a channel message
router.post("/stars/tip", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { messageId, amount } = req.body as { messageId?: number; amount?: number };
  if (!messageId || !amount || amount < 1) {
    res.status(400).json({ error: "Invalid messageId or amount" });
    return;
  }

  // Validate message exists and get sender (channel admin who receives the tip)
  const [msg] = await db
    .select({ senderId: messagesTable.senderId, chatType: messagesTable.chatType })
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  // Atomic debit sender
  const [senderRow] = await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} - ${amount}` })
    .where(
      sql`${usersTable.id} = ${req.userId!} AND ${usersTable.starsBalance} >= ${amount}`
    )
    .returning({ starsBalance: usersTable.starsBalance });

  if (!senderRow) {
    res.status(400).json({ error: "Insufficient stars balance" });
    return;
  }

  // Credit message author
  await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} + ${amount}` })
    .where(eq(usersTable.id, msg.senderId));

  // Balanced ledger entries
  await db.insert(starsTransactionsTable).values([
    {
      userId: req.userId!,
      amount: -amount,
      type: "tip",
      description: `Чаевые за сообщение #${messageId}`,
      relatedId: messageId,
    },
    {
      userId: msg.senderId,
      amount,
      type: "tip_received",
      description: `Чаевые за сообщение #${messageId}`,
      relatedId: messageId,
    },
  ]);

  res.json({ success: true, newBalance: senderRow.starsBalance });
});

// POST /stars/react — paid reaction on a message
router.post("/stars/react", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { messageId, amount } = req.body as { messageId?: number; amount?: number };
  if (!messageId || !amount || amount < 1) {
    res.status(400).json({ error: "Invalid messageId or amount" });
    return;
  }

  // Validate message exists
  const [msg] = await db
    .select({ senderId: messagesTable.senderId })
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  // Atomic debit
  const [senderRow] = await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} - ${amount}` })
    .where(
      sql`${usersTable.id} = ${req.userId!} AND ${usersTable.starsBalance} >= ${amount}`
    )
    .returning({ starsBalance: usersTable.starsBalance });

  if (!senderRow) {
    res.status(400).json({ error: "Insufficient stars balance" });
    return;
  }

  // Credit channel/message author
  await db
    .update(usersTable)
    .set({ starsBalance: sql`${usersTable.starsBalance} + ${amount}` })
    .where(eq(usersTable.id, msg.senderId));

  // Balanced ledger entries
  await db.insert(starsTransactionsTable).values([
    {
      userId: req.userId!,
      amount: -amount,
      type: "paid_reaction",
      description: `Платная реакция на сообщение #${messageId}`,
      relatedId: messageId,
    },
    {
      userId: msg.senderId,
      amount,
      type: "reaction_received",
      description: `Платная реакция на сообщение #${messageId}`,
      relatedId: messageId,
    },
  ]);

  res.json({ success: true, newBalance: senderRow.starsBalance });
});

export default router;
