import {
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

export const kontak = mysqlTable(
  "kontak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    /** Opsional: tautkan kontak ke penduduk desa (NIK). Bisa null untuk kontak eksternal. */
    residentId: int("resident_id").references(() => residents.id, { onDelete: "set null" }),
    nama: varchar("nama", { length: 100 }).notNull(),
    telepon: varchar("telepon", { length: 20 }),
    email: varchar("email", { length: 100 }),
    telegram: varchar("telegram", { length: 50 }),
    hubungWarga: varchar("hubung_warga", { length: 50 }).default("Telegram"),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("kontak_village_telepon_uq").on(t.villageId, t.telepon),
    uniqueIndex("kontak_village_telegram_uq").on(t.villageId, t.telegram),
    uniqueIndex("kontak_village_email_uq").on(t.villageId, t.email),
    index("kontak_village_idx").on(t.villageId),
    index("kontak_village_resident_idx").on(t.villageId, t.residentId),
  ],
);

export const kontakGrup = mysqlTable(
  "kontak_grup",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    namaGrup: varchar("nama_grup", { length: 50 }).notNull(),
    keterangan: text("keterangan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("kontak_grup_village_idx").on(t.villageId)],
);

export const anggotaGrupKontak = mysqlTable(
  "anggota_grup_kontak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    grupId: int("grup_id")
      .notNull()
      .references(() => kontakGrup.id, { onDelete: "cascade" }),
    kontakId: int("kontak_id")
      .notNull()
      .references(() => kontak.id, { onDelete: "cascade" }),
    /** Peran anggota dalam grup (mis. "Ketua", "Sekretaris"). */
    peran: varchar("peran", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("anggota_grup_kontak_unique").on(t.grupId, t.kontakId),
    index("anggota_grup_kontak_village_idx").on(t.villageId),
  ],
);
