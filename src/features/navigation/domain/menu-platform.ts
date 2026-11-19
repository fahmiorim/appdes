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

export interface MenuPlatformItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
  /** Label grup pada sidebar; item dengan grup sama tampil berurutan. */
  readonly grup: string;
}

export const MENU_PLATFORM: readonly MenuPlatformItem[] = [
  { href: "/super-admin", label: "Dashboard", icon: "▦", grup: "Menu utama" },
  { href: "/super-admin/tenant", label: "Manajemen tenant", icon: "⌂", grup: "Tenant" },
  { href: "/super-admin/domain", label: "Domain tenant", icon: "⇄", grup: "Tenant" },
  {
    href: "/super-admin/pengguna",
    label: "Pengguna platform",
    icon: "☺",
    grup: "Platform",
  },
  { href: "/super-admin/audit", label: "Audit trail", icon: "≡", grup: "Platform" },
  { href: "/super-admin/template", label: "Template tenant", icon: "◫", grup: "Platform" },
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
