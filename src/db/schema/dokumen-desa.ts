import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const dokumenDesa = mysqlTable("dokumen_desa", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  jenis: varchar("jenis", { length: 50 }),
  nomor: varchar("nomor", { length: 100 }),
  judul: varchar("judul", { length: 200 }).notNull(),
  berkas: varchar("berkas", { length: 255 }),
  keterangan: text("keterangan"),
});

export type DokumenDesa = typeof dokumenDesa.$inferSelect;
export type NewDokumenDesa = typeof dokumenDesa.$inferInsert;
