import {
  boolean,
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

/** Potensi unggulan dan indikatornya, seluruhnya terikat pada tenant desa. */
export const potensiDesa = mysqlTable(
  "potensi_desa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    kategori: varchar("kategori", { length: 40 }).notNull(),
    judul: varchar("judul", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    ringkasan: varchar("ringkasan", { length: 500 }),
    deskripsi: text("deskripsi"),
    gambar: varchar("gambar", { length: 255 }),
    lokasi: varchar("lokasi", { length: 200 }),
    kontak: varchar("kontak", { length: 150 }),
    unggulan: boolean("unggulan").notNull().default(false),
    aktif: boolean("aktif").notNull().default(false),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "potensi_desa_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    uniqueIndex("potensi_desa_village_slug_uq").on(t.villageId, t.slug),
    uniqueIndex("potensi_desa_village_id_uq").on(t.villageId, t.id),
    index("potensi_desa_village_category_active_idx").on(t.villageId, t.kategori, t.aktif, t.urut),
  ],
);

export const potensiIndikator = mysqlTable(
  "potensi_indikator",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    potensiId: int("potensi_id").notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    nilai: varchar("nilai", { length: 100 }).notNull(),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("potensi_indikator_village_potensi_idx").on(t.villageId, t.potensiId, t.urut),
    foreignKey({
      name: "potensi_indikator_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "potensi_indikator_tenant_fk",
      columns: [t.villageId, t.potensiId],
      foreignColumns: [potensiDesa.villageId, potensiDesa.id],
    }).onDelete("cascade"),
  ],
);
