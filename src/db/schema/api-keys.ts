import {
  boolean,
  datetime,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Tabel `api_keys` menyimpan kunci akses untuk API eksternal.
 * `hashed_key` disimpan sebagai hash (misal: SHA-256) untuk keamanan.
 * API Key asli hanya ditampilkan sekali saat pembuatan.
 */
export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    hashedKey: varchar("hashed_key", { length: 255 }).notNull(),
    prefix: varchar("prefix", { length: 16 }).notNull(),
    rateLimit: int("rate_limit").notNull().default(100),
    active: boolean("active").notNull().default(true),
    expiresAt: datetime("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("api_keys_hashed_key_uq").on(table.hashedKey)],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
