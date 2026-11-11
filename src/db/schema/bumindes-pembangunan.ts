import {
  date,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Buku Pembangunan.
 *
 * `bumindes_pembangunan` mencatat rencana, kegiatan, dan hasil pembangunan desa
 * per tahun; `bumindes_kader` mencatat kader pemberdayaan/pembangunan desa.
 * Dipisah dari modul `features/pembangunan` (proyek publik) karena ini adalah
 * buku administrasi resmi milik bumindes.
 */
export const bumindesPembangunan = mysqlTable(
  "bumindes_pembangunan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    tahun: int("tahun").notNull(),
    namaKegiatan: varchar("nama_kegiatan", { length: 255 }).notNull(),
    lokasi: varchar("lokasi", { length: 255 }),
    volume: varchar("volume", { length: 100 }),
    sumberDana: varchar("sumber_dana", { length: 150 }),
    biaya: decimal("biaya", { precision: 19, scale: 2 }).notNull().default("0.00"),
    pelaksana: varchar("pelaksana", { length: 150 }),
    status: varchar("status", { length: 20 }).notNull().default("rencana"),
    tanggalMulai: date("tanggal_mulai", { mode: "string" }),
    tanggalSelesai: date("tanggal_selesai", { mode: "string" }),
    hasil: text("hasil"),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_pembangunan_village_tahun_idx").on(t.villageId, t.tahun)],
);

export const bumindesKader = mysqlTable(
  "bumindes_kader",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 150 }).notNull(),
    jabatan: varchar("jabatan", { length: 150 }),
    bidang: varchar("bidang", { length: 150 }),
    alamat: varchar("alamat", { length: 255 }),
    noHp: varchar("no_hp", { length: 30 }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_kader_village_idx").on(t.villageId)],
);

export type BumindesPembangunan = typeof bumindesPembangunan.$inferSelect;
export type BumindesKader = typeof bumindesKader.$inferSelect;
