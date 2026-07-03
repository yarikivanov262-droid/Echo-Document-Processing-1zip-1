import { pgTable, bigserial, bigint, varchar, timestamp, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const callLogsTable = pgTable("call_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  callUuid: uuid("call_uuid").defaultRandom().notNull().unique(),
  callerId: bigint("caller_id", { mode: "number" }).notNull().references(() => usersTable.id),
  calleeId: bigint("callee_id", { mode: "number" }).notNull().references(() => usersTable.id),
  chatId: bigint("chat_id", { mode: "number" }).references(() => chatsTable.id),
  type: varchar("type", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  signalingData: jsonb("signaling_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCallLogSchema = createInsertSchema(callLogsTable).omit({ id: true, callUuid: true, createdAt: true });
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogsTable.$inferSelect;
