import { pgTable, bigserial, bigint, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";
import { messagesTable } from "./messages";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pinnedMessagesTable = pgTable("pinned_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  messageId: bigint("message_id", { mode: "number" }).notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  pinnedBy: bigint("pinned_by", { mode: "number" }).notNull().references(() => usersTable.id),
  pinnedAt: timestamp("pinned_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.chatId, t.messageId)]);

export const insertPinnedMessageSchema = createInsertSchema(pinnedMessagesTable).omit({ id: true, pinnedAt: true });
export type InsertPinnedMessage = z.infer<typeof insertPinnedMessageSchema>;
export type PinnedMessage = typeof pinnedMessagesTable.$inferSelect;
