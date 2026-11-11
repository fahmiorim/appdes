import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

import { villages } from "./village";

export const anjungan = mysqlTable("anjungan", {
  id: int("id").autoincrement().primaryKey(),
  villageId: int("village_id")
    .notNull()
    .references(() => villages.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  deskripsi: text("deskripsi"),
  aktif: int("aktif").default(1),
  urutan: int("urutan").default(0),

  // Kiosk device fields
  uuid: varchar("uuid", { length: 36 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  macAddress: varchar("mac_address", { length: 17 }),
  ipAddressPortPrinter: varchar("ip_address_port_printer", { length: 100 }),
  keyboard: int("keyboard").default(1),
  orientasiLayar: int("orientasi_layar").default(1),
  permohonanSuratTanpaAkun: int("permohonan_surat_tanpa_akun").default(0),
  status: varchar("status", { length: 20 }).default("aktif"),
});

export type Anjungan = typeof anjungan.$inferSelect;
export type NewAnjungan = typeof anjungan.$inferInsert;
