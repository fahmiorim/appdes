import {
  bigint,
  int,
  json,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `media_settings` — pengaturan batasan unggahan per desa per kategori.
 *
 * Mengizinkan konfigurasi MIME allowlist, jumlah file maksimal, dan ukuran
 * maksimal per file. Nilai kosong (NULL) berarti fallback ke default domain.
 */
export const mediaSettings = mysqlTable(
  "media_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kategori: varchar("kategori", { length: 100 }).notNull(),
    mimeAllowlist: json("mime_allowlist"),
    maxFiles: int("max_files"),
    maxSizeBytes: bigint("max_size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("media_settings_village_kategori_unique").on(table.villageId, table.kategori),
  ],
);

export type MediaSetting = typeof mediaSettings.$inferSelect;
export type NewMediaSetting = typeof mediaSettings.$inferInsert;
