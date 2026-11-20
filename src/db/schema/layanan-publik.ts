import { boolean, date, index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { villages } from "./village";

/** Katalog layanan administrasi dan layanan publik milik satu desa. */
export const layananPublik = mysqlTable("layanan_publik", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id").notNull().references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 180 }).notNull(),
  kategori: varchar("kategori", { length: 60 }).notNull().default("administrasi"),
  deskripsi: text("deskripsi"),
  persyaratan: text("persyaratan"),
  estimasiHari: int("estimasi_hari").notNull().default(1),
  biaya: int("biaya").notNull().default(0),
  metode: varchar("metode", { length: 80 }).notNull().default("online_dan_langsung"),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("layanan_publik_village_active_idx").on(t.villageId, t.aktif), index("layanan_publik_village_name_idx").on(t.villageId, t.nama)]);
export type LayananPublik = typeof layananPublik.$inferSelect;
