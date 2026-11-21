import {
  boolean,
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";
import { perangkatDesa } from "./content";

/** Lembaga desa dan BPD; seluruh data dipisahkan per tenant. */
export const lembagaDesa = mysqlTable(
  "lembaga_desa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 150 }).notNull(),
    jenis: varchar("jenis", { length: 50 }).notNull().default("lainnya"),
    deskripsi: text("deskripsi"),
    tugasFungsi: text("tugas_fungsi"),
    dasarHukum: varchar("dasar_hukum", { length: 255 }),
    masaBaktiMulai: date("masa_bakti_mulai", { mode: "string" }),
    masaBaktiSelesai: date("masa_bakti_selesai", { mode: "string" }),
    status: varchar("status", { length: 20 }).notNull().default("aktif"),
    tampilPublik: boolean("tampil_publik").notNull().default(false),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("lembaga_desa_village_status_idx").on(t.villageId, t.status),
    uniqueIndex("lembaga_desa_village_id_uq").on(t.villageId, t.id),
  ],
);

/** Pengurus/anggota lembaga; data sensitif tidak pernah dikirim ke halaman publik. */
export const lembagaAnggota = mysqlTable(
  "lembaga_anggota",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
    lembagaId: int("lembaga_id").notNull(),
    nama: varchar("nama", { length: 150 }).notNull(),
    jabatan: varchar("jabatan", { length: 100 }),
    foto: varchar("foto", { length: 255 }),
    periodeMulai: date("periode_mulai", { mode: "string" }),
    periodeSelesai: date("periode_selesai", { mode: "string" }),
    aktif: boolean("aktif").notNull().default(true),
    tampilPublik: boolean("tampil_publik").notNull().default(false),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("lembaga_anggota_village_lembaga_idx").on(t.villageId, t.lembagaId),
    foreignKey({
      name: "lembaga_anggota_tenant_fk",
      columns: [t.villageId, t.lembagaId],
      foreignColumns: [lembagaDesa.villageId, lembagaDesa.id],
    }).onDelete("cascade"),
  ],
);

/** Riwayat jabatan perangkat untuk rekam jejak dan masa jabatan. */
export const perangkatRiwayatJabatan = mysqlTable(
  "perangkat_riwayat_jabatan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
    perangkatId: int("perangkat_id").notNull(),
    jabatan: varchar("jabatan", { length: 150 }).notNull(),
    nomorSk: varchar("nomor_sk", { length: 100 }),
    mulai: date("mulai", { mode: "string" }),
    selesai: date("selesai", { mode: "string" }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("perangkat_riwayat_village_perangkat_idx").on(t.villageId, t.perangkatId),
    foreignKey({
      name: "perangkat_riwayat_tenant_fk",
      columns: [t.villageId, t.perangkatId],
      foreignColumns: [perangkatDesa.villageId, perangkatDesa.id],
    }).onDelete("cascade"),
  ],
);

/** Dokumen perangkat/lembaga. Berkas privat kecuali explicitly dipublikasikan. */
export const pemerintahanDokumen = mysqlTable(
  "pemerintahan_dokumen",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
    perangkatId: int("perangkat_id"),
    lembagaId: int("lembaga_id"),
    judul: varchar("judul", { length: 180 }).notNull(),
    nomor: varchar("nomor", { length: 100 }),
    tanggal: date("tanggal", { mode: "string" }),
    berkas: varchar("berkas", { length: 255 }).notNull(),
    tampilPublik: boolean("tampil_publik").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pemerintahan_dokumen_village_idx").on(t.villageId),
    foreignKey({
      name: "pemerintahan_dokumen_perangkat_tenant_fk",
      columns: [t.villageId, t.perangkatId],
      foreignColumns: [perangkatDesa.villageId, perangkatDesa.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pemerintahan_dokumen_lembaga_tenant_fk",
      columns: [t.villageId, t.lembagaId],
      foreignColumns: [lembagaDesa.villageId, lembagaDesa.id],
    }).onDelete("cascade"),
  ],
);
