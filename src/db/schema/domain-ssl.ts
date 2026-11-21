import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

import type { StatusSsl } from "@/features/multi-desa/domain/status-ssl";

import { villageDomains } from "./village";

/**
 * `domain_ssl_checks` — hasil pemeriksaan TLS terakhir per domain.
 *
 * Satu baris per domain (unique `domain_id`). Nilai ditulis hanya oleh
 * pemeriksa server-side setelah handshake TLS nyata; tidak ada status contoh.
 * Baris ikut terhapus saat domain dihapus agar cache tidak menunjuk host lama.
 */
export const domainSslChecks = mysqlTable(
  "domain_ssl_checks",
  {
    id: int("id").autoincrement().primaryKey(),
    domainId: int("domain_id")
      .notNull()
      .unique()
      .references(() => villageDomains.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).$type<StatusSsl>().notNull(),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    issuer: varchar("issuer", { length: 255 }),
    error: varchar("error", { length: 255 }),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (table) => [index("domain_ssl_checks_status_idx").on(table.status)],
);

export type DomainSslCheck = typeof domainSslChecks.$inferSelect;
export type NewDomainSslCheck = typeof domainSslChecks.$inferInsert;
