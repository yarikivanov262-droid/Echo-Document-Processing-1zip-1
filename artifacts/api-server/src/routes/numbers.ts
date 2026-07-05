import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CheckEchoNumberParams,
  CheckEchoNumberResponse,
  ClaimEchoNumberBody,
  ClaimEchoNumberResponse,
  GetUserByEchoNumberParams,
  GetUserByEchoNumberResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const ECHO_NUMBER_REGEX = /^\+999\d{7}$/;

router.get("/numbers/check/:number", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.number) ? req.params.number[0] : req.params.number;
  const params = CheckEchoNumberParams.safeParse({ number: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const num = params.data.number;

  if (!ECHO_NUMBER_REGEX.test(num)) {
    res.json(CheckEchoNumberResponse.parse({ available: false, number: num }));
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.echoNumber, num));

  res.json(CheckEchoNumberResponse.parse({ available: !existing, number: num }));
});

router.post("/numbers/claim", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = ClaimEchoNumberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const num = parsed.data.number;

  if (!ECHO_NUMBER_REGEX.test(num)) {
    res.status(400).json({ error: "Недопустимый формат номера. Используйте +999XXXXXXX (7 цифр после +999)" });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.echoNumber, num));

  if (existing) {
    res.status(409).json({ error: "Этот номер уже занят" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ echoNumber: num })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    ClaimEchoNumberResponse.parse({
      id: user.id,
      username: user.username,
      publicIdentityKey: user.publicIdentityKey,
      lastActive: user.lastActive.toISOString(),
      avatarFileId: user.avatarFileId ?? null,
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      settings: (user.settings as Record<string, unknown> | null) ?? undefined,
      createdAt: user.createdAt.toISOString(),
      echoNumber: user.echoNumber ?? null,
    })
  );
});

router.get("/users/by-number/:echoNumber", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.echoNumber) ? req.params.echoNumber[0] : req.params.echoNumber;
  const params = GetUserByEchoNumberParams.safeParse({ echoNumber: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.echoNumber, params.data.echoNumber));

  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const prekeys = user.publicOneTimePrekeys as string[] | null;
  const oneTimePrekey = prekeys && prekeys.length > 0 ? prekeys[0] : null;

  res.json(
    GetUserByEchoNumberResponse.parse({
      id: user.id,
      username: user.username,
      publicIdentityKey: user.publicIdentityKey,
      publicSignedPrekey: user.publicSignedPrekey ?? undefined,
      oneTimePrekey,
      lastActive: user.lastActive.toISOString(),
      avatarFileId: user.avatarFileId ?? null,
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      echoNumber: user.echoNumber ?? null,
    })
  );
});

export default router;
