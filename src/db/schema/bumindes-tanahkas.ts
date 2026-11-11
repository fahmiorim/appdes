import {
  date,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Buku Tanah Kas Desa.
 *
 * Setiap baris adalah satu persil tanah kas milik desa; mutasi mencatat
 * perubahan luas/nilai/status atas persil tersebut (sewa, tukar, lepas, dsb.).
 */
export const bumindesTanahKas = mysqlTable(
  "bumindes_tanah_kas",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nomorPersil: varchar("nomor_persil", { length: 50 }).notNull(),
    asal: varchar("asal", { length: 255 }),
    luas: decimal("luas", { precision: 14, scale: 2 }).notNull().default("0.00"),
    lokasi: varchar("lokasi", { length: 255 }),
    status: varchar("status", { length: 150 }),
    nilai: decimal("nilai", { precision: 19, scale: 2 }).notNull().default("0.00"),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("bumindes_tanah_kas_village_idx").on(t.villageId)],
);

export const bumindesTanahKasMutasi = mysqlTable(
  "bumindes_tanah_kas_mutasi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    tanahKasId: int("tanah_kas_id")
      .notNull()
      .references(() => bumindesTanahKas.id, { onDelete: "cascade" }),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    jenis: varchar("jenis", { length: 50 }).notNull(),
    uraian: varchar("uraian", { length: 500 }).notNull(),
    luasPerubahan: decimal("luas_perubahan", { precision: 14, scale: 2 }),
    nilaiPerubahan: decimal("nilai_perubahan", { precision: 19, scale: 2 }),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("bumindes_tanah_kas_mutasi_village_idx").on(t.villageId),
    index("bumindes_tanah_kas_mutasi_persil_idx").on(t.tanahKasId),
  ],
);

export type BumindesTanahKas = typeof bumindesTanahKas.$inferSelect;
export type BumindesTanahKasMutasi = typeof bumindesTanahKasMutasi.$inferSelect;
