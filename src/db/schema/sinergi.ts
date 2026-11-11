import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const sinergiProgram = mysqlTable("sinergi_program", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  mitra: varchar("mitra", { length: 200 }),
  tahun: int("tahun"),
  tanggalMulai: varchar("tanggal_mulai", { length: 20 }),
  tanggalSelesai: varchar("tanggal_selesai", { length: 20 }),
  keterangan: text("keterangan"),
});

export type SinergiProgram = typeof sinergiProgram.$inferSelect;
export type NewSinergiProgram = typeof sinergiProgram.$inferInsert;
