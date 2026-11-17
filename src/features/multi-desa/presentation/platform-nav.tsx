"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MENU_PLATFORM, menuPlatformAktif } from "@/features/navigation/domain/menu-platform";

/**
 * Sub-navigasi di dalam konsol platform.
 *
 * Sidebar tetap menampilkan menu yang sama; sub-navigasi ini membantu operator
 * berpindah antar halaman saat sidebar diciutkan pada layar kecil.
 */
export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="platform-subnav" aria-label="Navigasi konsol platform">
      {MENU_PLATFORM.map((item) => {
        const aktif = menuPlatformAktif(item.href, pathname);

        return (
          <Link
            className="platform-subnav-link"
            href={item.href}
            key={item.href}
            aria-current={aktif ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
