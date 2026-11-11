import { index, int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { regions } from "./region";
import { villages } from "./village";

/**
 * `families` — Kartu Keluarga (KK).
 *
 * Kepala keluarga sengaja **tidak** disimpan sebagai kolom tersendiri agar tidak
 * ada dua sumber kebenaran: keanggotaan dinyatakan oleh `residents.family_id`,
 * dan kepala keluarga adalah anggota yang berhubungan keluarga "KEPALA
 * KELUARGA".
 *
 * `address`/`region_id` di sini adalah domisili KK (alamat pada kartu), yang
 * boleh berbeda dari domisili terkini tiap penduduk.
 */
export const families = mysqlTable(
  "families",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Nomor Kartu Keluarga (16 angka), unik per desa. */
    number: varchar("number", { length: 16 }).notNull(),

    address: varchar("address", { length: 255 }),
    regionId: int("region_id").references(() => regions.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("families_village_number_uq").on(t.villageId, t.number),
    index("families_region_idx").on(t.regionId),
  ],
);
