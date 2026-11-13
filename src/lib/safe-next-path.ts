const NEXT_PATH_ORIGIN = "http://app.local";
const DEFAULT_NEXT_PATH = "/beranda";

/**
 * Kembalikan hanya path relatif lokal yang aman untuk redirect setelah login.
 *
 * Nilai di-parse sebagai URL terhadap origin tetap agar karakter yang dibuang
 * atau ditafsirkan ulang parser (mis. `\`, tab, newline) tidak berubah menjadi
 * host eksternal. Contoh yang harus ditolak: `//evil.test`, `/\evil.test`,
 * `/\t/evil.test`.
 */
export function safeNextPath(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_NEXT_PATH;

  let url: URL;
  try {
    url = new URL(value, NEXT_PATH_ORIGIN);
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  if (url.origin !== NEXT_PATH_ORIGIN) return DEFAULT_NEXT_PATH;
  if (url.pathname === "/masuk" || url.pathname.startsWith("/masuk/")) return DEFAULT_NEXT_PATH;

  return `${url.pathname}${url.search}${url.hash}`;
}
