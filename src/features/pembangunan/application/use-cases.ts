import "server-only";

import {
  getIdentitasFromRequest,
  resolveVillageId,
} from "@/features/desa/application/resolve-village";
import {
  buildPembangunanSlug,
  PEMBANGUNAN_RESOURCE,
  type DokumentasiFormInput,
  type PembangunanDetail,
  type PembangunanFormInput,
  type PembangunanProyekDTO,
} from "@/features/pembangunan/domain/pembangunan";
import {
  deleteDokumentasi as deleteDokumentasiRow,
  deletePembangunan as deletePembangunanRow,
  findDokumentasiScoped,
  findPembangunanById,
  findPembangunanBySlug,
  getRingkasanPembangunanPublik,
  insertDokumentasi,
  insertPembangunan,
  listDokumentasi,
  listPembangunanPublik,
  listPembangunan as listPembangunanRows,
  listTahunAnggaran as listTahunRows,
  pembangunanSlugExists,
  updatePembangunan as updatePembangunanRow,
  type ListPembangunanParams,
  type PembangunanListResult,
  type RingkasanPembangunanPublik,
} from "@/features/pembangunan/infrastructure/pembangunan-repository";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound } from "@/lib/errors";

/** Kategori media publik untuk foto dokumentasi proyek. */
const KATEGORI_MEDIA = "umum" as const;

export interface ListPembangunanInput {
  search: string;
  tahun: number | null;
  status: string;
  page: number;
  pageSize: number;
}

export async function listPembangunan(
  params: ListPembangunanInput,
): Promise<PembangunanListResult> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const rowParams: ListPembangunanParams = { villageId, ...params };
  return listPembangunanRows(rowParams);
}

export async function listTahunAnggaran(): Promise<number[]> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listTahunRows(villageId);
}

/**
 * Seluruh proyek (atau satu tahun anggaran) untuk buku pembangunan.
 *
 * `pageSize` besar dipakai karena buku memerlukan seluruh baris untuk rekap;
 * batas tetap ada agar satu tahun dengan data sangat banyak tidak membebani
 * memori tanpa kendali.
 */
export async function getBukuPembangunan(tahun: number | null): Promise<PembangunanProyekDTO[]> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const result = await listPembangunanRows({
    villageId,
    search: "",
    tahun,
    status: "",
    page: 1,
    pageSize: 1000,
  });

  return result.rows;
}

/** Slug bebas untuk desa ini; akhiran angka bila sudah dipakai. */
async function slugBebas(
  villageId: number,
  judul: string,
  excludeId: number | null,
): Promise<string> {
  const dasar = buildPembangunanSlug(judul);

  for (let langkah = 0; langkah < 200; langkah += 1) {
    const kandidat = langkah === 0 ? dasar : `${dasar}-${langkah + 1}`;
    if (!(await pembangunanSlugExists(villageId, kandidat, excludeId))) {
      return kandidat;
    }
  }

  throw conflict("Tidak dapat membentuk slug proyek yang unik.");
}

async function getScopedProyek(villageId: number, id: number): Promise<PembangunanProyekDTO> {
  const proyek = await findPembangunanById(villageId, id);
  if (!proyek) throw notFound("Proyek pembangunan tidak ditemukan.");
  return proyek;
}

export async function createPembangunan(input: PembangunanFormInput): Promise<{ id: number }> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const slug = await slugBebas(villageId, input.judul, null);
  const id = await insertPembangunan(villageId, slug, input);
  return { id };
}

export async function updatePembangunan(id: number, input: PembangunanFormInput): Promise<void> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await getScopedProyek(villageId, id);

  const slug = await slugBebas(villageId, input.judul, id);
  await updatePembangunanRow(id, slug, input);
}

/** Hapus proyek beserta berkas foto dokumentasinya. */
export async function deletePembangunan(id: number): Promise<void> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  await getScopedProyek(villageId, id);

  const dokumentasi = await listDokumentasi(id);
  await deletePembangunanRow(id);
  await Promise.all(dokumentasi.map((dok) => hapusMedia(dok.gambar).catch(() => undefined)));
}

export async function getPembangunanDetail(id: number): Promise<PembangunanDetail> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const proyek = await getScopedProyek(villageId, id);
  const dokumentasi = await listDokumentasi(id);
  const canManage = hasPermission(user.permissions, PEMBANGUNAN_RESOURCE, "update");

  return { proyek, dokumentasi, canManage };
}

export async function addDokumentasi(
  proyekId: number,
  input: DokumentasiFormInput,
  berkas: BerkasUnggahan | null,
): Promise<void> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await getScopedProyek(villageId, proyekId);

  if (!berkas) {
    throw conflict("Pilih berkas foto yang akan diunggah.");
  }

  const gambar = await simpanBerkasMedia(villageId, berkas, KATEGORI_MEDIA, "gambar");
  await insertDokumentasi(proyekId, gambar, input);
}

export async function deleteDokumentasi(id: number): Promise<void> {
  const user = await requirePermission(PEMBANGUNAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const dokumentasi = await findDokumentasiScoped(villageId, id);
  if (!dokumentasi) throw notFound("Dokumentasi tidak ditemukan.");

  await deleteDokumentasiRow(id);
  await hapusMedia(dokumentasi.gambar).catch(() => undefined);
}

// --- Publik (tanpa sesi) ----------------------------------------------------

export interface PembangunanPublik {
  rows: PembangunanProyekDTO[];
  ringkasan: RingkasanPembangunanPublik;
  tahunList: number[];
  tahun: number | null;
}

export async function getPembangunanPublik(tahun: number | null): Promise<PembangunanPublik> {
  const villageId = await villageIdPublik();

  const [rows, ringkasan, tahunList] = await Promise.all([
    listPembangunanPublik(villageId, tahun),
    getRingkasanPembangunanPublik(villageId, tahun),
    listTahunRows(villageId),
  ]);

  return { rows, ringkasan, tahunList, tahun };
}

/** Proyek publik berdasarkan slug di desa host permintaan. */
export async function getPembangunanPublikBySlug(slug: string): Promise<{
  proyek: PembangunanProyekDTO;
  dokumentasi: Awaited<ReturnType<typeof listDokumentasi>>;
}> {
  const villageId = await villageIdPublik();
  const proyek = await findPembangunanBySlug(villageId, slug);
  if (!proyek) throw notFound("Proyek pembangunan tidak ditemukan.");

  const dokumentasi = await listDokumentasi(proyek.id);
  return { proyek, dokumentasi };
}

/** `village_id` dari host permintaan untuk halaman publik. */
async function villageIdPublik(): Promise<number> {
  const desa = await getIdentitasFromRequest();
  return desa.id;
}
