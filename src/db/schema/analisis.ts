import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const analisisKategori = mysqlTable("analisis_kategori", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 100 }).notNull(),
  keterangan: text("keterangan"),
});

export type AnalisisKategori = typeof analisisKategori.$inferSelect;
export type NewAnalisisKategori = typeof analisisKategori.$inferInsert;
