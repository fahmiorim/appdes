import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { letterClassifications } from "./letter-classifications";
import { villages } from "./village";

/**
 * `letter_dinas` — surat dinas internal antar instansi.
 *
 * Berbeda dengan surat layanan warga (`letters`), surat dinas dibuat langsung
 * oleh perangkat desa untuk keperluan resmi instansi (tanpa pemohon warga dan
 * tanpa alur verifikasi berjenjang). Dokumen berkas bisa diarsipkan sebagai
 * lampiran media kategori `umum`.
 *
 * Tanggal disimpan sebagai teks ISO (`YYYY-MM-DD`) mengikuti konvensi buku
 * agenda surat masuk/keluar.
 */
export const letterDinas = mysqlTable(
  "letter_dinas",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    letterNumber: varchar("letter_number", { length: 100 }).notNull(),
    /** Tanggal surat dinas (ISO). */
    letterDate: varchar("letter_date", { length: 10 }).notNull(),

    /** Penerima surat (nama instansi/orang) dan alamatnya. */
    recipient: varchar("recipient", { length: 150 }),
    recipientAddress: varchar("recipient_address", { length: 255 }),

    /** Isi ringkas / perihal surat. */
    subject: varchar("subject", { length: 200 }).notNull(),
    /** Isi surat (opsional; ringkas). */
    content: text("content"),

    classificationId: int("classification_id").references(() => letterClassifications.id, {
      onDelete: "set null",
    }),

    /** Lampiran berkas softcopy (jalur media relatif, kategori umum). */
    archiveFile: varchar("archive_file", { length: 255 }),
    /** Sebutan lokasi arsip fisik (bila ada). */
    archiveLocation: varchar("archive_location", { length: 150 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("letter_dinas_village_date_idx").on(table.villageId, table.letterDate)],
);

export type LetterDinas = typeof letterDinas.$inferSelect;
export type NewLetterDinas = typeof letterDinas.$inferInsert;
