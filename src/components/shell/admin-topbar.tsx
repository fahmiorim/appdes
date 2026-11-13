"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AdminTopbar({ name, villageName }: { name: string; villageName: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.replace("/masuk");
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
      <div>
        <div className="admin-topbar-title">Ruang kerja administrasi</div>
        <strong>{villageName || "Administrasi Platform"}</strong>
      </div>
      <div className="admin-topbar-user">
        <span className="avatar" aria-hidden="true">{initials || "U"}</span>
        <span>
          <strong>{name}</strong>
          <span className="form-help" style={{ display: "block" }}>Pengguna aktif</span>
        </span>
        <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? "Keluar..." : "Keluar"}
        </Button>
      </div>
    </header>
  );
}
