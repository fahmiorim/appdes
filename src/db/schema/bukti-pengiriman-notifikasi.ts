import {
  boolean,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { pengaduan } from "./pengaduan";
import { villages } from "./village";

/**
 * `bukti_pengiriman_notifikasi` — rekam jejak pengiriman notifikasi.
 * Menyimpan bukti pengiriman email/WhatsApp untuk setiap pengaduan.
 */
export const buktiPengirimanNotifikasi = mysqlTable(
  "bukti_pengiriman_notifikasi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** FK ke pengaduan */
    pengaduanId: int("pengaduan_id")
      .notNull()
      .references(() => pengaduan.id, { onDelete: "cascade" }),

    /** Metode: 'email' | 'whatsapp' */
    metode: varchar("metode", { length: 20 }).notNull(),

    /** Target (email atau nomor telepon) */
    target: varchar("target", { length: 255 }).notNull(),

    /** Payload respons provider (JSON) */
    responsProvider: text("respons_provider"),

    /** Sukses atau tidak */
    sukses: boolean("sukses").notNull().default(false),

    /** Pesan error jika gagal */
    pesanError: text("pesan_error"),

    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bukti_pengiriman_pengaduan_metode_target_unique").on(
      t.pengaduanId,
      t.metode,
      t.target,
    ),
  ],
);

export type BuktiPengirimanNotifikasi = typeof buktiPengirimanNotifikasi.$inferSelect;
export type NewBuktiPengirimanNotifikasi = typeof buktiPengirimanNotifikasi.$inferInsert;
