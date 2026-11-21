import {
  boolean,
  date,
  decimal,
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
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

export const INVENTARIS_KONDISI = [
  "baik",
  "rusak_ringan",
  "rusak_berat",
  "dalam_perbaikan",
] as const;
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
  (table) => [
    uniqueIndex("inventaris_kategori_village_id_uq").on(table.villageId, table.id),
    index("inv_kat_village_kode").on(table.villageId, table.kode),
  ],
);

export const inventaris = mysqlTable(
  "inventaris",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kategoriId: int("kategori_id"),
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
    akumulasiPenyusutan: decimal("akumulasi_penyusutan", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    umurManfaatBulan: int("umur_manfaat_bulan"),
    nilaiResidu: decimal("nilai_residu", { precision: 15, scale: 2 }).notNull().default("0"),
    tanggalMulaiPenyusutan: date("tanggal_mulai_penyusutan", { mode: "string" }),
    tahunPembelian: int("tahun_pembelian"),
    tanggalPembelian: date("tanggal_pembelian", { mode: "string" }),
    asal: mysqlEnum("asal", INVENTARIS_ASAL),
    donatur: varchar("donatur", { length: 150 }),
    kondisi: mysqlEnum("kondisi", INVENTARIS_KONDISI).notNull().default("baik"),
    lokasi: varchar("lokasi", { length: 150 }),
    keterangan: text("keterangan"),
    penanggungJawab: varchar("penanggung_jawab", { length: 150 }),
    jabatanPenanggungJawab: varchar("jabatan_penanggung_jawab", { length: 100 }),
    teleponPenanggungJawab: varchar("telepon_penanggung_jawab", { length: 30 }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("inventaris_village_id_uq").on(table.villageId, table.id),
    index("inv_village_kategori").on(table.villageId, table.kategoriId),
    foreignKey({
      name: "inventaris_kategori_tenant_fk",
      columns: [table.villageId, table.kategoriId],
      foreignColumns: [inventarisKategori.villageId, inventarisKategori.id],
    }).onDelete("restrict"),
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
    /**
     * Barang yang dimutasi. FK-nya composite bersama `village_id` (lihat
     * `inventaris_mutasi_inventaris_tenant_fk`), sehingga mutasi tidak dapat
     * menunjuk inventaris desa lain.
     */
    inventarisId: int("inventaris_id").notNull(),
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
    foreignKey({
      name: "inventaris_mutasi_inventaris_tenant_fk",
      columns: [table.villageId, table.inventarisId],
      foreignColumns: [inventaris.villageId, inventaris.id],
    }).onDelete("cascade"),
  ],
);

export type InventarisKategori = typeof inventarisKategori.$inferSelect;
export type NewInventarisKategori = typeof inventarisKategori.$inferInsert;
export type Inventaris = typeof inventaris.$inferSelect;
export type NewInventaris = typeof inventaris.$inferInsert;
export type InventarisMutasi = typeof inventarisMutasi.$inferSelect;
export type NewInventarisMutasi = typeof inventarisMutasi.$inferInsert;

export const INVENTARIS_PEMELIHARAAN_STATUS = [
  "terjadwal",
  "dalam_proses",
  "selesai",
  "dibatalkan",
] as const;
export type InventarisPemeliharaanStatus = (typeof INVENTARIS_PEMELIHARAAN_STATUS)[number];

export const inventarisPemeliharaan = mysqlTable(
  "inventaris_pemeliharaan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    inventarisId: int("inventaris_id").notNull(),
    jenis: varchar("jenis", { length: 100 }).notNull(),
    tanggalRencana: date("tanggal_rencana", { mode: "string" }).notNull(),
    tanggalSelesai: date("tanggal_selesai", { mode: "string" }),
    status: mysqlEnum("status", INVENTARIS_PEMELIHARAAN_STATUS).notNull().default("terjadwal"),
    kondisiSetelah: mysqlEnum("kondisi_setelah", INVENTARIS_KONDISI),
    biaya: decimal("biaya", { precision: 15, scale: 2 }).notNull().default("0"),
    pelaksana: varchar("pelaksana", { length: 150 }),
    deskripsi: text("deskripsi"),
    hasil: text("hasil"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("inventaris_pemeliharaan_village_id_uq").on(table.villageId, table.id),
    index("inv_pem_village_date").on(table.villageId, table.tanggalRencana),
    index("inv_pem_village_status").on(table.villageId, table.status),
    foreignKey({
      name: "inventaris_pemeliharaan_asset_tenant_fk",
      columns: [table.villageId, table.inventarisId],
      foreignColumns: [inventaris.villageId, inventaris.id],
    }).onDelete("cascade"),
  ],
);
export type InventarisPemeliharaan = typeof inventarisPemeliharaan.$inferSelect;

export const inventarisDokumen = mysqlTable(
  "inventaris_dokumen",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    inventarisId: int("inventaris_id").notNull(),
    nama: varchar("nama", { length: 200 }).notNull(),
    namaFile: varchar("nama_file", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 100 }).notNull(),
    ukuran: int("ukuran").notNull(),
    jalurMedia: varchar("jalur_media", { length: 500 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inv_doc_village_asset").on(table.villageId, table.inventarisId),
    foreignKey({
      name: "inventaris_dokumen_asset_tenant_fk",
      columns: [table.villageId, table.inventarisId],
      foreignColumns: [inventaris.villageId, inventaris.id],
    }).onDelete("cascade"),
  ],
);

export const inventarisPenanggungJawabRiwayat = mysqlTable(
  "inventaris_penanggung_jawab_riwayat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    inventarisId: int("inventaris_id").notNull(),
    namaSebelum: varchar("nama_sebelum", { length: 150 }),
    jabatanSebelum: varchar("jabatan_sebelum", { length: 100 }),
    teleponSebelum: varchar("telepon_sebelum", { length: 30 }),
    namaSesudah: varchar("nama_sesudah", { length: 150 }),
    jabatanSesudah: varchar("jabatan_sesudah", { length: 100 }),
    teleponSesudah: varchar("telepon_sesudah", { length: 30 }),
    diubahOleh: varchar("diubah_oleh", { length: 150 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inv_pj_village_asset_date").on(table.villageId, table.inventarisId, table.createdAt),
    foreignKey({
      name: "inventaris_pj_history_asset_tenant_fk",
      columns: [table.villageId, table.inventarisId],
      foreignColumns: [inventaris.villageId, inventaris.id],
    }).onDelete("cascade"),
  ],
);
export type InventarisPenanggungJawabRiwayat = typeof inventarisPenanggungJawabRiwayat.$inferSelect;

export const INVENTARIS_PEMELIHARAAN_AKSI = ["dibuat", "diperbarui", "dihapus"] as const;
export const inventarisPemeliharaanRiwayat = mysqlTable(
  "inventaris_pemeliharaan_riwayat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pemeliharaanId: int("pemeliharaan_id").notNull(),
    inventarisId: int("inventaris_id").notNull(),
    aksi: mysqlEnum("aksi", INVENTARIS_PEMELIHARAAN_AKSI).notNull(),
    statusSebelum: mysqlEnum("status_sebelum", INVENTARIS_PEMELIHARAAN_STATUS),
    statusSesudah: mysqlEnum("status_sesudah", INVENTARIS_PEMELIHARAAN_STATUS),
    ringkasan: text("ringkasan"),
    dilakukanOleh: varchar("dilakukan_oleh", { length: 150 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inv_pem_hist_village_date").on(table.villageId, table.createdAt),
    index("inv_pem_hist_village_asset").on(table.villageId, table.inventarisId),
    foreignKey({
      name: "inventaris_pemeliharaan_history_schedule_tenant_fk",
      columns: [table.villageId, table.pemeliharaanId],
      foreignColumns: [inventarisPemeliharaan.villageId, inventarisPemeliharaan.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "inventaris_pemeliharaan_history_asset_tenant_fk",
      columns: [table.villageId, table.inventarisId],
      foreignColumns: [inventaris.villageId, inventaris.id],
    }).onDelete("cascade"),
  ],
);
