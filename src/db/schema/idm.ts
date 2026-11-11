import { int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const idmIndikator = mysqlTable("idm_indikator", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  tahun: int("tahun").notNull(),
  kode: varchar("kode", { length: 20 }).notNull(),
  nama: varchar("nama", { length: 200 }).notNull(),
  skor: int("skor").default(0),
  kategori: varchar("kategori", { length: 50 }),
  keterangan: text("keterangan"),
});

/**
 * Capaian SDGs Desa per tujuan (1–18) untuk satu tahun.
 *
 * Unik per desa + tahun + tujuan sehingga operator cukup mengisi ulang nilai
 * yang sudah ada (upsert), bukan membuat baris baru.
 */
export const idmSdgs = mysqlTable(
  "idm_sdgs",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    tahun: int("tahun").notNull(),
    goal: int("goal").notNull(),
    skor: int("skor").notNull().default(0),
    keterangan: text("keterangan"),
  },
  (t) => [uniqueIndex("idm_sdgs_village_tahun_goal_uq").on(t.villageId, t.tahun, t.goal)],
);

export type IdmIndikator = typeof idmIndikator.$inferSelect;
export type NewIdmIndikator = typeof idmIndikator.$inferInsert;
export type IdmSdgs = typeof idmSdgs.$inferSelect;
export type NewIdmSdgs = typeof idmSdgs.$inferInsert;
