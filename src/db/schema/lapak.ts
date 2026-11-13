import { int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

export const lapak = mysqlTable("lapak", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  /** Pemilik warga; `null` untuk lapak yang dikelola operator. */
  residentId: int("resident_id").references(() => residents.id, { onDelete: "set null" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  pemilik: varchar("pemilik", { length: 100 }),
  kategori: varchar("kategori", { length: 100 }),
  alamat: text("alamat"),
  keterangan: text("keterangan"),
}, (t) => [uniqueIndex("lapak_village_id_uq").on(t.villageId, t.id)]);

export type Lapak = typeof lapak.$inferSelect;
export type NewLapak = typeof lapak.$inferInsert;
