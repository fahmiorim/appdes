import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { residents } from "./resident";
import { villages } from "./village";

/**
 * `warga_pesan` — percakapan dua arah antara warga dan operator desa.
 *
 * Satu baris adalah satu pesan. `pengirim` bernilai `warga` atau `operator`;
 * penanda dibaca dipisah per sisi agar masing-masing dapat menghitung pesan
 * baru tanpa saling mengubah status.
 */
export const wargaPesan = mysqlTable(
  "warga_pesan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id").notNull(),
    pengirim: varchar("pengirim", { length: 20 }).notNull(),
    isi: text("isi").notNull(),
    dibacaWargaPada: timestamp("dibaca_warga_pada"),
    dibacaOperatorPada: timestamp("dibaca_operator_pada"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("warga_pesan_village_resident_idx").on(table.villageId, table.residentId),
    index("warga_pesan_village_created_idx").on(table.villageId, table.createdAt),
    foreignKey({
      name: "warga_pesan_resident_tenant_fk",
      columns: [table.villageId, table.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("cascade"),
  ],
);

export type WargaPesan = typeof wargaPesan.$inferSelect;
export type NewWargaPesan = typeof wargaPesan.$inferInsert;
