import { date, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const sisaLebih = mysqlTable("sisa_lebih", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  tahun: int("tahun").notNull(),
  jumlah: varchar("jumlah", { length: 50 }),
  keterangan: text("keterangan"),
  tanggal: date("tanggal"),
});

export type SisaLebih = typeof sisaLebih.$inferSelect;
export type NewSisaLebih = typeof sisaLebih.$inferInsert;
