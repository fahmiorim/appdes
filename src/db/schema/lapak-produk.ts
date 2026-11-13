import { decimal, foreignKey, index, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { lapak } from "./lapak";
import { villages } from "./village";

/**
 * Produk UMKM pada lapak tertentu.
 * Setiap produk terkait dengan satu lapak dan desa.
 */
export const lapakProduk = mysqlTable("lapak_produk", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  lapakId: int("lapak_id").notNull(),
  nama: varchar("nama", { length: 200 }).notNull(),
  deskripsi: text("deskripsi"),
  harga: decimal("harga", { precision: 12, scale: 2 }).notNull(),
  stok: int("stok").default(0),
  gambar: varchar("gambar", { length: 500 }),
  aktif: int("aktif").default(1).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
}, (t) => [
  index("lapak_produk_village_lapak_idx").on(t.villageId, t.lapakId),
  foreignKey({
    columns: [t.villageId, t.lapakId],
    foreignColumns: [lapak.villageId, lapak.id],
    name: "lapak_produk_lapak_tenant_fk",
  }).onDelete("cascade"),
]);

export type LapakProduk = typeof lapakProduk.$inferSelect;
export type NewLapakProduk = typeof lapakProduk.$inferInsert;
