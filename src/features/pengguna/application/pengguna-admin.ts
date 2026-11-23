import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getRoleDetail } from "@/features/rbac/application/grup-use-cases";
import { GRUP_AKSES_RESOURCE } from "@/features/rbac/domain/grup";
import { isPlatformRole } from "@/features/rbac/domain/role";
import {
  listLevelsByRole,
  listModules,
  listRoles,
  type RoleRecord,
} from "@/features/rbac/infrastructure/rbac-repository";
import { requirePermission } from "@/lib/dal";

import { PENGGUNA_RESOURCE, type PenggunaDTO } from "../domain/pengguna";
import { hitungStatistikPengguna, type StatistikPengguna } from "../domain/statistik-pengguna";
import { listPengguna } from "../infrastructure/pengguna-repository";

export interface PenggunaAdminData {
  rows: PenggunaDTO[];
  roles: RoleRecord[];
  statistik: StatistikPengguna;
  currentUserId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  moduleCount: number;
  totalHakAkses: number;
}

/**
 * Data halaman Manajemen Pengguna.
 *
 * Role yang ditawarkan hanya role milik desa sesi; role global dan role
 * platform tidak pernah ikut, sama seperti aturan pada `createPenggunaData`.
 */
export async function getPenggunaAdminData(): Promise<PenggunaAdminData> {
  const user = await requirePermission(PENGGUNA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [rows, roleRows, modules] = await Promise.all([
    listPengguna(villageId),
    listRoles(villageId),
    listModules(villageId),
  ]);
  const roles = roleRows.filter((role) => role.villageId === villageId && !isPlatformRole(role));
  const permissionMaps = await Promise.all(
    roles.map((role) => listLevelsByRole(role.id, villageId)),
  );
  const totalHakAkses = permissionMaps.reduce((total, permissions) => total + permissions.size, 0);

  return {
    rows,
    roles,
    statistik: hitungStatistikPengguna(rows),
    currentUserId: user.id,
    canCreate: hasPermission(user.permissions, PENGGUNA_RESOURCE, "create"),
    canUpdate: hasPermission(user.permissions, PENGGUNA_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, PENGGUNA_RESOURCE, "delete"),
    moduleCount: modules.filter((module) => module.isActive && !module.isHidden && !module.isGroup)
      .length,
    totalHakAkses,
  };
}

export interface GrupAksesAdminData {
  roles: RoleRecord[];
  statistik: StatistikPengguna;
  selected: Awaited<ReturnType<typeof getRoleDetail>> | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  moduleCount: number;
  totalHakAkses: number;
  canAudit: boolean;
}

/**
 * Data halaman Hak Akses (role) dan matriks izin.
 *
 * `roleParam` hanya memilih role yang ditampilkan; kepemilikan role tetap
 * diverifikasi `getRoleDetail` terhadap desa dari sesi.
 */
export async function getGrupAksesAdminData(roleParam?: number): Promise<GrupAksesAdminData> {
  const user = await requirePermission(GRUP_AKSES_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [roleRows, pengguna, modules] = await Promise.all([
    listRoles(villageId),
    listPengguna(villageId),
    listModules(villageId),
  ]);
  const roles = roleRows.filter((role) => role.villageId === villageId && !isPlatformRole(role));

  const [dipilih, permissionMaps] = await Promise.all([
    roleParam !== undefined && roles.some((role) => role.id === roleParam)
      ? getRoleDetail(roleParam)
      : Promise.resolve(null),
    Promise.all(roles.map((role) => listLevelsByRole(role.id, villageId))),
  ]);
  const totalHakAkses = permissionMaps.reduce((total, permissions) => total + permissions.size, 0);

  return {
    roles,
    statistik: hitungStatistikPengguna(pengguna),
    selected: dipilih,
    canCreate: hasPermission(user.permissions, GRUP_AKSES_RESOURCE, "create"),
    canUpdate: hasPermission(user.permissions, GRUP_AKSES_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, GRUP_AKSES_RESOURCE, "delete"),
    moduleCount: modules.filter((module) => module.isActive && !module.isHidden && !module.isGroup)
      .length,
    totalHakAkses,
    canAudit: hasPermission(user.permissions, "audit-log", "read"),
  };
}
