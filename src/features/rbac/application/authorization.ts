import "server-only";

import { cache } from "react";

import {
  applyParentInheritance,
  levelAllows,
  type AccessLevel,
  type Action,
} from "@/features/rbac/domain/permission";
import {
  findRoleById,
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
}

const EMPTY_PERMISSIONS: EffectivePermissions = {
  isSuperadmin: false,
  levelByResource: new Map(),
};

/**
 * Hitung izin efektif sebuah role, termasuk warisan induk ← anak.
 *
 * Di-cache per-permintaan memakai `cache()` React sehingga berapa kali pun
 * dipanggil dalam satu render/aksi, query hanya dijalankan sekali.
 */
export const computeEffectivePermissions = cache(
  async (roleId: number, villageId: number | null): Promise<EffectivePermissions> => {
    const role = await findRoleById(roleId);

    if (!role) return EMPTY_PERMISSIONS;

    if (role.slug === SUPERADMIN_SLUG) {
      return { isSuperadmin: true, levelByResource: new Map() };
    }

    const [modules, levelById] = await Promise.all([
      listModules(villageId),
      listLevelsByRole(roleId),
    ]);

    return {
      isSuperadmin: false,
      levelByResource: applyParentInheritance(modules, levelById),
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
  return levelAllows(permissions.levelByResource.get(resource), action);
}

/** Daftar slug resource yang boleh dibaca (untuk menyusun menu). */
export function readableResources(permissions: EffectivePermissions): Set<string> {
  const slugs = new Set<string>();

  for (const [slug, level] of permissions.levelByResource) {
    if (levelAllows(level, "read")) slugs.add(slug);
  }

  return slugs;
}
