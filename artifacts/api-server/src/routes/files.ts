import { Router, type IRouter } from "express";
import { db, filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  UploadFileBody,
  UploadFileResponse,
  GetFileParams,
  GetFileResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { fileUploadRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

router.use(fileUploadRateLimit);

router.post("/files/upload", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UploadFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const dataSize = Buffer.byteLength(parsed.data.data, "base64");

  const [file] = await db
    .insert(filesTable)
    .values({
      uploaderId: req.userId!,
      data: parsed.data.data,
      mimeType: parsed.data.mimeType ?? "application/octet-stream",
      size: dataSize,
      encryptedKey: parsed.data.encryptedKey ?? null,
    })
    .returning();

  res.json(
    UploadFileResponse.parse({
      fileId: file.id,
      url: `/api/files/${file.id}`,
      size: file.size,
      mimeType: file.mimeType ?? "application/octet-stream",
    })
  );
});

router.get("/files/:fileId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
  const params = GetFileParams.safeParse({ fileId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, params.data.fileId));
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json(
    GetFileResponse.parse({
      fileId: file.id,
      size: file.size,
      mimeType: file.mimeType ?? "application/octet-stream",
      createdAt: file.createdAt.toISOString(),
    })
  );
});

export default router;
