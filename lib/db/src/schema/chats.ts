import { pgTable, bigserial, smallint, varchar, bigint, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatsTable = pgTable("chats", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: smallint("type").notNull(), // 2=group, 3=channel
  title: varchar("title", { length: 255 }).notNull(),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => usersTable.id),
  avatarFileId: varchar("avatar_file_id", { length: 36 }),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMembersTable = pgTable("chat_members", {
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  permissions: jsonb("permissions").$type<Record<string, boolean>>(),
});

export const insertChatSchema = createInsertSchema(chatsTable).omit({ id: true, createdAt: true });
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chatsTable.$inferSelect;
export type ChatMember = typeof chatMembersTable.$inferSelect;
