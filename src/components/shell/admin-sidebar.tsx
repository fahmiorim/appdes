"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminSidebar({
  canReadDashboard,
  isPlatformAdmin = false,
}: {
  canReadDashboard: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homeHref = isPlatformAdmin ? "/super-admin" : "/beranda";

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
          <span>FlexiDesa</span>
        </Link>
        <div className="admin-nav-label">{isPlatformAdmin ? "Platform" : "Menu utama"}</div>
        <nav className="admin-nav" aria-label="Navigasi administrasi">
          {canReadDashboard ? (
            <Link
              className="admin-nav-link"
              href={homeHref}
              aria-current={
                (isPlatformAdmin && pathname.startsWith("/super-admin")) ||
                (!isPlatformAdmin && pathname === "/beranda")
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {isPlatformAdmin ? "▦" : "⌂"}
              </span>
              <span>{isPlatformAdmin ? "Dashboard platform" : "Beranda"}</span>
            </Link>
          ) : null}
        </nav>
        <div className="admin-nav-note">
          {isPlatformAdmin
            ? "Pantau tenant desa dan ringkasan operasional platform."
            : "Menu operasional desa akan ditampilkan sesuai modul dan hak akses."}
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
