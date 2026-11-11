import { date, int, mysqlTable, time, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const kehadiranPerangkat = mysqlTable("kehadiran_perangkat", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  perangkatId: int("perangkat_id"),
  tanggal: date("tanggal").notNull(),
  jamMasuk: time("jam_masuk"),
  jamKeluar: time("jam_keluar"),
  status: varchar("status", { length: 20 }).default("hadir"),
});

export type KehadiranPerangkat = typeof kehadiranPerangkat.$inferSelect;
export type NewKehadiranPerangkat = typeof kehadiranPerangkat.$inferInsert;
