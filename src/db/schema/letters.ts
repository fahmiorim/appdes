import {
  boolean,
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

import { LETTER_STATUSES } from "@/features/surat/domain/surat";

import { users } from "./auth";
import { letterTypes } from "./letter-types";
import { residents } from "./resident";
import { villages } from "./village";

/**
 * `letters` — surat dinas desa (konsep → terbit).
 *
 * Satu baris mewakili satu surat. Saat masih `draft`, `number`/`content`/
 * `issued_at` masih kosong; `issueSuratRecord` mengisinya saat surat
 * diterbitkan. `type_name` disalin (denormalisasi) agar arsip surat tetap utuh
 * meski jenis suratnya kelak diubah atau dihapus.
 */
export const letters = mysqlTable(
  "letters",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    typeId: int("type_id").notNull(),
    residentId: int("resident_id"),

    /** Salinan nama jenis surat saat surat dibuat (denormalisasi arsip). */
    typeName: varchar("type_name", { length: 150 }).notNull(),

    /** Nomor surat final; kosong selama masih konsep. */
    number: varchar("number", { length: 50 }),
    /** Nomor urut per jenis & tahun, dipakai menyusun nomor surat. */
    sequence: int("sequence").notNull().default(0),

    status: mysqlEnum("status", LETTER_STATUSES).notNull().default("draft"),
    letterDate: varchar("letter_date", { length: 10 }).notNull(),
    year: int("year").notNull(),
    purpose: varchar("purpose", { length: 255 }),

    /** Badan surat hasil render template pada saat diterbitkan. */
    content: text("content"),
    /** Salinan isi surat untuk arsip (parity dengan log_surat.isi_surat). */
    isiSurat: text("isi_surat"),
    /** Nilai isian dinamis per jenis surat (JSON map kode isian → nilai). */
    nilaiIsian: text("nilai_isian"),

    /** Verifikasi berjenjang (operator -> sekdes -> kades). */
    verifikasiOperator: boolean("verifikasi_operator"),
    verifikasiSekdes: boolean("verifikasi_sekdes"),
    verifikasiKades: boolean("verifikasi_kades"),
    /** Tahap verifikasi terakhir (operator/sekdes/kades/ditolak). */
    logVerifikasi: varchar("log_verifikasi", { length: 100 }),
    /** Catatan/alasan penolakan dari verifikator. */
    catatanVerifikasi: text("catatan_verifikasi"),
    /** Tanda TTE (BSRE) */
    tte: boolean("tte"),
    /** Jalur relatif berkas PDF hasil tanda tangan elektronik (privat). */
    tteFile: varchar("tte_file", { length: 255 }),
    /** Relasi ke tabel urls untuk QR verifikasi */
    urlsId: int("urls_id"),

    /**
     * Token verifikasi publik.
     *
     * Nilai acak (32 byte hex) dihasilkan saat surat diterbitkan. Halaman
     * publik `/desa/verifikasi-surat/[token]` mencari surat berdasarkan
     * `verification_token_hash`, bukan `id`, sehingga surat tidak dapat
     * ditebak. Token mentah disimpan agar tautan/QR dapat dicetak ulang dari
     * halaman surat; hash dipakai sebagai kunci pencarian.
     */
    verificationToken: varchar("verification_token", { length: 64 }),
    verificationTokenHash: varchar("verification_token_hash", { length: 64 }),

    /** Nama pemohon / informasi pelengkap */
    pemohon: varchar("pemohon", { length: 200 }),

    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    issuedAt: timestamp("issued_at"),
    /** Soft delete untuk arsip verifikasi */
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("letters_village_type_year_idx").on(table.villageId, table.typeId, table.year),
    index("letters_village_status_idx").on(table.villageId, table.status),
    uniqueIndex("letters_village_id_uq").on(table.villageId, table.id),
    foreignKey({
      name: "letters_type_tenant_fk",
      columns: [table.villageId, table.typeId],
      foreignColumns: [letterTypes.villageId, letterTypes.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "letters_resident_tenant_fk",
      columns: [table.villageId, table.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
  ],
);

export type Letter = typeof letters.$inferSelect;
export type NewLetter = typeof letters.$inferInsert;
