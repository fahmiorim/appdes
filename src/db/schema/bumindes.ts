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

export const bumindesBuku = mysqlTable(
  "bumindes_buku",
  {
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
  },
  (table) => [uniqueIndex("bumindes_buku_village_id_uq").on(table.villageId, table.id)],
);

export const bumindesItem = mysqlTable(
  "bumindes_item",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    bukuId: int("buku_id").notNull(),
    nomorUrut: int("nomor_urut").notNull().default(0),
    tanggal: date("tanggal", { mode: "string" }),
    uraian: varchar("uraian", { length: 500 }).notNull(),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("bumindes_item_village_buku_idx").on(table.villageId, table.bukuId),
    foreignKey({
      name: "bumindes_item_buku_tenant_fk",
      columns: [table.villageId, table.bukuId],
      foreignColumns: [bumindesBuku.villageId, bumindesBuku.id],
    }).onDelete("cascade"),
  ],
);

export type BumindesBuku = typeof bumindesBuku.$inferSelect;
export type BumindesItem = typeof bumindesItem.$inferSelect;
