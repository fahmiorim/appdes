import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const arsip = mysqlTable("arsip", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  kategori: varchar("kategori", { length: 100 }),
  judul: varchar("judul", { length: 200 }).notNull(),
  berkas: varchar("berkas", { length: 255 }),
  keterangan: text("keterangan"),
});

export type Arsip = typeof arsip.$inferSelect;
export type NewArsip = typeof arsip.$inferInsert;
