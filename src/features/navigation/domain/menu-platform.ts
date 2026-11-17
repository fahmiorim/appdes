/**
 * Menu konsol Super Admin.
 *
 * Menu desa dibangun dari tabel `modules` yang dibatasi tenant, sedangkan akun
 * platform memakai `villageId === null` dan tidak memiliki baris modul. Karena
 * itu menu platform ditulis eksplisit di sini: setiap tautan dijamin menunjuk
 * halaman yang benar-benar ada, dan urutannya mengikuti alur kerja operator
 * (ringkasan → tenant → domain → akses → audit → template → pengaturan).
 *
 * Fungsi di file ini murni (tanpa I/O) agar dapat diuji tanpa database.
 */

export interface MenuPlatformItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export const MENU_PLATFORM: readonly MenuPlatformItem[] = [
  { href: "/super-admin", label: "Ringkasan", icon: "▦" },
  { href: "/super-admin/tenant", label: "Tenant desa", icon: "⌂" },
  { href: "/super-admin/domain", label: "Domain", icon: "⇄" },
  { href: "/super-admin/pengguna", label: "Pengguna platform", icon: "☺" },
  { href: "/super-admin/audit", label: "Audit trail", icon: "≡" },
  { href: "/super-admin/template", label: "Template tenant", icon: "◫" },
  { href: "/super-admin/pengaturan", label: "Pengaturan", icon: "⚙" },
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
