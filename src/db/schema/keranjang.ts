import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

import { lapak } from "./lapak";
import { lapakProduk } from "./lapak-produk";

/**
 * Keranjang belanja publik.
 * Disimpan berdasarkan sessionKey untuk pengunjung tanpa akun.
 */
export const keranjang = mysqlTable("keranjang", {
  id: int("id").autoincrement().primaryKey(),
  lapakId: int("lapak_id")
    .notNull()
    .references(() => lapak.id, { onDelete: "cascade" }),
  produkId: int("produk_id")
    .notNull()
    .references(() => lapakProduk.id, { onDelete: "cascade" }),
  jumlah: int("jumlah").notNull().default(1),
  sessionKey: varchar("session_key", { length: 100 }).notNull(),
});

export type Keranjang = typeof keranjang.$inferSelect;
export type NewKeranjang = typeof keranjang.$inferInsert;
