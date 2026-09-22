import { pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "member"]);

export const users = pgTable("User", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: roleEnum("role").notNull(),
});
