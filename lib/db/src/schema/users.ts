import { pgTable, bigserial, varchar, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 32 }).unique().notNull(),
  publicIdentityKey: varchar("public_identity_key", { length: 512 }).notNull(),
  publicSignedPrekey: varchar("public_signed_prekey", { length: 512 }),
  publicOneTimePrekeys: jsonb("public_one_time_prekeys").$type<string[]>(),
  seedHash: varchar("seed_hash", { length: 512 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  avatarFileId: varchar("avatar_file_id", { length: 36 }),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, lastActive: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
