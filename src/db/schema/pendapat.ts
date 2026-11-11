import {
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
    residentId: int("resident_id").references(() => residents.id, { onDelete: "set null" }),
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
  ],
);
