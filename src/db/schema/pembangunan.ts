import {
  date,
  decimal,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `pembangunan_proyek` — proyek pembangunan desa.
 *
 * Satu baris = satu kegiatan fisik/kegiatan pembangunan yang dibiayai APBDes
 * atau sumber dana lain. `progres` disimpan sebagai angka 0–100 dan
 * **diturunkan** dari status pada tampilan publik, sehingga tidak ada dua
 * sumber kebenaran yang bisa bertentangan.
 *
 * `slug` unik per desa agar tautan langsung ke proyek stabil, sementara
 * `tahun_anggaran` dipakai menyaring daftar per tahun.
 */
export const pembangunanProyek = mysqlTable(
  "pembangunan_proyek",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    judul: varchar("judul", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),

    /** Ringkasan/uraian proyek. */
    deskripsi: text("deskripsi"),

    lokasi: varchar("lokasi", { length: 200 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    tahunAnggaran: int("tahun_anggaran").notNull(),

    /** Sumber dana; lihat `SUMBER_DANA_PEMBANGUNAN` pada domain. */
    sumberDana: varchar("sumber_dana", { length: 40 }),

    /** Nilai anggaran proyek. */
    anggaran: decimal("anggaran", { precision: 15, scale: 2 }),

    /** Volume pekerjaan, mis. `250` + `meter`. */
    volume: decimal("volume", { precision: 12, scale: 2 }),
    satuan: varchar("satuan", { length: 30 }),

    /** Pelaksana (kontraktor/swakelola/masyarakat). */
    pelaksana: varchar("pelaksana", { length: 200 }),

    mulai: date("mulai", { mode: "string" }),
    selesai: date("selesai", { mode: "string" }),

    /** Status: `rencana` | `berjalan` | `selesai` | `dibatalkan`. */
    status: varchar("status", { length: 20 }).notNull().default("rencana"),

    /** Progres fisik 0–100 (%). */
    progres: tinyint("progres").notNull().default(0),

    /** Uraian hasil/manfaat setelah proyek selesai. */
    hasil: text("hasil"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("pembangunan_proyek_village_slug_uq").on(t.villageId, t.slug),
    uniqueIndex("pembangunan_proyek_village_id_uq").on(t.villageId, t.id),
    index("pembangunan_proyek_village_tahun_idx").on(t.villageId, t.tahunAnggaran),
    index("pembangunan_proyek_village_status_idx").on(t.villageId, t.status),
  ],
);

/**
 * `pembangunan_dokumentasi` — foto/dokumentasi proyek pembangunan.
 *
 * Menyimpan `village_id` yang didenormalisasi dari proyek induk agar isolasi
 * tenant dijaga composite foreign key, bukan hanya join di aplikasi.
 */
export const pembangunanDokumentasi = mysqlTable(
  "pembangunan_dokumentasi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    proyekId: int("proyek_id").notNull(),

    /** Jalur relatif media. */
    gambar: varchar("gambar", { length: 255 }).notNull(),
    judul: varchar("judul", { length: 150 }),
    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pembangunan_dokumentasi_village_proyek_idx").on(t.villageId, t.proyekId),
    foreignKey({
      name: "pembangunan_dokumentasi_proyek_tenant_fk",
      columns: [t.villageId, t.proyekId],
      foreignColumns: [pembangunanProyek.villageId, pembangunanProyek.id],
    }).onDelete("cascade"),
  ],
);

export type PembangunanProyek = typeof pembangunanProyek.$inferSelect;
export type NewPembangunanProyek = typeof pembangunanProyek.$inferInsert;
export type PembangunanDokumentasi = typeof pembangunanDokumentasi.$inferSelect;
