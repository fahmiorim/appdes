import {
  foreignKey,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { families } from "./family";
import { residents } from "./resident";
import { villages } from "./village";

/**
 * `family_member_logs` — riwayat perubahan anggota Kartu Keluarga.
 *
 * Keanggotaan KK sendiri dinyatakan oleh `residents.family_id` +
 * `residents.family_relation_id`, sehingga perubahannya tidak bisa dibaca dari
 * data saat ini saja. Tabel ini menyimpan jejak setiap perubahan (ditambahkan,
 * dikeluarkan, atau berubah hubungan) beserta nama penduduk saat kejadian agar
 * riwayat tetap terbaca walau penduduknya kemudian dihapus.
 *
 * `familyId` dan `residentId` dilepas (bukan cascade) supaya menghapus KK atau
 * penduduk tidak menghapus riwayat anggotanya. Composite FK memakai `RESTRICT`
 * karena `village_id` child NOT NULL; repository (bukan database) yang
 * mengosongkan referensi dalam transaksi sebelum parent dihapus.
 */
export const AKSI_LOG_ANGGOTA_KK = ["added", "removed", "role_changed"] as const;

export const familyMemberLogs = mysqlTable(
  "family_member_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    familyId: int("family_id"),
    residentId: int("resident_id"),
    /** Nama penduduk pada saat perubahan dicatat. */
    residentName: varchar("resident_name", { length: 100 }).notNull(),
    aksi: mysqlEnum("aksi", AKSI_LOG_ANGGOTA_KK).notNull(),
    relationId: int("relation_id"),
    /** Nama hubungan keluarga saat kejadian (snapshot). */
    relationName: varchar("relation_name", { length: 60 }),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("family_member_logs_family_idx").on(t.familyId, t.createdAt),
    index("family_member_logs_village_idx").on(t.villageId),
    index("family_member_logs_resident_idx").on(t.residentId),
    index("family_member_logs_village_family_idx").on(t.villageId, t.familyId),
    index("family_member_logs_village_resident_idx").on(t.villageId, t.residentId),
    foreignKey({
      name: "family_member_logs_family_tenant_fk",
      columns: [t.villageId, t.familyId],
      foreignColumns: [families.villageId, families.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "family_member_logs_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
  ],
);

export type FamilyMemberLog = typeof familyMemberLogs.$inferSelect;
export type NewFamilyMemberLog = typeof familyMemberLogs.$inferInsert;
