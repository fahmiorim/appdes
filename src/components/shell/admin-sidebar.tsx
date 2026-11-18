"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { MenuNode } from "@/features/navigation/application/build-menu";
import { MENU_PLATFORM, menuPlatformAktif } from "@/features/navigation/domain/menu-platform";
import { pathMenu, ratakanMenu } from "@/features/navigation/domain/menu-tampil";

export function AdminSidebar({
  menu,
  canReadDashboard,
  isPlatformAdmin = false,
}: {
  menu: readonly MenuNode[];
  canReadDashboard: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homeHref = isPlatformAdmin ? "/super-admin" : "/beranda";

  // Beranda sudah dirender sebagai tautan utama; jangan tampilkan dua kali.
  const baris = ratakanMenu(menu).filter((row) => pathMenu(row.url) !== homeHref);

  return (
    <>
      <button
        className="mobile-menu-button button button-secondary"
        type="button"
        aria-label="Buka navigasi"
        aria-expanded={open}
        aria-controls="admin-sidebar-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        ☰
      </button>
      <aside className="admin-sidebar" data-open={open} id="admin-sidebar-navigation">
        <Link className="admin-sidebar-brand" href={homeHref} onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            ⌂
          </span>
          <span className="admin-brand-text">
            <strong>FlexiDesa</strong>
            <span>Sistem Informasi Desa</span>
          </span>
        </Link>
        <div className="admin-nav-label">{isPlatformAdmin ? "Platform" : "Menu utama"}</div>
        <nav className="admin-nav" aria-label="Navigasi administrasi">
          {isPlatformAdmin
            ? MENU_PLATFORM.map((item) => (
                <Link
                  className="admin-nav-link"
                  href={item.href}
                  key={item.href}
                  aria-current={menuPlatformAktif(item.href, pathname) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="admin-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))
            : null}

          {!isPlatformAdmin && canReadDashboard ? (
            <Link
              className="admin-nav-link"
              href="/beranda"
              aria-current={pathname === "/beranda" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                ⌂
              </span>
              <span>Beranda</span>
            </Link>
          ) : null}

          {isPlatformAdmin
            ? null
            : baris.map((row, index) => {
                const key = `${row.kind}-${row.label}-${index}`;

                if (row.kind === "grup") {
                  return (
                    <div className="admin-nav-label" key={key}>
                      {row.label}
                    </div>
                  );
                }

                if (row.tersedia && row.url) {
                  const aktif = pathMenu(row.url) === pathname;
                  return (
                    <Link
                      className="admin-nav-link"
                      href={row.url}
                      key={key}
                      aria-current={aktif ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="admin-nav-icon" aria-hidden="true">
                        ·
                      </span>
                      <span>{row.label}</span>
                    </Link>
                  );
                }

                return (
                  <span className="admin-nav-link admin-nav-pending" key={key} aria-disabled="true">
                    <span className="admin-nav-icon" aria-hidden="true">
                      ·
                    </span>
                    <span>{row.label}</span>
                    <span className="admin-nav-badge">Segera</span>
                  </span>
                );
              })}
        </nav>
        <div className="admin-nav-note">
          {isPlatformAdmin
            ? "Kelola tenant desa, domain, akses platform, dan telusuri audit lintas desa."
            : "Menu mengikuti hak akses akun. Modul bertanda Segera belum memiliki halaman."}
        </div>
        <div className="admin-sidebar-footer">
          Sistem Informasi Desa
          <br />
          {isPlatformAdmin ? "Konsol Super Admin" : "Platform FlexiDesa"}
        </div>
      </aside>
    </>
  );
}
