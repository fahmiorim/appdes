import { int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { users } from "./auth";

/**
 * `pengguna_shortcut` — pintasan beranda per pengguna.
 *
 * Tujuan divalidasi ulang terhadap menu yang boleh dibaca pengguna saat
 * disimpan dan saat ditampilkan, sehingga penurunan izin otomatis
 * menyembunyikan pintasan lama.
 */
export const penggunaShortcut = mysqlTable(
  "pengguna_shortcut",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    href: varchar("href", { length: 255 }).notNull(),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pengguna_shortcut_user_href_uq").on(t.userId, t.href)],
);

export type PenggunaShortcut = typeof penggunaShortcut.$inferSelect;
