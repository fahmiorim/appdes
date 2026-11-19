"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

import { PlatformTopbarHead } from "./platform-topbar-head";

/**
 * Label breadcrumb untuk halaman Admin Desa yang sudah tersedia.
 *
 * Daftar ini sengaja eksplisit dan mengikuti `RUTE_ADMIN_TERSEDIA`: rute yang
 * belum punya halaman tidak boleh muncul sebagai tujuan breadcrumb. Tambahkan
 * entri saat halamannya dibuat.
 */
const LABEL_HALAMAN_DESA: Readonly<Record<string, string>> = {
  "/beranda": "Beranda",
};

export function AdminTopbar({
  name,
  isPlatformAdmin = false,
}: {
  name: string;
  /** Konsol platform memakai judul halamannya sendiri, bukan breadcrumb desa. */
  isPlatformAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const labelHalaman = isPlatformAdmin ? null : (LABEL_HALAMAN_DESA[pathname] ?? null);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.replace(isPlatformAdmin ? "/super-admin-login" : "/masuk-admin");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="admin-topbar">
      {isPlatformAdmin ? (
        <PlatformTopbarHead />
      ) : (
        <nav className="admin-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              {labelHalaman ? (
                <Link href="/beranda">Dashboard</Link>
              ) : (
                <span aria-current="page">Dashboard</span>
              )}
            </li>
            {labelHalaman ? <li aria-current="page">{labelHalaman}</li> : null}
          </ol>
        </nav>
      )}
      <div className="admin-topbar-user">
        {isPlatformAdmin ? (
          <details className="platform-user-menu">
            <summary className="admin-user-chip">
              <span className="avatar" aria-hidden="true">
                {initials || "U"}
              </span>
              <span className="admin-user-text">
                <strong>{name}</strong>
                <span>Platform FlexiDesa</span>
              </span>
              <span aria-hidden="true" className="platform-user-chevron">
                ▾
              </span>
            </summary>
            <div className="platform-user-menu-panel">
              <button
                className="button button-secondary button-block"
                disabled={isSigningOut}
                onClick={handleSignOut}
                type="button"
              >
                {isSigningOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </details>
        ) : (
          <>
            <span className="admin-user-chip">
              <span className="avatar" aria-hidden="true">
                {initials || "U"}
              </span>
              <span className="admin-user-text">
                <strong>{name}</strong>
                <span>Pengguna aktif</span>
              </span>
            </span>
            <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Keluar..." : "Keluar"}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
