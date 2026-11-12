import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requireUser } from "@/lib/dal";
import { GRUP_AKSES_RESOURCE, type RoleFormInput } from "@/features/rbac/domain/grup";
import { fromCrudPermissions, toCrudPermissions } from "@/features/rbac/domain/permission";
import {
  createRole,
  deleteRole,
  getRoleById,
  listLevelsByRole,
  listModules,
  listRoles,
  setRolePermissions,
  updateRole,
} from "@/features/rbac/infrastructure/rbac-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/** Pastikan role yang diakses berada pada desa yang sama. */
async function getScopedRole(id: number, villageId: number) {
  const role = await getRoleById(id, villageId);
  if (!role) {
    throw notFound("Grup akses tidak ditemukan.");
  }
  return role;
}

export async function listRolesWithMeta() {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listRoles(villageId);
}

/** Nama dan slug peran pengguna sesi; sesi sudah diverifikasi layout/halaman pemanggil. */
export async function getPeranSesi(roleId: number): Promise<{ name: string; slug: string } | null> {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const role = await getRoleById(roleId, villageId);
  return role ? { name: role.name, slug: role.slug } : null;
}

export async function getRoleDetail(id: number) {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(id, villageId);

  const [modules, levels] = await Promise.all([listModules(villageId), listLevelsByRole(id, villageId)]);

  const permissions = modules.map((m) => {
    const level = levels.get(m.id) ?? null;
    const crud = toCrudPermissions(level);
    return {
      moduleId: m.id,
      slug: m.slug,
      name: m.name,
      url: m.url,
      icon: m.icon,
      parentId: m.parentId,
      isGroup: m.isGroup,
      isActive: m.isActive,
      read: crud.canRead,
      write: crud.canWrite,
      manage: crud.canManage,
    };
  });

  return { role, permissions };
}

export async function createRoleData(input: RoleFormInput): Promise<{ id: number }> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await listRoles(villageId);
  if (existing.some((r) => r.name.toLowerCase() === input.name.toLowerCase())) {
    throw conflict("Nama grup sudah digunakan.");
  }

  const role = await createRole({ villageId, name: input.name });
  return { id: role.id };
}

export async function updateRoleData(id: number, input: RoleFormInput): Promise<void> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(id, villageId);
  if (role.isSystem) throw conflict("Grup sistem tidak dapat diubah.");

  const existing = await listRoles(villageId);
  if (existing.some((r) => r.id !== id && r.name.toLowerCase() === input.name.toLowerCase())) {
    throw conflict("Nama grup sudah digunakan.");
  }

  await updateRole(villageId, id, { name: input.name });
}

export async function deleteRoleData(id: number): Promise<void> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(id, villageId);
  if (role.isSystem) throw conflict("Grup sistem tidak dapat dihapus.");

  await deleteRole(villageId, id);
}

export async function saveRolePermissions(
  roleId: number,
  perms: Array<{ moduleId: number; read: boolean; write: boolean; manage: boolean }>,
): Promise<void> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(roleId, villageId);
  if (role.isSystem) throw conflict("Izin grup sistem tidak dapat diubah.");

  const modules = await listModules(villageId);
  const validModuleIds = new Set(modules.map((modul) => modul.id));

  const mapped = perms.flatMap((p) => {
    if (!validModuleIds.has(p.moduleId)) return [];

    const access = fromCrudPermissions({
      canRead: p.read,
      canWrite: p.write,
      canManage: p.manage,
    });

    return access === null ? [] : [{ moduleId: p.moduleId, access }];
  });

  await setRolePermissions(villageId, roleId, mapped);
}
