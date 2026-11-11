import { int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { users } from "./auth";

/**
 * `pengguna_menu_urutan` — urutan menu sidebar per pengguna.
 *
 * Hanya slug menu tingkat atas yang disimpan. Slug divalidasi ulang terhadap
 * menu yang boleh dibaca saat disimpan dan saat ditampilkan, sehingga menu baru
 * tetap muncul (di urutan bawaan) dan menu yang izinnya dicabut otomatis hilang.
 */
export const penggunaMenuUrutan = mysqlTable(
  "pengguna_menu_urutan",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 100 }).notNull(),
    urut: int("urut").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pengguna_menu_urutan_user_slug_uq").on(t.userId, t.slug)],
);

export type PenggunaMenuUrutan = typeof penggunaMenuUrutan.$inferSelect;
