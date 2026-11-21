import {
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

/** Profil pegawai; perangkatId menghubungkan aparatur ke data Pemerintahan Desa. */
export const kepegawaianPegawai = mysqlTable(
  "kepegawaian_pegawai",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    perangkatId: int("perangkat_id"),
    nama: varchar("nama", { length: 150 }).notNull(),
    nip: varchar("nip", { length: 30 }),
    nik: varchar("nik", { length: 16 }),
    jabatan: varchar("jabatan", { length: 150 }),
    jenisKelamin: varchar("jenis_kelamin", { length: 10 }),
    tempatLahir: varchar("tempat_lahir", { length: 100 }),
    tanggalLahir: date("tanggal_lahir", { mode: "string" }),
    alamat: varchar("alamat", { length: 500 }),
    telepon: varchar("telepon", { length: 30 }),
    email: varchar("email", { length: 150 }),
    pendidikan: varchar("pendidikan", { length: 100 }),
    statusPegawai: varchar("status_pegawai", { length: 20 }).notNull().default("tetap"),
    status: varchar("status", { length: 20 }).notNull().default("aktif"),
    tanggalMasuk: date("tanggal_masuk", { mode: "string" }),
    tanggalKeluar: date("tanggal_keluar", { mode: "string" }),
    foto: varchar("foto", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("kepegawaian_pegawai_village_id_uq").on(table.villageId, table.id),
    uniqueIndex("kepegawaian_pegawai_village_perangkat_uq").on(table.villageId, table.perangkatId),
    index("kepegawaian_pegawai_village_status_idx").on(table.villageId, table.status),
    index("kepegawaian_pegawai_village_jabatan_idx").on(table.villageId, table.jabatan),
  ],
);

/** Riwayat perubahan jabatan/penempatan pegawai. */
export const kepegawaianRiwayat = mysqlTable(
  "kepegawaian_riwayat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pegawaiId: int("pegawai_id").notNull(),
    jabatan: varchar("jabatan", { length: 150 }).notNull(),
    unitKerja: varchar("unit_kerja", { length: 150 }),
    nomorSk: varchar("nomor_sk", { length: 100 }),
    mulai: date("mulai", { mode: "string" }).notNull(),
    selesai: date("selesai", { mode: "string" }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("kepegawaian_riwayat_village_pegawai_idx").on(table.villageId, table.pegawaiId),
    foreignKey({
      name: "kepegawaian_riwayat_pegawai_tenant_fk",
      columns: [table.villageId, table.pegawaiId],
      foreignColumns: [kepegawaianPegawai.villageId, kepegawaianPegawai.id],
    }).onDelete("cascade"),
  ],
);

/** Arsip SK, kontrak, ijazah, dan dokumen kepegawaian lainnya. */
export const kepegawaianDokumen = mysqlTable(
  "kepegawaian_dokumen",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pegawaiId: int("pegawai_id").notNull(),
    judul: varchar("judul", { length: 180 }).notNull(),
    kategori: varchar("kategori", { length: 50 }).notNull().default("lainnya"),
    nomor: varchar("nomor", { length: 100 }),
    tanggal: date("tanggal", { mode: "string" }),
    berkas: varchar("berkas", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("kepegawaian_dokumen_village_pegawai_idx").on(table.villageId, table.pegawaiId),
    foreignKey({
      name: "kepegawaian_dokumen_pegawai_tenant_fk",
      columns: [table.villageId, table.pegawaiId],
      foreignColumns: [kepegawaianPegawai.villageId, kepegawaianPegawai.id],
    }).onDelete("cascade"),
  ],
);

/** Pengajuan cuti dan izin pegawai desa. */
export const cutiPegawai = mysqlTable(
  "cuti_pegawai",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pegawaiId: int("pegawai_id").notNull(),
    jenis: varchar("jenis", { length: 30 }).notNull().default("cuti_tahunan"),
    mulai: date("mulai", { mode: "string" }).notNull(),
    selesai: date("selesai", { mode: "string" }).notNull(),
    durasi: int("durasi").notNull(),
    alasan: text("alasan").notNull(),
    lampiran: varchar("lampiran", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("menunggu"),
    catatan: text("catatan"),
    diputuskanOleh: varchar("diputuskan_oleh", { length: 36 }),
    diputuskanAt: timestamp("diputuskan_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("cuti_pegawai_village_status_idx").on(table.villageId, table.status),
    index("cuti_pegawai_village_pegawai_idx").on(table.villageId, table.pegawaiId),
    index("cuti_pegawai_village_dates_idx").on(table.villageId, table.mulai, table.selesai),
    foreignKey({
      name: "cuti_pegawai_pegawai_tenant_fk",
      columns: [table.villageId, table.pegawaiId],
      foreignColumns: [kepegawaianPegawai.villageId, kepegawaianPegawai.id],
    }).onDelete("cascade"),
  ],
);

/** Kuota cuti tahunan per pegawai dan tahun kalender. */
export const cutiKuota = mysqlTable(
  "cuti_kuota",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pegawaiId: int("pegawai_id").notNull(),
    tahun: int("tahun").notNull(),
    total: int("total").notNull().default(12),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("cuti_kuota_village_pegawai_tahun_uq").on(
      table.villageId,
      table.pegawaiId,
      table.tahun,
    ),
    foreignKey({
      name: "cuti_kuota_pegawai_tenant_fk",
      columns: [table.villageId, table.pegawaiId],
      foreignColumns: [kepegawaianPegawai.villageId, kepegawaianPegawai.id],
    }).onDelete("cascade"),
  ],
);

export type Pegawai = typeof kepegawaianPegawai.$inferSelect;
export type NewPegawai = typeof kepegawaianPegawai.$inferInsert;
export type CutiPegawai = typeof cutiPegawai.$inferSelect;
