import { db, messagesTable, usersTable, premiumSubscriptionsTable } from "@workspace/db";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { logger } from "./lib/logger";

async function runSelfDestruct() {
  try {
    const expired = await db
      .select({ id: messagesTable.id, chatId: messagesTable.chatId })
      .from(messagesTable)
      .where(
        and(
          isNotNull(messagesTable.selfDestructAt),
          lte(messagesTable.selfDestructAt, new Date()),
          eq(messagesTable.isDeleted, false)
        )
      );

    for (const msg of expired) {
      await db
        .update(messagesTable)
        .set({ isDeleted: true })
        .where(eq(messagesTable.id, msg.id));
    }

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "Self-destructed messages");
    }
  } catch (err) {
    logger.error({ err }, "Self-destruct job failed");
  }
}

async function runPremiumExpiry() {
  try {
    const now = new Date();

    const expired = await db
      .select({ userId: premiumSubscriptionsTable.userId })
      .from(premiumSubscriptionsTable)
      .where(lte(premiumSubscriptionsTable.expiresAt, now));

    for (const { userId } of expired) {
      await db
        .update(usersTable)
        .set({ isPremium: false, premiumUntil: null })
        .where(
          and(eq(usersTable.id, userId), eq(usersTable.isPremium, true))
        );
    }

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "Premium subscriptions expired");
    }
  } catch (err) {
    logger.error({ err }, "Premium expiry job failed");
  }
}

export function startBackgroundJobs() {
  setInterval(() => void runSelfDestruct(), 10_000);
  setInterval(() => void runPremiumExpiry(), 3_600_000);

  logger.info("Background jobs started");
}
