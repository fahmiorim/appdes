import { date, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const bumindesBuku = mysqlTable("bumindes_buku", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  kodeBuku: varchar("kode_buku", { length: 20 }).notNull(),
  namaBuku: varchar("nama_buku", { length: 150 }).notNull(),
  uraian: text("uraian"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bumindesItem = mysqlTable("bumindes_item", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  bukuId: int("buku_id")
    .notNull()
    .references(() => bumindesBuku.id, { onDelete: "cascade" }),
  nomorUrut: int("nomor_urut").notNull().default(0),
  tanggal: date("tanggal", { mode: "string" }),
  uraian: varchar("uraian", { length: 500 }).notNull(),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BumindesBuku = typeof bumindesBuku.$inferSelect;
export type BumindesItem = typeof bumindesItem.$inferSelect;
