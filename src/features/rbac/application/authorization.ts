import "server-only";

import { cache } from "react";

import {
  applyParentInheritance,
  levelAllows,
  type AccessLevel,
  type Action,
  type ModuleActions,
} from "@/features/rbac/domain/permission";
import {
  findRoleById,
  listActionsByRole,
  listLevelsByRole,
  listModules,
} from "@/features/rbac/infrastructure/rbac-repository";

/** Slug role super admin: melewati seluruh pemeriksaan izin. */
export const SUPERADMIN_SLUG = "administrator";

/** Modul bawaan yang selalu dapat dibaca setiap pengguna yang sudah masuk. */
export const DEFAULT_RESOURCE = "beranda";

export interface EffectivePermissions {
  isSuperadmin: boolean;
  levelByResource: Map<string, AccessLevel>;
  actionByResource: Map<string, ModuleActions>;
}

const EMPTY_PERMISSIONS: EffectivePermissions = {
  isSuperadmin: false,
  levelByResource: new Map(),
  actionByResource: new Map(),
};

/**
 * Hitung izin efektif sebuah role, termasuk warisan induk ← anak.
 *
 * Di-cache per-permintaan memakai `cache()` React sehingga berapa kali pun
 * dipanggil dalam satu render/aksi, query hanya dijalankan sekali.
 */
export const computeEffectivePermissions = cache(
  async (roleId: number, villageId: number | null): Promise<EffectivePermissions> => {
    const role = await findRoleById(roleId, villageId);

    if (!role) return EMPTY_PERMISSIONS;

    if (
      role.slug === SUPERADMIN_SLUG &&
      role.isSystem &&
      role.villageId === null &&
      villageId === null
    ) {
      return { isSuperadmin: true, levelByResource: new Map(), actionByResource: new Map() };
    }

    const [modules, levelById, actionsById] = await Promise.all([
      listModules(villageId),
      listLevelsByRole(roleId, villageId),
      listActionsByRole(roleId, villageId),
    ]);
    const actionByResource = new Map<string, ModuleActions>();
    const childrenByParent = new Map<number, number[]>();
    for (const module of modules) {
      const parentId = module.parentId ?? 0;
      if (parentId > 0) childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), module.id]);
      const actions = actionsById.get(module.id);
      if (actions) actionByResource.set(module.slug, actions);
    }
    // Menu induk hanya mendapat izin lihat jika setidaknya satu anak memang dapat dibaca.
    for (const module of modules) {
      const childIds = childrenByParent.get(module.id) ?? [];
      const childReadable = childIds.some((childId) => actionsById.get(childId)?.read === true);
      if (childReadable) {
        const current = actionByResource.get(module.slug) ?? { read: false, create: false, update: false, delete: false };
        actionByResource.set(module.slug, { ...current, read: true });
      }
    }
    return {
      isSuperadmin: false,
      levelByResource: applyParentInheritance(modules, levelById),
      actionByResource,
    };
  },
);

/** Apakah `permissions` mengizinkan `action` atas `resource`. */
export function hasPermission(
  permissions: EffectivePermissions,
  resource: string,
  action: Action,
): boolean {
  if (permissions.isSuperadmin) return true;
  if (resource === DEFAULT_RESOURCE) return action === "read";
  const actions = permissions.actionByResource.get(resource);
  if (actions) return actions[action];
  return levelAllows(permissions.levelByResource.get(resource), action);
}

/** Daftar slug resource yang boleh dibaca (untuk menyusun menu). */
export function readableResources(permissions: EffectivePermissions): Set<string> {
  const slugs = new Set<string>();

  for (const [slug, level] of permissions.levelByResource) {
    const actions = permissions.actionByResource.get(slug);
    if (actions ? actions.read : levelAllows(level, "read")) slugs.add(slug);
  }

  return slugs;
}
