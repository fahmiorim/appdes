import { bigint, index, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Shared sliding-window logs use HMAC keys so raw IPs are neither stored nor guessable. */
export const rateLimitEntries = mysqlTable(
  "rate_limit_entries",
  {
    keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
    requestTimes: json("request_times").$type<number[]>().notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (table) => [index("rate_limit_entries_expires_idx").on(table.expiresAt)],
);
