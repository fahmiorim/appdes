import {
  foreignKey,
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
  (t) => [
    uniqueIndex("suplemen_village_slug_uq").on(t.villageId, t.slug),
    uniqueIndex("suplemen_village_id_uq").on(t.villageId, t.id),
  ],
);

export const suplemenTerdata = mysqlTable(
  "suplemen_terdata",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    suplemenId: int("id_suplemen").notNull(),

    /**
     * Referensi opsional ke penduduk/keluarga.
     *
     * FK composite memakai `RESTRICT` karena menyertakan `village_id NOT NULL`;
     * pelepasan referensi saat penduduk/keluarga dihapus dilakukan transaksi
     * aplikasi. Lihat migration `0002_b2_dtks_suplemen_composite_fk`.
     */
    pendudukId: int("penduduk_id"),
    keluargaId: int("keluarga_id"),

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
    index("suplemen_terdata_village_suplemen_idx").on(t.villageId, t.suplemenId),
    index("suplemen_terdata_village_penduduk_idx").on(t.villageId, t.pendudukId),
    index("suplemen_terdata_village_keluarga_idx").on(t.villageId, t.keluargaId),
    foreignKey({
      name: "suplemen_terdata_suplemen_tenant_fk",
      columns: [t.villageId, t.suplemenId],
      foreignColumns: [suplemen.villageId, suplemen.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "suplemen_terdata_penduduk_tenant_fk",
      columns: [t.villageId, t.pendudukId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "suplemen_terdata_keluarga_tenant_fk",
      columns: [t.villageId, t.keluargaId],
      foreignColumns: [families.villageId, families.id],
    }).onDelete("restrict"),
  ],
);

export type Suplemen = typeof suplemen.$inferSelect;
export type NewSuplemen = typeof suplemen.$inferInsert;
export type SuplemenTerdata = typeof suplemenTerdata.$inferSelect;
export type NewSuplemenTerdata = typeof suplemenTerdata.$inferInsert;
