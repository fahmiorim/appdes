import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const registrasiWarga = mysqlTable("registrasi_warga", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nik: varchar("nik", { length: 16 }).notNull(),
  nama: varchar("nama", { length: 100 }).notNull(),
  noHp: varchar("no_hp", { length: 20 }),
  status: varchar("status", { length: 20 }).default("menunggu"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RegistrasiWarga = typeof registrasiWarga.$inferSelect;
export type NewRegistrasiWarga = typeof registrasiWarga.$inferInsert;
