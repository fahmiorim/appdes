import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const INVENTARIS_KATEGORI = [
  "tanah",
  "gedung_bangunan",
  "jalan_irigasi_jaringan",
  "peralatan_mesin",
  "aset_lainnya",
  "konstruksi_dalam_pengerjaan",
] as const;

export const INVENTARIS_ASAL = [
  "pembelian",
  "hibah",
  "bantuan_pemerintah",
  "sumbangan",
  "lainnya",
] as const;
export type InventarisAsal = (typeof INVENTARIS_ASAL)[number];

export const INVENTARIS_KONDISI = ["baik", "rusak_ringan", "rusak_berat"] as const;
export type InventarisKondisi = (typeof INVENTARIS_KONDISI)[number];

export const MUTASI_JENIS = ["pindah", "rusak", "hapus", "perbaikan"] as const;
export type MutasiJenis = (typeof MUTASI_JENIS)[number];

export const MUTASI_STATUS = ["diajukan", "disetujui", "ditolak"] as const;
export type MutasiStatus = (typeof MUTASI_STATUS)[number];

export const inventarisKategori = mysqlTable(
  "inventaris_kategori",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kode: varchar("kode", { length: 20 }).notNull(),
    nama: varchar("nama", { length: 150 }).notNull(),
    golongan: mysqlEnum("golongan", INVENTARIS_KATEGORI).notNull(),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("inv_kat_village_kode").on(table.villageId, table.kode)],
);

export const inventaris = mysqlTable(
  "inventaris",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kategoriId: int("kategori_id").references(() => inventarisKategori.id, {
      onDelete: "set null",
    }),
    nomorInventaris: varchar("nomor_inventaris", { length: 50 }),
    namaBarang: varchar("nama_barang", { length: 200 }).notNull(),
    kodeBarang: varchar("kode_barang", { length: 50 }),
    merk: varchar("merk", { length: 100 }),
    tipe: varchar("tipe", { length: 100 }),
    spesifikasi: text("spesifikasi"),
    jumlah: decimal("jumlah", { precision: 12, scale: 2 }).notNull().default("1"),
    satuan: varchar("satuan", { length: 20 }).default("buah"),
    hargaSatuan: decimal("harga_satuan", { precision: 15, scale: 2 }),
    nilaiAkhir: decimal("nilai_akhir", { precision: 15, scale: 2 }),
    tahunPembelian: int("tahun_pembelian"),
    tanggalPembelian: date("tanggal_pembelian", { mode: "string" }),
    asal: mysqlEnum("asal", INVENTARIS_ASAL),
    donatur: varchar("donatur", { length: 150 }),
    kondisi: mysqlEnum("kondisi", INVENTARIS_KONDISI).notNull().default("baik"),
    lokasi: varchar("lokasi", { length: 150 }),
    keterangan: text("keterangan"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("inv_village_kategori").on(table.villageId, table.kategoriId),
    index("inv_village_no").on(table.villageId, table.nomorInventaris),
  ],
);

export const inventarisMutasi = mysqlTable(
  "inventaris_mutasi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    inventarisId: int("inventaris_id")
      .notNull()
      .references(() => inventaris.id, { onDelete: "cascade" }),
    jenis: mysqlEnum("jenis", MUTASI_JENIS).notNull(),
    status: mysqlEnum("status", MUTASI_STATUS).notNull().default("diajukan"),
    tanggalMutasi: date("tanggal_mutasi", { mode: "string" }).notNull(),
    lokasiBaru: varchar("lokasi_baru", { length: 150 }),
    kondisiBaru: mysqlEnum("kondisi_baru", INVENTARIS_KONDISI),
    jumlahMutasi: decimal("jumlah_mutasi", { precision: 12, scale: 2 }).default("1"),
    alasan: text("alasan"),
    keterangan: text("keterangan"),
    diajukanOleh: varchar("diajukan_oleh", { length: 150 }),
    diajukanOlehId: varchar("diajukan_oleh_id", { length: 50 }),
    verifikasiOleh: varchar("verifikasi_oleh", { length: 150 }),
    verifikasiSekdes: varchar("verifikasi_sekdes", { length: 150 }),
    verifikasiKades: varchar("verifikasi_kades", { length: 150 }),
    logVerifikasi: text("log_verifikasi"),
    catatanVerifikasi: text("catatan_verifikasi"),
    disetujuiOleh: varchar("disetujui_oleh", { length: 150 }),
    tanggalPersetujuan: timestamp("tanggal_persetujuan"),
    catatanPenolakan: text("catatan_penolakan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("inv_mut_village_inv").on(table.villageId, table.inventarisId),
    index("inv_mut_village_status").on(table.villageId, table.status),
  ],
);

export type InventarisKategori = typeof inventarisKategori.$inferSelect;
export type NewInventarisKategori = typeof inventarisKategori.$inferInsert;
export type Inventaris = typeof inventaris.$inferSelect;
export type NewInventaris = typeof inventaris.$inferInsert;
export type InventarisMutasi = typeof inventarisMutasi.$inferSelect;
export type NewInventarisMutasi = typeof inventarisMutasi.$inferInsert;
