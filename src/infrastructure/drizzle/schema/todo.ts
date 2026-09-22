import { boolean, index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const todos = pgTable(
  "Todo",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    completed: boolean("completed").notNull(),
    ownerId: varchar("ownerId", { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull(),
  },
  (table) => [index("Todo_ownerId_idx").on(table.ownerId)],
);
