import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { letterTypes } from "./letter-types";
import { letters } from "./letters";
import { residents } from "./resident";
import { villages } from "./village";

/**
 * `permohonan_surat` — permohonan surat yang diajukan warga.
 *
 * Status mengikuti alur OpenSID: 0 belum lengkap, 1 sedang diperiksa,
 * 2 menunggu tanda tangan, 3 siap diambil, 4 sudah diambil, 5 dibatalkan.
 * Lihat `PERMOHONAN_STATUS` di domain layanan mandiri.
 */
export const permohonanSurat = mysqlTable(
  "permohonan_surat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    letterTypeId: int("letter_type_id")
      .notNull()
      .references(() => letterTypes.id, { onDelete: "cascade" }),

    /** Surat dinas yang dibuat dari permohonan ini (bila sudah diproses). */
    letterId: int("letter_id").references(() => letters.id, { onDelete: "set null" }),

    /** Nomor antrian yang diberikan saat permohonan dikirim. */
    noAntrian: varchar("no_antrian", { length: 30 }),
    status: int("status").notNull().default(1),

    /** Isian formulir dinamis (JSON) dan syarat yang dicentang (JSON). */
    isianForm: text("isian_form"),
    syarat: text("syarat"),

    noHpAktif: varchar("no_hp_aktif", { length: 30 }),
    keterangan: text("keterangan"),
    /** Alasan pengembalian/penolakan oleh operator. */
    alasan: text("alasan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("permohonan_surat_village_status_idx").on(table.villageId, table.status),
    index("permohonan_surat_village_created_idx").on(table.villageId, table.createdAt),
    index("permohonan_surat_letter_idx").on(table.letterId),
  ],
);

export type PermohonanSurat = typeof permohonanSurat.$inferSelect;
export type NewPermohonanSurat = typeof permohonanSurat.$inferInsert;
