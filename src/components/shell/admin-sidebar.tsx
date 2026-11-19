"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { MenuNode } from "@/features/navigation/application/build-menu";
import { grupMenuPlatform, menuPlatformAktif } from "@/features/navigation/domain/menu-platform";
import { pathMenu, ratakanMenu } from "@/features/navigation/domain/menu-tampil";

export function AdminSidebar({
  menu,
  canReadDashboard,
  isPlatformAdmin = false,
  villageName = "",
}: {
  menu: readonly MenuNode[];
  canReadDashboard: boolean;
  isPlatformAdmin?: boolean;
  /** Nama tenant desa yang ditampilkan sebagai identitas di kepala sidebar. */
  villageName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [submenuTertutup, setSubmenuTertutup] = useState<Record<string, boolean>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const homeHref = isPlatformAdmin ? "/super-admin" : "/beranda";
  const baris = ratakanMenu(menu).filter((row) => pathMenu(row.url) !== homeHref);

  function closeDrawer() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!open || !drawer) return;

    const ambilFocusable = () =>
      Array.from(drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter(
        (element) => element.getClientRects().length > 0,
      );

    ambilFocusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = ambilFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const diLuarDrawer = active === null || !drawerRef.current?.contains(active);
      if (event.shiftKey && (diLuarDrawer || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (diLuarDrawer || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        className="mobile-menu-button button button-secondary"
        type="button"
        ref={triggerRef}
        aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
        aria-expanded={open}
        aria-controls="admin-sidebar-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        ☰
      </button>
      {open ? (
        <div className="admin-drawer-backdrop" aria-hidden="true" onClick={closeDrawer} />
      ) : null}
      <aside
        className="admin-sidebar"
        data-open={open}
        data-desa={isPlatformAdmin ? undefined : "true"}
        data-platform={isPlatformAdmin ? "true" : undefined}
        id="admin-sidebar-navigation"
        ref={drawerRef}
      >
        <Link className="admin-sidebar-brand" href={homeHref} onClick={() => setOpen(false)}>
          <Image
            className="admin-brand-logo"
            src="/images/logo.png"
            alt=""
            width={44}
            height={44}
            priority
            unoptimized
          />
          <span className="admin-brand-text">
            {isPlatformAdmin ? (
              <strong>
                FlexiDesa<span className="admin-brand-domain">.id</span>
              </strong>
            ) : (
              <strong>{villageName || "Desa"}</strong>
            )}
            <span>{isPlatformAdmin ? "Konsol Super Admin" : "Admin Desa"}</span>
          </span>
        </Link>
        {isPlatformAdmin ? null : <div className="admin-nav-label">Menu utama</div>}
        <nav className="admin-nav" aria-label="Navigasi administrasi">
          {isPlatformAdmin
            ? grupMenuPlatform().map((kelompok) => (
                <div className="platform-nav-group" key={kelompok.grup}>
                  <div className="admin-nav-label">{kelompok.grup}</div>
                  {kelompok.item.map((item) => {
                    const aktif = menuPlatformAktif(item.href, pathname);

                    if (!item.anak?.length) {
                      return (
                        <Link
                          className="admin-nav-link"
                          href={item.href}
                          key={item.href}
                          aria-current={aktif ? "page" : undefined}
                          onClick={() => setOpen(false)}
                        >
                          <span className="admin-nav-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    }

                    const idSubmenu = `platform-submenu-${item.href.replace(/[^a-z0-9]+/gi, "-")}`;
                    const terbuka = !submenuTertutup[item.href];

                    return (
                      <div className="platform-nav-item" key={item.href}>
                        <button
                          aria-controls={idSubmenu}
                          aria-expanded={terbuka}
                          className="admin-nav-link platform-nav-parent"
                          data-aktif={aktif ? "true" : undefined}
                          onClick={() =>
                            setSubmenuTertutup((sebelumnya) => ({
                              ...sebelumnya,
                              [item.href]: terbuka,
                            }))
                          }
                          type="button"
                        >
                          <span className="admin-nav-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                          <span aria-hidden="true" className="platform-nav-caret">
                            ⌄
                          </span>
                        </button>
                        {terbuka ? (
                          <div className="platform-nav-sub" id={idSubmenu}>
                            {item.anak.map((anak) => (
                              <Link
                                aria-current={pathname === anak.href ? "page" : undefined}
                                className="platform-nav-sublink"
                                href={anak.href}
                                key={anak.href}
                                onClick={() => setOpen(false)}
                              >
                                {anak.label}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
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
        {isPlatformAdmin ? (
          <div className="platform-sidebar-footer">
            <Image
              src="/images/platform-sidebar-landscape.svg"
              alt=""
              width={220}
              height={92}
              unoptimized
            />
            <strong>
              FlexiDesa<span className="admin-brand-domain">.id</span>
            </strong>
            <span>Platform Desa Terpadu</span>
            <span className="platform-sidebar-role">Super Admin</span>
          </div>
        ) : (
          <>
            <div className="admin-nav-note">
              Menu mengikuti hak akses akun. Modul bertanda Segera belum memiliki halaman.
            </div>
            <div className="admin-sidebar-footer">
              Sistem Informasi Desa
              <br />
              Platform FlexiDesa
            </div>
          </>
        )}
      </aside>
    </>
  );
}
