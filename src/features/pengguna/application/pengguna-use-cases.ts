import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  fallbackEmail,
  PENGGUNA_RESOURCE,
  type PenggunaCreateInput,
  type PenggunaDTO,
  type PenggunaUpdateInput,
  type RoleOption,
} from "@/features/pengguna/domain/pengguna";
import {
  createPengguna,
  deletePengguna,
  findPenggunaByEmail,
  findPenggunaByUsername,
  getPenggunaById,
  listPengguna,
  updatePengguna,
} from "@/features/pengguna/infrastructure/pengguna-repository";
import { isPlatformRole } from "@/features/rbac/domain/role";
import { getRoleById, listRoles } from "@/features/rbac/infrastructure/rbac-repository";
import { requirePermission, requireUser } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/** Data profil pengguna yang sedang login (halaman "Profil Saya"). */
export async function getProfilSaya(): Promise<PenggunaDTO> {
  const user = await requireUser();

  const profil = await getPenggunaById(user.id);
  if (!profil) throw notFound("Profil tidak ditemukan.");

  return profil;
}

/** Daftar pengguna pada desa pengguna yang sedang login + opsi grup akses. */
export async function listPenggunaWithMeta(): Promise<{
  rows: Awaited<ReturnType<typeof listPengguna>>;
  roles: RoleOption[];
  currentUserId: string;
}> {
  const user = await requirePermission(PENGGUNA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [rows, roleRows] = await Promise.all([listPengguna(villageId), listRoles(villageId)]);

  return {
    rows,
    // Hanya role milik desa ini. Role global dan role platform tidak boleh
    // ditawarkan karena akan memberi izin lintas desa.
    roles: roleRows
      .filter((role) => role.villageId === villageId && !isPlatformRole(role))
      .map((role) => ({ value: String(role.id), label: role.name })),
    currentUserId: user.id,
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function ensureUsernameAvailable(username: string, excludeId?: string): Promise<void> {
  const existing = await findPenggunaByUsername(username);
  if (existing && existing.id !== excludeId) throw conflict("Username sudah digunakan.");
}

async function ensureEmailAvailable(email: string, excludeId?: string): Promise<void> {
  const existing = await findPenggunaByEmail(email);
  if (existing && existing.id !== excludeId) throw conflict("Email sudah digunakan.");
}

async function ensureRoleExists(roleId: number, villageId: number): Promise<void> {
  const role = await getRoleById(roleId, villageId);
  if (!role || role.villageId !== villageId || isPlatformRole(role)) {
    throw conflict("Grup akses tidak tersedia untuk desa ini.");
  }
}

/** Ambil pengguna yang berada dalam desa yang sama (mencegah akses lintas desa). */
async function getScopedPengguna(id: string, villageId: number) {
  const target = await getPenggunaById(id);
  if (!target || target.villageId !== villageId) {
    throw notFound("Pengguna tidak ditemukan.");
  }
  return target;
}

export async function createPenggunaData(input: PenggunaCreateInput): Promise<{ id: string }> {
  const user = await requirePermission(PENGGUNA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const username = normalizeUsername(input.username);
  const email = input.email ?? fallbackEmail(username);

  await ensureRoleExists(input.roleId, villageId);
  await ensureUsernameAvailable(username);
  await ensureEmailAvailable(email);

  const created = await createPengguna({
    villageId,
    name: input.name,
    username,
    email,
    roleId: input.roleId,
    active: input.active,
    password: input.password,
  });

  return { id: created.id };
}

export async function updatePenggunaData(id: string, input: PenggunaUpdateInput): Promise<void> {
  const user = await requirePermission(PENGGUNA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const target = await getScopedPengguna(id, villageId);

  if (id === user.id) {
    if (!input.active) throw conflict("Tidak dapat menonaktifkan akun sendiri.");
    if (input.roleId !== target.roleId) {
      throw conflict("Tidak dapat mengubah grup akses akun sendiri.");
    }
  }

  const username = normalizeUsername(input.username);
  const email = input.email ?? target.email;

  await ensureRoleExists(input.roleId, villageId);
  await ensureUsernameAvailable(username, id);
  await ensureEmailAvailable(email, id);

  await updatePengguna(id, {
    name: input.name,
    username,
    email,
    roleId: input.roleId,
    active: input.active,
    password: input.password,
  });
}

export async function deletePenggunaData(id: string): Promise<void> {
  const user = await requirePermission(PENGGUNA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  if (id === user.id) throw conflict("Tidak dapat menghapus akun sendiri.");

  await getScopedPengguna(id, villageId);
  await deletePengguna(id);
}
