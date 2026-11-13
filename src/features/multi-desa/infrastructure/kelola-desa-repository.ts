import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, roles, sessions, users, villageDomains, villages } from "@/db/schema";
import { conflict, notFound } from "@/lib/errors";

/**
 * Repository pengelolaan desa oleh super admin.
 *
 * Semua operasi menerima `villageId` eksplisit dari pemanggil (bukan dari
 * input klien) dan memeriksa kepemilikan baris sebelum mengubah data.
 */

export interface DesaKelolaRow {
  id: number;
  name: string | null;
  code: string | null;
  domain: string | null;
  active: boolean;
  kuotaMediaMb: number | null;
}

export interface DomainDesaRow {
  id: number;
  villageId: number;
  domain: string;
  isPrimary: boolean;
}

/** Satu desa untuk validasi/pengelolaan. */
export async function getDesaKelola(villageId: number): Promise<DesaKelolaRow | null> {
  const [row] = await db
    .select({
      id: villages.id,
      name: villages.name,
      code: villages.code,
      domain: villages.domain,
      active: villages.active,
      kuotaMediaMb: villages.kuotaMediaMb,
    })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);

  return row ?? null;
}

/** Seluruh domain/alias untuk banyak desa (dipakai dashboard). */
export async function listSemuaDomain(): Promise<DomainDesaRow[]> {
  return db
    .select({
      id: villageDomains.id,
      villageId: villageDomains.villageId,
      domain: villageDomains.domain,
      isPrimary: villageDomains.isPrimary,
    })
    .from(villageDomains)
    .orderBy(asc(villageDomains.villageId), asc(villageDomains.id));
}

/** Domain/alias milik satu desa. */
export async function listDomainDesa(villageId: number): Promise<DomainDesaRow[]> {
  return db
    .select({
      id: villageDomains.id,
      villageId: villageDomains.villageId,
      domain: villageDomains.domain,
      isPrimary: villageDomains.isPrimary,
    })
    .from(villageDomains)
    .where(eq(villageDomains.villageId, villageId))
    .orderBy(asc(villageDomains.id));
}

/**
 * Tambah alias domain. Domain pertama otomatis menjadi domain utama dan
 * dicerminkan ke `villages.domain`.
 */
export async function tambahDomainDesa(villageId: number, domain: string): Promise<{ id: number }> {
  return db.transaction(async (tx) => {
    const [duplikat] = await tx
      .select({ villageId: villageDomains.villageId })
      .from(villageDomains)
      .where(eq(villageDomains.domain, domain))
      .limit(1);
    if (duplikat) throw conflict("Domain tersebut sudah dipakai desa lain.");

    const [utama] = await tx
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(and(eq(villageDomains.villageId, villageId), eq(villageDomains.isPrimary, true)))
      .limit(1);

    const isPrimary = !utama;
    const [row] = await tx
      .insert(villageDomains)
      .values({ villageId, domain, isPrimary })
      .$returningId();

    if (!row) throw conflict("Domain gagal disimpan.");

    if (isPrimary) {
      await tx.update(villages).set({ domain }).where(eq(villages.id, villageId));
    }

    return { id: row.id };
  });
}

/** Hapus alias non-utama. Domain utama harus diganti lebih dulu. */
export async function hapusDomainDesa(villageId: number, domainId: number): Promise<void> {
  const [row] = await db
    .select({
      id: villageDomains.id,
      isPrimary: villageDomains.isPrimary,
    })
    .from(villageDomains)
    .where(and(eq(villageDomains.id, domainId), eq(villageDomains.villageId, villageId)))
    .limit(1);

  if (!row) throw notFound("Domain desa tidak ditemukan.");
  if (row.isPrimary) {
    throw conflict("Jadikan domain lain sebagai domain utama sebelum menghapusnya.");
  }

  await db.delete(villageDomains).where(eq(villageDomains.id, domainId));
}

/** Jadikan satu domain sebagai domain utama desa. */
export async function jadikanDomainUtama(villageId: number, domainId: number): Promise<void> {
  const [row] = await db
    .select({ domain: villageDomains.domain })
    .from(villageDomains)
    .where(and(eq(villageDomains.id, domainId), eq(villageDomains.villageId, villageId)))
    .limit(1);

  if (!row) throw notFound("Domain desa tidak ditemukan.");

  await db.transaction(async (tx) => {
    await tx
      .update(villageDomains)
      .set({ isPrimary: false })
      .where(eq(villageDomains.villageId, villageId));
    await tx.update(villageDomains).set({ isPrimary: true }).where(eq(villageDomains.id, domainId));
    await tx.update(villages).set({ domain: row.domain }).where(eq(villages.id, villageId));
  });
}

/** Aktifkan/nonaktifkan desa. Data tetap tersimpan (arsip lunak). */
export async function setStatusDesa(villageId: number, active: boolean): Promise<void> {
  const hasil = await db.update(villages).set({ active }).where(eq(villages.id, villageId));
  if (hasil[0].affectedRows === 0) throw notFound("Desa tidak ditemukan.");
}

/** Atur kuota media desa (MB); `null` = tanpa batas. */
export async function setKuotaMediaDesa(
  villageId: number,
  kuotaMediaMb: number | null,
): Promise<void> {
  const hasil = await db.update(villages).set({ kuotaMediaMb }).where(eq(villages.id, villageId));
  if (hasil[0].affectedRows === 0) throw notFound("Desa tidak ditemukan.");
}

export interface AdminDesaRow {
  id: string;
  username: string | null;
  email: string;
}

/** Akun administrator milik satu desa. */
export async function findAdminDesa(villageId: number): Promise<AdminDesaRow | null> {
  const [row] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.villageId, villageId), eq(roles.slug, "administrator")))
    .limit(1);

  return row ?? null;
}

/**
 * Ganti sandi akun administrator desa.
 *
 * `passwordHash` dibuat pemanggil (application layer) agar repository tidak
 * memegang kebijakan kata sandi. Akun juga diaktifkan kembali supaya reset
 * benar-benar memulihkan akses.
 */
export async function resetAdminDesa(
  villageId: number,
  passwordHash: string,
): Promise<AdminDesaRow> {
  const admin = await findAdminDesa(villageId);
  if (!admin) throw conflict("Desa ini belum memiliki akun administrator.");

  await db.transaction(async (tx) => {
    const hasil = await tx
      .update(accounts)
      .set({ password: passwordHash })
      .where(and(eq(accounts.userId, admin.id), eq(accounts.providerId, "credential")));

    if (hasil[0].affectedRows === 0) {
      throw conflict("Akun administrator tidak memiliki kredensial sandi.");
    }

    await tx.delete(sessions).where(eq(sessions.userId, admin.id));
    await tx.update(users).set({ active: true }).where(eq(users.id, admin.id));
  });

  return admin;
}
