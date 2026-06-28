import { pgTable, uuid, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sessionsTable = pgTable("sessions", {
  deviceId: uuid("device_id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 512 }).unique().notNull(),
  publicDeviceKey: varchar("public_device_key", { length: 512 }),
  userAgent: varchar("user_agent", { length: 512 }),
  lastUsed: timestamp("last_used", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
