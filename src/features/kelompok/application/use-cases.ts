import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  buildKelompokSlug,
  KATEGORI_KELOMPOK_RESOURCE,
  KELOMPOK_RESOURCE,
  type AnggotaKelompokFormInput,
  type KategoriKelompokDTO,
  type KategoriKelompokFormInput,
  type KelompokDTO,
  type KelompokFormInput,
  type KelompokMember,
  type KelompokReferenceData,
} from "@/features/kelompok/domain/kelompok";
import type { AnggotaLaporanRow } from "@/features/kelompok/domain/laporan-anggota";
import {
  addKelompokMember,
  countKelompokAnggota,
  deleteKategori as deleteKategoriRow,
  deleteKelompok as deleteKelompokRow,
  findKategoriById,
  findKelompokById,
  getKelompokReference,
  insertKategori,
  insertKelompok,
  kategoriExists,
  kategoriIsUsed,
  kelompokCodeExists,
  kelompokMemberExists,
  kelompokSlugExists,
  listAnggotaKandidat as listAnggotaKandidatRows,
  listKategoriKelompok as listKategoriKelompokRows,
  listKelompokMembers,
  listKelompok as listKelompokRows,
  listLaporanAnggota,
  removeKelompokMember,
  residentExists,
  setKelompokMemberPublic as setKelompokMemberPublicRow,
  updateKategori as updateKategoriRow,
  updateKelompok as updateKelompokRow,
  type KelompokListResult,
} from "@/features/kelompok/infrastructure/kelompok-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound, validationError } from "@/lib/errors";

/**
 * Lapisan aplikasi (use case) untuk kelompok, lembaga, dan kategorinya.
 *
 * Setiap use case menegakkan izinnya sendiri lewat `requirePermission`, jadi
 * pemanggil mana pun (Server Action, Route Handler, skrip) otomatis terlindungi.
 * Slug dibangkitkan di sini — bukan di UI — agar konsisten bagi semua jalur
 * pembuatan data.
 */

export interface ListKelompokParams {
  search: string;
  tipe: string;
  categoryId: number | null;
  page: number;
  pageSize: number;
}

export async function listKelompok(params: ListKelompokParams): Promise<KelompokListResult> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listKelompokRows({ villageId, ...params });
}

/** Detail satu kelompok (untuk halaman rincian). */
export async function getKelompokDetail(id: number): Promise<KelompokDTO> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const row = await findKelompokById(villageId, id);
  if (!row) throw notFound("Kelompok tidak ditemukan.");
  return row;
}

/**
 * Laporan terperinci seluruh anggota (dipakai halaman cetak & ekspor CSV).
 *
 * `tipe` kosong berarti seluruh kelompok & lembaga; nilai tak dikenal juga
 * diperlakukan sebagai "semua" agar tautan lama tidak menjadi laporan kosong.
 */
export async function getLaporanAnggota(tipe: string): Promise<AnggotaLaporanRow[]> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listLaporanAnggota(villageId, tipe);
}

/** Anggota sebuah kelompok; dipakai dialog rincian pada UI. */
export async function getKelompokMembers(id: number): Promise<KelompokMember[]> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const row = await findKelompokById(villageId, id);
  if (!row) throw notFound("Kelompok tidak ditemukan.");

  return listKelompokMembers(villageId, id);
}

/**
 * Data referensi dialog kelompok & anggota: kategori dan penduduk kandidat.
 *
 * `kelompokId` diisi saat menambah anggota (agar penduduk yang sudah menjadi
 * anggota tidak muncul lagi); dibiarkan `null` saat sekadar mengisi formulir.
 */
export async function getReferensiKelompok(
  kelompokId: number | null = null,
): Promise<KelompokReferenceData> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  if (kelompokId !== null) {
    const row = await findKelompokById(villageId, kelompokId);
    if (!row) throw notFound("Kelompok tidak ditemukan.");
  }

  return getKelompokReference(villageId, kelompokId);
}

/** Penduduk yang belum menjadi anggota kelompok (untuk dialog anggota). */
export async function listAnggotaKandidat(kelompokId: number) {
  const user = await requirePermission(KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const row = await findKelompokById(villageId, kelompokId);
  if (!row) throw notFound("Kelompok tidak ditemukan.");

  return listAnggotaKandidatRows(villageId, kelompokId);
}

/**
 * Bangkitkan slug unik untuk sebuah nama.
 *
 * Slug dasar diturunkan dari nama; bila sudah dipakai, ditambahkan akhiran angka
 * (`-2`, `-3`, …) sampai bebas. Indeks unik `(village_id, slug)` tetap menjadi
 * pengaman terakhir.
 */
async function slugUnik(
  villageId: number,
  nama: string,
  excludeId: number | null,
): Promise<string> {
  const dasar = buildKelompokSlug(nama);

  if (!(await kelompokSlugExists(villageId, dasar, excludeId))) return dasar;

  for (let urutan = 2; urutan < 200; urutan += 1) {
    const kandidat = `${dasar}-${urutan}`;
    if (!(await kelompokSlugExists(villageId, kandidat, excludeId))) return kandidat;
  }

  throw conflict("Tidak dapat membentuk slug kelompok yang unik.");
}

/** Pastikan kategori (bila dipilih) ada di desa yang sama. */
async function pastikanKategori(villageId: number, kategoriId: number | null): Promise<void> {
  if (kategoriId === null) return;

  const kategori = await findKategoriById(villageId, kategoriId);
  if (!kategori)
    throw validationError("Kategori tidak ditemukan.", {
      kategoriId: ["Kategori tidak ditemukan."],
    });
}

export async function createKelompok(input: KelompokFormInput): Promise<{ id: number }> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await pastikanKategori(villageId, input.kategoriId);

  if (input.kode !== "" && (await kelompokCodeExists(villageId, input.kode, null))) {
    throw validationError("Kode kelompok sudah dipakai.", { kode: ["Kode sudah dipakai."] });
  }

  const slug = await slugUnik(villageId, input.nama, null);
  const id = await insertKelompok(villageId, slug, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.kelompokCreate,
    resource: KELOMPOK_RESOURCE,
    resourceId: String(id),
    details: { nama: input.nama },
  });

  return { id };
}

