import { foreignKey, index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import { pengajuanLayanan } from "./pengajuan-layanan";
import { villages } from "./village";

export const pengajuanLayananBerkas = mysqlTable(
  "pengajuan_layanan_berkas",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    pengajuanId: int("pengajuan_id").notNull(),
    namaPersyaratan: varchar("nama_persyaratan", { length: 180 }).notNull(),
    jenis: varchar("jenis", { length: 20 }).notNull().default("persyaratan"),
    jalur: varchar("jalur", { length: 500 }).notNull(),
    namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 80 }).notNull().default("application/pdf"),
    ukuran: int("ukuran").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pengajuan_layanan_berkas_tenant_request_idx").on(t.villageId, t.pengajuanId),
    foreignKey({
      name: "pengajuan_layanan_berkas_request_tenant_fk",
      columns: [t.villageId, t.pengajuanId],
      foreignColumns: [pengajuanLayanan.villageId, pengajuanLayanan.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pengajuan_layanan_berkas_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    index("pengajuan_layanan_berkas_tenant_type_idx").on(t.villageId, t.pengajuanId, t.jenis),
  ],
);
