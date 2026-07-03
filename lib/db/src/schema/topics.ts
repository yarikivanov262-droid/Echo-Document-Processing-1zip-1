import { pgTable, bigserial, bigint, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const topicsTable = pgTable("topics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 64 }).notNull(),
  iconColor: varchar("icon_color", { length: 16 }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => usersTable.id),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;
