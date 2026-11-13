import {
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const pemilihan = mysqlTable("pemilihan", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  tahun: int("tahun").notNull(),
  jenis: varchar("jenis", { length: 50 }).notNull(),
  tanggal: date("tanggal"),
  keterangan: text("keterangan"),
}, (t) => [uniqueIndex("pemilihan_village_id_uq").on(t.villageId, t.id)]);

/**
 * `pemilihan_kandidat` — kandidat pada satu pemilihan beserta perolehan suara.
 *
 * Nomor urut unik per pemilihan; perolehan suara disimpan sebagai angka mentah
 * (bukan persentase) agar rekapitulasi selalu dapat dihitung ulang.
 */
export const pemilihanKandidat = mysqlTable(
  "pemilihan_kandidat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    pemilihanId: int("pemilihan_id").notNull(),

    nomorUrut: int("nomor_urut").notNull(),
    nama: varchar("nama", { length: 100 }).notNull(),
    keterangan: varchar("keterangan", { length: 500 }),
    jumlahSuara: int("jumlah_suara").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("pemilihan_kandidat_nomor_uq").on(t.pemilihanId, t.nomorUrut),
    index("pemilihan_kandidat_pemilihan_idx").on(t.pemilihanId),
    index("pemilihan_kandidat_village_pemilihan_idx").on(t.villageId, t.pemilihanId),
    foreignKey({
      columns: [t.villageId, t.pemilihanId],
      foreignColumns: [pemilihan.villageId, pemilihan.id],
      name: "pemilihan_kandidat_parent_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export type Pemilihan = typeof pemilihan.$inferSelect;
export type NewPemilihan = typeof pemilihan.$inferInsert;
export type PemilihanKandidat = typeof pemilihanKandidat.$inferSelect;
export type NewPemilihanKandidat = typeof pemilihanKandidat.$inferInsert;
