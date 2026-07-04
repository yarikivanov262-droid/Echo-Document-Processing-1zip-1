import { Router, type IRouter } from "express";
import { db, usersTable, sessionsTable, backupsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import {
  RegisterBody,
  RegisterResponse,
  LoginBody,
  LoginResponse,
  CheckUsernameBody,
  CheckUsernameResponse,
  RestoreAccountBody,
  RestoreAccountResponse,
  DeleteAccountBody,
  DeleteAccountResponse,
  GetSessionsResponse,
  TerminateSessionParams,
  TerminateSessionResponse,
  UploadBackupBody,
  UploadBackupResponse,
  GetLatestBackupResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { authRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

router.post("/register", authRateLimit, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, publicIdentityKey, publicSignedPrekey, publicOneTimePrekeys, seedHash } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      publicIdentityKey,
      publicSignedPrekey: publicSignedPrekey ?? null,
      publicOneTimePrekeys: publicOneTimePrekeys ?? null,
      seedHash,
    })
    .returning();

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: user.id,
      sessionToken,
      userAgent: req.headers["user-agent"] ?? "unknown",
    })
    .returning();

  res.status(201).json(
    RegisterResponse.parse({
      userId: user.id,
      username: user.username,
      sessionToken,
      deviceId: session.deviceId,
    })
  );
});

router.post("/check-username", authRateLimit, async (req, res): Promise<void> => {
  const parsed = CheckUsernameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username));

  res.json(CheckUsernameResponse.parse({ available: !existing }));
});

router.post("/login", authRateLimit, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, seedHash } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.username, username), eq(usersTable.isDeleted, false)));

  if (!user || user.seedHash !== seedHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: user.id,
      sessionToken,
      publicDeviceKey: parsed.data.publicDeviceKey ?? null,
      userAgent: req.headers["user-agent"] ?? "unknown",
    })
    .returning();

  res.json(
    LoginResponse.parse({
      userId: user.id,
      username: user.username,
      sessionToken,
      deviceId: session.deviceId,
    })
  );
});

router.post("/restore", authRateLimit, async (req, res): Promise<void> => {
  const parsed = RestoreAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.seedHash, parsed.data.seedHash), eq(usersTable.isDeleted, false)));

  if (!user) {
    res.status(401).json({ error: "No account found with this seed" });
    return;
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: user.id,
      sessionToken,
      publicDeviceKey: parsed.data.publicDeviceKey ?? null,
      userAgent: req.headers["user-agent"] ?? "unknown",
    })
    .returning();

  res.json(
    RestoreAccountResponse.parse({
      userId: user.id,
      username: user.username,
      sessionToken,
      deviceId: session.deviceId,
    })
  );
});

router.post("/delete-account", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = DeleteAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(usersTable)
    .set({ isDeleted: true })
    .where(eq(usersTable.id, req.userId!));

  await db.delete(sessionsTable).where(eq(sessionsTable.userId, req.userId!));

  res.json(DeleteAccountResponse.parse({ success: true, message: "Account burned" }));
});

router.get("/sessions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, req.userId!));

  res.json(
    GetSessionsResponse.parse(
      sessions.map((s) => ({
        deviceId: s.deviceId,
        lastUsed: s.lastUsed.toISOString(),
        createdAt: s.createdAt.toISOString(),
        userAgent: s.userAgent ?? "unknown",
        isCurrent: s.deviceId === req.deviceId,
      }))
    )
  );
});

router.delete("/sessions/:deviceId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
  const params = TerminateSessionParams.safeParse({ deviceId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.deviceId, params.data.deviceId), eq(sessionsTable.userId, req.userId!)));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db.delete(sessionsTable).where(eq(sessionsTable.deviceId, params.data.deviceId));

  res.json(TerminateSessionResponse.parse({ success: true }));
});

router.post("/backup/upload", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = UploadBackupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(backupsTable).values({
    userId: req.userId!,
    encryptedData: parsed.data.encryptedData,
  });

  res.json(UploadBackupResponse.parse({ success: true }));
});

router.get("/backup/latest", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.userId, req.userId!))
    .orderBy(backupsTable.createdAt)
    .limit(1);

  if (!backup) {
    res.status(404).json({ error: "No backup found" });
    return;
  }

  res.json(
    GetLatestBackupResponse.parse({
      id: backup.id,
      encryptedData: backup.encryptedData,
      createdAt: backup.createdAt.toISOString(),
    })
  );
});

export default router;
