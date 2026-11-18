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
/**
 * Normalisasi daftar host platform dari konfigurasi.
 *
 * Menerima satu nilai yang dipisah koma atau satu URL penuh (mis. `APP_URL`)
 * dan mengembalikan host unik tanpa skema, path, port, atau huruf besar.
 */
export function normalisasiDaftarHost(value: string | null | undefined): string[] {
  if (!value) return [];

  const hasil = new Set<string>();
  for (const bagian of value.split(",")) {
    const host = normalizeBaseDomain(bagian);
    if (host) hasil.add(host);
  }

  return [...hasil];
}

/**
 * Apakah host ini milik platform, bukan tenant desa?
 *
 * Host platform (mis. `flexidesa.id` di produksi, `flexidesa.test` di dev)
 * adalah wajah produk: landing page, bukan beranda desa. Daftar host platform
 * sengaja terpisah dari `DESA_BASE_DOMAIN` karena di produksi domain desa dapat
 * memakai induk lain (mis. `desa.id`).
 *
 * Alias `www` mengikuti host dasarnya. Host yang hanya *berakhiran* teks host
 * platform (`flexidesa.id.evil.example`) tidak dianggap platform. Daftar kosong
 * berarti pemisahan host platform tidak aktif.
 */
export function adalahHostPlatform(
  host: string | null | undefined,
  hostPlatform: readonly string[],
): boolean {
  if (hostPlatform.length === 0) return false;

  return hostCandidates(host).some((kandidat) => hostPlatform.includes(kandidat));
}

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
