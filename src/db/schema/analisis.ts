import { int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const analisisKategori = mysqlTable(
  "analisis_kategori",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 100 }).notNull(),
    keterangan: text("keterangan"),
  },
  (table) => [uniqueIndex("analisis_kategori_village_id_uq").on(table.villageId, table.id)],
);

export type AnalisisKategori = typeof analisisKategori.$inferSelect;
export type NewAnalisisKategori = typeof analisisKategori.$inferInsert;
