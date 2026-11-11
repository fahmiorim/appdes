import { date, index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Buku Sekretariat.
 *
 * Tiga tabel khusus menggantikan katalog generik untuk rekam sekretariat:
 * - `bumindes_peraturan`: Buku Peraturan Desa & Keputusan Kepala Desa (jenis).
 * - `bumindes_aparat`: Buku Data Aparat Pemerintah Desa.
 * - `bumindes_agenda`: Buku Agenda (surat masuk) & Ekspedisi (surat keluar).
 */
export const bumindesPeraturan = mysqlTable(
  "bumindes_peraturan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    jenis: varchar("jenis", { length: 40 }).notNull().default("peraturan_desa"),
    nomor: varchar("nomor", { length: 100 }).notNull(),
    tahun: int("tahun"),
    tentang: varchar("tentang", { length: 500 }).notNull(),
    tanggalDitetapkan: date("tanggal_ditetapkan", { mode: "string" }),
    tanggalDiundangkan: date("tanggal_diundangkan", { mode: "string" }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_peraturan_village_jenis_idx").on(t.villageId, t.jenis)],
);

export const bumindesAparat = mysqlTable(
  "bumindes_aparat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 150 }).notNull(),
    nip: varchar("nip", { length: 30 }),
    jabatan: varchar("jabatan", { length: 150 }).notNull(),
    tempatLahir: varchar("tempat_lahir", { length: 100 }),
    tanggalLahir: date("tanggal_lahir", { mode: "string" }),
    pendidikan: varchar("pendidikan", { length: 100 }),
    nomorSkPengangkatan: varchar("nomor_sk_pengangkatan", { length: 100 }),
    tanggalPengangkatan: date("tanggal_pengangkatan", { mode: "string" }),
    nomorSkPemberhentian: varchar("nomor_sk_pemberhentian", { length: 100 }),
    tanggalPemberhentian: date("tanggal_pemberhentian", { mode: "string" }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_aparat_village_idx").on(t.villageId)],
);

export const bumindesAgenda = mysqlTable(
  "bumindes_agenda",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    jenis: varchar("jenis", { length: 20 }).notNull().default("masuk"),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    nomorSurat: varchar("nomor_surat", { length: 150 }),
    asalTujuan: varchar("asal_tujuan", { length: 255 }),
    perihal: varchar("perihal", { length: 500 }).notNull(),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_agenda_village_jenis_idx").on(t.villageId, t.jenis)],
);

export type BumindesPeraturan = typeof bumindesPeraturan.$inferSelect;
export type BumindesAparat = typeof bumindesAparat.$inferSelect;
export type BumindesAgenda = typeof bumindesAgenda.$inferSelect;
