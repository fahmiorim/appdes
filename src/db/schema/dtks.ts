import {
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { families } from "./family";
import { residents } from "./resident";
import { rumahTangga } from "./rumah-tangga";
import { villages } from "./village";

/**
 * `dtks` — Data Terpadu Kesejahteraan Sosial (DTKS / Satu Data).
 *
 * Satu baris = satu formulir DTKS untuk satu Rumah Tangga (RTM).
 * Dapat terikat opsional ke Keluarga (KK) jika beda dari RTM.
 */
export const DTKS_VERSI = ["regsos_ek2022_k"] as const;
export type DtksVersi = (typeof DTKS_VERSI)[number];

export const DTKS_VERSI_LABELS: Record<DtksVersi, string> = {
  regsos_ek2022_k: "REGSOS EK 2022 K",
};

export const DTKS_STATUS = ["draf", "terverifikasi"] as const;
export type DtksStatus = (typeof DTKS_STATUS)[number];

export const DTKS_STATUS_LABELS: Record<DtksStatus, string> = {
  draf: "Draf",
  terverifikasi: "Terverifikasi",
};

export const dtks = mysqlTable(
  "dtks",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** RTM yang jadi subjek DTKS (wajib). */
    rtmId: int("rtm_id")
      .notNull()
      .references(() => rumahTangga.id, { onDelete: "restrict" }),

    /** Keluarga (KK) opsional — bila beda dari RTM. */
    keluargaId: int("keluarga_id").references(() => families.id, {
      onDelete: "set null",
    }),

    /** Versi kuisioner. */
    versiKuisioner: mysqlEnum("versi_kuisioner", DTKS_VERSI).notNull().default("regsos_ek2022_k"),

    /** Status formulir. */
    status: mysqlEnum("status", DTKS_STATUS).notNull().default("draf"),

    /** Tanggal pencacahan (pengisian formulir). */
    tanggalPencacahan: date("tanggal_pencacahan", { mode: "string" }),

    /** Tanggal pemeriksaan/verifikasi. */
    tanggalPemeriksaan: date("tanggal_pemeriksaan", { mode: "string" }),

    /** Nama petugas pencacahan. */
    namaPetugasPencacahan: varchar("nama_petugas_pencacahan", { length: 100 }),

    /** Nama responden. */
    namaResponden: varchar("nama_responden", { length: 100 }),

    /** Keterangan tambahan. */
    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("dtks_village_rtm_versi_uq").on(t.villageId, t.rtmId, t.versiKuisioner),
    index("dtks_village_status_idx").on(t.villageId, t.status),
    index("dtks_village_versi_idx").on(t.villageId, t.versiKuisioner),
    index("dtks_rtm_idx").on(t.rtmId),
    index("dtks_keluarga_idx").on(t.keluargaId),
  ],
);

/**
 * `dtks_anggota` — Anggota DTKS (tiap baris = satu penduduk yang tercatat di formulir DTKS).
 */
export const dtksAnggota = mysqlTable(
  "dtks_anggota",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    dtksId: int("dtks_id")
      .notNull()
      .references(() => dtks.id, { onDelete: "cascade" }),

    /** Penduduk yang tercatat sebagai anggota DTKS. */
    pendudukId: int("penduduk_id")
      .notNull()
      .references(() => residents.id, { onDelete: "restrict" }),

    /** Hubungan dengan kepala RTM (mis. kepala, istri, anak, dll). */
    hubunganId: int("hubungan_id"),

    /** Status keanggotaan. */
    statusAnggota: varchar("status_anggota", { length: 30 }).default("aktif"),

    /** Keterangan tambahan. */
    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("dtks_anggota_dtks_penduduk_uq").on(t.dtksId, t.pendudukId),
    index("dtks_anggota_village_idx").on(t.villageId),
    index("dtks_anggota_dtks_idx").on(t.dtksId),
    index("dtks_anggota_penduduk_idx").on(t.pendudukId),
  ],
);

/**
 * `dtks_lampiran` — Lampiran/bukti pendukung DTKS (foto KK, KTP, dll).
 */
export const dtksLampiran = mysqlTable(
  "dtks_lampiran",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Judul/nama lampiran. */
    nama: varchar("nama", { length: 200 }).notNull(),

    /** Jalur file relatif media (kategori `dtks`). */
    berkas: varchar("berkas", { length: 255 }).notNull(),

    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("dtks_lampiran_village_idx").on(t.villageId)],
);

/**
 * `dtks_ref_lampiran` — Many-to-many antara DTKS dan Lampiran.
 */
export const dtksRefLampiran = mysqlTable(
  "dtks_ref_lampiran",
  {
    id: int("id").autoincrement().primaryKey(),
    dtksId: int("dtks_id")
      .notNull()
      .references(() => dtks.id, { onDelete: "cascade" }),
    lampiranId: int("lampiran_id")
      .notNull()
      .references(() => dtksLampiran.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("dtks_ref_lampiran_dtks_lampiran_uq").on(t.dtksId, t.lampiranId)],
);

/**
 * `dtks_pengaturan_program` — Pengaturan program bansos yang terikat DTKS.
 */
export const dtksPengaturanProgram = mysqlTable(
  "dtks_pengaturan_program",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Kode program (mis. PKH, BPNT, BST, dll). */
    kodeProgram: varchar("kode_program", { length: 50 }).notNull(),
    namaProgram: varchar("nama_program", { length: 200 }).notNull(),

    /** Aktif/tidak. */
    aktif: int("aktif").notNull().default(1),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("dtks_pengaturan_program_village_kode_uq").on(t.villageId, t.kodeProgram)],
);

export type Dtks = typeof dtks.$inferSelect;
export type NewDtks = typeof dtks.$inferInsert;
export type DtksAnggota = typeof dtksAnggota.$inferSelect;
export type NewDtksAnggota = typeof dtksAnggota.$inferInsert;
export type DtksLampiran = typeof dtksLampiran.$inferSelect;
export type NewDtksLampiran = typeof dtksLampiran.$inferInsert;
export type DtksPengaturanProgram = typeof dtksPengaturanProgram.$inferSelect;
export type NewDtksPengaturanProgram = typeof dtksPengaturanProgram.$inferInsert;
