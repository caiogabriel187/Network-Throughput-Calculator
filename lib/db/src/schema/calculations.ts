import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** Saved 5G NR calculations, scoped to the owning user. */
export const calculationsTable = pgTable(
  "calculations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: varchar("summary", { length: 512 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("calculations_user_created_idx").on(t.userId, t.createdAt)],
);

export type CalculationRow = typeof calculationsTable.$inferSelect;
export type InsertCalculation = typeof calculationsTable.$inferInsert;
