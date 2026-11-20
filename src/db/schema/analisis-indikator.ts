import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { analisisKategori } from "./analisis";
import { villages } from "./village";

/**
 * `kategori_id` memakai composite RESTRICT; `deleteAnalisisKategori` melepas
 * referensi dalam transaksi sebelum menghapus parent.
 */
export const analisisIndikator = mysqlTable(
  "analisis_indikator",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kategoriId: int("kategori_id"),
    kode: varchar("kode", { length: 20 }).notNull(),
    nama: varchar("nama", { length: 200 }).notNull(),
    /** Bobot indikator dalam perhitungan skor (1–100). */
    bobot: int("bobot").notNull().default(1),
    keterangan: text("keterangan"),
  },
  (table) => [
    uniqueIndex("analisis_indikator_village_id_uq").on(table.villageId, table.id),
    index("analisis_indikator_village_kategori_idx").on(table.villageId, table.kategoriId),
    foreignKey({
      name: "analisis_indikator_kategori_tenant_fk",
      columns: [table.villageId, table.kategoriId],
      foreignColumns: [analisisKategori.villageId, analisisKategori.id],
    }).onDelete("restrict"),
  ],
);

export type AnalisisIndikator = typeof analisisIndikator.$inferSelect;
export type NewAnalisisIndikator = typeof analisisIndikator.$inferInsert;
