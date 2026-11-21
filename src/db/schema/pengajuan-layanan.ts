import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { layananPublik } from "./layanan-publik";
import { residents } from "./resident";
import { villages } from "./village";

/** Permohonan layanan warga; data pemohon disimpan sebagai snapshot. */
export const pengajuanLayanan = mysqlTable(
  "pengajuan_layanan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    layananId: int("layanan_id").notNull(),
    residentId: int("resident_id"),
    nomorTiket: varchar("nomor_tiket", { length: 40 }).notNull(),
    namaPemohon: varchar("nama_pemohon", { length: 150 }).notNull(),
    nik: varchar("nik", { length: 16 }),
    telepon: varchar("telepon", { length: 30 }),
    email: varchar("email", { length: 150 }),
    alamat: text("alamat"),
    keperluan: text("keperluan").notNull(),
    lampiran: text("lampiran"),
    status: varchar("status", { length: 24 }).notNull().default("diajukan"),
    catatanPetugas: text("catatan_petugas"),
    alasanPenolakan: text("alasan_penolakan"),
    petugasId: varchar("petugas_id", { length: 36 }),
    diprosesPada: timestamp("diproses_pada"),
    selesaiPada: timestamp("selesai_pada"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("pengajuan_layanan_village_ticket_uq").on(t.villageId, t.nomorTiket),
    uniqueIndex("pengajuan_layanan_village_id_uq").on(t.villageId, t.id),
    index("pengajuan_layanan_tenant_status_idx").on(t.villageId, t.status, t.createdAt),
    index("pengajuan_layanan_tenant_layanan_idx").on(t.villageId, t.layananId),
    foreignKey({
      name: "pengajuan_layanan_service_tenant_fk",
      columns: [t.villageId, t.layananId],
      foreignColumns: [layananPublik.villageId, layananPublik.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "pengajuan_layanan_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "pengajuan_layanan_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pengajuan_layanan_petugas_fk",
      columns: [t.petugasId],
      foreignColumns: [users.id],
    }).onDelete("set null"),
  ],
);
export type PengajuanLayanan = typeof pengajuanLayanan.$inferSelect;
