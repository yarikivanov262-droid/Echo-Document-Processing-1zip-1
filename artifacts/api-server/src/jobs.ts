import { db, messagesTable } from "@workspace/db";
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

export function startBackgroundJobs() {
  setInterval(() => void runSelfDestruct(), 10_000);

  logger.info("Background jobs started");
}
