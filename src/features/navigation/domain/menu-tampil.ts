/**
 * Penyajian menu admin.
 *
 * RBAC menyimpan seluruh modul yang boleh dibaca sebuah role, tetapi belum
 * semuanya memiliki halaman. Menu tidak boleh menautkan rute yang belum ada
 * (menghasilkan 404), sehingga ketersediaan rute ditandai terpisah dan modul
 * yang belum siap ditampilkan sebagai label non-aktif.
 *
 * Fungsi di sini murni (tanpa I/O) agar dapat diuji tanpa database.
 */

/**
 * Rute admin yang benar-benar memiliki halaman.
 *
 * Tambahkan path di sini ketika halaman barunya dibuat. Ini sengaja berupa
 * daftar eksplisit: menebak dari `modules.url` akan menghasilkan tautan mati.
 */
export const RUTE_ADMIN_TERSEDIA: readonly string[] = [
  "/beranda",
  "/penduduk",
  "/persuratan/surat",
  "/pengaduan-admin",
  "/keuangan",
  "/konten/berita",
  "/konten/galeri",
  "/website",
  "/website/pengaturan",
  "/website/halaman",
  "/website/konten",
  "/website/dokumen",
  "/pengaturan/pengguna",
  "/pengaturan/grup-akses",
  "/super-admin",
  "/super-admin/tenant",
  "/super-admin/domain",
  "/super-admin/pengguna",
  "/super-admin/audit",
  "/super-admin/template",
  "/super-admin/pengaturan",
];

export interface MenuNodeLike {
  label: string;
  url: string | null;
  children: readonly MenuNodeLike[];
}

export interface BarisMenu {
  kind: "grup" | "item";
  label: string;
  url: string | null;
  /** Hanya bermakna untuk `item`: apakah halaman tujuan sudah tersedia. */
  tersedia: boolean;
}

/** Normalisasi path: buang query dan garis miring di akhir. */
export function pathMenu(url: string | null | undefined): string | null {
  if (!url) return null;
  const tanpaQuery = url.split("?")[0] ?? "";
  const path = tanpaQuery.replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

/** Apakah URL menu menunjuk halaman admin yang sudah diimplementasikan. */
export function ruteTersedia(url: string | null | undefined): boolean {
  const path = pathMenu(url);
  if (!path) return false;
  return RUTE_ADMIN_TERSEDIA.includes(path);
}

/**
 * Ratakan menu bersarang menjadi baris siap render.
 *
 * Simpul yang punya anak menjadi judul grup; daun menjadi item. Urutan mengikuti
 * hasil `buildMenu` (sudah diurutkan berdasarkan sortOrder lalu label).
 */
export function ratakanMenu(menu: readonly MenuNodeLike[]): BarisMenu[] {
  const hasil: BarisMenu[] = [];

  const telusuri = (nodes: readonly MenuNodeLike[]): void => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        hasil.push({ kind: "grup", label: node.label, url: null, tersedia: false });
        telusuri(node.children);
        continue;
      }

      hasil.push({
        kind: "item",
        label: node.label,
        url: node.url,
        tersedia: ruteTersedia(node.url),
      });
    }
  };

  telusuri(menu);
  return hasil;
}
