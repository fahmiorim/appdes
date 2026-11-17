import {
  foreignKey,
  index,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

export const pendapat = mysqlTable(
  "pendapat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    residentId: int("resident_id"),
    /** Kunci sesi unik (hash dari residentId + ipAddress) untuk mencegah double vote. */
    sessionKey: varchar("session_key", { length: 64 }),
    pengguna: varchar("pengguna", { length: 100 }),
    pilihan: tinyint("pilihan").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pendapat_village_idx").on(t.villageId),
    index("pendapat_created_idx").on(t.createdAt),
    uniqueIndex("pendapat_village_session_uq").on(t.villageId, t.sessionKey),
    index("pendapat_village_resident_idx").on(t.villageId, t.residentId),
    // Composite `RESTRICT`: `village_id` child NOT NULL, sehingga composite
    // `SET NULL` tidak mungkin. Repository melepas `resident_id` lebih dulu.
    foreignKey({
      name: "pendapat_resident_tenant_fk",
      columns: [t.villageId, t.residentId],
      foreignColumns: [residents.villageId, residents.id],
    }).onDelete("restrict"),
  ],
);
