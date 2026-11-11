import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

/**
 * `dokumen_warga` — arsip dokumen pribadi warga (KTP, KK, akta, dsb.).
 *
 * Mengikuti perilaku layanan mandiri OpenSID: warga mengunggah sendiri
 * dokumennya, hanya pemilik yang dapat mengunduh, dan hanya baris dengan
 * `sumber = 'warga'` yang boleh diubah/dihapus warga. Baris yang diunggah
 * operator bersifat baca-saja bagi warga.
 *
 * Berkas disimpan di media privat (kategori `permohonan`), tidak pernah
 * disajikan lewat route media publik.
 */
export const dokumenWarga = mysqlTable(
  "dokumen_warga",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    /** Kode jenis dokumen; daftar baku ada di domain `dokumen-warga`. */
    jenis: varchar("jenis", { length: 40 }).notNull(),
    nama: varchar("nama", { length: 200 }).notNull(),
    berkas: text("berkas").notNull(),
    mime: varchar("mime", { length: 100 }).notNull(),
    namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
    /** `warga` (dapat diubah pemilik) atau `operator` (baca-saja). */
    sumber: varchar("sumber", { length: 20 }).notNull().default("warga"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("dokumen_warga_village_resident_idx").on(table.villageId, table.residentId),
    index("dokumen_warga_village_jenis_idx").on(table.villageId, table.jenis),
  ],
);

export type DokumenWarga = typeof dokumenWarga.$inferSelect;
export type NewDokumenWarga = typeof dokumenWarga.$inferInsert;
