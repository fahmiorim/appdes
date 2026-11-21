import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { catatPerubahanAnggotaKk } from "@/features/keluarga/application/catat-anggota-kk";
import { listKeluargaMembers as listFamilyMembersRows } from "@/features/keluarga/infrastructure/keluarga-repository";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  PENDUDUK_RESOURCE,
  type PendudukDTO,
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
  getRingkasanPenduduk,
  headOfFamilyExists,
  insertPenduduk,
  listPendudukOptions,
  listPenduduk as listPendudukRows,
  nationalIdExists,
  updatePenduduk as updatePendudukRow,
  validatePendudukTenantReferences,
  type PendudukListResult,
  type RingkasanPenduduk,
} from "@/features/penduduk/infrastructure/penduduk-repository";
import { getPendudukReferenceData } from "@/features/penduduk/infrastructure/reference-repository";
import { listWilayahOptions } from "@/features/wilayah/infrastructure/wilayah-repository";
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

/** Ringkasan KPI halaman penduduk; izin dan desa berasal dari sesi. */
export async function getRingkasanPendudukData(): Promise<RingkasanPenduduk> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return getRingkasanPenduduk(villageId);
}

export interface PendudukFilterOptions {
  dusun: string[];
  rw: string[];
  rt: string[];
}

/** Pilihan wilayah untuk toolbar filter; tidak memuat katalog formulir. */
export async function getPendudukFilterOptionsData(): Promise<PendudukFilterOptions> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const wilayah = await listWilayahOptions(villageId);

  const unik = (nilai: string[]): string[] =>
    [...new Set(nilai.filter((item) => item !== ""))].sort((a, b) => a.localeCompare(b, "id"));

  return {
    dusun: unik(wilayah.map((row) => row.dusun)),
    rw: unik(wilayah.map((row) => row.rw)),
    rt: unik(wilayah.map((row) => row.rt)),
  };
}

/** Detail penduduk dengan desa dari sesi, bukan dari parameter URL. */
export async function getPendudukDetailData(id: number) {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return getPendudukDetailById(villageId, id);
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

export interface PendudukFormData {
  references: PendudukReferenceData;
  /** Data lama untuk mode ubah; `null` pada mode tambah. */
  penduduk: PendudukDTO | null;
}

/**
 * Data formulir tambah/ubah penduduk.
 *
 * Memakai izin `update` karena formulir menampilkan NIK lengkap dan data orang
 * tua, bukan sekadar ringkasan baca. Pada mode ubah, pencarian data dibatasi
 * `villageId` dari sesi sehingga ID milik desa lain diperlakukan tidak ada.
 */
export async function getPendudukFormData(id: number | null = null): Promise<PendudukFormData> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const [references, penduduk] = await Promise.all([
    getPendudukReferenceData(villageId),
    id === null ? Promise.resolve(null) : findPendudukById(villageId, id),
  ]);

  if (id !== null && !penduduk) throw notFound("Data penduduk tidak ditemukan.");

  return { references, penduduk };
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
  if (existing.familyId !== null && existing.familyRelationId === HEAD_OF_FAMILY_RELATION_ID) {
    const members = await listFamilyMembersRows(villageId, existing.familyId);
    if (members.length > 1)
      throw conflict(
        "Tetapkan anggota lain sebagai kepala keluarga sebelum menghapus kepala keluarga saat ini.",
      );
  }

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
