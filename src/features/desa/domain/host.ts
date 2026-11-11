/**
 * Normalisasi host untuk pencarian domain desa.
 *
 * Tidak menyentuh database agar mudah diuji. Contoh:
 * - `Desa.Example.id:3000` → `desa.example.id`
 * - `[::1]:3000` → `::1`
 * - `desa.example.id.` → `desa.example.id`
 */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";

  let value = host.trim().toLowerCase();

  // IPv6 literal: [::1]:3000 → ::1
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    value = end >= 0 ? value.slice(1, end) : value.slice(1);
  } else {
    // Buang port (host:3000), tetapi jangan menyentuh titik pada hostname.
    value = value.replace(/:\d+$/, "");
  }

  return value.replace(/\.$/, "");
}

/**
 * Normalisasi domain induk untuk wildcard subdomain.
 *
 * Menerima `https://desa.id/` atau `Desa.ID` dan mengembalikan `desa.id`.
 * String kosong berarti wildcard dinonaktifkan.
 */
export function normalizeBaseDomain(value: string | null | undefined): string {
  if (!value) return "";

  return normalizeHost(
    value
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, ""),
  );
}

/**
 * Kandidat domain yang dicoba berurutan.
 *
 * `www.` diperlakukan sebagai alias dari domain tanpa `www` agar pengunjung
 * tidak mendapat 404 hanya karena perbedaan awalan.
 */
export function hostCandidates(host: string | null | undefined): string[] {
  const normalized = normalizeHost(host);
  if (!normalized) return [];

  const candidates = [normalized];
  if (normalized.startsWith("www.")) {
    const tanpaWww = normalized.slice(4);
    if (tanpaWww) candidates.push(tanpaWww);
  }

  return candidates;
}
