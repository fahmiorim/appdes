import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { ACCESS_LEVELS } from "@/features/rbac/domain/permission";

import { villages } from "./village";

/**
 * RBAC: `roles` × `modules` dengan matriks `role_permissions`.
 *
 * Tingkat akses disimpan sebagai nilai bernama (`read`/`write`/`manage`) yang
 * kosakatanya berasal dari domain RBAC, bukan kode bitmask.
 */

/** `roles` — role pengguna. Role sistem tidak boleh diubah/dihapus lewat UI. */
export const roles = mysqlTable(
  "roles",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").references(() => villages.id, { onDelete: "set null" }),
    name: varchar("name", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("roles_village_slug_uq").on(t.villageId, t.slug),
    uniqueIndex("roles_village_name_uq").on(t.villageId, t.name),
  ],
);

/**
 * `modules` — katalog modul/menu (≈ resource izin).
 * `parent_id` = 0 berarti modul tingkat atas.
 */
export const modules = mysqlTable(
  "modules",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").references(() => villages.id, { onDelete: "set null" }),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    url: varchar("url", { length: 255 }),
    icon: varchar("icon", { length: 100 }).default(""),
    /** Modul yang hanya menjadi judul/grup (punya anak, tanpa halaman sendiri). */
    isGroup: boolean("is_group").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").default(0),
    parentId: int("parent_id").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("modules_village_slug_uq").on(t.villageId, t.slug),
    index("modules_parent_idx").on(t.parentId),
  ],
);

/** `role_permissions` — matriks role × modul dengan tingkat akses bernama. */
export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    moduleId: int("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    access: mysqlEnum("access", ACCESS_LEVELS).notNull(),
  },
  (t) => [
    uniqueIndex("role_permissions_role_module_uq").on(t.roleId, t.moduleId),
    index("role_permissions_module_idx").on(t.moduleId),
  ],
);

// --- Relasi (untuk query API Drizzle) -------------------------------------

export const rolesRelations = relations(roles, ({ many, one }) => ({
  permissions: many(rolePermissions),
  village: one(villages, {
    fields: [roles.villageId],
    references: [villages.id],
  }),
}));

export const modulesRelations = relations(modules, ({ many, one }) => ({
  permissions: many(rolePermissions),
  village: one(villages, {
    fields: [modules.villageId],
    references: [villages.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  module: one(modules, {
    fields: [rolePermissions.moduleId],
    references: [modules.id],
  }),
}));

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
