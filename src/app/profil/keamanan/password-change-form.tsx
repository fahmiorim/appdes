"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

export function PasswordChangeForm({
  expired,
  minLength,
  requireUppercase,
  requireLowercase,
  requireNumber,
  requireSymbol,
  reuseCount,
}: {
  expired: boolean;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  reuseCount: number;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmation) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError(result.error.message ?? "Password gagal diubah.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess("Password berhasil diperbarui.");
      router.refresh();
    } catch {
      setError("Password gagal diubah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      style={{
        padding: 20,
        border: "1px solid #e5ddf5",
        borderRadius: 14,
        background: "#fff",
        display: "grid",
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>Ubah Password Akun</h2>
      {expired ? (
        <p
          role="alert"
          style={{ padding: 10, borderRadius: 8, background: "#fff3e8", color: "#9a4b00" }}
        >
          Password telah melewati masa berlaku. Ubah password untuk melanjutkan ke modul desa.
        </p>
      ) : null}
      <p style={{ fontSize: 13, color: "#666" }}>
        Minimal {minLength} karakter{requireUppercase ? ", huruf besar" : ""}
        {requireLowercase ? ", huruf kecil" : ""}
        {requireNumber ? ", angka" : ""}
        {requireSymbol ? ", simbol" : ""}.{" "}
        {reuseCount > 0
          ? `Password tidak boleh sama dengan ${reuseCount} password terakhir.`
          : "Pemeriksaan riwayat password dinonaktifkan."}
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Password saat ini
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          Password baru
          <input
            required
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          Ulangi password baru
          <input
            required
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" style={{ color: "#b42318", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
        {success ? (
          <>
            <p role="status" style={{ color: "#08752d", fontSize: 13 }}>
              {success}
            </p>
            <button
              type="button"
              onClick={() => router.push("/beranda")}
              style={{
                padding: 10,
                border: 0,
                borderRadius: 8,
                background: "#1b8b3d",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Lanjutkan ke Dashboard
            </button>
          </>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: 11,
            border: 0,
            borderRadius: 8,
            background: "linear-gradient(110deg,#a200ff,#3214ed)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {busy ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </section>
  );
}
