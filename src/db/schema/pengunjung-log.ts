import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * `pengunjung_log` — log kunjungan ke halaman desa.
 * Mencatat statistik pengunjung per halaman.
 */
export const pengunjungLog = mysqlTable(
  "pengunjung_log",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** Halaman yang dikunjungi. */
    halaman: varchar("halaman", { length: 100 }).notNull(),

    /** Tanggal kunjungan (tanpa waktu) untuk agregasi harian. */
    tanggal: varchar("tanggal", { length: 10 }).notNull(),

    /** Jumlah kunjungan unik pada tanggal tersebut. */
    jumlah: int("jumlah").notNull().default(1),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pengunjung_log_village_halaman_tanggal_idx").on(t.villageId, t.halaman, t.tanggal),
  ],
);

export type PengunjungLog = typeof pengunjungLog.$inferSelect;
export type NewPengunjungLog = typeof pengunjungLog.$inferInsert;
