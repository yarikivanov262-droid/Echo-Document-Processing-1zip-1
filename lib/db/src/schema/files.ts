import { pgTable, uuid, bigint, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const filesTable = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: bigint("uploader_id", { mode: "number" }).references(() => usersTable.id),
  data: varchar("data", { length: 10485760 }), // base64 encoded, up to ~8MB
  mimeType: varchar("mime_type", { length: 128 }),
  size: integer("size").default(0).notNull(),
  encryptedKey: varchar("encrypted_key", { length: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FileRecord = typeof filesTable.$inferSelect;