export async function updateKelompok(id: number, input: KelompokFormInput): Promise<void> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await findKelompokById(villageId, id);
  if (!existing) throw notFound("Kelompok tidak ditemukan.");

  await pastikanKategori(villageId, input.kategoriId);

  if (input.kode !== "" && (await kelompokCodeExists(villageId, input.kode, id))) {
    throw validationError("Kode kelompok sudah dipakai.", { kode: ["Kode sudah dipakai."] });
  }

  const slug = await slugUnik(villageId, input.nama, id);
  await updateKelompokRow(villageId, id, slug, input);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.kelompokUpdate,
    resource: KELOMPOK_RESOURCE,
    resourceId: String(id),
  });
}

export async function deleteKelompok(id: number): Promise<void> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const existing = await findKelompokById(villageId, id);
  if (!existing) throw notFound("Kelompok tidak ditemukan.");

  const anggota = await countKelompokAnggota(villageId, id);
  if (anggota > 0) {
    throw conflict(
      "Kelompok masih memiliki anggota. Kosongkan anggotanya terlebih dahulu melalui dialog Anggota.",
    );
  }

  await deleteKelompokRow(villageId, id);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.kelompokDelete,
    resource: KELOMPOK_RESOURCE,
    resourceId: String(id),
  });
}

/**
 * Tambah seorang penduduk sebagai anggota kelompok.
 *
 * Keanggotaan bersifat banyak-ke-banyak (satu penduduk boleh di banyak
 * kelompok), tetapi satu penduduk hanya sekali per kelompok.
 */
export async function addAnggotaKelompok(
  kelompokId: number,
  input: AnggotaKelompokFormInput,
): Promise<void> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const kelompokRow = await findKelompokById(villageId, kelompokId);
  if (!kelompokRow) throw notFound("Kelompok tidak ditemukan.");

  if (input.residentId === null) {
    throw validationError("Penduduk wajib dipilih.", { residentId: ["Penduduk wajib dipilih."] });
  }

  if (!(await residentExists(villageId, input.residentId))) {
    throw validationError("Penduduk tidak ditemukan.", {
      residentId: ["Penduduk tidak ditemukan."],
    });
  }

  if (await kelompokMemberExists(villageId, kelompokId, input.residentId)) {
    throw conflict("Penduduk sudah menjadi anggota kelompok ini.");
  }

  await addKelompokMember(
    villageId,
    kelompokId,
    input.residentId,
    input.jabatan ?? 90,
    input.nomorAnggota === "" ? null : input.nomorAnggota,
    input.nomorSk === "" ? null : input.nomorSk,
  );
}

export async function removeAnggotaKelompok(kelompokId: number, memberId: number): Promise<void> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const kelompokRow = await findKelompokById(villageId, kelompokId);
  if (!kelompokRow) throw notFound("Kelompok tidak ditemukan.");

  await removeKelompokMember(villageId, kelompokId, memberId);
}

/**
 * Atur publikasi seorang anggota di situs desa.
 * NIK tetap tersedia di admin, tetapi tidak pernah dikirim ke halaman publik.
 */
export async function setAnggotaPublik(
  kelompokId: number,
  memberId: number,
  tampilPublik: boolean,
): Promise<void> {
  const user = await requirePermission(KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const kelompokRow = await findKelompokById(villageId, kelompokId);
  if (!kelompokRow) throw notFound("Kelompok tidak ditemukan.");

  const ok = await setKelompokMemberPublicRow(villageId, kelompokId, memberId, tampilPublik);
  if (!ok) throw notFound("Anggota tidak ditemukan.");
}

// --- Kategori kelompok ------------------------------------------------------

export async function listKategoriKelompok(): Promise<KategoriKelompokDTO[]> {
  const user = await requirePermission(KATEGORI_KELOMPOK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listKategoriKelompokRows(villageId);
}

export async function createKategori(input: KategoriKelompokFormInput): Promise<{ id: number }> {
  const user = await requirePermission(KATEGORI_KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (await kategoriExists(villageId, input.nama, input.tipe, null)) {
    throw validationError("Kategori dengan nama & tipe itu sudah ada.", {
      nama: ["Nama sudah dipakai untuk tipe ini."],
    });
  }

  const id = await insertKategori(villageId, input);
  return { id };
}

export async function updateKategori(id: number, input: KategoriKelompokFormInput): Promise<void> {
  const user = await requirePermission(KATEGORI_KELOMPOK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await findKategoriById(villageId, id);
  if (!existing) throw notFound("Kategori tidak ditemukan.");

  if (await kategoriExists(villageId, input.nama, input.tipe, id)) {
    throw validationError("Kategori dengan nama & tipe itu sudah ada.", {
      nama: ["Nama sudah dipakai untuk tipe ini."],
    });
  }

  await updateKategoriRow(villageId, id, input);
}

export async function deleteKategori(id: number): Promise<void> {
  const user = await requirePermission(KATEGORI_KELOMPOK_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const existing = await findKategoriById(villageId, id);
  if (!existing) throw notFound("Kategori tidak ditemukan.");

  if (await kategoriIsUsed(villageId, id)) {
    throw conflict(
      "Kategori masih dipakai kelompok. Pindahkan kelompok itu ke kategori lain dulu.",
    );
  }

  await deleteKategoriRow(villageId, id);
}
