import { pgTable, bigserial, bigint, smallint, text, timestamp, boolean, integer, varchar, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  senderId: bigint("sender_id", { mode: "number" }).notNull().references(() => usersTable.id),
  receiverId: bigint("receiver_id", { mode: "number" }).references(() => usersTable.id),
  chatType: smallint("chat_type").notNull(), // 1=private, 2=group, 3=channel, 4=secret
  chatId: bigint("chat_id", { mode: "number" }).references(() => chatsTable.id),
  encryptedContent: text("encrypted_content").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  deleteAfterRead: boolean("delete_after_read").default(false).notNull(),
  deleteAfterSeconds: integer("delete_after_seconds"),
  isVoice: boolean("is_voice").default(false).notNull(),
  mediaFileId: varchar("media_file_id", { length: 36 }),
  replyToId: bigint("reply_to_id", { mode: "number" }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  forwardedFromId: bigint("forwarded_from_id", { mode: "number" }),
  selfDestructAt: timestamp("self_destruct_at", { withTimezone: true }),
  reactions: jsonb("reactions").$type<Record<string, number[]>>(),
});

export const reactionsTable = pgTable("message_reactions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  messageId: bigint("message_id", { mode: "number" }).notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, timestamp: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type Reaction = typeof reactionsTable.$inferSelect;
