import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  username?: string;
  deviceId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [session] = await db
    .select({
      deviceId: sessionsTable.deviceId,
      userId: sessionsTable.userId,
      username: usersTable.username,
      isDeleted: usersTable.isDeleted,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.sessionToken, token));

  if (!session || session.isDeleted) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.userId = session.userId;
  req.username = session.username;
  req.deviceId = session.deviceId;

  await db
    .update(sessionsTable)
    .set({ lastUsed: new Date() })
    .where(eq(sessionsTable.sessionToken, token));

  await db
    .update(usersTable)
    .set({ lastActive: new Date() })
    .where(eq(usersTable.id, session.userId));

  next();
}
