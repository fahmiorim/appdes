import {
  decimal,
  index,
  int,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { keuanganTemplate } from "./keuangan";
import { villages } from "./village";

/**
 * Target dan realisasi bulanan dicatat eksplisit oleh operator.
 * Angka tidak diturunkan/dibagi dari realisasi tahunan atau triwulan.
 */
export const keuanganBulanan = mysqlTable(
  "keuangan_bulanan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    tahun: int("tahun").notNull(),
    bulan: int("bulan").notNull(),
    templateUuid: varchar("template_uuid", { length: 20 })
      .notNull()
      .references(() => keuanganTemplate.uuid, { onDelete: "restrict" }),
    target: decimal("target", { precision: 65, scale: 2 }).notNull().default("0.00"),
    realisasi: decimal("realisasi", { precision: 65, scale: 2 }).notNull().default("0.00"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("keuangan_bulanan_village_year_month_account_uq").on(
      table.villageId,
      table.tahun,
      table.bulan,
      table.templateUuid,
    ),
    index("keuangan_bulanan_village_year_idx").on(table.villageId, table.tahun),
  ],
);

export type KeuanganBulanan = typeof keuanganBulanan.$inferSelect;
