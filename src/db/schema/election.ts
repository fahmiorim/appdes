import {
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `elections` — pemilihan/pilkades di desa.
 *
 * Satu desa bisa memiliki beberapa pemilihan (pilkades, pemilu, dsb.). Hanya
 * pemilihan dengan status `aktif` yang dipakai sebagai referensi tanggal untuk
 * DPT (Daftar Pemilih Tetap).
 */
export const elections = mysqlTable(
  "elections",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    judul: varchar("judul", { length: 200 }).notNull(),
    /** Status: `draf` | `aktif` | `selesai`. Hanya satu `aktif` per desa. */
    status: mysqlEnum("status", ["draf", "aktif", "selesai"]).notNull().default("draf"),
    /** Tanggal pemilihan — dipakai menghitung umur pemilih (DPT). */
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("elections_village_status_idx").on(t.villageId, t.status),
    index("elections_village_tanggal_idx").on(t.villageId, t.tanggal),
  ],
);

export type Election = typeof elections.$inferSelect;
export type NewElection = typeof elections.$inferInsert;
