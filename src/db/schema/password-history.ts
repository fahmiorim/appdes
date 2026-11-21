import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./auth";

export const passwordHistory = mysqlTable("password_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("password_history_user_created_idx").on(t.userId, t.createdAt)]);
