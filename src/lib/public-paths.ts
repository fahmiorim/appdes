/**
 * Aturan rute publik untuk proxy (dahulu "middleware").
 *
 * Dipisahkan dari `src/proxy.ts` agar dapat diuji tanpa memuat `next/server`.
 * Proxy hanya bersifat optimistis: otorisasi sebenarnya tetap di Data Access
 * Layer (`src/lib/dal.ts`).
 */

/** Halaman publik: boleh diakses tanpa sesi. */
export const PUBLIC_PATHS = [
  "/desa",
  "/masuk",
  // Alur pemulihan kata sandi harus dapat dibuka tanpa sesi; tautannya dikirim
  // lewat email (`src/lib/auth.ts`).
  "/lupa-sandi",
  "/reset-sandi",
  // Rute lama IDM; dialihkan permanen ke kanonis `/desa/idm-sdgs`.
  "/idm",
  "/jajak-pendapat",
] as const;

/**
 * Berkas metadata yang harus selalu dapat diambil mesin pencari/perayap tanpa
 * sesi. Tidak boleh dialihkan ke halaman masuk.
 *
 * Semuanya benar-benar ada: `sitemap.ts`/`robots.ts` (`/sitemap.xml`,
 * `/robots.txt`), `icon.svg`, serta metadata route `manifest.ts` dan
 * `opengraph-image.tsx` yang menghasilkan `/manifest.webmanifest` dan
 * `/opengraph-image`.
 */
export const PUBLIC_FILES = [
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/icon.svg",
  "/opengraph-image",
] as const;

export function isPublicPath(pathname: string): boolean {
  // Beranda publik.
  if (pathname === "/") return true;

  // Halaman informasi layanan mandiri boleh dibaca tanpa sesi; area warga di
  // bawahnya (`/layanan-mandiri/beranda`, dst.) tetap dilindungi.
  if (pathname === "/layanan-mandiri") return true;

  if (PUBLIC_FILES.includes(pathname as (typeof PUBLIC_FILES)[number])) return true;

  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
