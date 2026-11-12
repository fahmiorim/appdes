import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { catatPerubahanAnggotaKk } from "@/features/keluarga/application/catat-anggota-kk";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  PENDUDUK_RESOURCE,
  type PendudukFilter,
  type PendudukFormInput,
  type PendudukReferenceData,
} from "@/features/penduduk/domain/penduduk";
import {
  deletePenduduk as deletePendudukRow,
  findPendudukById,
  findPendudukHidupByNik,
  findPendudukOptionByNik,
  getPendudukDetailById,
  headOfFamilyExists,
  insertPenduduk,
  listPendudukOptions,
  listPenduduk as listPendudukRows,
  nationalIdExists,
  updatePenduduk as updatePendudukRow,
  validatePendudukTenantReferences,
  type PendudukListResult,
} from "@/features/penduduk/infrastructure/penduduk-repository";
import { getPendudukReferenceData } from "@/features/penduduk/infrastructure/reference-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/**
 * Lapisan aplikasi (use case) untuk penduduk.
 *
 * Setiap use case menegakkan izinnya sendiri lewat `requirePermission`, jadi
 * pemanggil mana pun (Server Action, Route Handler, skrip) otomatis terlindungi.
 */

/** Detail biodata penduduk; izin baca diperiksa halaman pemanggil (sesi sudah diverifikasi). */
export async function getPendudukDetail(villageId: number, id: number) {
  return getPendudukDetailById(villageId, id);
}

export interface ListPendudukParams {
  /** Filter lanjutan daftar penduduk (lihat `parseFilterPenduduk`). */
  filter: PendudukFilter;
  page: number;
  pageSize: number;
}

export async function listPenduduk(params: ListPendudukParams): Promise<PendudukListResult> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listPendudukRows({ villageId, ...params });
}

/** Opsi penduduk desa untuk pencarian NIK; villageId dari sesi, izin baca modul penduduk. */
export async function listPendudukOptionsData() {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listPendudukOptions(villageId);
}

/** Cari satu penduduk berdasarkan NIK pada desa milik sesi. */
export async function cariPendudukByNikData(nik: string) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return findPendudukOptionByNik(villageId, nik);
}

/** Data referensi untuk mengisi formulir (butuh izin baca modul penduduk). */
export async function getPendudukReference(): Promise<PendudukReferenceData> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return getPendudukReferenceData(villageId);
}

/** Pastikan sebuah KK tidak punya lebih dari satu kepala keluarga. */
async function ensureSingleHeadOfFamily(
  villageId: number,
  input: PendudukFormInput,
  excludeId: number | null,
): Promise<void> {
  if (input.familyId === null || input.familyRelationId !== HEAD_OF_FAMILY_RELATION_ID) return;

  if (await headOfFamilyExists(villageId, input.familyId, excludeId)) {
    throw conflict("Kartu Keluarga tersebut sudah memiliki kepala keluarga.");
  }
}

export async function createPenduduk(input: PendudukFormInput): Promise<{ id: number }> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (input.nationalId !== null && (await nationalIdExists(villageId, input.nationalId, null))) {
    throw conflict("NIK tersebut sudah terdaftar pada penduduk lain.");
  }

  await validatePendudukTenantReferences(villageId, input);
  await ensureSingleHeadOfFamily(villageId, input, null);

  const id = await insertPenduduk(villageId, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pendudukCreate,
    resource: PENDUDUK_RESOURCE,
    resourceId: String(id),
    details: { nama: input.name },
  });

  await catatPerubahanAnggotaKk({
    villageId,
    residentId: id,
    residentName: input.name,
    sebelum: null,
    sesudah: { familyId: input.familyId, familyRelationId: input.familyRelationId },
    actorId: user.id,
  });

  return { id };
}

export async function updatePenduduk(id: number, input: PendudukFormInput): Promise<void> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await findPendudukById(villageId, id);
  if (!existing) throw notFound("Data penduduk tidak ditemukan.");

  if (input.nationalId !== null && (await nationalIdExists(villageId, input.nationalId, id))) {
    throw conflict("NIK tersebut sudah terdaftar pada penduduk lain.");
  }

  await validatePendudukTenantReferences(villageId, input);
  await ensureSingleHeadOfFamily(villageId, input, id);

  await updatePendudukRow(villageId, id, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pendudukUpdate,
    resource: PENDUDUK_RESOURCE,
    resourceId: String(id),
  });

  await catatPerubahanAnggotaKk({
    villageId,
    residentId: id,
    residentName: input.name,
    sebelum: { familyId: existing.familyId, familyRelationId: existing.familyRelationId },
    sesudah: { familyId: input.familyId, familyRelationId: input.familyRelationId },
    actorId: user.id,
  });
}

export async function deletePenduduk(id: number): Promise<void> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const existing = await findPendudukById(villageId, id);
  if (!existing) throw notFound("Data penduduk tidak ditemukan.");

  await deletePendudukRow(villageId, id);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.pendudukDelete,
    resource: PENDUDUK_RESOURCE,
    resourceId: String(id),
    details: { nama: existing.name },
  });

  await catatPerubahanAnggotaKk({
    villageId,
    residentId: null,
    residentName: existing.name,
    sebelum: { familyId: existing.familyId, familyRelationId: existing.familyRelationId },
    sesudah: null,
    actorId: user.id,
  });
}

/**
 * Penduduk hidup berdasarkan NIK pada satu desa.
 *
 * Tanpa pemeriksaan izin karena dipanggil dari alur anjungan kiosk yang sudah
 * memverifikasi perangkat; `villageId` berasal dari host/sesi, bukan input klien.
 */
export async function cariPendudukHidupByNikData(villageId: number, nik: string) {
  return findPendudukHidupByNik(villageId, nik);
}
