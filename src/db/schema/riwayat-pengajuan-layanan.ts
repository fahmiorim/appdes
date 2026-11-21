import {
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { pengajuanLayanan } from "./pengajuan-layanan";
import { villages } from "./village";

/** Jejak perubahan status pengajuan yang append-only. */
export const riwayatPengajuanLayanan = mysqlTable(
  "riwayat_pengajuan_layanan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    pengajuanId: int("pengajuan_id").notNull(),
    statusSebelumnya: varchar("status_sebelumnya", { length: 24 }),
    statusBaru: varchar("status_baru", { length: 24 }).notNull(),
    catatan: text("catatan"),
    actorId: varchar("actor_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("riwayat_pengajuan_tenant_request_idx").on(t.villageId, t.pengajuanId, t.createdAt),
    foreignKey({
      name: "riwayat_pengajuan_request_tenant_fk",
      columns: [t.villageId, t.pengajuanId],
      foreignColumns: [pengajuanLayanan.villageId, pengajuanLayanan.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "riwayat_pengajuan_village_fk",
      columns: [t.villageId],
      foreignColumns: [villages.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "riwayat_pengajuan_actor_fk",
      columns: [t.actorId],
      foreignColumns: [users.id],
    }).onDelete("set null"),
  ],
);
