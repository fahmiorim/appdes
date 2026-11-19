/**
 * Judul halaman konsol platform.
 *
 * Top bar konsol menampilkan identitas halaman (eyebrow, judul, deskripsi) milik
 * rute aktif. Karena layout Next.js tidak menerima metadata milik halaman, isi
 * top bar disimpan di sini sebagai sumber tunggal dan dipetakan dari pathname.
 *
 * Setiap tautan di `MENU_PLATFORM` harus punya entri di sini; test memastikan
 * keduanya tidak melenceng saat menu ditambah.
 */

export interface RemahPlatform {
  readonly label: string;
  readonly href?: string;
}

export interface HeaderPlatform {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  /** Induk navigasi yang ditampilkan sebelum judul halaman. */
  readonly remah?: readonly RemahPlatform[];
  /** Aksi utama halaman, bila ada. */
  readonly aksi?: { readonly label: string; readonly href: string };
}

export const HEADER_PLATFORM: Readonly<Record<string, HeaderPlatform>> = {
  "/super-admin": {
    eyebrow: "Konsol platform",
    title: "Ringkasan platform",
    description: "Pantau tenant desa, domain, akses platform, dan retensi data dalam satu tempat.",
  },
  "/super-admin/tenant": {
    eyebrow: "Desa & Domain",
    title: "Konsol tenant",
    description:
      "Kelola status, kuota media, domain, akses administrator, ekspor, dan purge tiap desa.",
    remah: [{ label: "Desa & Domain" }],
  },
  "/super-admin/domain": {
    eyebrow: "Desa & Domain",
    title: "Daftar domain",
    description:
      "Kelola domain dan alamat website publik seluruh desa/tenant pada platform FlexiDesa.",
    remah: [{ label: "Desa & Domain" }],
  },
  "/super-admin/domain/tambah": {
    eyebrow: "Desa & Domain",
    title: "Tambah Domain",
    description: "Daftarkan subdomain atau custom domain baru untuk tenant desa.",
    remah: [{ label: "Desa & Domain" }, { label: "Daftar Domain", href: "/super-admin/domain" }],
  },
  "/super-admin/pengguna": {
    eyebrow: "Konsol platform",
    title: "Pengguna platform",
    description:
      "Akun yang tidak terikat desa dan hanya mengelola platform. Akun administrator desa dikelola dari konsol tenant, bukan di sini.",
  },
  "/super-admin/audit": {
    eyebrow: "Konsol platform",
    title: "Audit trail",
    description:
      "Rekaman aksi sensitif dari seluruh desa dan tingkat platform: aktor, waktu, alamat IP, dan sumber daya yang berubah.",
  },
  "/super-admin/template": {
    eyebrow: "Konsol platform",
    title: "Template tenant",
    description:
      "Fondasi yang disalin ke setiap desa baru: role, modul, matriks akses, tema, dan menu publik. Katalog surat dan data master desa sengaja tidak termasuk.",
  },
  "/super-admin/pengaturan": {
    eyebrow: "Konsol platform",
    title: "Pengaturan platform",
    description:
      "Ringkasan konfigurasi aktif yang dibaca aplikasi. Nilai rahasia tidak pernah dibaca maupun ditampilkan di halaman ini.",
  },
};

const BAWAAN = HEADER_PLATFORM["/super-admin"] as HeaderPlatform;

/**
 * Header untuk pathname aktif.
 *
 * Sub-rute memakai header menu induknya (mis. `/super-admin/tenant/12` memakai
 * header `/super-admin/tenant`). Pathname yang tidak dikenal memakai ringkasan
 * agar top bar tidak pernah kosong.
 */
export function headerPlatform(pathname: string): HeaderPlatform {
  const persis = HEADER_PLATFORM[pathname];
  if (persis) return persis;

  const induk = Object.keys(HEADER_PLATFORM)
    .filter((href) => href !== "/super-admin" && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return induk ? (HEADER_PLATFORM[induk] as HeaderPlatform) : BAWAAN;
}
