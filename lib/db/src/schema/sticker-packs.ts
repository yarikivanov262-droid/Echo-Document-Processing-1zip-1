import { pgTable, bigserial, bigint, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const stickerPacksTable = pgTable("sticker_packs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  creatorId: bigint("creator_id", { mode: "number" }).references(() => usersTable.id),
  thumbnail: text("thumbnail"),
  stickers: jsonb("stickers").$type<{ emoji: string; fileId?: string }[]>().default([]),
  isAnimated: boolean("is_animated").default(false).notNull(),
  isOfficial: boolean("is_official").default(false).notNull(),
  installCount: bigint("install_count", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StickerPack = typeof stickerPacksTable.$inferSelect;
