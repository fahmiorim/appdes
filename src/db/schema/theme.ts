import {
  boolean,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `theme` — tema situs publik per desa.
 *
 * Meniru konsep OpenSID (`storage/app/themes/<slug>` + `config.json`), tetapi
 * kontraknya berbeda: tema **dikompilasi saat build** di `src/themes/<slug>`
 * (lihat `src/themes/registry.ts`), sedangkan tabel ini hanya menyimpan pilihan
 * tema aktif beserta opsinya per desa.
 *
 * `slug` merujuk tema yang benar-benar ada di registry; slug asing ditolak saat
 * dibaca sehingga tidak ada kode/aset tak tepercaya yang dieksekusi (unggah ZIP
 * tema saat runtime memang tidak didukung).
 */
export const theme = mysqlTable(
  "theme",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Slug tema terpasang, mis. `esensi` atau `natra`. */
    slug: varchar("slug", { length: 50 }).notNull(),
    /** Nama tampilan tema (cache dari manifest agar mudah ditampilkan). */
    nama: varchar("nama", { length: 100 }).notNull(),
    /** Versi tema saat baris terakhir disimpan (informasional). */
    versi: varchar("versi", { length: 20 }).notNull().default("1.0.0"),
    /** Asal tema: `bawaan` (kompilasi) — cadangan untuk sumber lain kelak. */
    sumber: varchar("sumber", { length: 20 }).notNull().default("bawaan"),

    /** Hanya boleh ada satu tema aktif per desa, dijaga di lapisan aplikasi. */
    aktif: boolean("aktif").notNull().default(true),
    /** Opsi tema (warna, font, hero, widget) sebagai JSON tervalidasi Zod. */
    opsi: text("opsi"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("theme_village_slug_unique").on(table.villageId, table.slug)],
);

export type Theme = typeof theme.$inferSelect;
export type NewTheme = typeof theme.$inferInsert;
