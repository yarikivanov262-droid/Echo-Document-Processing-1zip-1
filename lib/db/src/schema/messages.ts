import { pgTable, bigserial, bigint, smallint, text, timestamp, boolean, integer, varchar, jsonb, decimal } from "drizzle-orm/pg-core";
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
  senderUsername: varchar("sender_username", { length: 32 }),
  mediaGroupId: varchar("media_group_id", { length: 36 }),
  mediaType: varchar("media_type", { length: 16 }),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: bigint("file_size", { mode: "number" }),
  mediaDuration: integer("media_duration"),
  mediaWidth: integer("media_width"),
  mediaHeight: integer("media_height"),
  mediaThumbFileId: varchar("media_thumb_file_id", { length: 36 }),
  pollId: bigint("poll_id", { mode: "number" }),
  locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
  locationTitle: varchar("location_title", { length: 128 }),
  contactUserId: bigint("contact_user_id", { mode: "number" }),
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  isSilent: boolean("is_silent").default(false).notNull(),
  hasSpoiler: boolean("has_spoiler").default(false).notNull(),
  viewOnce: boolean("view_once").default(false).notNull(),
  viewedByIds: jsonb("viewed_by_ids").$type<number[]>(),
  starredBy: jsonb("starred_by").$type<number[]>(),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  forwardedFromUsername: varchar("forwarded_from_username", { length: 32 }),
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
