import "server-only";

import { desaBaruSchema } from "@/features/multi-desa/domain/desa-baru";
import {
  listDesaSuperAdmin,
  provisionDesa,
  type DesaSuperAdminRow,
} from "@/features/multi-desa/infrastructure/provisioning-repository";
import { PLATFORM_ROLE_SLUG } from "@/features/rbac/domain/role";
import { getRoleById } from "@/features/rbac/infrastructure/rbac-repository";
import { requireUser, type CurrentUser } from "@/lib/dal";
import { forbidden } from "@/lib/errors";

/** Role pengelola platform. */
const ROLE_PLATFORM = PLATFORM_ROLE_SLUG;

/**
 * Apakah pengguna berhak mengelola desa.
 *
 * Hak ini milik pengelola platform, bukan pengelola desa. Role `administrator`
 * sengaja tidak diterima walau `permissions.isSuperadmin` bernilai true, dan
 * akun yang terikat desa selalu ditolak — termasuk bila role `super-admin`
 * yang di-seed per desa diberikan kepadanya. Pengelola platform dikenali dari
 * `villageId === null`; role `super-admin` tidak punya izin modul desa,
 * sehingga slug-nya diperiksa langsung.
 */
export async function isSuperAdminUser(user: CurrentUser): Promise<boolean> {
  if (user.villageId !== null) return false;
  if (user.roleId === null) return false;

  const role = await getRoleById(user.roleId, user.villageId);
  return role?.slug === ROLE_PLATFORM;
}

/** Gerbang Server Action/Route Handler pengelolaan desa. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await isSuperAdminUser(user))) {
    throw forbidden("Hanya super admin yang boleh mengelola desa.");
  }
  return user;
}

/** Daftar desa untuk dashboard super admin. */
export async function daftarDesaSuperAdmin(): Promise<DesaSuperAdminRow[]> {
  await requireSuperAdmin();
  return listDesaSuperAdmin();
}

/**
 * Buat desa baru dari data form.
 *
 * Validasi Zod di sini (bukan hanya di komponen) karena Server Action dapat
 * dipanggil langsung tanpa melewati UI.
 */
export async function buatDesaBaru(input: unknown): Promise<{ id: number }> {
  await requireSuperAdmin();
  const parsed = desaBaruSchema.parse(input);
  return provisionDesa(parsed);
}
