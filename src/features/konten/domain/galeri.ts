import { z } from "zod";

import { buatSlug } from "@/features/publik/domain/slug";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { optionalText } from "@/lib/forms";

/**
 * Konten galeri.
 *
 * Satu desa punya banyak **album**; setiap album berisi **foto**. Foto yang
 * ditandai `slider` ikut dipakai beranda bila tabel `slider` kosong (lihat
 * `listSliderBeranda` di repository publik). Semua aturan di sini murni.
 */

export const GALERI_RESOURCE = RESOURCES.galeri;

/** Skema form album. */
export const albumFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama album wajib diisi.").max(150, "Maksimal 150 karakter."),
  keterangan: optionalText(2000),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(999, "Urutan maksimal 999.")
    .default(0),
  aktif: z.boolean().default(true),
});

export type AlbumFormInput = z.infer<typeof albumFormSchema>;

/** Skema form foto. */
export const fotoFormSchema = z.object({
  judul: optionalText(150),
  keterangan: optionalText(2000),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .max(9999, "Urutan maksimal 9999.")
    .default(0),
  aktif: z.boolean().default(true),
  slider: z.boolean().default(false),
});

export type FotoFormInput = z.infer<typeof fotoFormSchema>;

/** Maksimal berkas per satu unggahan agar satu permintaan tidak terlalu besar. */
export const MAKS_FOTO_PER_UNGGAH = 20;

/**
 * Slug album dari nama; tidak pernah kosong.
 *
 * Kolom `galeri_album.slug` hanya 150 karakter. Akhiran unik `-2` … `-200`
 * memakai maksimal 4 karakter, jadi slug dasar dibatasi 146 karakter.
 */
export function slugAlbum(nama: string): string {
  const dasar = buatSlug(nama, 146);
  return dasar === "" ? "album" : dasar;
}

/** Album pada daftar admin (dengan jumlah foto). */
export interface AlbumAdminRow {
  id: number;
  nama: string;
  slug: string;
  keterangan: string | null;
  sampul: string | null;
  aktif: boolean;
  urut: number;
  jumlahFoto: number;
}

/** Foto pada halaman kelola album. */
export interface FotoAdminRow {
  id: number;
  gambar: string;
  judul: string | null;
  keterangan: string | null;
  urut: number;
  aktif: boolean;
  slider: boolean;
}

/** Hasil unggah banyak foto: yang tersimpan dan yang dilewati beserta alasannya. */
export interface HasilUnggahFoto {
  tersimpan: number;
  dilewati: { nama: string; alasan: string }[];
}
