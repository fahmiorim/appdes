import {
  listMenuPublik,
  type MenuPublikRingkas,
} from "@/features/publik/infrastructure/content-repository";

/**
 * Navigasi situs publik.
 *
 * Sumber kebenaran navigasi adalah tabel `menu_publik` milik tenant, sehingga
 * administrator desa dapat mengubah menunya tanpa mengubah kode. Sebelum ini
 * setiap halaman publik menulis daftar tautannya sendiri, sementara template
 * tenant menyemai `menu_publik` — dua daftar yang bisa menyimpang.
 *
 * Halaman publik tetap memakai `PublicShell` sebagai presenter; modul ini hanya
 * menerjemahkan baris database menjadi item navigasi yang aman dirender.
 */

export type NavPublikItem = {
  href: string;
  label: string;
  /** Tautan keluar dirender sebagai `<a>` biasa, bukan `next/link`. */
  eksternal?: boolean;
};

/**
 * Navigasi cadangan bila tenant belum memiliki satu pun menu aktif.
 *
 * Isinya sengaja sama dengan menu publik template tenant (`TENANT_TEMPLATE`),
 * tetapi ditulis ulang di sini karena navigasi tidak boleh bergantung pada data
 * tenant lain atau pada template yang belum tentu pernah diterapkan. Tenant lama
 * yang belum punya baris `menu_publik` tetap mendapatkan navigasi yang berfungsi,
 * bukan header kosong.
 */
export const NAV_PUBLIK_BAWAAN: readonly NavPublikItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/profil", label: "Profil Desa" },
  { href: "/pemerintahan", label: "Pemerintahan" },
  { href: "/layanan", label: "Layanan" },
  { href: "/berita", label: "Berita" },
  { href: "/agenda", label: "Agenda" },
  { href: "/statistik", label: "Statistik" },
  { href: "/kontak", label: "Kontak" },
];

/**
 * Tautan internal harus path absolut di situs ini.
 *
 * `//host` dan `/\host` diperlakukan browser sebagai URL absolut ke host lain,
 * dan skema seperti `javascript:`/`data:` harus ditolak sebelum dirender. Nilai
 * dari database tidak dipercaya meski UI pengelolaan membatasi inputnya.
 */
function linkInternal(link: string): string | null {
  const trimmed = link.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  return trimmed;
}

/** Tautan eksternal hanya `http(s)`; skema lain tidak dirender. */
function linkEksternal(link: string): string | null {
  const trimmed = link.trim();
  return /^https?:\/\/[^\s]+$/i.test(trimmed) ? trimmed : null;
}

function jadikanItem(menu: MenuPublikRingkas): NavPublikItem | null {
  const label = menu.nama.trim();
  if (!label) return null;

  if (menu.linkTipe === "eksternal") {
    const href = linkEksternal(menu.link);
    return href === null ? null : { href, label, eksternal: true };
  }

  const href = linkInternal(menu.link);
  return href === null ? null : { href, label };
}

/**
 * Ubah baris `menu_publik` menjadi item navigasi.
 *
 * Perilaku yang disengaja:
 * - Urutan mengikuti `urut`, lalu `id` agar stabil bila `urut` sama.
 * - Anak langsung ditampilkan tepat setelah induknya. Header situs berupa satu
 *   baris tautan, jadi submenu tidak dirender sebagai dropdown; menampilkannya
 *   datar lebih baik daripada menghilangkan tautan yang dibuat administrator.
 * - Anak yang induknya nonaktif atau tidak ada diperlakukan sebagai induk agar
 *   tautannya tidak hilang diam-diam.
 * - Tautan yang tidak valid dibuang (lihat `linkInternal`/`linkEksternal`), dan
 *   `href` ganda hanya ditampilkan sekali.
 * - Bila tidak ada satu pun menu yang dapat dirender, kembalikan
 *   `NAV_PUBLIK_BAWAAN` supaya situs tidak kehilangan navigasi.
 */
export function bangunNavPublik(menu: readonly MenuPublikRingkas[]): NavPublikItem[] {
  const aktif = menu
    .filter((baris) => baris.aktif)
    .slice()
    .sort((kiri, kanan) => kiri.urut - kanan.urut || kiri.id - kanan.id);

  const idAktif = new Set(aktif.map((baris) => baris.id));
  const anak = new Map<number, MenuPublikRingkas[]>();
  const akar: MenuPublikRingkas[] = [];

  for (const baris of aktif) {
    const induk = baris.parentId;
    if (induk === null || induk === baris.id || !idAktif.has(induk)) {
      akar.push(baris);
      continue;
    }
    const daftar = anak.get(induk);
    if (daftar) daftar.push(baris);
    else anak.set(induk, [baris]);
  }

  const hasil: NavPublikItem[] = [];
  const hrefTerpakai = new Set<string>();

  const tambahkan = (baris: MenuPublikRingkas) => {
    const item = jadikanItem(baris);
    if (item === null || hrefTerpakai.has(item.href)) return;
    hrefTerpakai.add(item.href);
    hasil.push(item);
  };

  for (const baris of akar) {
    tambahkan(baris);
    for (const turunan of anak.get(baris.id) ?? []) tambahkan(turunan);
  }

  return hasil.length > 0 ? hasil : [...NAV_PUBLIK_BAWAAN];
}

/** Navigasi publik tenant, dibaca dari `menu_publik` pada tiap permintaan. */
export async function getNavPublik(villageId: number): Promise<NavPublikItem[]> {
  return bangunNavPublik(await listMenuPublik(villageId));
}
