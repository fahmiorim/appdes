import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

export const lapak = mysqlTable(
  "lapak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    /** Pemilik warga; `null` untuk lapak yang dikelola operator. */
    residentId: int("resident_id"),
    nama: varchar("nama", { length: 200 }).notNull(),
    pemilik: varchar("pemilik", { length: 100 }),
    kategori: varchar("kategori", { length: 100 }),
    alamat: text("alamat"),
    keterangan: text("keterangan"),
  },
  (t) => [
    uniqueIndex("lapak_village_id_uq").on(t.villageId, t.id),
    index("lapak_village_resident_idx").on(t.villageId, t.residentId),
    // Composite `RESTRICT`: `village_id` child NOT NULL, sehingga composite
    // `SET NULL` tidak mungkin. Repository melepas `resident_id` lebih dulu.
    foreignKey({
      name: "lapak_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
  ],
);

export type Lapak = typeof lapak.$inferSelect;
export type NewLapak = typeof lapak.$inferInsert;
