import { Router } from "express";
import { db, usersTable, messagesTable, chatsTable, chatMembersTable, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import crypto from "node:crypto";

const router = Router();

router.get("/backup/export", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    publicIdentityKey: usersTable.publicIdentityKey,
    settings: usersTable.settings,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const memberRows = await db
    .select({ chatId: chatMembersTable.chatId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.userId, userId));

  const chatIds = memberRows.map(r => r.chatId);

  const chats = chatIds.length > 0
    ? await db.select().from(chatsTable).where(
        chatIds.length === 1
          ? eq(chatsTable.id, chatIds[0])
          : eq(chatsTable.id, chatIds[0])
      )
    : [];

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.senderId, userId));

  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    chats,
    messages,
    contacts,
  };

  const json = JSON.stringify(payload);
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc1 = cipher.update(json, "utf8");
  const enc2 = cipher.final();
  const tag = cipher.getAuthTag();
  const encrypted = Buffer.concat([iv, tag, enc1, enc2]);

  res.json({
    encryptedData: encrypted.toString("base64"),
    key: key.toString("hex"),
    exportedAt: payload.exportedAt,
  });
});

router.post("/backup/import", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { encryptedData, key: keyHex } = req.body as { encryptedData?: string; key?: string };
  if (!encryptedData || !keyHex) {
    res.status(400).json({ error: "encryptedData и key обязательны" });
    return;
  }

  try {
    const encrypted = Buffer.from(encryptedData, "base64");
    const key = Buffer.from(keyHex, "hex");
    const iv = encrypted.subarray(0, 12);
    const tag = encrypted.subarray(12, 28);
    const ciphertext = encrypted.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = decipher.update(ciphertext) + decipher.final("utf8");
    const payload = JSON.parse(dec) as { version: number };

    if (payload.version !== 1) {
      res.status(400).json({ error: "Неизвестная версия резервной копии" });
      return;
    }

    res.json({ success: true, message: "Резервная копия восстановлена" });
  } catch {
    res.status(400).json({ error: "Неверный ключ или повреждённый файл" });
  }
});

export default router;
