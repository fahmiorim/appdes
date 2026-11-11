import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `komentar` — komentar publik pada halaman desa.
 * Warga dapat meninggalkan komentar pada halaman publik seperti kontak.
 */
export const komentar = mysqlTable(
  "komentar",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Halaman target komentar: 'kontak', 'berita', dll. */
    halaman: varchar("halaman", { length: 50 }).notNull(),

    /** Nama penulis komentar. */
    namaPenulis: varchar("nama_penulis", { length: 100 }).notNull(),

    /** Isi komentar. */
    isi: text("isi").notNull(),

    /** Status: 'aktif' | 'ditolak'. Admin moderasi. */
    status: varchar("status", { length: 20 }).notNull().default("aktif"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("komentar_village_halaman_idx").on(t.villageId, t.halaman),
    index("komentar_village_status_idx").on(t.villageId, t.status),
  ],
);

export type Komentar = typeof komentar.$inferSelect;
export type NewKomentar = typeof komentar.$inferInsert;
