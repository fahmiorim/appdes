import {
  foreignKey,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

/** Snapshot laporan yang dibuat operator; data sumber tetap berada di modul asal. */
export const laporanDesaTersimpan = mysqlTable(
  "laporan_desa_tersimpan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    judul: varchar("judul", { length: 200 }).notNull(),
    jenis: varchar("jenis", { length: 30 }).notNull(),
    tahun: int("tahun").notNull(),
    deskripsi: text("deskripsi"),
    kolom: json("kolom").$type<string[]>().notNull(),
    baris: json("baris").$type<(string | number)[][]>().notNull(),
    dibuatOleh: varchar("dibuat_oleh", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("laporan_desa_tersimpan_village_created_idx").on(t.villageId, t.createdAt),
    index("laporan_desa_tersimpan_village_type_year_idx").on(t.villageId, t.jenis, t.tahun),
    foreignKey({
      name: "laporan_desa_tersimpan_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "laporan_desa_tersimpan_user_fk",
      columns: [t.dibuatOleh],
      foreignColumns: [users.id],
    }).onDelete("set null"),
  ],
);

export type LaporanDesaTersimpan = typeof laporanDesaTersimpan.$inferSelect;

/** Template laporan yang dapat digunakan ulang oleh operator desa. */
export const laporanDesaTemplate = mysqlTable(
  "laporan_desa_template",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    judul: varchar("judul", { length: 150 }).notNull(),
    jenis: varchar("jenis", { length: 30 }).notNull(),
    deskripsi: text("deskripsi"),
    createdBy: varchar("created_by", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("laporan_desa_template_village_created_idx").on(t.villageId, t.createdAt),
    index("laporan_desa_template_village_type_idx").on(t.villageId, t.jenis),
    foreignKey({
      name: "laporan_desa_template_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "laporan_desa_template_user_fk",
      columns: [t.createdBy],
      foreignColumns: [users.id],
    }).onDelete("set null"),
  ],
);
