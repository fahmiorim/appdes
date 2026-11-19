import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hapusVideoGaleriAdmin as hapusVideoGaleriRepo,
  listAlbumGaleri,
  listBerita,
  listVideoGaleriAdmin as listVideoGaleriRepo,
  simpanMetadataAlbumAdmin as simpanMetadataAlbumRepo,
  tambahVideoGaleriAdmin as tambahVideoGaleriRepo,
  type AlbumRingkas,
  type BeritaRingkas,
} from "@/features/publik/infrastructure/content-repository";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";

/**
 * Pembacaan konten desa untuk halaman admin.
 *
 * Konten publik tetap dibatasi tenant; izin baca modul berita/galeri diperiksa
 * di sini agar halaman admin tidak membuka data tanpa otorisasi.
 */

export async function listBeritaAdminData(limit = 50): Promise<BeritaRingkas[]> {
  const user = await requirePermission(RESOURCES.berita, "read");
  const villageId = await resolveVillageId(user);
  return listBerita(villageId, { limit });
}

export async function listGaleriAdminData(): Promise<AlbumRingkas[]> {
  const user = await requirePermission(RESOURCES.galeri, "read");
  const villageId = await resolveVillageId(user);
  return listAlbumGaleri(villageId);
}

export async function listVideoGaleriAdminData() {
  const user = await requirePermission(RESOURCES.galeri, "read");
  const villageId = await resolveVillageId(user);
  return listVideoGaleriRepo(villageId);
}

export async function simpanMetadataAlbumAdmin(
  albumId: number,
  kategori: string | null,
  publishedAt: Date | null,
) {
  const user = await requirePermission(RESOURCES.galeri, "update");
  const villageId = await resolveVillageId(user);
  return simpanMetadataAlbumRepo(villageId, albumId, kategori, publishedAt);
}

export async function tambahVideoGaleriAdmin(data: {
  judul: string;
  keterangan: string | null;
  url: string;
  provider: "youtube" | "vimeo";
  publishedAt: Date;
}) {
  const user = await requirePermission(RESOURCES.galeri, "update");
  const villageId = await resolveVillageId(user);
  return tambahVideoGaleriRepo(villageId, data);
}

export async function hapusVideoGaleriAdmin(videoId: number) {
  const user = await requirePermission(RESOURCES.galeri, "delete");
  const villageId = await resolveVillageId(user);
  return hapusVideoGaleriRepo(villageId, videoId);
}
