import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

export const villageSecuritySettings = mysqlTable(
  "village_security_settings",
  {
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    passwordMinLength: int("password_min_length").notNull().default(8),
    passwordExpiryDays: int("password_expiry_days").notNull().default(90),
    passwordReuseCount: int("password_reuse_count").notNull().default(3),
    requireUppercase: boolean("require_uppercase").notNull().default(true),
    requireLowercase: boolean("require_lowercase").notNull().default(true),
    requireNumber: boolean("require_number").notNull().default(true),
    requireSymbol: boolean("require_symbol").notNull().default(false),
    sessionTimeoutMinutes: int("session_timeout_minutes").notNull().default(30),
    autoLogoutInactive: boolean("auto_logout_inactive").notNull().default(true),
    concurrentLogin: boolean("concurrent_login").notNull().default(false),
    requireTwoFactorForAllUsers: boolean("require_two_factor_for_all_users")
      .notNull()
      .default(false),
    ipRestrictionEnabled: boolean("ip_restriction_enabled").notNull().default(false),
    allowedIps: text("allowed_ips"),
    updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.villageId] })],
);

export const villageBlockedIps = mysqlTable(
  "village_blocked_ips",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("village_blocked_ip_uq").on(t.villageId, t.ipAddress),
    index("village_blocked_ip_lookup_idx").on(t.villageId, t.ipAddress, t.expiresAt),
  ],
);

export const villageSecuritySettingsRelations = relations(villageSecuritySettings, ({ one }) => ({
  village: one(villages, {
    fields: [villageSecuritySettings.villageId],
    references: [villages.id],
  }),
  updatedByUser: one(users, {
    fields: [villageSecuritySettings.updatedBy],
    references: [users.id],
  }),
}));
