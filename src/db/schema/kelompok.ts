import {
  boolean,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

/**
 * `kelompok_master` — kategori kelompok.
 *
 * Master kategori (mis. PKK, Karang Taruna, LPM) beserta tipenya. Dipakai
 * `kelompok.category_id`; menghapus kategori tidak menghapus kelompok —
 * kategorinya saja yang dilepas (`ON DELETE SET NULL`).
 */
export const kelompokMaster = mysqlTable(
  "kelompok_master",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),

    /** Tipe kategori; lihat `KELOMPOK_TIPE` ("kelompok" | "lembaga"). */
    type: varchar("type", { length: 20 }).notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("kelompok_master_village_name_uq").on(t.villageId, t.name, t.type)],
);

/**
 * `kelompok` — kelompok masyarakat & lembaga desa.
 *
 * Memakai **single-table inheritance**: lembaga adalah kelompok bertipe
 * `lembaga` (kolom `type`), bukan tabel terpisah. Berbeda dari sistem rujukan
 * yang menyimpan `id_ketua` di tabel kelompok (berisiko tidak sinkron dengan
 * jabatan anggota), di sini **ketua diturunkan** dari anggota yang berjabatan
 * KETUA — satu sumber kebenaran, tanpa penanda sentinel `-9999`.
 */
export const kelompok = mysqlTable(
  "kelompok",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),

    /** Tipe: "kelompok" (kelompok masyarakat) atau "lembaga" (lembaga desa). */
    type: varchar("type", { length: 20 }).notNull(),

    categoryId: int("category_id").references(() => kelompokMaster.id, { onDelete: "set null" }),

    /** Kode kelompok (bila ada), unik per desa bila diisi. */
    code: varchar("code", { length: 50 }),

    /** Nomor SK pendirian kelompok. */
    decreeNumber: varchar("decree_number", { length: 100 }),

    description: varchar("description", { length: 500 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("kelompok_village_slug_uq").on(t.villageId, t.slug),
    uniqueIndex("kelompok_village_type_code_uq").on(t.villageId, t.code),
    uniqueIndex("kelompok_village_id_uq").on(t.villageId, t.id),
    index("kelompok_village_type_idx").on(t.villageId, t.type),
    index("kelompok_category_idx").on(t.categoryId),
  ],
);

/**
 * `kelompok_anggota` — keanggotaan kelompok (banyak-ke-banyak).
 *
 * Satu penduduk boleh berada di banyak kelompok (berbeda dari RTM yang
 * eksklusif), sehingga relasinya berupa tabel pivot. Jabatan disimpan per
 * keanggotaan; lihat `JABATAN_KELOMPOK` di domain.
 */
export const kelompokAnggota = mysqlTable(
  "kelompok_anggota",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kelompokId: int("kelompok_id")
      .notNull()
      .references(() => kelompok.id, { onDelete: "cascade" }),
    residentId: int("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),

    /** Jabatan dalam kelompok; lihat `JABATAN_KELOMPOK`. */
    position: int("position").notNull(),

    /** Nomor anggota (opsional). */
    memberNumber: varchar("member_number", { length: 50 }),

    /** Nomor SK jabatan (opsional). */
    decreeNumber: varchar("decree_number", { length: 100 }),

    /**
     * Apakah keanggotaan ini dipublikasikan di situs desa.
     * Bawaan `true` agar data lama tetap tampil sampai operator menyembunyikan
     * anggota tertentu.
     */
    tampilPublik: boolean("tampil_publik").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("kelompok_anggota_kelompok_resident_uq").on(t.kelompokId, t.residentId),
    index("kelompok_anggota_kelompok_idx").on(t.kelompokId),
    index("kelompok_anggota_resident_idx").on(t.residentId),
  ],
);
