import "server-only";

import { randomInt } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  domainDesaSchema,
  kuotaMediaSchema,
  statusDesaSchema,
} from "@/features/multi-desa/domain/kelola-desa";
import {
  findAdminDesa,
  getDesaKelola,
  hapusDomainDesa,
  jadikanDomainUtama,
  listDomainDesa,
  resetAdminDesa as resetAdminDesaRepo,
  setKuotaMediaDesa,
  setStatusDesa,
  tambahDomainDesa,
  type AdminDesaRow,
  type DesaKelolaRow,
  type DomainDesaRow,
} from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import { notFound } from "@/lib/errors";

/**
 * Use case pengelolaan desa oleh super admin.
 *
 * Setiap operasi melewati `requireSuperAdmin`, memvalidasi `villageId` sebagai
 * id positif (bukan menerima objek klien), dan menulis audit trail. Repository
 * tetap memeriksa kepemilikan baris sebelum mengubah data.
 */

const villageIdSchema = z.coerce
  .number({ error: "Desa tidak valid." })
  .int("Desa tidak valid.")
  .positive("Desa tidak valid.");

const domainIdSchema = z.coerce
  .number({ error: "Domain tidak valid." })
  .int("Domain tidak valid.")
  .positive("Domain tidak valid.");

async function pastikanDesaAda(villageId: number): Promise<DesaKelolaRow> {
  const desa = await getDesaKelola(villageId);
  if (!desa) throw notFound("Desa tidak ditemukan.");
  return desa;
}

/** Detail desa untuk dialog pengelolaan. */
export async function getDetailDesa(input: unknown): Promise<DesaKelolaRow> {
  await requireSuperAdmin();
  return pastikanDesaAda(villageIdSchema.parse(input));
}

/** Daftar alias domain milik desa. */
export async function daftarDomainDesa(input: unknown): Promise<DomainDesaRow[]> {
  await requireSuperAdmin();
  const villageId = villageIdSchema.parse(input);
  await pastikanDesaAda(villageId);
  return listDomainDesa(villageId);
}

/** Aktifkan atau nonaktifkan desa (arsip lunak). */
export async function ubahStatusDesa(input: unknown): Promise<{ active: boolean }> {
  const user = await requireSuperAdmin();
  const parsed = z
    .object({ villageId: villageIdSchema, active: statusDesaSchema.shape.active })
    .parse(input);
  const desa = await pastikanDesaAda(parsed.villageId);

  await setStatusDesa(parsed.villageId, parsed.active);
  await recordAuditEvent({
    villageId: parsed.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaStatus,
    resource: "villages",
    resourceId: String(parsed.villageId),
    details: { nama: desa.name, active: parsed.active },
  });

  return { active: parsed.active };
}

/** Atur kuota media desa (MB); `null` = tanpa batas. */
export async function ubahKuotaMedia(input: unknown): Promise<{ kuotaMediaMb: number | null }> {
  const user = await requireSuperAdmin();
  const parsed = z
    .object({ villageId: villageIdSchema, kuotaMediaMb: kuotaMediaSchema.shape.kuotaMediaMb })
    .parse(input);
  const desa = await pastikanDesaAda(parsed.villageId);

  await setKuotaMediaDesa(parsed.villageId, parsed.kuotaMediaMb);
  await recordAuditEvent({
    villageId: parsed.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaKuota,
    resource: "villages",
    resourceId: String(parsed.villageId),
    details: { nama: desa.name, kuotaMediaMb: parsed.kuotaMediaMb },
  });

  return { kuotaMediaMb: parsed.kuotaMediaMb };
}

/** Tambah alias domain; domain pertama otomatis menjadi domain utama. */
export async function tambahDomain(input: unknown): Promise<{ id: number }> {
  const user = await requireSuperAdmin();
  const parsed = z
    .object({ villageId: villageIdSchema, domain: domainDesaSchema.shape.domain })
    .parse(input);
  const desa = await pastikanDesaAda(parsed.villageId);

  const hasil = await tambahDomainDesa(parsed.villageId, parsed.domain);
  await recordAuditEvent({
    villageId: parsed.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaDomain,
    resource: "village_domains",
    resourceId: String(hasil.id),
    details: { nama: desa.name, aksi: "tambah", domain: parsed.domain },
  });

  return hasil;
}

/** Hapus alias domain non-utama. */
export async function hapusDomain(input: unknown): Promise<void> {
  const user = await requireSuperAdmin();
  const parsed = z.object({ villageId: villageIdSchema, domainId: domainIdSchema }).parse(input);
  const desa = await pastikanDesaAda(parsed.villageId);

  await hapusDomainDesa(parsed.villageId, parsed.domainId);
  await recordAuditEvent({
    villageId: parsed.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaDomain,
    resource: "village_domains",
    resourceId: String(parsed.domainId),
    details: { nama: desa.name, aksi: "hapus" },
  });
}

/** Jadikan salah satu domain sebagai domain utama desa. */
export async function jadikanDomainUtamaDesa(input: unknown): Promise<void> {
  const user = await requireSuperAdmin();
  const parsed = z.object({ villageId: villageIdSchema, domainId: domainIdSchema }).parse(input);
  const desa = await pastikanDesaAda(parsed.villageId);

  await jadikanDomainUtama(parsed.villageId, parsed.domainId);
  await recordAuditEvent({
    villageId: parsed.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaDomain,
    resource: "village_domains",
    resourceId: String(parsed.domainId),
    details: { nama: desa.name, aksi: "utama" },
  });
}

/** Karakter sandi sementara: hindari huruf/angka yang mudah tertukar. */
const HURUF_SANDI = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function buatSandiSementara(panjang = 12): string {
  let sandi = "";
  for (let i = 0; i < panjang; i += 1) {
    sandi += HURUF_SANDI[randomInt(0, HURUF_SANDI.length)];
  }
  return sandi;
}

export interface HasilResetAdmin {
  username: string | null;
  email: string;
  sandiSementara: string;
}

/**
 * Reset akses administrator desa.
 *
 * Sandi sementara dikembalikan sekali ke pemanggil (ditampilkan di UI) dan
 * tidak pernah dicatat di audit trail — hanya fakta reset yang diaudit.
 */
export async function resetAksesAdminDesa(input: unknown): Promise<HasilResetAdmin> {
  const user = await requireSuperAdmin();
  const villageId = villageIdSchema.parse(input);
  const desa = await pastikanDesaAda(villageId);

  const admin: AdminDesaRow | null = await findAdminDesa(villageId);
  if (!admin) throw notFound("Desa ini belum memiliki akun administrator.");

  const sandiSementara = buatSandiSementara();
  const passwordHash = await hashPassword(sandiSementara);
  await resetAdminDesaRepo(villageId, passwordHash);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.desaAdminReset,
    resource: "users",
    resourceId: admin.id,
    details: { nama: desa.name, username: admin.username },
  });

  return { username: admin.username, email: admin.email, sandiSementara };
}
