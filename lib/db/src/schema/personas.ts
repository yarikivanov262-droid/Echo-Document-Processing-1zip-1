import { pgTable, bigserial, bigint, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const personasTable = pgTable("personas", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  masterUserId: bigint("master_user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  index: integer("index").notNull().default(0),
  label: varchar("label", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Persona = typeof personasTable.$inferSelect;
