import { pgTable, bigserial, varchar, jsonb, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 32 }).unique().notNull(),
  publicIdentityKey: varchar("public_identity_key", { length: 512 }).notNull(),
  publicSignedPrekey: varchar("public_signed_prekey", { length: 512 }),
  publicOneTimePrekeys: jsonb("public_one_time_prekeys").$type<string[]>(),
  seedHash: varchar("seed_hash", { length: 512 }).notNull(),
  seedLookupHash: varchar("seed_lookup_hash", { length: 64 }),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  avatarFileId: varchar("avatar_file_id", { length: 36 }),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow().notNull(),
  bio: varchar("bio", { length: 255 }),
  isOnline: boolean("is_online").default(false).notNull(),
  lastOnline: timestamp("last_online", { withTimezone: true }),
  isPremium: boolean("is_premium").default(false).notNull(),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  starsBalance: integer("stars_balance").default(0).notNull(),
  displayName: varchar("display_name", { length: 64 }),
  pinnedChats: jsonb("pinned_chats").$type<number[]>(),
  publicUsername: boolean("public_username").default(true).notNull(),
  echoNumber: varchar("echo_number", { length: 16 }).unique(),
  isBot: boolean("is_bot").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, lastActive: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
