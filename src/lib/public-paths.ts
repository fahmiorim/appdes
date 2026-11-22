/**
 * Aturan rute publik untuk proxy (dahulu "middleware").
 *
 * Dipisahkan dari `src/proxy.ts` agar dapat diuji tanpa memuat `next/server`.
 * Proxy hanya bersifat optimistis: otorisasi sebenarnya tetap di Data Access
 * Layer (`src/lib/dal.ts`).
 */

/** Prefix rute publik yang memang memiliki halaman turunan publik. */
export const PUBLIC_PATHS = [
  "/desa",
  "/masuk",
  "/masuk-admin",
  "/super-admin-login",
  // Verifikasi faktor kedua harus dapat diakses sebelum sesi penuh diterbitkan.
  "/two-factor",
  // Alur pemulihan kata sandi harus dapat dibuka tanpa sesi.
  "/lupa-sandi",
  "/reset-sandi",
  // Rute lama IDM; dialihkan permanen ke kanonis `/desa/idm-sdgs`.
  "/idm",
  "/jajak-pendapat",
  // Daftar dan detail konten publik.
  "/berita",
  "/galeri",
] as const;

/**
 * Rute website desa yang hanya publik pada path yang disebutkan.
 *
 * Sengaja tidak menggunakan prefix untuk `/pemerintahan` agar area lain seperti
 * `/pemerintahan/pemilihan` tidak ikut terbuka tanpa sesi. Hal yang sama berlaku
 * untuk `/layanan` dan `/profil`: hanya halaman katalog/profil publik yang
 * diizinkan, bukan rute lain yang kebetulan memakai prefix tersebut.
 */
export const PUBLIC_EXACT_PATHS = [
  "/agenda",
  "/pengumuman",
  "/profil",
  "/profil/sejarah",
  "/profil/visi-misi",
  "/statistik",
  "/data/statistik",
  "/pemerintahan",
  "/wilayah",
  "/sejarah",
  "/visi-misi",
  "/dokumen",
  "/potensi",
  "/kontak",
  "/pengaduan",
  "/transparansi/apbdes",
  "/layanan",
  "/layanan/surat",
] as const;

/**
 * Berkas metadata yang harus selalu dapat diambil mesin pencari/perayap tanpa
 * sesi. Tidak boleh dialihkan ke halaman masuk.
 */
export const PUBLIC_FILES = [
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/icon.svg",
  "/opengraph-image",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;

  // Halaman informasi layanan mandiri boleh dibaca tanpa sesi; area warga di
  // bawahnya (`/layanan-mandiri/beranda`, dst.) tetap dilindungi.
  if (pathname === "/layanan-mandiri") return true;

  if (PUBLIC_EXACT_PATHS.includes(pathname as (typeof PUBLIC_EXACT_PATHS)[number])) {
    return true;
  }

  if (PUBLIC_FILES.includes(pathname as (typeof PUBLIC_FILES)[number])) return true;

  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
