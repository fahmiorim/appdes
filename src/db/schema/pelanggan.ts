import { date, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const pelanggan = mysqlTable("pelanggan", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  kontak: varchar("kontak", { length: 100 }),
  alamat: text("alamat"),
  keterangan: text("keterangan"),
  statusLangganan: varchar("status_langganan", { length: 20 }).default("menunggu"),
  tanggalMulai: date("tanggal_mulai"),
  tanggalSelesai: date("tanggal_selesai"),
  noKerjasama: varchar("no_kerjasama", { length: 100 }),
  keteranganLangganan: text("keterangan_langganan"),
  dokumenKerjasama: varchar("dokumen_kerjasama", { length: 500 }),
  dokumenNama: varchar("dokumen_nama", { length: 255 }),
  dokumenMime: varchar("dokumen_mime", { length: 100 }),
});

export type Pelanggan = typeof pelanggan.$inferSelect;
export type NewPelanggan = typeof pelanggan.$inferInsert;
