import { int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { villages } from "./village";

/** Pengaturan keamanan terisolasi per tenant; konfigurasi berupa JSON tervalidasi di application layer. */
export const pengaturanKeamanan = mysqlTable("pengaturan_keamanan", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  konfigurasi: text("konfigurasi").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("pengaturan_keamanan_village_uq").on(t.villageId)]);

/** Daftar IP yang diblokir administrator desa. */
export const ipDiblokir = mysqlTable("ip_diblokir", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  alamatIp: varchar("alamat_ip", { length: 45 }).notNull(),
  alasan: varchar("alasan", { length: 255 }).notNull().default("Diblokir administrator"),
  blockedBy: varchar("blocked_by", { length: 36 }),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("ip_diblokir_village_ip_uq").on(t.villageId, t.alamatIp)]);
