import "server-only";

import {
  getAlbumBySlug,
  getBeritaBySlug,
  getHalamanBySlug,
  getProfilDesa,
  listAlbumGaleri,
  listBerita,
  listFotoAlbum,
  listKategoriBerita,
  listPerangkatDesa,
  listSliderBeranda,
  listSlugBerita,
  listSlugHalaman,
  listWidget,
  tambahHitBerita,
} from "@/features/publik/infrastructure/content-repository";

/**
 * Use case baca konten situs publik.
 *
 * Halaman rute dan `sitemap.ts` memanggil fungsi di sini, bukan repository.
 * Tidak ada pemeriksaan izin karena ini konten publik; isolasi tenant tetap
 * dijaga `villageId` yang berasal dari host (`getIdentitasFromRequest`).
 */

export async function daftarBerita(
  villageId: number,
  opsi: { limit?: number; kategoriSlug?: string; headlineSaja?: boolean; cari?: string } = {},
) {
  return listBerita(villageId, opsi);
}

export async function detailBerita(villageId: number, slug: string) {
  return getBeritaBySlug(villageId, slug);
}

export async function catatKunjunganBerita(id: number): Promise<void> {
  await tambahHitBerita(id);
}

export async function daftarKategoriBerita(villageId: number) {
  return listKategoriBerita(villageId);
}

export async function daftarAlbumGaleri(villageId: number, cari?: string) {
  return listAlbumGaleri(villageId, cari);
}

export async function detailAlbumGaleri(villageId: number, slug: string) {
  return getAlbumBySlug(villageId, slug);
}

export async function daftarFotoAlbum(villageId: number, albumId: number) {
  return listFotoAlbum(villageId, albumId);
}

export async function profilDesaPublik(villageId: number) {
  return getProfilDesa(villageId);
}

/** Perangkat untuk situs publik; berbeda dari `daftarPerangkatDesa` admin. */
export async function daftarPerangkatPublik(villageId: number) {
  return listPerangkatDesa(villageId);
}

export async function halamanStatisPublik(villageId: number, slug: string) {
  return getHalamanBySlug(villageId, slug);
}

export async function daftarSliderBeranda(villageId: number) {
  return listSliderBeranda(villageId);
}

export async function daftarWidgetPublik(villageId: number) {
  return listWidget(villageId);
}

export async function daftarSlugBerita(villageId: number) {
  return listSlugBerita(villageId);
}

export async function daftarSlugHalaman(villageId: number) {
  return listSlugHalaman(villageId);
}
