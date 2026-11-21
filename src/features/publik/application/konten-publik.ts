import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pengaturanDesa } from "@/db/schema";

import {
  countBerita,
  getAlbumBySlug,
  getBeritaBySlug,
  getHalamanBySlug,
  getProfilDesa,
  listAlbumGaleri,
  listBerita,
  listDokumenPublik,
  listFotoAlbum,
  listKategoriBerita,
  listPerangkatDesa,
  listPotensiDesa,
  listSliderBeranda,
  listSlugBerita,
  listSlugHalaman,
  listVideoGaleriPublik,
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

export async function daftarDokumenPublik(villageId: number, kategori?: string) {
  return listDokumenPublik(villageId, kategori);
}

export async function daftarBerita(
  villageId: number,
  opsi: { limit?: number; kategoriSlug?: string; headlineSaja?: boolean; cari?: string } = {},
) {
  return listBerita(villageId, opsi);
}

export async function hitungBeritaPublik(villageId: number, kategoriSlug?: string) {
  return countBerita(villageId, kategoriSlug);
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

export async function daftarVideoGaleriPublik(villageId: number, limit = 8) {
  return listVideoGaleriPublik(villageId, limit);
}

export async function daftarPotensiDesa(villageId: number, includeInactive = false) {
  return listPotensiDesa(villageId, includeInactive);
}

/** Pengaturan kontak publik tenant; hanya field kontak nonrahasia yang dibaca. */
export async function pengaturanKontakPublik(villageId: number) {
  const [row] = await db.select({ nilai: pengaturanDesa.nilai }).from(pengaturanDesa)
    .where(and(eq(pengaturanDesa.villageId, villageId), eq(pengaturanDesa.kunci, "pengaturan.kontak"))).limit(1);
  try {
    const parsed: unknown = row?.nilai ? JSON.parse(row.nilai) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const data = parsed as Record<string, unknown>;
    const safe = (key: string) => typeof data[key] === "string" ? (data[key] as string).trim() : "";
    return {
      whatsapp: safe("whatsapp"), telepon: safe("telepon"), email: safe("email"), alamat: safe("alamat"),
      website: safe("website"), instagram: safe("instagram"), facebook: safe("facebook"), youtube: safe("youtube"),
      koordinat: safe("koordinat"), tautanPeta: safe("tautanPeta"), jamLayanan: safe("jamLayanan"),
    };
  } catch {
    return {};
  }
}
