import "server-only";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { buatSandiSementara } from "@/features/multi-desa/domain/sandi-sementara";
import {
  buatPenggunaPlatform,
  cabutSesiPenggunaPlatform,
  emailDipakai,
  getPenggunaPlatform,
  getPeranPlatform,
  listPenggunaPlatform,
  resetSandiPenggunaPlatform as resetSandiRepo,
  setStatusPenggunaPlatform,
  usernameDipakai,
  type PenggunaPlatformRow,
} from "@/features/multi-desa/infrastructure/pengguna-platform-repository";
import { conflict, notFound } from "@/lib/errors";

/**
 * Pengelolaan akun platform oleh Super Admin.
 *
 * Setiap fungsi memanggil `requireSuperAdmin()` lebih dulu; repository
 * membatasi seluruh operasi pada `village_id IS NULL`, sehingga akun desa tidak
 * dapat diubah lewat konsol platform. Reset sandi dan pencabutan sesi dicatat
 * sebagai peristiwa audit, tetapi sandi sementara tidak pernah masuk audit log.
 */

const SANDI_MINIMAL = 12;

const idSchema = z
  .string({ error: "Pengguna tidak valid." })
  .trim()
  .min(1, "Pengguna tidak valid.")
  .max(36, "Pengguna tidak valid.");

export const penggunaPlatformBaruSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(255),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format email tidak valid."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,50}$/, "Username 3–50 karakter: huruf, angka, titik, garis."),
  password: z
    .string()
    .min(SANDI_MINIMAL, `Sandi minimal ${SANDI_MINIMAL} karakter.`)
    .max(72, "Sandi maksimal 72 karakter."),
});

export type PenggunaPlatformBaruInput = z.infer<typeof penggunaPlatformBaruSchema>;

const statusSchema = z.object({
  id: idSchema,
  active: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "1" || value === "on"),
});

/** Daftar akun pengelola platform. */
export async function daftarPenggunaPlatform(): Promise<PenggunaPlatformRow[]> {
  await requireSuperAdmin();
  return listPenggunaPlatform();
}

/** Buat akun platform baru dengan role `super-admin` platform. */
export async function buatPenggunaPlatformBaru(input: unknown): Promise<{ id: string }> {
  const user = await requireSuperAdmin();
  const parsed = penggunaPlatformBaruSchema.parse(input);

  const peran = await getPeranPlatform();
  if (!peran) {
    throw conflict(
      "Role super-admin platform belum ada. Jalankan `npm run platform:bootstrap` lebih dulu.",
    );
  }

  if (await emailDipakai(parsed.email)) throw conflict("Email sudah digunakan.");
  if (await usernameDipakai(parsed.username)) throw conflict("Username sudah digunakan.");

  const passwordHash = await hashPassword(parsed.password);
  const hasil = await buatPenggunaPlatform({
    name: parsed.name,
    email: parsed.email,
    username: parsed.username,
    passwordHash,
    roleId: peran.id,
  });

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.platformUserCreate,
    resource: "users",
    resourceId: hasil.id,
    details: { username: parsed.username, role: peran.name },
  });

  return hasil;
}

/**
 * Aktifkan atau nonaktifkan akun platform.
 *
 * Operator tidak boleh menonaktifkan akunnya sendiri: konsol akan terkunci
 * tanpa jalur pemulihan selain bootstrap CLI.
 */
export async function ubahStatusPenggunaPlatform(input: unknown): Promise<{ active: boolean }> {
  const user = await requireSuperAdmin();
  const parsed = statusSchema.parse(input);

  if (parsed.id === user.id && !parsed.active) {
    throw conflict("Akun yang sedang dipakai tidak dapat dinonaktifkan.");
  }

  const pengguna = await getPenggunaPlatform(parsed.id);
  if (!pengguna) throw notFound("Pengguna platform tidak ditemukan.");

  await setStatusPenggunaPlatform(parsed.id, parsed.active);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.platformUserStatus,
    resource: "users",
    resourceId: parsed.id,
    details: { username: pengguna.username, email: pengguna.email, active: parsed.active },
  });

  return { active: parsed.active };
}

export interface HasilResetSandiPlatform {
  username: string | null;
  email: string;
  sandiSementara: string;
}

/** Reset sandi akun platform; sandi sementara hanya dikembalikan sekali. */
export async function resetSandiPenggunaPlatform(input: unknown): Promise<HasilResetSandiPlatform> {
  const user = await requireSuperAdmin();
  const id = idSchema.parse(input);

  const pengguna = await getPenggunaPlatform(id);
  if (!pengguna) throw notFound("Pengguna platform tidak ditemukan.");

  const sandiSementara = buatSandiSementara();
  const passwordHash = await hashPassword(sandiSementara);
  await resetSandiRepo(id, passwordHash);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.platformUserReset,
    resource: "users",
    resourceId: id,
    details: { username: pengguna.username, email: pengguna.email },
  });

  return { username: pengguna.username, email: pengguna.email, sandiSementara };
}

/** Cabut seluruh sesi akun platform. */
export async function cabutSesiPenggunaPlatformAkun(input: unknown): Promise<{ jumlah: number }> {
  const user = await requireSuperAdmin();
  const id = idSchema.parse(input);

  const pengguna = await getPenggunaPlatform(id);
  if (!pengguna) throw notFound("Pengguna platform tidak ditemukan.");

  const jumlah = await cabutSesiPenggunaPlatform(id);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.platformUserSessionRevoke,
    resource: "sessions",
    resourceId: id,
    details: { username: pengguna.username, jumlahSesi: jumlah },
  });

  return { jumlah };
}
