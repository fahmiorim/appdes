"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

import { PlatformTopbarHead } from "./platform-topbar-head";

export function AdminTopbar({
  name,
  villageName,
  isPlatformAdmin = false,
}: {
  name: string;
  villageName: string;
  /** Konsol platform memakai judul halamannya sendiri, bukan label ruang kerja. */
  isPlatformAdmin?: boolean;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        <div className="admin-topbar-context">
          <span className="admin-topbar-title">Ruang kerja administrasi</span>
          <strong>{villageName || "Administrasi Platform"}</strong>
        </div>
      )}
      <div className="admin-topbar-user">
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
      </div>
    </header>
  );
}
