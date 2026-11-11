import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

/**
 * `pengaduan` — pengaduan/saran warga.
 *
 * Warga dapat mengirim pengaduan tanpa akun dari halaman publik, atau dari
 * layanan mandiri bila sudah masuk. Kolom pelapor (`nama_pelapor`, `nik`,
 * `telepon`, `email`) adalah **salinan isian saat kirim**, bukan relasi ke
 * `residents`, agar pengaduan tetap utuh walau data penduduk berubah dan agar
 * warga luar desa pun bisa menyampaikan aspirasi.
 *
 * `nomor_tiket` unik per desa dan dipakai sebagai kunci lacak status.
 * `publik` menandai pengaduan yang boleh tampil di halaman publik; isian
 * pelapor tetap disamarkan pada tampilan publik (lihat domain pengaduan).
 */
export const pengaduan = mysqlTable(
  "pengaduan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Nomor tiket, mis. `PGD-20261024-0001`. */
    nomorTiket: varchar("nomor_tiket", { length: 40 }).notNull(),

    /** Kategori pengaduan; lihat `KATEGORI_PENGADUAN` pada domain. */
    kategori: varchar("kategori", { length: 30 }).notNull().default("umum"),

    judul: varchar("judul", { length: 200 }).notNull(),
    isi: text("isi").notNull(),

    namaPelapor: varchar("nama_pelapor", { length: 100 }).notNull(),
    nik: varchar("nik", { length: 16 }),
    telepon: varchar("telepon", { length: 30 }),
    email: varchar("email", { length: 100 }),
    alamat: varchar("alamat", { length: 255 }),

    /** Lampiran (jalur relatif media), mis. foto pendukung. */
    lampiran: varchar("lampiran", { length: 255 }),

    /** Status: `baru` | `diproses` | `selesai` | `ditolak`. */
    status: varchar("status", { length: 20 }).notNull().default("baru"),

    /** Tanggapan/respons petugas desa. */
    tanggapan: text("tanggapan"),
    petugasId: varchar("petugas_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    ditanggapiPada: timestamp("ditanggapi_pada"),

    /** Boleh ditampilkan di halaman publik desa? */
    publik: boolean("publik").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("pengaduan_village_tiket_uq").on(t.villageId, t.nomorTiket),
    index("pengaduan_village_status_idx").on(t.villageId, t.status, t.createdAt),
    index("pengaduan_village_publik_idx").on(t.villageId, t.publik),
  ],
);

export type Pengaduan = typeof pengaduan.$inferSelect;
export type NewPengaduan = typeof pengaduan.$inferInsert;
