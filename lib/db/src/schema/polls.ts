import { pgTable, bigserial, bigint, varchar, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pollsTable = pgTable("polls", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }).notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  creatorId: bigint("creator_id", { mode: "number" }).notNull().references(() => usersTable.id),
  question: varchar("question", { length: 255 }).notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  isMultipleChoice: boolean("is_multiple_choice").default(false).notNull(),
  isQuiz: boolean("is_quiz").default(false).notNull(),
  correctOptionIndex: bigint("correct_option_index", { mode: "number" }),
  explanation: text("explanation"),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pollVotesTable = pgTable("poll_votes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  pollId: bigint("poll_id", { mode: "number" }).notNull().references(() => pollsTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  optionIndexes: jsonb("option_indexes").$type<number[]>().notNull(),
  votedAt: timestamp("voted_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPollSchema = createInsertSchema(pollsTable).omit({ id: true, createdAt: true });
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof pollsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;
