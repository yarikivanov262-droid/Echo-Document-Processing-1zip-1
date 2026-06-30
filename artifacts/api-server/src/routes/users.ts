import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetUserByUsernameParams,
  GetUserByUsernameResponse,
  GetMeResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  UploadPrekeysBody,
  UploadPrekeysResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: user.id,
      username: user.username,
      publicIdentityKey: user.publicIdentityKey,
      lastActive: user.lastActive.toISOString(),
      avatarFileId: user.avatarFileId ?? null,
      settings: (user.settings as Record<string, unknown> | null) ?? undefined,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.patch("/users/me/settings", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ settings: parsed.data.settings as Record<string, unknown> ?? undefined })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json(
    UpdateSettingsResponse.parse({
      id: user.id,
      username: user.username,
      publicIdentityKey: user.publicIdentityKey,
      lastActive: user.lastActive.toISOString(),
      avatarFileId: user.avatarFileId ?? null,
      settings: user.settings ?? null,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.get("/users/:username", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const params = GetUserByUsernameParams.safeParse({ username: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, params.data.username));

  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const prekeys = user.publicOneTimePrekeys as string[] | null;
  const oneTimePrekey = prekeys && prekeys.length > 0 ? prekeys[0] : null;

  res.json(
    GetUserByUsernameResponse.parse({
      id: user.id,
      username: user.username,
      publicIdentityKey: user.publicIdentityKey,
      publicSignedPrekey: user.publicSignedPrekey ?? undefined,
      oneTimePrekey,
      lastActive: user.lastActive.toISOString(),
      avatarFileId: user.avatarFileId ?? null,
    })
  );
});

router.post("/prekeys", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UploadPrekeysBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(usersTable)
    .set({ publicOneTimePrekeys: parsed.data.publicOneTimePrekeys })
    .where(eq(usersTable.id, req.userId!));

  res.json(UploadPrekeysResponse.parse({ success: true }));
});

export default router;
