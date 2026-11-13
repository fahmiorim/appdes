import {
  date,
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
    rtmId: int("rtm_id").notNull(),

    /**
     * Keluarga (KK) opsional — bila beda dari RTM.
     *
     * FK-nya `RESTRICT` (bukan `SET NULL`) karena composite FK menyertakan
     * `village_id NOT NULL`; pelepasan referensi dilakukan transaksi aplikasi
     * saat keluarga dihapus. Lihat migration `0002_b2_dtks_suplemen_composite_fk`.
     */
    keluargaId: int("keluarga_id"),

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
    uniqueIndex("dtks_village_id_uq").on(t.villageId, t.id),
    index("dtks_village_status_idx").on(t.villageId, t.status),
    index("dtks_village_versi_idx").on(t.villageId, t.versiKuisioner),
    index("dtks_rtm_idx").on(t.rtmId),
    index("dtks_keluarga_idx").on(t.keluargaId),
    index("dtks_village_keluarga_idx").on(t.villageId, t.keluargaId),
    foreignKey({
      name: "dtks_rtm_tenant_fk",
      columns: [t.villageId, t.rtmId],
      foreignColumns: [rumahTangga.villageId, rumahTangga.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "dtks_keluarga_tenant_fk",
      columns: [t.villageId, t.keluargaId],
      foreignColumns: [families.villageId, families.id],
    }).onDelete("restrict"),
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

    dtksId: int("dtks_id").notNull(),

    /** Penduduk yang tercatat sebagai anggota DTKS. */
    pendudukId: int("penduduk_id").notNull(),

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
    index("dtks_anggota_village_dtks_idx").on(t.villageId, t.dtksId),
    index("dtks_anggota_village_penduduk_idx").on(t.villageId, t.pendudukId),
    foreignKey({
      name: "dtks_anggota_dtks_tenant_fk",
      columns: [t.villageId, t.dtksId],
      foreignColumns: [dtks.villageId, dtks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "dtks_anggota_penduduk_tenant_fk",
      columns: [t.villageId, t.pendudukId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
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
  (t) => [
    index("dtks_lampiran_village_idx").on(t.villageId),
    uniqueIndex("dtks_lampiran_village_id_uq").on(t.villageId, t.id),
  ],
);

/**
 * `dtks_ref_lampiran` — Many-to-many antara DTKS dan Lampiran.
 *
 * `village_id` wajib dan harus sama dengan desa DTKS maupun desa lampiran;
 * dijaga composite FK, jadi junction tidak bisa menautkan dokumen lintas desa.
 */
export const dtksRefLampiran = mysqlTable(
  "dtks_ref_lampiran",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    dtksId: int("dtks_id").notNull(),
    lampiranId: int("lampiran_id").notNull(),
  },
  (t) => [
    uniqueIndex("dtks_ref_lampiran_dtks_lampiran_uq").on(t.dtksId, t.lampiranId),
    index("dtks_ref_lampiran_village_dtks_idx").on(t.villageId, t.dtksId),
    index("dtks_ref_lampiran_village_lampiran_idx").on(t.villageId, t.lampiranId),
    foreignKey({
      name: "dtks_ref_lampiran_dtks_tenant_fk",
      columns: [t.villageId, t.dtksId],
      foreignColumns: [dtks.villageId, dtks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "dtks_ref_lampiran_lampiran_tenant_fk",
      columns: [t.villageId, t.lampiranId],
      foreignColumns: [dtksLampiran.villageId, dtksLampiran.id],
    }).onDelete("cascade"),
  ],
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
