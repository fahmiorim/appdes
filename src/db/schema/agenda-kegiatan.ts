import {
  boolean,
  date,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { villages } from "./village";

/**
 * Agenda kegiatan desa untuk situs publik.
 *
 * Sengaja terpisah dari `bumindes_agenda` (buku agenda surat masuk/keluar):
 * metadata surat internal tidak boleh bocor ke situs publik. Hanya baris dengan
 * `tayang = true` yang boleh dibaca halaman publik.
 */
export const agendaKegiatan = mysqlTable(
  "agenda_kegiatan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    judul: varchar("judul", { length: 200 }).notNull(),
    mulai: date("mulai", { mode: "string" }).notNull(),
    selesai: date("selesai", { mode: "string" }),
    lokasi: varchar("lokasi", { length: 200 }),
    deskripsi: text("deskripsi"),
    tayang: boolean("tayang").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("agenda_kegiatan_village_mulai_idx").on(t.villageId, t.mulai)],
);

export type AgendaKegiatan = typeof agendaKegiatan.$inferSelect;
