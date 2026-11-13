import {
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

/** Jenis pengajuan ketidakhadiran warga/perangkat. */
export const JENIS_IZIN = ["izin", "sakit", "cuti"] as const;
export type JenisIzin = (typeof JENIS_IZIN)[number];

export const STATUS_IZIN = ["menunggu", "disetujui", "ditolak"] as const;
export type StatusIzin = (typeof STATUS_IZIN)[number];

/**
 * `kehadiran_izin` — pengajuan izin/sakit/cuti dari area warga.
 *
 * Diputuskan operator pada modul kehadiran. Rekap bulanan dihitung dari
 * `tanggal_mulai`..`tanggal_selesai` dan status `disetujui`.
 */
export const kehadiranIzin = mysqlTable(
  "kehadiran_izin",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id").notNull(),
    jenis: varchar("jenis", { length: 20 }).notNull().default("izin"),
    tanggalMulai: date("tanggal_mulai", { mode: "string" }).notNull(),
    tanggalSelesai: date("tanggal_selesai", { mode: "string" }).notNull(),
    alasan: text("alasan").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("menunggu"),
    catatanOperator: text("catatan_operator"),
    diputuskanOleh: varchar("diputuskan_oleh", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("kehadiran_izin_village_status_idx").on(table.villageId, table.status),
    index("kehadiran_izin_village_resident_idx").on(table.villageId, table.residentId),
    foreignKey({
      name: "kehadiran_izin_resident_tenant_fk",
      columns: [table.villageId, table.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("cascade"),
  ],
);

/** Pengaturan jam kerja & hari libur per desa. */
export const kehadiranPengaturan = mysqlTable(
  "kehadiran_pengaturan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    jamMasuk: varchar("jam_masuk", { length: 5 }).notNull().default("08:00"),
    jamKeluar: varchar("jam_keluar", { length: 5 }).notNull().default("16:00"),
    /** JSON array angka hari libur (0=Minggu … 6=Sabtu). */
    hariLibur: text("hari_libur").notNull(),
    diperbaruiOleh: varchar("diperbarui_oleh", { length: 36 }),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("kehadiran_pengaturan_village_idx").on(table.villageId)],
);

export type KehadiranIzin = typeof kehadiranIzin.$inferSelect;
export type NewKehadiranIzin = typeof kehadiranIzin.$inferInsert;
export type KehadiranPengaturan = typeof kehadiranPengaturan.$inferSelect;
