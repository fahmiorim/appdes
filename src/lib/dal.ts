import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { users, villages } from "@/db/schema";
import {
  computeEffectivePermissions,
  hasPermission,
  type EffectivePermissions,
} from "@/features/rbac/application/authorization";
import type { Action } from "@/features/rbac/domain/permission";
import { auth } from "@/lib/auth";
import { forbidden, unauthenticated } from "@/lib/errors";

/** Pengguna yang sedang login beserta role & izin efektifnya. */
export interface CurrentUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  villageId: number | null;
  roleId: number | null;
  /** Penduduk yang ditautkan ke akun; hanya untuk akun warga. */
  residentId: number | null;
  /** Warga wajib mengganti PIN sementara sebelum memakai layanan. */
  mustChangePin: boolean;
  permissions: EffectivePermissions;
}

/** Pengguna yang sudah dipastikan memiliki akun warga. */
export interface WargaUser extends CurrentUser {
  residentId: number;
}

/**
 * Sesi mentah better-auth (di-cache per permintaan).
 *
 * JANGAN dipakai langsung untuk otorisasi; gunakan `getCurrentUser()`.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Ambil pengguna saat ini lengkap dengan izin efektifnya.
 * Mengembalikan `null` bila belum login.
 *
 * Ini adalah satu-satunya pintu resmi untuk mengetahui "siapa yang sedang
 * login" di server. Semua Server Action & Route Handler WAJIB memakainya.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = session.user;

  // Status aktif, role, dan desa dibaca dari DB (bukan cookie cache sesi) agar
  // akun yang dinonaktifkan, diturunkan role-nya, atau dipindah desa langsung
  // kehilangan akses lama tanpa menunggu cache sesi kedaluwarsa.
  const [account] = await db
    .select({
      active: users.active,
      residentId: users.residentId,
      mustChangePin: users.mustChangePin,
      villageActive: villages.active,
      villageId: users.villageId,
      roleId: users.roleId,
    })
    .from(users)
    .leftJoin(villages, eq(users.villageId, villages.id))
    .where(eq(users.id, user.id))
    .limit(1);

  if (!account?.active) return null;

  // Desa nonaktif (arsip lunak) memblokir seluruh akun staf & warga miliknya.
  // Super admin (villageId null) tetap bisa masuk untuk mengelola desa.
  if (account.villageId !== null && account.villageActive !== true) return null;

  const permissions = await computeEffectivePermissions(account.roleId ?? 0, account.villageId);

  return {
    id: user.id,
    name: user.name,
    username: (user.username as string | null) ?? null,
    email: user.email,
    image: user.image ?? null,
    villageId: account.villageId,
    roleId: account.roleId,
    residentId: account.residentId,
    mustChangePin: account.mustChangePin,
    permissions,
  };
});

/**
 * Pastikan ada pengguna login, jika tidak alihkan ke halaman masuk.
 * Dipakai di Server Component (layout/halaman).
 */
export async function verifySession(redirectTo = "/masuk"): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Ambil pengguna atau lempar `AppError` (untuk Server Action / Route Handler).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/**
 * Pastikan sesi aktif adalah akun warga (punya `residentId`).
 *
 * Dipakai Server Component area warga. Pengguna staf yang membuka area warga
 * dialihkan ke beranda admin; pengguna tanpa sesi ke halaman masuk.
 */
export async function verifyWargaSession(): Promise<WargaUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/masuk?next=%2Flayanan-mandiri%2Fberanda");
  }

  if (user.residentId === null) {
    redirect("/beranda");
  }

  return user as WargaUser;
}

/**
 * Gerbang halaman area warga.
 *
 * Layout dan page dapat dirender paralel, jadi setiap page wajib memeriksa
 * sesi sendiri sebelum memanggil use case yang melempar `forbidden` untuk
 * akun staf. Warga dengan PIN sementara diarahkan ke form ubah PIN.
 */
export async function verifyWargaPage(): Promise<WargaUser> {
  const user = await verifyWargaSession();

  if (user.mustChangePin) {
    redirect("/layanan-mandiri/ubah-pin");
  }

  return user;
}

/**
 * Versi `verifyWargaSession` untuk Server Action/Route Handler: tidak mengalihkan,
 * tetapi melempar kesalahan yang aman.
 */
export async function requireWarga(): Promise<WargaUser> {
  const user = await requireUser();

  if (user.residentId === null) {
    throw forbidden("Akun ini bukan akun warga.");
  }

  return user as WargaUser;
}

/** Warga yang sudah boleh memakai layanan (PIN sementara sudah diganti). */
export async function requireWargaAktif(): Promise<WargaUser> {
  const user = await requireWarga();

  if (user.mustChangePin) {
    throw forbidden("Ganti PIN sementara terlebih dahulu sebelum memakai layanan.");
  }

  return user;
}

/**
 * Wajib punya izin `action` atas `resource`; jika tidak, lempar kesalahan.
 *
 * Selalu panggil ini di awal setiap Server Action yang mengubah data — Server
 * Action dapat dipanggil langsung (POST) tanpa melewati UI.
 */
export async function requirePermission(resource: string, action: Action): Promise<CurrentUser> {
  const user = await requireUser();

  if (!hasPermission(user.permissions, resource, action)) {
    throw forbidden();
  }

  return user;
}
