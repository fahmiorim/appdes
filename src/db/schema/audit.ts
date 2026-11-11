import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

/**
 * Rekam aktivitas keamanan dan perubahan administratif.
 *
 * `details` sengaja disimpan sebagai teks JSON yang sudah disanitasi oleh
 * application layer agar skema tidak mengikat provider database pada bentuk
 * payload tertentu dan rahasia kredensial tidak ikut tercatat.
 */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").references(() => villages.id, { onDelete: "set null" }),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    event: varchar("event", { length: 80 }).notNull(),
    resource: varchar("resource", { length: 80 }).notNull(),
    resourceId: varchar("resource_id", { length: 100 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    details: text("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_village_created_idx").on(table.villageId, table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorId, table.createdAt),
    index("audit_logs_event_idx").on(table.event),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
