import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { getIdentitas } from "@/features/desa/application/get-identitas";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  KELUARGA_RESOURCE,
  type KeluargaDetail,
  type KeluargaDTO,
  type KeluargaFormInput,
  type KeluargaMember,
  type KeluargaMemberDetail,
  type KeluargaReferenceData,
} from "@/features/keluarga/domain/keluarga";
import { buildKeluargaPdf } from "@/features/keluarga/infrastructure/keluarga-pdf";
import {
  deleteKeluarga as deleteKeluargaRow,
  findKeluargaById,
  findKeluargaDetail,
  insertKeluarga,
  keluargaNumberExists,
  listKeluargaAnggotaRows,
  listKeluargaMemberDetails,
  listKeluargaMembers as listKeluargaMembersRows,
  listKeluarga as listKeluargaRows,
  listLogAnggotaKk,
  updateKeluarga as updateKeluargaRow,
  type KeluargaListResult,
} from "@/features/keluarga/infrastructure/keluarga-repository";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";
import {
  findWilayahById,
  listWilayahOptions,
} from "@/features/wilayah/infrastructure/wilayah-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/**
 * Lapisan aplikasi (use case) untuk keluarga.
 *
 * Setiap use case menegakkan izinnya sendiri lewat `requirePermission`, jadi
 * pemanggil mana pun (Server Action, Route Handler, skrip) otomatis terlindungi.
 */

export interface ListKeluargaParams {
  search: string;
  page: number;
  pageSize: number;
}

export async function listKeluarga(params: ListKeluargaParams): Promise<KeluargaListResult> {
  const user = await requirePermission(KELUARGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listKeluargaRows({ villageId, ...params });
}

/** Data referensi untuk mengisi formulir (butuh izin baca modul keluarga). */
export async function getKeluargaReference(): Promise<KeluargaReferenceData> {
  const user = await requirePermission(KELUARGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const regions = await listWilayahOptions(villageId);

  return {
    regions: regions.map((region) => ({ id: region.id, label: formatWilayahLabel(region) })),
  };
}

/** Anggota sebuah KK; dipakai dialog rincian pada UI. */
export async function listKeluargaMembers(familyId: number): Promise<KeluargaMember[]> {
  const user = await requirePermission(KELUARGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const family = await findKeluargaById(villageId, familyId);
  if (!family) throw notFound("Kartu Keluarga tidak ditemukan.");

  return listKeluargaMembersRows(villageId, familyId);
}

/**
 * Data lengkap sebuah KK untuk dicetak.
 *
 * Menggabungkan identitas desa (untuk kop & wilayah), keluarga (nomor, alamat),
 * dan seluruh anggota berstatus hidup dengan kolom baku KK. Route PDF memakai
 * ini agar tidak perlu menyusun data sendiri.
 */
export interface KeluargaPrintData {
  keluarga: KeluargaDTO;
  anggota: KeluargaMemberDetail[];
  wilayah: {
    dusun: string | null;
    rw: string | null;
    rt: string | null;
  };
}

/** Bangun PDF Kartu Keluarga; izin dan wilayah diperiksa di use case. */
export async function buildKeluargaPdfData(familyId: number): Promise<Uint8Array> {
  const { keluarga, anggota, wilayah } = await getKeluargaPrintData(familyId);
  const desa = await getIdentitas();
  return buildKeluargaPdf({
    desa,
    nomorKk: keluarga.number,
    alamat: keluarga.address,
    wilayah,
    anggota,
  });
}

export async function getKeluargaPrintData(familyId: number): Promise<KeluargaPrintData> {
  const user = await requirePermission(KELUARGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const keluarga = await findKeluargaById(villageId, familyId);
  if (!keluarga) throw notFound("Kartu Keluarga tidak ditemukan.");

  const [anggota, wilayah] = await Promise.all([
    listKeluargaMemberDetails(villageId, familyId),
    keluarga.regionId === null
      ? Promise.resolve(null)
      : findWilayahById(villageId, keluarga.regionId),
  ]);

  return {
    keluarga,
    anggota,
    wilayah: {
      dusun: wilayah?.dusun || null,
      rw: wilayah?.rw || null,
      rt: wilayah?.rt || null,
    },
  };
}

/**
 * Data lengkap sebuah KK untuk halaman rincian.
 *
 * Memuat identitas KK, kepala keluarga, seluruh anggota (termasuk yang sudah
 * meninggal/pindah), dan riwayat perubahan anggota.
 */
export async function getKeluargaDetail(familyId: number): Promise<KeluargaDetail> {
  const user = await requirePermission(KELUARGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const detail = await findKeluargaDetail(villageId, familyId);
  if (!detail) throw notFound("Kartu Keluarga tidak ditemukan.");

  const [members, logs] = await Promise.all([
    listKeluargaAnggotaRows(villageId, familyId),
    listLogAnggotaKk(villageId, familyId),
  ]);

  const kepala = members.find((member) => member.relationId === HEAD_OF_FAMILY_RELATION_ID);

  return {
    keluarga: detail.keluarga,
    regionLabel: detail.regionLabel,
    headName: kepala?.name ?? null,
    members,
    logs,
  };
}

export async function createKeluarga(input: KeluargaFormInput): Promise<{ id: number }> {
  const user = await requirePermission(KELUARGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (await keluargaNumberExists(villageId, input.number, null)) {
    throw conflict("Nomor KK tersebut sudah terdaftar.");
  }

  const id = await insertKeluarga(villageId, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.keluargaCreate,
    resource: KELUARGA_RESOURCE,
    resourceId: String(id),
    details: { nomor: input.number },
  });

  return { id };
}

export async function updateKeluarga(id: number, input: KeluargaFormInput): Promise<void> {
  const user = await requirePermission(KELUARGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await findKeluargaById(villageId, id);
  if (!existing) throw notFound("Kartu Keluarga tidak ditemukan.");

  if (await keluargaNumberExists(villageId, input.number, id)) {
    throw conflict("Nomor KK tersebut sudah terdaftar.");
  }

  await updateKeluargaRow(id, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.keluargaUpdate,
    resource: KELUARGA_RESOURCE,
    resourceId: String(id),
  });
}

export async function deleteKeluarga(id: number): Promise<void> {
  const user = await requirePermission(KELUARGA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const existing = await findKeluargaById(villageId, id);
  if (!existing) throw notFound("Kartu Keluarga tidak ditemukan.");

  await deleteKeluargaRow(id);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.keluargaDelete,
    resource: KELUARGA_RESOURCE,
    resourceId: String(id),
    details: { nomor: existing.number },
  });
}
