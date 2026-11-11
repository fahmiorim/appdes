import { sql } from "drizzle-orm";
import {
  date,
  datetime,
  decimal,
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

/**
 * `polygon` — kategori/layer peta (pohon: root → child).
 *
 * Tipe: 0 = root (polygon utama), 1 = sub-polygon (detail).
 * `color` digunakan untuk mengisi fill layer di peta.
 */
export const polygons = mysqlTable(
  "polygon",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 50 }).notNull(),
    simbol: varchar("simbol", { length: 50 }),
    color: varchar("color", { length: 25 }),
    tipe: int("tipe").notNull().default(0),
    parrent: int("parrent").default(1),
    enabled: int("enabled").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [
    index("polygon_village_sort_idx").on(t.villageId, t.sortOrder),
    index("polygon_village_parrent_idx").on(t.villageId, t.parrent),
  ],
);

export type Polygon = typeof polygons.$inferSelect;
export type NewPolygon = typeof polygons.$inferInsert;

/**
 * `area` — area/wilayah peta (merujuk ke polygon).
 *
 * `path` berisi GeoJSON Polygon (batas area) sebagai teks JSON.
 */
export const areas = mysqlTable(
  "area",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 50 }).notNull(),
    path: text("path"),
    refPolygon: int("ref_polygon").references(() => polygons.id, { onDelete: "set null" }),
    foto: varchar("foto", { length: 100 }),
    desk: text("desk"),
    enabled: int("enabled").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [
    index("area_village_sort_idx").on(t.villageId, t.sortOrder),
    index("area_village_polygon_idx").on(t.villageId, t.refPolygon),
  ],
);

export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;

/**
 * `garis` — garis/jalan peta.
 *
 * `path` berisi GeoJSON LineString.
 * `ref_line` mengacu pada garis induk (self-reference untuk hierarki).
 */
// Garis table uses a local var to break circular type inference for self-reference.
const _garisColumns = {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 50 }).notNull(),
  path: text("path"),
  refLine: int("ref_line"),
  foto: varchar("foto", { length: 100 }),
  desk: text("desk"),
  enabled: int("enabled").notNull().default(1),
  sortOrder: int("sort_order").notNull().default(0),
};
export const garis = mysqlTable("garis", _garisColumns, (t) => [
  index("garis_village_sort_idx").on(t.villageId, t.sortOrder),
  index("garis_village_ref_line_idx").on(t.villageId, t.refLine),
]);

export type Garis = typeof garis.$inferSelect;
export type NewGaris = typeof garis.$inferInsert;

/**
 * `point` — titik/lokasi peta.
 *
 * `path` berisi GeoJSON Point (koordinat [lng, lat]).
 * `parrent` mengacu pada `polygon.id` untuk mengelompokkan titik ke layer.
 */
export const points = mysqlTable(
  "point",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 50 }).notNull(),
    simbol: varchar("simbol", { length: 50 }),
    tipe: int("tipe").default(0),
    parrent: int("parrent").default(1),
    path: text("path"),
    enabled: int("enabled").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [
    index("point_village_sort_idx").on(t.villageId, t.sortOrder),
    index("point_village_parrent_idx").on(t.villageId, t.parrent),
  ],
);

export type Point = typeof points.$inferSelect;
export type NewPoint = typeof points.$inferInsert;

/**
 * `gis_simbol` — katalog simbol peta (ikon/marker).
 *
 * Global (tanpa village_id) karena referensi visual baku; desa dapat
 * menambah simbol khusus namun tetap memakai skema yang sama.
 */
