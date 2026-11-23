import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { countPenggunaDenganRole } from "@/features/pengguna/infrastructure/pengguna-repository";
import { GRUP_AKSES_RESOURCE, type RoleFormInput } from "@/features/rbac/domain/grup";
import { fromCrudPermissions, toCrudPermissions } from "@/features/rbac/domain/permission";
import {
  createRole,
  deleteRole,
  getRoleById,
  listActionsByRole,
  listLevelsByRole,
  listModules,
  listRoles,
  setRolePermissions,
  updateRole,
} from "@/features/rbac/infrastructure/rbac-repository";
import { requirePermission, requireUser } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/** Pastikan role yang diakses berada pada desa yang sama. */
async function getScopedRole(id: number, villageId: number) {
  const role = await getRoleById(id, villageId);
  if (!role || (role.villageId !== null && role.villageId !== villageId)) {
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

  const [modules, levels, actions] = await Promise.all([
    listModules(villageId),
    listLevelsByRole(id, villageId),
    listActionsByRole(id, villageId),
  ]);

  const permissions = modules.map((m) => {
    const level = levels.get(m.id) ?? null;
    const legacy = toCrudPermissions(level);
    const crud = actions.get(m.id) ?? {
      read: legacy.canRead,
      create: legacy.canCreate,
      update: legacy.canUpdate,
      delete: legacy.canDelete,
    };
    return {
      moduleId: m.id,
      slug: m.slug,
      name: m.name,
      url: m.url,
      icon: m.icon,
      parentId: m.parentId,
      isGroup: m.isGroup,
      isActive: m.isActive,
      read: crud.read,
      create: crud.create,
      update: crud.update,
      delete: crud.delete,
    };
  });

  return { role, permissions };
}

export async function createRoleData(input: RoleFormInput): Promise<{ id: number }> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "create");
  const villageId = await resolveVillageId(user);

  const existing = await listRoles(villageId);
  if (existing.some((r) => r.name.toLowerCase() === input.name.toLowerCase())) {
    throw conflict("Nama grup sudah digunakan.");
  }

  const role = await createRole({ villageId, name: input.name });

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.grupAksesCreate,
    resource: GRUP_AKSES_RESOURCE,
    resourceId: String(role.id),
  });

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

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.grupAksesUpdate,
    resource: GRUP_AKSES_RESOURCE,
    resourceId: String(id),
  });
}

export async function deleteRoleData(id: number): Promise<void> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(id, villageId);
  if (role.isSystem) throw conflict("Grup sistem tidak dapat dihapus.");
  const assigned = await countPenggunaDenganRole(villageId, id);
  if (assigned > 0)
    throw conflict(
      "Role masih digunakan oleh " +
        assigned +
        " pengguna. Pindahkan pengguna ke role lain terlebih dahulu.",
    );

  await deleteRole(villageId, id);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.grupAksesDelete,
    resource: GRUP_AKSES_RESOURCE,
    resourceId: String(id),
  });
}

export async function saveRolePermissions(
  roleId: number,
  perms: Array<{
    moduleId: number;
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  }>,
): Promise<void> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const role = await getScopedRole(roleId, villageId);
  if (role.isSystem) throw conflict("Izin grup sistem tidak dapat diubah.");

  const modules = await listModules(villageId);
  const validModuleIds = new Set(modules.map((modul) => modul.id));

  if (perms.some((p) => !p.read && (p.create || p.update || p.delete))) {
    throw conflict("Izin Lihat wajib aktif sebelum Tambah, Ubah, atau Hapus diberikan.");
  }

  const mapped = perms.flatMap((p) => {
    if (!validModuleIds.has(p.moduleId)) return [];

    const access = fromCrudPermissions({
      canRead: p.read,
      canCreate: p.create,
      canUpdate: p.update,
      canDelete: p.delete,
    });
    return access === null
      ? []
      : [
          {
            moduleId: p.moduleId,
            access,
            read: p.read,
            create: p.create,
            update: p.update,
            delete: p.delete,
          },
        ];
  });

  await setRolePermissions(villageId, roleId, mapped);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.grupAksesPermission,
    resource: GRUP_AKSES_RESOURCE,
    resourceId: String(roleId),
    details: { jumlahModul: mapped.length },
  });
}

/** Buat role kustom baru dengan menyalin matriks izin role sumber dalam tenant yang sama. */
export async function duplicateRoleData(
  sourceRoleId: number,
  input: RoleFormInput,
): Promise<{ id: number }> {
  const source = await getRoleDetail(sourceRoleId);
  const created = await createRoleData(input);
  await saveRolePermissions(
    created.id,
    source.permissions.map((permission) => ({
      moduleId: permission.moduleId,
      read: permission.read,
      create: permission.create,
      update: permission.update,
      delete: permission.delete,
    })),
  );
  return created;
}
