import { pgTable, uuid, bigint, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const backupsTable = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" }).references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  encryptedData: text("encrypted_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Backup = typeof backupsTable.$inferSelect;
