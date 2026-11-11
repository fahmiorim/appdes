import {
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { families } from "./family";
import { residents } from "./resident";
import { villages } from "./village";

export const SASARAN_PENDUDUK = 1;
export const SASARAN_KELUARGA = 2;

export const suplemen = mysqlTable(
  "suplemen",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    nama: varchar("nama", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    sasaran: int("sasaran").notNull().default(SASARAN_PENDUDUK),
    keterangan: text("keterangan"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("suplemen_village_slug_uq").on(t.villageId, t.slug)],
);

export const suplemenTerdata = mysqlTable(
  "suplemen_terdata",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    suplemenId: int("id_suplemen")
      .notNull()
      .references(() => suplemen.id, { onDelete: "cascade" }),

    pendudukId: int("penduduk_id").references(() => residents.id, {
      onDelete: "set null",
    }),
    keluargaId: int("keluarga_id").references(() => families.id, {
      onDelete: "set null",
    }),

    /** Data isian dinamis (tergantung bentuk suplemen). */
    dataFormIsian: json("data_form_isian"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("suplemen_terdata_suplemen_idx").on(t.suplemenId),
    index("suplemen_terdata_penduduk_idx").on(t.pendudukId),
    index("suplemen_terdata_keluarga_idx").on(t.keluargaId),
  ],
);

export type Suplemen = typeof suplemen.$inferSelect;
export type NewSuplemen = typeof suplemen.$inferInsert;
export type SuplemenTerdata = typeof suplemenTerdata.$inferSelect;
export type NewSuplemenTerdata = typeof suplemenTerdata.$inferInsert;
