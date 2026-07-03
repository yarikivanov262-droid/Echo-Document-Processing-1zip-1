import { createServer } from "http";
import app from "./app";
import { attachWsServer } from "./lib/ws-hub";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

async function validateToken(token: string): Promise<number | null> {
  const [session] = await db
    .select({ userId: sessionsTable.userId, isDeleted: usersTable.isDeleted })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.sessionToken, token));
  if (!session || session.isDeleted) return null;
  return session.userId;
}

attachWsServer(httpServer, validateToken);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
