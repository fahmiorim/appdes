import { date, index, int, mysqlTable, time, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/** Catatan kehadiran pegawai desa; pegawaiId merujuk kepegawaian_pegawai. */
export const kehadiranPerangkat = mysqlTable("kehadiran_perangkat", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  perangkatId: int("perangkat_id"),
  pegawaiId: int("pegawai_id"),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  jamMasuk: time("jam_masuk"),
  jamKeluar: time("jam_keluar"),
  status: varchar("status", { length: 20 }).default("hadir"),
  latitudeMasuk: varchar("latitude_masuk", { length: 30 }),
  longitudeMasuk: varchar("longitude_masuk", { length: 30 }),
  fotoMasuk: varchar("foto_masuk", { length: 255 }),
  catatan: varchar("catatan", { length: 500 }),
}, (table) => [
  index("kehadiran_perangkat_village_tanggal_idx").on(table.villageId, table.tanggal),
  index("kehadiran_perangkat_village_status_idx").on(table.villageId, table.status),
]);

export type KehadiranPerangkat = typeof kehadiranPerangkat.$inferSelect;
export type NewKehadiranPerangkat = typeof kehadiranPerangkat.$inferInsert;