export const gisSimbol = mysqlTable(
  "gis_simbol",
  {
    id: int("id").autoincrement().primaryKey(),
    simbol: varchar("simbol", { length: 40 }).notNull(),
    desk: text("desk"),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [index("gis_simbol_simbol_idx").on(t.simbol)],
);

export type GisSimbol = typeof gisSimbol.$inferSelect;
export type NewGisSimbol = typeof gisSimbol.$inferInsert;

/**
 * `persil` — data persil tanah desa.
 *
 * Setiap persil punya nomor unik per desa, luas (m2), status, dan rincian.
 */
export const persil = mysqlTable(
  "persil",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nomor: varchar("nomor", { length: 50 }).notNull(),
    nomorCdesa: varchar("nomor_cdesa", { length: 50 }),
    luas: decimal("luas", { precision: 10, scale: 2 }).notNull().default("0.00"),
    status: varchar("status", { length: 30 }).notNull().default("milik"),
    path: text("path"),
    keterangan: text("keterangan"),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("persil_village_nomor_uq").on(t.villageId, t.nomor),
    index("persil_village_sort_idx").on(t.villageId, t.sortOrder),
  ],
);

export type Persil = typeof persil.$inferSelect;
export type NewPersil = typeof persil.$inferInsert;

/**
 * `cdesa` — data Cdesa/Sertifikat Tanah.
 */
export const cdesa = mysqlTable(
  "cdesa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nomor: varchar("nomor", { length: 50 }).notNull(),
    nomorPersil: varchar("nomor_persil", { length: 50 }),
    nomorSertifikat: varchar("nomor_sertifikat", { length: 50 }),
    tanggal: date("tanggal", { mode: "string" }),
    namaPemegang: varchar("nama_pemegang", { length: 255 }),
    luas: decimal("luas", { precision: 10, scale: 2 }).notNull().default("0.00"),
    keterangan: text("keterangan"),
    sortOrder: int("sort_order").notNull().default(0),
    // `datetime` (drizzle) tidak punya `defaultNow`/`onUpdateNow` — hanya
    // `date`/`timestamp` yang memilikinya — sehingga default ditulis eksplisit
    // selaras dengan migrasi 0038 (`DEFAULT CURRENT_TIMESTAMP ON UPDATE …`).
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cdesa_village_nomor_uq").on(t.villageId, t.nomor),
    uniqueIndex("cdesa_village_id_id_uq").on(t.villageId, t.id),
    index("cdesa_village_sort_idx").on(t.villageId, t.sortOrder),
  ],
);

export type Cdesa = typeof cdesa.$inferSelect;
export type NewCdesa = typeof cdesa.$inferInsert;

/**
 * `cdesa_rincian` — rincian Cdesa (nama, alamat, DLLB).
 */
export const cdesaRincian = mysqlTable(
  "cdesa_rincian",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    cdesaId: int("cdesa_id").notNull(),
    nama: varchar("nama", { length: 255 }),
    alamat: text("alamat"),
    dllb: text("dllb"),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("cdesa_rincian_village_cdesa_idx").on(t.villageId, t.cdesaId),
    foreignKey({
      name: "cdesa_rincian_village_cdesa_id_cdesa_village_id_id_fk",
      columns: [t.villageId, t.cdesaId],
      foreignColumns: [cdesa.villageId, cdesa.id],
    }).onDelete("cascade"),
  ],
);

export type CdesaRincian = typeof cdesaRincian.$inferSelect;
export type NewCdesaRincian = typeof cdesaRincian.$inferInsert;

/**
 * `cdesa_mutasi` — riwayat mutasi Cdesa.
 */
export const cdesaMutasi = mysqlTable(
  "cdesa_mutasi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    cdesaId: int("cdesa_id").notNull(),
    nomor: varchar("nomor", { length: 50 }).notNull(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    tipe: varchar("tipe", { length: 30 }).notNull(),
    keterangan: text("keterangan"),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("cdesa_mutasi_village_cdesa_idx").on(t.villageId, t.cdesaId),
    foreignKey({
      name: "cdesa_mutasi_village_cdesa_id_cdesa_village_id_id_fk",
      columns: [t.villageId, t.cdesaId],
      foreignColumns: [cdesa.villageId, cdesa.id],
    }).onDelete("cascade"),
  ],
);

export type CdesaMutasi = typeof cdesaMutasi.$inferSelect;
export type NewCdesaMutasi = typeof cdesaMutasi.$inferInsert;
