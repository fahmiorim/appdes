import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";

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

export async function findRoleById(
  roleId: number,
  villageId: number | null,
): Promise<RoleRecord | null> {
  const tenantFilter =
    villageId === null
      ? isNull(roles.villageId)
      : or(eq(roles.villageId, villageId), isNull(roles.villageId));
  const [row] = await db
    .select(roleColumns)
    .from(roles)
    .where(and(eq(roles.id, roleId), tenantFilter))
    .limit(1);
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
export async function listLevelsByRole(
  roleId: number,
  villageId: number | null,
): Promise<Map<number, AccessLevel>> {
  const moduleTenantFilter =
    villageId === null ? isNull(modules.villageId) : eq(modules.villageId, villageId);
  const roleTenantFilter =
    villageId === null
      ? isNull(roles.villageId)
      : or(eq(roles.villageId, villageId), isNull(roles.villageId));
  const rows = await db
    .select({ moduleId: rolePermissions.moduleId, access: rolePermissions.access })
    .from(rolePermissions)
    .innerJoin(
      roles,
      and(eq(roles.id, rolePermissions.roleId), roleTenantFilter),
    )
    .innerJoin(
      modules,
      and(eq(modules.id, rolePermissions.moduleId), moduleTenantFilter),
    )
    .where(eq(rolePermissions.roleId, roleId));

  return new Map(rows.map((row) => [row.moduleId, row.access]));
}

export async function listRoles(villageId: number | null): Promise<RoleRecord[]> {
  return db
    .select(roleColumns)
    .from(roles)
    .where(
      villageId === null
        ? isNull(roles.villageId)
        : or(eq(roles.villageId, villageId), isNull(roles.villageId)),
    )
    .orderBy(roles.createdAt, roles.name);
}

export async function getRoleBySlug(
  slug: string,
  villageId: number | null,
): Promise<RoleRecord | null> {
  const tenantFilter =
    villageId === null
      ? isNull(roles.villageId)
      : or(eq(roles.villageId, villageId), isNull(roles.villageId));
  const [row] = await db
    .select(roleColumns)
    .from(roles)
    .where(and(eq(roles.slug, slug), tenantFilter))
    .limit(1);
  return row ?? null;
}

export async function getRoleById(
  id: number,
  villageId: number | null,
): Promise<RoleRecord | null> {
  const tenantFilter =
    villageId === null
      ? isNull(roles.villageId)
      : or(eq(roles.villageId, villageId), isNull(roles.villageId));
  const [row] = await db
    .select(roleColumns)
    .from(roles)
    .where(and(eq(roles.id, id), tenantFilter))
    .limit(1);
  return row ?? null;
}

export async function clearRolePermissions(roleId: number, villageId: number): Promise<void> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.villageId, villageId)))
    .limit(1);
  if (!role) throw new Error("Grup akses tidak ditemukan pada desa aktif.");
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
  const role = await getRoleById(inserted.id, input.villageId);
  if (!role) throw new Error("Gagal mengambil role baru.");
  return role;
}

export async function updateRole(
  villageId: number,
  id: number,
  input: { name: string; slug?: string },
): Promise<void> {
  const updates: Record<string, unknown> = { name: input.name };
  if (input.slug) updates.slug = input.slug;
  await db
    .update(roles)
    .set(updates)
    .where(and(eq(roles.villageId, villageId), eq(roles.id, id)));
}

export async function deleteRole(villageId: number, id: number): Promise<void> {
  await db.delete(roles).where(and(eq(roles.villageId, villageId), eq(roles.id, id)));
}

export async function setRolePermissions(
  villageId: number,
  roleId: number,
  perms: Array<{ moduleId: number; access: AccessLevel }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.villageId, villageId)))
      .limit(1);
    if (!role) throw new Error("Grup akses tidak ditemukan pada desa aktif.");

    const moduleIds = [...new Set(perms.map((permission) => permission.moduleId))];
    if (moduleIds.length > 0) {
      const validModules = await tx
        .select({ id: modules.id })
        .from(modules)
        .where(and(eq(modules.villageId, villageId), inArray(modules.id, moduleIds)));
      if (validModules.length !== moduleIds.length) {
        throw new Error("Salah satu modul tidak ditemukan pada desa aktif.");
      }
    }

    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (perms.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(perms.map((permission) => ({ roleId, moduleId: permission.moduleId, access: permission.access })));
    }
  });
}
