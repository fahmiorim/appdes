import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { roles } from "./rbac";
import { residents } from "./resident";
import { villages } from "./village";

/**
 * Skema identitas & sesi untuk **better-auth** (tabel jamak).
 *
 * Definisi kolom mengikuti keluaran `getSchema()` dari better-auth 1.7 sehingga
 * adapter Drizzle mengenali seluruh field. Kolom tambahan kita (`villageId`,
 * `roleId`, `active`, `lastLoginAt`) didaftarkan lewat `additionalFields` di
 * `src/lib/auth.ts`.
 */

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),

    username: varchar("username", { length: 100 }),
    displayUsername: varchar("display_username", { length: 100 }),

    villageId: int("village_id").references(() => villages.id, { onDelete: "set null" }),
    roleId: int("role_id").references(() => roles.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    mustChangePin: boolean("must_change_pin").notNull().default(true),
    otpLoginAktif: boolean("otp_login_aktif").notNull().default(false),
    residentId: int("resident_id").references(() => residents.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_username_uq").on(t.username),
    index("users_role_idx").on(t.roleId),
    // Satu akun warga per penduduk. MySQL mengizinkan banyak NULL, sehingga
    // akun staf (tanpa residentId) tetap aman.
    uniqueIndex("users_resident_uq").on(t.residentId),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.token), index("sessions_user_idx").on(t.userId)],
);

export const accounts = mysqlTable(
  "accounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    uniqueIndex("accounts_provider_account_uq").on(t.providerId, t.accountId),
  ],
);

export const verifications = mysqlTable(
  "verifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// --- Relasi ---------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  village: one(villages, { fields: [users.villageId], references: [villages.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
