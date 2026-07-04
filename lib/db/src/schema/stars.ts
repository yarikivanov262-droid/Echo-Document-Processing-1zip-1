import { pgTable, bigserial, bigint, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const starsTransactionsTable = pgTable("stars_transactions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  description: varchar("description", { length: 255 }),
  relatedId: bigint("related_id", { mode: "number" }),
  isAnonymousSender: boolean("is_anonymous_sender").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const premiumSubscriptionsTable = pgTable("premium_subscriptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 32 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  autoRenew: varchar("auto_renew", { length: 8 }).default("false").notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }),
});

export const reactionsPaidTable = pgTable("reactions_paid", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  messageId: bigint("message_id", { mode: "number" }).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  starsAmount: integer("stars_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStarsTransactionSchema = createInsertSchema(starsTransactionsTable).omit({ id: true, createdAt: true });
export type InsertStarsTransaction = z.infer<typeof insertStarsTransactionSchema>;
export type StarsTransaction = typeof starsTransactionsTable.$inferSelect;
export type PremiumSubscription = typeof premiumSubscriptionsTable.$inferSelect;
export type ReactionPaid = typeof reactionsPaidTable.$inferSelect;
