import { boolean, int, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `rentang_umur` — rentang umur dinamis per desa untuk statistik penduduk (kategori `age_range`).
 *
 * Desa dapat menyesuaikan bucket umur sesuai kebutuhan. Bila tabel kosong,
 * repository fallback ke `KELOMPOK_UMUR` bawaan.
 */
export const rentangUmur = mysqlTable("rentang_umur", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 60 }).notNull(),
  /** Batas bawah inklusif. */
  dari: int("dari").notNull().default(0),
  /** Batas atas inklusif; `null` = tanpa batas atas. */
  sampai: int("sampai"),
  /** Status aktif/nonaktif. */
  status: boolean("status").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * `rentang_umur_defaults` — konfigurasi default bucket umur yang dipakai saat
 * desa belum menetapkan rentang kustom. Satu baris per desa.
 *
 * Kolom `dari`/`sampai` mengikuti skema `rentang_umur`.
 */
export const rentangUmurDefaults = mysqlTable(
  "rentang_umur_defaults",
  {
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    defaultSets: varchar("default_sets", { length: 200 }).notNull().default("standard"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.villageId] }),
  }),
);
