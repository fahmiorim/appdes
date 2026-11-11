import { index, int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `regions` — wilayah administratif desa (dusun/RW/RT).
 *
 * Struktur datar: satu baris merepresentasikan kombinasi dusun/RW/RT. Istilah
 * `dusun`, `rw`, dan `rt` dipertahankan apa adanya karena tidak punya padanan
 * baku dalam bahasa Inggris.
 */
export const regions = mysqlTable(
  "regions",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    dusun: varchar("dusun", { length: 100 }),
    rw: varchar("rw", { length: 10 }),
    rt: varchar("rt", { length: 10 }),

    sortOrder: int("sort_order").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("regions_village_dusun_rw_rt_uq").on(t.villageId, t.dusun, t.rw, t.rt),
    index("regions_village_sort_idx").on(t.villageId, t.sortOrder),
  ],
);

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
