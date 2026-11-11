import { date, int, mysqlTable, text, time, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const bukuTamu = mysqlTable("buku_tamu", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  instansi: varchar("instansi", { length: 200 }),
  keperluan: text("keperluan"),
  tanggal: date("tanggal").notNull(),
  jamMasuk: time("jam_masuk"),
  jamKeluar: time("jam_keluar"),
  keterangan: text("keterangan"),
});

export type BukuTamu = typeof bukuTamu.$inferSelect;
export type NewBukuTamu = typeof bukuTamu.$inferInsert;
