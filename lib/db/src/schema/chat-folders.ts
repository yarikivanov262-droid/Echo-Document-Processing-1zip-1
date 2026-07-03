import { pgTable, bigserial, bigint, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatFoldersTable = pgTable("chat_folders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 32 }).notNull(),
  emoji: varchar("emoji", { length: 8 }),
  chatIds: jsonb("chat_ids").$type<number[]>().notNull(),
  position: bigint("position", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertChatFolderSchema = createInsertSchema(chatFoldersTable).omit({ id: true, createdAt: true });
export type InsertChatFolder = z.infer<typeof insertChatFolderSchema>;
export type ChatFolder = typeof chatFoldersTable.$inferSelect;
