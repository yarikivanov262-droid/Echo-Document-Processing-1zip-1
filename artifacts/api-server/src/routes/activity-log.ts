import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetActivityLogResponse } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/activity-log", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, req.userId!))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(100);

  res.json(
    GetActivityLogResponse.parse(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        ipAddress: r.ipAddress ?? null,
        userAgent: r.userAgent ?? null,
        createdAt: r.createdAt.toISOString(),
      }))
    )
  );
});

export async function logActivity(userId: number, action: string, req?: { ip?: string; headers?: Record<string, unknown> }) {
  await db.insert(activityLogsTable).values({
    userId,
    action,
    ipAddress: req?.ip ?? null,
    userAgent: (req?.headers?.["user-agent"] as string) ?? null,
  });
}

export default router;
