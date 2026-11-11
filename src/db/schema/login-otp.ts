import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { users } from "./auth";

/**
 * `login_otp` — kode OTP sekali pakai untuk faktor kedua saat login.
 *
 * Hanya hash kode yang disimpan. Satu baris aktif per pengguna; permintaan baru
 * menggantikan kode sebelumnya.
 */
export const loginOtp = mysqlTable("login_otp", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kanal: varchar("kanal", { length: 20 }).notNull(),
  target: varchar("target", { length: 255 }).notNull(),
  kodeHash: varchar("kode_hash", { length: 64 }).notNull(),
  kedaluwarsa: timestamp("kedaluwarsa").notNull(),
  percobaan: int("percobaan").notNull().default(0),
  terpakaiAt: timestamp("terpakai_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LoginOtp = typeof loginOtp.$inferSelect;
