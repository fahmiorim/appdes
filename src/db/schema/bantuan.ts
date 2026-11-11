import {
  date,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { families } from "./family";
import { kelompok } from "./kelompok";
import { residents } from "./resident";
import { rumahTangga } from "./rumah-tangga";
import { villages } from "./village";

/**
 * `bantuan_program` — program bantuan sosial desa.
 *
 * Satu program punya **sasaran** (penduduk / keluarga / rumah tangga / kelompok),
 * rentang tanggal aktif (`start_date`–`end_date`), dan asal dana. Status masa
 * aktif sengaja **tidak** disimpan sebagai kolom: nilainya dihitung dari rentang
 * tanggal (lihat `features/bantuan/domain`), sehingga tidak ada dua sumber
 * kebenaran yang bisa saling bertentangan.
 *
 * Berbeda dari sistem rujukan yang mengizinkan `slug` kosong, di sini program
 * selalu punya `slug` unik per desa agar tautan langsung ke program stabil.
 */
export const bantuanProgram = mysqlTable(
  "bantuan_program",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),

    /** Sasaran program; lihat `SASARAN_BANTUAN` (1 penduduk, 2 keluarga, 3 rumah tangga, 4 kelompok). */
    sasaran: int("sasaran").notNull(),

    /** Keterangan singkat program. */
    description: varchar("description", { length: 500 }),

    /** Rentang masa aktif program. */
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),

    /** Asal dana (lihat `ASAL_DANA` pada domain bantuan), boleh kosong. */
    asalDana: int("asal_dana"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("bantuan_program_village_slug_uq").on(t.villageId, t.slug),
    index("bantuan_program_village_sasaran_idx").on(t.villageId, t.sasaran),
  ],
);

/**
 * `bantuan_peserta` — keanggotaan peserta pada sebuah program.
 *
 * Penautan memakai **FK eksplisit per jenis sasaran** (`resident_id`,
 * `family_id`, `rtm_id`, `kelompok_id`) alih-alih kunci join berupa teks
 * (NIK/no. KK) seperti sistem rujukan, sehingga integritas referensial terjaga
 * dan peserta otomatis terlepas bila sasaran dihapus.
 *
 * Kolom `card_*` adalah **salinan cetak** yang boleh berbeda dari data master
 * (mis. nama pada kartu bantuan), jadi tidak digabung paksa dengan `residents`.
 */
export const bantuanPeserta = mysqlTable(
  "bantuan_peserta",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    programId: int("program_id")
      .notNull()
      .references(() => bantuanProgram.id, { onDelete: "cascade" }),

    /** Sasaran: penduduk. */
    residentId: int("resident_id").references(() => residents.id, { onDelete: "cascade" }),
    /** Sasaran: keluarga (Kartu Keluarga). */
    familyId: int("family_id").references(() => families.id, { onDelete: "cascade" }),
    /** Sasaran: rumah tangga (RTM). */
    rtmId: int("rtm_id").references(() => rumahTangga.id, { onDelete: "cascade" }),
    /** Sasaran: kelompok. */
    kelompokId: int("kelompok_id").references(() => kelompok.id, { onDelete: "cascade" }),

    /** Nomor Kartu Peserta (KKS/PKH/dll.) sebagai identitas cetak. */
    cardNumber: varchar("card_number", { length: 60 }),

    cardNationalId: varchar("card_national_id", { length: 30 }),
    cardName: varchar("card_name", { length: 100 }),
    cardBirthPlace: varchar("card_birth_place", { length: 100 }),
    cardBirthDate: date("card_birth_date", { mode: "string" }),
    cardAddress: varchar("card_address", { length: 255 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("bantuan_peserta_program_resident_uq").on(t.programId, t.residentId),
    uniqueIndex("bantuan_peserta_program_family_uq").on(t.programId, t.familyId),
    uniqueIndex("bantuan_peserta_program_rtm_uq").on(t.programId, t.rtmId),
    uniqueIndex("bantuan_peserta_program_kelompok_uq").on(t.programId, t.kelompokId),
    index("bantuan_peserta_program_idx").on(t.programId),
  ],
);
