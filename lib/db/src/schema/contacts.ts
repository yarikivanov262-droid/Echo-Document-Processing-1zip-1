import { pgTable, bigserial, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable("contacts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ownerId: bigint("owner_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: bigint("contact_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  nickname: varchar("nickname", { length: 64 }),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.ownerId, t.contactId)]);

export const blockedUsersTable = pgTable("blocked_users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedId: bigint("blocked_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.blockedId)]);

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, addedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
export type BlockedUser = typeof blockedUsersTable.$inferSelect;
