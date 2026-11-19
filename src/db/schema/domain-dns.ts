import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import type { StatusDns } from "@/features/multi-desa/domain/status-dns";

import { villageDomains } from "./village";

/**
 * `domain_dns_checks` — hasil resolusi DNS terakhir per domain.
 *
 * Satu baris per domain. Alamat disimpan agar operator dapat melihat host yang
 * benar-benar diresolusi, bukan hanya badge status.
 */
export const domainDnsChecks = mysqlTable(
  "domain_dns_checks",
  {
    id: int("id").autoincrement().primaryKey(),
    domainId: int("domain_id")
      .notNull()
      .unique()
      .references(() => villageDomains.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).$type<StatusDns>().notNull(),
    addresses: text("addresses"),
    error: varchar("error", { length: 255 }),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (table) => [index("domain_dns_checks_status_idx").on(table.status)],
);

export type DomainDnsCheck = typeof domainDnsChecks.$inferSelect;
export type NewDomainDnsCheck = typeof domainDnsChecks.$inferInsert;
