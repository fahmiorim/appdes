"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminSidebar({ canReadDashboard }: { canReadDashboard: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mobile-menu-button button button-secondary"
        type="button"
        aria-label="Buka navigasi"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ☰
      </button>
      <aside className="admin-sidebar" data-open={open}>
        <Link className="admin-sidebar-brand" href="/beranda" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            ⌂
          </span>
          <span>FlexiDesa</span>
        </Link>
        <div className="admin-nav-label">Menu utama</div>
        <nav className="admin-nav" aria-label="Navigasi administrasi">
          {canReadDashboard ? (
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
        </nav>
        <div className="admin-nav-note">
          Menu operasional akan ditampilkan setelah halaman modul tersedia.
        </div>
        <div className="admin-sidebar-footer">
          Sistem Informasi Desa
          <br />
          Platform FlexiDesa
        </div>
      </aside>
    </>
  );
}
