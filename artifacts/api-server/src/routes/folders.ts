import { Router, type IRouter } from "express";
import { db, chatFoldersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetFoldersResponse,
  CreateFolderBody,
  CreateFolderResponse,
  PatchFolderBody,
  PatchFolderResponse,
  DeleteFolderResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/folders", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(chatFoldersTable)
    .where(eq(chatFoldersTable.userId, req.userId!));

  res.json(
    GetFoldersResponse.parse(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji ?? null,
        chatIds: r.chatIds,
        position: Number(r.position),
      }))
    )
  );
});

router.post("/folders", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [folder] = await db
    .insert(chatFoldersTable)
    .values({
      userId: req.userId!,
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? null,
      chatIds: parsed.data.chatIds,
      position: parsed.data.position ?? 0,
    })
    .returning();

  res.status(201).json(
    CreateFolderResponse.parse({
      id: folder.id,
      name: folder.name,
      emoji: folder.emoji ?? null,
      chatIds: folder.chatIds,
      position: Number(folder.position),
    })
  );
});

router.patch("/folders/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid folder id" });
    return;
  }

  const parsed = PatchFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [folder] = await db
    .update(chatFoldersTable)
    .set({
      name: parsed.data.name ?? undefined,
      emoji: parsed.data.emoji ?? undefined,
      chatIds: parsed.data.chatIds ?? undefined,
      position: parsed.data.position ?? undefined,
    })
    .where(and(eq(chatFoldersTable.id, id), eq(chatFoldersTable.userId, req.userId!)))
    .returning();

  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }

  res.json(
    PatchFolderResponse.parse({
      id: folder.id,
      name: folder.name,
      emoji: folder.emoji ?? null,
      chatIds: folder.chatIds,
      position: Number(folder.position),
    })
  );
});

router.delete("/folders/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid folder id" });
    return;
  }

  await db
    .delete(chatFoldersTable)
    .where(and(eq(chatFoldersTable.id, id), eq(chatFoldersTable.userId, req.userId!)));

  res.json(DeleteFolderResponse.parse({ success: true }));
});

export default router;
