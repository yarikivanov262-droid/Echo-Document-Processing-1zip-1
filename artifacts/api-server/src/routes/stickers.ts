import { Router, type IRouter } from "express";
import { db, stickerPacksTable, userStickerPacksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetStickerPacksResponse,
  GetInstalledStickerPacksResponse,
  InstallStickerPackBody,
  InstallStickerPackResponse,
  UninstallStickerPackResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stickers/packs", requireAuth, async (_req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select().from(stickerPacksTable);
  res.json(
    GetStickerPacksResponse.parse(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        thumbnail: r.thumbnail ?? null,
        stickers: r.stickers ?? [],
        isAnimated: r.isAnimated,
        isOfficial: r.isOfficial,
        installCount: r.installCount,
      }))
    )
  );
});

router.get("/stickers/installed", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: stickerPacksTable.id,
      title: stickerPacksTable.title,
      thumbnail: stickerPacksTable.thumbnail,
      stickers: stickerPacksTable.stickers,
      isAnimated: stickerPacksTable.isAnimated,
      position: userStickerPacksTable.position,
    })
    .from(userStickerPacksTable)
    .innerJoin(stickerPacksTable, eq(userStickerPacksTable.packId, stickerPacksTable.id))
    .where(eq(userStickerPacksTable.userId, req.userId!));

  res.json(
    GetInstalledStickerPacksResponse.parse(
      rows
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: r.id,
          title: r.title,
          thumbnail: r.thumbnail ?? null,
          stickers: r.stickers ?? [],
          isAnimated: r.isAnimated,
        }))
    )
  );
});

router.post("/stickers/install", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const body = InstallStickerPackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(userStickerPacksTable)
    .where(and(eq(userStickerPacksTable.userId, req.userId!), eq(userStickerPacksTable.packId, body.data.packId)));

  if (!existing) {
    await db.insert(userStickerPacksTable).values({ userId: req.userId!, packId: body.data.packId });
    const [pack] = await db.select().from(stickerPacksTable).where(eq(stickerPacksTable.id, body.data.packId));
    if (pack) {
      await db
        .update(stickerPacksTable)
        .set({ installCount: pack.installCount + 1 })
        .where(eq(stickerPacksTable.id, body.data.packId));
    }
  }

  res.json(InstallStickerPackResponse.parse({ success: true }));
});

router.delete("/stickers/install/:packId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.packId) ? req.params.packId[0] : req.params.packId;
  const packId = parseInt(raw, 10);
  if (isNaN(packId)) {
    res.status(400).json({ error: "Invalid pack id" });
    return;
  }

  await db
    .delete(userStickerPacksTable)
    .where(and(eq(userStickerPacksTable.userId, req.userId!), eq(userStickerPacksTable.packId, packId)));

  res.json(UninstallStickerPackResponse.parse({ success: true }));
});

export default router;
