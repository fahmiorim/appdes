import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `umpan_balik` — masukan/umpan balik warga dari formulir publik.
 *
 * Formulir publik memakai captcha + honeypot; baris di sini hanya menyimpan isi
 * yang lolos validasi. `status` dipakai operator untuk menandai apakah pesan
 * sudah dibaca/ditindaklanjuti. Tidak ada data pribadi wajib, sehingga warga
 * boleh mengirim secara anonim.
 */
export const umpanBalik = mysqlTable(
  "umpan_balik",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Nama pengirim (opsional). */
    nama: varchar("nama", { length: 100 }),
    /** Kontak pengirim: email/telepon (opsional). */
    kontak: varchar("kontak", { length: 150 }),
    /** Isi umpan balik. */
    pesan: text("pesan").notNull(),

    /** `baru` | `dibaca` | `ditindaklanjuti`. */
    status: varchar("status", { length: 20 }).notNull().default("baru"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("umpan_balik_village_status_idx").on(t.villageId, t.status),
    index("umpan_balik_village_created_idx").on(t.villageId, t.createdAt),
  ],
);

export type UmpanBalik = typeof umpanBalik.$inferSelect;
