import {
  boolean,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

/**
 * `notifikasi_terkirim` — bukti pengiriman notifikasi lintas fitur.
 *
 * Setiap percobaan kirim (email/WhatsApp) dicatat, termasuk yang gagal atau
 * dilewati karena provider belum dikonfigurasi, sehingga operator punya jejak
 * pengiriman tanpa bergantung pada log proses.
 */
export const notifikasiTerkirim = mysqlTable(
  "notifikasi_terkirim",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id"),
    /** Jenis peristiwa, mis. `registrasi-warga.disetujui`. */
    jenis: varchar("jenis", { length: 60 }).notNull(),
    /** `email` | `whatsapp`. */
    kanal: varchar("kanal", { length: 20 }).notNull(),
    target: varchar("target", { length: 255 }).notNull(),
    subjek: varchar("subjek", { length: 200 }),
    pesan: text("pesan"),
    sukses: boolean("sukses").notNull().default(false),
    /** `true` bila provider belum dikonfigurasi sehingga pengiriman dilewati. */
    dilewati: boolean("dilewati").notNull().default(false),
    responsProvider: text("respons_provider"),
    pesanError: text("pesan_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifikasi_village_resident_idx").on(t.villageId, t.residentId),
    // Composite `RESTRICT`: `village_id` child NOT NULL, sehingga composite
    // `SET NULL` tidak mungkin. Repository melepas `resident_id` lebih dulu.
    foreignKey({
      name: "notifikasi_terkirim_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
  ],
);

export type NotifikasiTerkirim = typeof notifikasiTerkirim.$inferSelect;
export type NewNotifikasiTerkirim = typeof notifikasiTerkirim.$inferInsert;
