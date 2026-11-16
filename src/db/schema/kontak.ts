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
    residentId: int("resident_id"),
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
    // Parent key untuk composite tenant FK `anggota_grup_kontak.kontak_id`.
    uniqueIndex("kontak_village_id_uq").on(t.villageId, t.id),
    uniqueIndex("kontak_village_telepon_uq").on(t.villageId, t.telepon),
    uniqueIndex("kontak_village_telegram_uq").on(t.villageId, t.telegram),
    uniqueIndex("kontak_village_email_uq").on(t.villageId, t.email),
    index("kontak_village_idx").on(t.villageId),
    index("kontak_village_resident_idx").on(t.villageId, t.residentId),
    // Composite `RESTRICT`: `village_id` child NOT NULL, sehingga composite
    // `SET NULL` tidak mungkin. Repository melepas `resident_id` lebih dulu.
    foreignKey({
      name: "kontak_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
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
  (t) => [
    // Parent key untuk composite tenant FK `anggota_grup_kontak.grup_id`.
    uniqueIndex("kontak_grup_village_id_uq").on(t.villageId, t.id),
    index("kontak_grup_village_idx").on(t.villageId),
  ],
);

export const anggotaGrupKontak = mysqlTable(
  "anggota_grup_kontak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    grupId: int("grup_id").notNull(),
    kontakId: int("kontak_id").notNull(),
    /** Peran anggota dalam grup (mis. "Ketua", "Sekretaris"). */
    peran: varchar("peran", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("anggota_grup_kontak_unique").on(t.grupId, t.kontakId),
    index("anggota_grup_kontak_village_idx").on(t.villageId),
    index("anggota_grup_kontak_village_grup_idx").on(t.villageId, t.grupId),
    index("anggota_grup_kontak_village_kontak_idx").on(t.villageId, t.kontakId),
    foreignKey({
      name: "anggota_grup_kontak_grup_tenant_fk",
      columns: [t.villageId, t.grupId],
      foreignColumns: [kontakGrup.villageId, kontakGrup.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "anggota_grup_kontak_kontak_tenant_fk",
      columns: [t.villageId, t.kontakId],
      foreignColumns: [kontak.villageId, kontak.id],
    }).onDelete("cascade"),
  ],
);
