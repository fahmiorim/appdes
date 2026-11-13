import { foreignKey, index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

/**
 * `verifikasi_kontak` — kode OTP verifikasi nomor HP warga.
 *
 * Hanya hash kode yang disimpan. Satu baris aktif per warga; permintaan baru
 * menggantikan kode sebelumnya.
 */
export const verifikasiKontak = mysqlTable(
  "verifikasi_kontak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id").notNull(),
    target: varchar("target", { length: 150 }).notNull(),
    /** Kanal pengiriman kode: `whatsapp` atau `email`. */
    kanal: varchar("kanal", { length: 20 }).notNull().default("whatsapp"),
    kodeHash: varchar("kode_hash", { length: 64 }).notNull(),
    kedaluwarsa: timestamp("kedaluwarsa").notNull(),
    terverifikasiAt: timestamp("terverifikasi_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("verifikasi_kontak_resident_idx").on(table.villageId, table.residentId),
    foreignKey({
      name: "verifikasi_kontak_resident_tenant_fk",
      columns: [table.villageId, table.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("cascade"),
  ],
);

export type VerifikasiKontak = typeof verifikasiKontak.$inferSelect;
