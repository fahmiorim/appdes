import { boolean, index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { users } from "./auth";

export const twoFactors = mysqlTable(
  "two_factor",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(false),
    failedVerificationCount: int("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
  },
  (t) => [index("two_factor_user_idx").on(t.userId)],
);
