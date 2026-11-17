import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { accounts, roles, sessions, users } from "@/db/schema";
import { PLATFORM_ROLE_SLUG } from "@/features/rbac/domain/role";
import { conflict, notFound } from "@/lib/errors";

/**
 * Akun pengelola platform (`village_id IS NULL`).
 *
 * Setiap operasi tulis dibatasi `village_id IS NULL`, sehingga id akun desa
 * yang dikirim dari klien tidak pernah dapat diubah lewat jalur konsol platform.
 * Hanya kolom non-rahasia yang dibaca: sandi dan token sesi tidak pernah
 * dikembalikan ke pemanggil.
 */
export interface PenggunaPlatformRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  roleName: string | null;
  roleSlug: string | null;
  active: boolean;
  mustChangePin: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  sesiAktif: number;
}

export interface PeranPlatformRow {
  id: number;
  name: string;
}

/** Role platform yang sah (`super-admin` dengan `village_id NULL`). */
export async function getPeranPlatform(): Promise<PeranPlatformRow | null> {
  const [row] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(isNull(roles.villageId), eq(roles.slug, PLATFORM_ROLE_SLUG)))
    .limit(1);

  return row ?? null;
}

export async function listPenggunaPlatform(): Promise<PenggunaPlatformRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      roleName: roles.name,
      roleSlug: roles.slug,
      active: users.active,
      mustChangePin: users.mustChangePin,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      sesiAktif: sql<number>`(
        SELECT COUNT(*) FROM sessions s
        WHERE s.user_id = users.id AND s.expires_at > NOW() )`,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(isNull(users.villageId))
    .orderBy(asc(users.createdAt));

  return rows.map((row) => ({ ...row, sesiAktif: Number(row.sesiAktif) }));
}

export interface PenggunaPlatformDetail {
  id: string;
  name: string;
  email: string;
  username: string | null;
  active: boolean;
}

/** Satu akun platform; `null` bila id bukan akun platform. */
export async function getPenggunaPlatform(id: string): Promise<PenggunaPlatformDetail | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      active: users.active,
    })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.villageId)))
    .limit(1);

  return row ?? null;
}

/** Pastikan id menunjuk akun platform sebelum operasi tulis. */
async function pastikanPenggunaPlatform(id: string): Promise<PenggunaPlatformDetail> {
  const pengguna = await getPenggunaPlatform(id);
  if (!pengguna) throw notFound("Pengguna platform tidak ditemukan.");
  return pengguna;
}

export async function emailDipakai(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return Boolean(row);
}

export async function usernameDipakai(username: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return Boolean(row);
}

export async function buatPenggunaPlatform(input: {
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  roleId: number;
}): Promise<{ id: string }> {
  const id = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      username: input.username,
      displayUsername: input.username,
      roleId: input.roleId,
      villageId: null,
      active: true,
      mustChangePin: false,
    });
    await tx.insert(accounts).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: input.passwordHash,
    });
  });

  return { id };
}

/**
 * Aktifkan atau nonaktifkan akun platform.
 *
 * Menonaktifkan akun sekaligus menghapus sesinya agar akses berhenti seketika,
 * bukan menunggu token kedaluwarsa.
 */
export async function setStatusPenggunaPlatform(id: string, active: boolean): Promise<void> {
  await pastikanPenggunaPlatform(id);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ active })
      .where(and(eq(users.id, id), isNull(users.villageId)));
    if (!active) await tx.delete(sessions).where(eq(sessions.userId, id));
  });
}

/**
 * Ganti sandi akun platform.
 *
 * `passwordHash` dibuat application layer agar repository tidak memegang
 * kebijakan kata sandi. Seluruh sesi lama dicabut dan akun diaktifkan kembali.
 */
export async function resetSandiPenggunaPlatform(id: string, passwordHash: string): Promise<void> {
  await pastikanPenggunaPlatform(id);

  await db.transaction(async (tx) => {
    const hasil = await tx
      .update(accounts)
      .set({ password: passwordHash })
      .where(and(eq(accounts.userId, id), eq(accounts.providerId, "credential")));
    if (hasil[0].affectedRows === 0) {
      throw conflict("Akun ini tidak memiliki kredensial sandi.");
    }

    await tx.delete(sessions).where(eq(sessions.userId, id));
    await tx.update(users).set({ active: true }).where(eq(users.id, id));
  });
}

/** Hapus seluruh sesi akun; mengembalikan jumlah sesi yang dicabut. */
export async function cabutSesiPenggunaPlatform(id: string): Promise<number> {
  await pastikanPenggunaPlatform(id);

  const hasil = await db.delete(sessions).where(eq(sessions.userId, id));
  return hasil[0].affectedRows;
}
