import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const registrasiWarga = mysqlTable(
  "registrasi_warga",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nik: varchar("nik", { length: 16 }).notNull(),
    nama: varchar("nama", { length: 100 }).notNull(),
    noHp: varchar("no_hp", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("menunggu"),
    catatan: varchar("catatan", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (t) => [
    index("registrasi_warga_tenant_status_idx").on(t.villageId, t.status, t.createdAt),
    index("registrasi_warga_tenant_nik_idx").on(t.villageId, t.nik),
  ],
);

export type RegistrasiWarga = typeof registrasiWarga.$inferSelect;
export type NewRegistrasiWarga = typeof registrasiWarga.$inferInsert;
