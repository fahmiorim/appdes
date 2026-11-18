"use client";

import type { ActionState } from "@/lib/action-state";

/**
 * Potongan markup yang dipakai semua dialog konsol platform: pesan hasil aksi
 * dan galat per field. Dipisah agar dialog tidak menyalin markup yang sama.
 */

export function PesanDialog({ state }: { state: ActionState<unknown> }) {
  if (state.status === "idle") return null;

  const error = state.status === "error";
  return (
    <p
      className={error ? "alert alert-error" : "alert alert-info"}
      role={error ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function GalatField({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <span className="form-help" role="alert">
      {pesan}
    </span>
  );
}
