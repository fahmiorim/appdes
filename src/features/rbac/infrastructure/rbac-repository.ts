import "server-only";

import { eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { modules, rolePermissions, roles } from "@/db/schema";
import type { AccessLevel } from "@/features/rbac/domain/permission";

/** Representasi ringkas sebuah role (`roles`). */
export interface RoleRecord {
  id: number;
  villageId: number | null;
  slug: string;
  name: string;
  isSystem: boolean;
}

/** Representasi sebuah modul/resource (`modules`). */
export interface ModuleRecord {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  url: string | null;
  icon: string | null;
  sortOrder: number | null;
  isGroup: boolean;
  isHidden: boolean;
  isActive: boolean;
}

const roleColumns = {
  id: roles.id,
  villageId: roles.villageId,
  slug: roles.slug,
  name: roles.name,
  isSystem: roles.isSystem,
};

const moduleColumns = {
  id: modules.id,
  parentId: modules.parentId,
  slug: modules.slug,
  name: modules.name,
  url: modules.url,
  icon: modules.icon,
  sortOrder: modules.sortOrder,
  isGroup: modules.isGroup,
  isHidden: modules.isHidden,
  isActive: modules.isActive,
};

export async function findRoleById(roleId: number): Promise<RoleRecord | null> {
  const [row] = await db.select(roleColumns).from(roles).where(eq(roles.id, roleId)).limit(1);
  return row ?? null;
}

export async function listModules(villageId: number | null): Promise<ModuleRecord[]> {
  const rows = await db
    .select(moduleColumns)
    .from(modules)
    .where(villageId === null ? isNull(modules.villageId) : eq(modules.villageId, villageId));

  // Di basis data, modul tingkat atas disimpan sebagai `parent_id = 0`.
  // Domain memakai `null`; samakan di sini agar hierarki menu/matriks konsisten.
  return rows.map((row) => ({ ...row, parentId: row.parentId === 0 ? null : row.parentId }));
}

/** Tingkat akses per modul untuk sebuah role. */
export async function listLevelsByRole(roleId: number): Promise<Map<number, AccessLevel>> {
  const rows = await db
    .select({ moduleId: rolePermissions.moduleId, access: rolePermissions.access })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  return new Map(rows.map((row) => [row.moduleId, row.access]));
}

export async function listRoles(villageId?: number): Promise<RoleRecord[]> {
  const query = db.select(roleColumns).from(roles);

  if (villageId === undefined) {
    return query.orderBy(roles.createdAt, roles.name);
  }

  return query
    .where(or(eq(roles.villageId, villageId), isNull(roles.villageId)))
    .orderBy(roles.createdAt, roles.name);
}

export async function getRoleBySlug(slug: string): Promise<RoleRecord | null> {
  const [row] = await db.select(roleColumns).from(roles).where(eq(roles.slug, slug)).limit(1);
  return row ?? null;
}

export async function getRoleById(id: number): Promise<RoleRecord | null> {
  const [row] = await db.select(roleColumns).from(roles).where(eq(roles.id, id)).limit(1);
  return row ?? null;
}

export async function clearRolePermissions(roleId: number): Promise<void> {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
}

export async function createRole(input: {
  villageId: number;
  name: string;
  slug?: string;
}): Promise<RoleRecord> {
  const slug = input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-");
  const [inserted] = await db
    .insert(roles)
    .values({ villageId: input.villageId, name: input.name, slug })
    .$returningId();
  if (!inserted) throw new Error("Gagal membuat role.");
  const role = await getRoleById(inserted.id);
  if (!role) throw new Error("Gagal mengambil role baru.");
  return role;
}

export async function updateRole(
  id: number,
  input: { name: string; slug?: string },
): Promise<void> {
  const updates: Record<string, unknown> = { name: input.name };
  if (input.slug) updates.slug = input.slug;
  await db.update(roles).set(updates).where(eq(roles.id, id));
}

export async function deleteRole(id: number): Promise<void> {
  await db.delete(roles).where(eq(roles.id, id));
}

export async function setRolePermissions(
  roleId: number,
  perms: Array<{ moduleId: number; access: AccessLevel }>,
): Promise<void> {
  await clearRolePermissions(roleId);
  if (perms.length === 0) return;
  await db
    .insert(rolePermissions)
    .values(perms.map((p) => ({ roleId, moduleId: p.moduleId, access: p.access })));
}
