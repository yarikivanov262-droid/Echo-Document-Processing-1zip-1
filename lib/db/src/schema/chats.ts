import { pgTable, bigserial, smallint, varchar, bigint, timestamp, jsonb, integer, boolean, text } from "drizzle-orm/pg-core";
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
  description: text("description"),
  isVerified: boolean("is_verified").default(false).notNull(),
  isScam: boolean("is_scam").default(false).notNull(),
  linkedChatId: bigint("linked_chat_id", { mode: "number" }),
  inviteLink: varchar("invite_link", { length: 128 }),
  inviteLinkExpiry: timestamp("invite_link_expiry", { withTimezone: true }),
  joinByRequest: boolean("join_by_request").default(false).notNull(),
  slowMode: integer("slow_mode").default(0).notNull(),
  isProtected: boolean("is_protected").default(false).notNull(),
  isForum: boolean("is_forum").default(false).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  memberCount: integer("member_count").default(0).notNull(),
  pinnedMessageId: bigint("pinned_message_id", { mode: "number" }),
  defaultPermissions: jsonb("default_permissions").$type<Record<string, boolean>>(),
});

export const chatMembersTable = pgTable("chat_members", {
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  permissions: jsonb("permissions").$type<Record<string, boolean>>(),
  customTitle: varchar("custom_title", { length: 32 }),
  restrictedUntil: timestamp("restricted_until", { withTimezone: true }),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  isPinned: boolean("is_pinned").default(false).notNull(),
  unreadCount: integer("unread_count").default(0).notNull(),
  draftText: text("draft_text"),
  lastReadMsgId: bigint("last_read_msg_id", { mode: "number" }),
  isArchived: boolean("is_archived").default(false).notNull(),
});

export const chatJoinRequestsTable = pgTable("chat_join_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  message: text("message"),
  reviewedBy: bigint("reviewed_by", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertChatSchema = createInsertSchema(chatsTable).omit({ id: true, createdAt: true });
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chatsTable.$inferSelect;
export type ChatMember = typeof chatMembersTable.$inferSelect;
export type ChatJoinRequest = typeof chatJoinRequestsTable.$inferSelect;
