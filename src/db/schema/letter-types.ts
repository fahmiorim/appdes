import {
  boolean,
  int,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { letterClassifications } from "./letter-classifications";
import { villages } from "./village";

/**
 * `letter_types` — jenis/format surat (mis. Surat Keterangan Domisili,
 * Surat Undangan Rapat). Menyimpan templat badan surat, format penomoran,
 * dan masa berlaku hasil surat.
 *
 * Kode unik per desa.
 */
export const letterTypes = mysqlTable(
  "letter_types",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    classificationId: int("classification_id").references(() => letterClassifications.id, {
      onDelete: "set null",
    }),

    /** Badan surat bertemplat, memakai placeholder `[nama_desa]`, dst. */
    templateBody: text("template_body").notNull(),
    /** Badan surat alternatif untuk varian kedua (opsional). */
    templateBodyAlt: text("template_body_alt"),
    /** Form isian dinamis per kategori (JSON) */
    formIsian: text("form_isian"),
    /** Kode isian kustom (JSON) */
    kodeIsian: text("kode_isian"),
    /** Daftar id syarat surat (JSON array), parity `syarat_surat`. */
    syaratSurat: text("syarat_surat"),
    requiresResident: boolean("requires_resident").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),

    /** Pola penomoran, mis. `[kode_surat]/[nomor]/[kode_desa]/[tahun]`. */
    numberFormat: varchar("number_format", { length: 100 })
      .notNull()
      .default("[kode_surat]/[nomor]/[kode_desa]/[tahun]"),
    /** Pakai format penomoran global (1) atau per jenis (0) */
    formatNomorGlobal: tinyint("format_nomor_global").default(1),
    /** Masa berlaku surat (bulan); 0 = tidak kedaluwarsa. */
    validityMonths: int("validity_months").notNull().default(1),
    /** Satuan masa berlaku (d/w/M/y) */
    satuanMasaBerlaku: varchar("satuan_masa_berlaku", { length: 15 }).default("M"),
    sortOrder: int("sort_order").notNull().default(0),

    /** Pengaturan rendering/TTE/QR */
    qrCode: boolean("qr_code"),
    qrCodeTte: boolean("qr_code_tte"),
    logoGaruda: boolean("logo_garuda"),
    kecamatan: boolean("kecamatan"),
    orientasi: varchar("orientasi", { length: 10 }),
    ukuran: varchar("ukuran", { length: 10 }),
    margin: text("margin"),
    header: int("header").default(1),
    footer: int("footer").default(1),
    sumberPendudukBerulang: boolean("sumber_penduduk_berulang"),

    /** Varian template & konfigurasi layout */
    templateVariant: varchar("template_variant", { length: 50 }),
    layoutConfig: text("layout_config"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("letter_types_village_code_unique").on(table.villageId, table.code),
    uniqueIndex("letter_types_village_id_uq").on(table.villageId, table.id),
  ],
);

export type LetterType = typeof letterTypes.$inferSelect;
export type NewLetterType = typeof letterTypes.$inferInsert;
