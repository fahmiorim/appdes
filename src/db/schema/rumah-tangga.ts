import { index, int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { regions } from "./region";
import { villages } from "./village";

/**
 * `rtm` — Rumah Tangga.
 *
 * RTM berada **di bawah** Kartu Keluarga: satu KK dapat memuat beberapa rumah
 * tangga. Kepala rumah tangga sengaja tidak disimpan sebagai kolom agar tidak
 * ada dua sumber kebenaran — seperti KK, kepala diturunkan dari anggota yang
 * ber-`rtm_level` = 1 (lihat `features/rumah-tangga/domain`).
 *
 * `number` dibangkitkan otomatis (kode desa + nomor urut) dan unik per desa.
 * `bdt` menyimpan nomor Basis Data Terpadu bila rumah tangga terdaftar.
 */
export const rumahTangga = mysqlTable(
  "rtm",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Nomor Rumah Tangga (kode desa + nomor urut), unik per desa. */
    number: varchar("number", { length: 32 }).notNull(),

    address: varchar("address", { length: 255 }),
    regionId: int("region_id").references(() => regions.id, { onDelete: "set null" }),

    /** Kelas sosial ekonomi rumah tangga (1 = terendah), bila diketahui. */
    kelasSosial: int("kelas_sosial"),

    /** Nomor Basis Data Terpadu (BDT), bila rumah tangga terdaftar. */
    bdt: varchar("bdt", { length: 30 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("rtm_village_number_uq").on(t.villageId, t.number),
    index("rtm_region_idx").on(t.regionId),
  ],
);
