/**
 * Menu konsol Super Admin.
 *
 * Menu desa dibangun dari tabel `modules` yang dibatasi tenant, sedangkan akun
 * platform memakai `villageId === null` dan tidak memiliki baris modul. Karena
 * itu menu platform ditulis eksplisit di sini: setiap tautan dijamin menunjuk
 * halaman yang benar-benar ada, dan urutannya mengikuti alur kerja operator
 * (ringkasan → tenant → domain → akses → audit → template → pengaturan).
 *
 * `grup` dipakai sidebar untuk memisahkan pekerjaan seperti mockup konsol.
 * Nilainya harus berurutan: sidebar mencetak label saat grup berubah.
 *
 * Fungsi di file ini murni (tanpa I/O) agar dapat diuji tanpa database.
 */

export interface SubmenuPlatformItem {
  readonly href: string;
  readonly label: string;
}

export interface MenuPlatformItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
  /** Label grup pada sidebar; item dengan grup sama tampil berurutan. */
  readonly grup: string;
  /** Submenu hanya ditampilkan saat menu induk aktif. */
  readonly submenu?: readonly SubmenuPlatformItem[];
}

export const MENU_PLATFORM: readonly MenuPlatformItem[] = [
  { href: "/super-admin", label: "Dashboard", icon: "▦", grup: "Menu utama" },
  {
    href: "/super-admin/domain",
    label: "Desa & Domain",
    icon: "⇄",
    grup: "Desa & Domain",
    submenu: [
      { href: "/super-admin/domain", label: "Daftar Domain" },
      { href: "/super-admin/domain/tambah", label: "Tambah Domain" },
    ],
  },
  {
    href: "/super-admin/pengguna",
    label: "Pengguna platform",
    icon: "☺",
    grup: "Platform",
  },
  { href: "/super-admin/audit", label: "Audit trail", icon: "≡", grup: "Platform" },
  {
    href: "/super-admin/template",
    label: "Manajemen template",
    icon: "◫",
    grup: "Platform",
    submenu: [
      { href: "/super-admin/template", label: "Katalog template" },
      { href: "/super-admin/template/penggunaan", label: "Penggunaan & pembaruan" },
      { href: "/super-admin/template/fondasi", label: "Fondasi tenant" },
    ],
  },
  { href: "/super-admin/pengaturan", label: "Pengaturan", icon: "⚙", grup: "Platform" },
] as const;

/**
 * Apakah tautan menu sedang aktif untuk pathname saat ini.
 *
 * Ringkasan hanya aktif tepat di `/super-admin`; halaman lain aktif juga pada
 * sub-rutenya (mis. `/super-admin/tenant/12`) agar breadcrumb tidak hilang.
 */
export function menuPlatformAktif(href: string, pathname: string): boolean {
  if (href === "/super-admin") return pathname === "/super-admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Href submenu yang paling spesifik untuk pathname aktif.
 *
 * Detail domain (`/super-admin/domain/12`) tetap menandai "Daftar Domain",
 * sedangkan "Tambah Domain" menang atas "Daftar Domain" karena prefiksnya lebih
 * panjang. Dengan begitu submenu tidak perlu aturan rute satu per satu.
 */
export function submenuPlatformAktif(
  submenu: readonly SubmenuPlatformItem[],
  pathname: string,
): string | null {
  const cocok = submenu
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);

  return cocok[0]?.href ?? null;
}

/** Daftar grup unik sesuai urutan kemunculan, untuk label sidebar. */
export function grupMenuPlatform(): { readonly grup: string; readonly item: MenuPlatformItem[] }[] {
  return MENU_PLATFORM.reduce<{ grup: string; item: MenuPlatformItem[] }[]>((hasil, item) => {
    const terakhir = hasil[hasil.length - 1];
    if (terakhir?.grup === item.grup) {
      terakhir.item.push(item);
    } else {
      hasil.push({ grup: item.grup, item: [item] });
    }
    return hasil;
  }, []);
}
