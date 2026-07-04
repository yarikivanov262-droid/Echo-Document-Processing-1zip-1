import { pgTable, bigserial, bigint, varchar, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const anonymousInboxesTable = pgTable("anonymous_inboxes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 32 }).unique().notNull(),
  label: varchar("label", { length: 64 }),
  isActive: boolean("is_active").default(true).notNull(),
  isOneTime: boolean("is_one_time").default(false).notNull(),
  allowFiles: boolean("allow_files").default(false).notNull(),
  maxLength: integer("max_length").default(500).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anonymousInboxMessagesTable = pgTable("anonymous_inbox_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  inboxId: bigint("inbox_id", { mode: "number" }).notNull().references(() => anonymousInboxesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  senderHash: varchar("sender_hash", { length: 64 }),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export type AnonInbox = typeof anonymousInboxesTable.$inferSelect;
export type AnonInboxMessage = typeof anonymousInboxMessagesTable.$inferSelect;
