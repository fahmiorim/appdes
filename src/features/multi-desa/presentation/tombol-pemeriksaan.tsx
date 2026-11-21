"use client";

import { useActionState } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

/**
 * Tombol pemeriksaan massal dengan status proses dan hasil dari Server Action.
 *
 * Aksi tetap dijalankan di server; komponen ini hanya menampilkan pending dan
 * pesan hasil. Tidak ada status pemeriksaan yang dibuat di browser.
 */
export function TombolPemeriksaan<T>({
  aksi,
  jenis,
  label,
  labelPending,
}: {
  aksi: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  jenis: "ssl" | "dns";
  label: string;
  labelPending: string;
}) {
  const [state, formAction, pending] = useActionState(aksi, createIdleActionState<T>());

  return (
    <form action={formAction} className="domain-action">
      <button className="button button-secondary" disabled={pending} type="submit">
        {jenis === "ssl" ? (
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path d="M12 3.2 19 6v5.2c0 4.4-2.8 7.6-7 9.6-4.2-2-7-5.2-7-9.6V6Z" />
            <path d="m8.8 12 2.2 2.2 4.2-4.4" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="8.4" />
            <path d="M3.6 12h16.8" />
            <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
          </svg>
        )}
        {pending ? labelPending : label}
      </button>
      {state.status === "success" ? (
        <span
          aria-live="polite"
          className={
            state.tone === "warning" ? "domain-action-note is-warning" : "domain-action-note"
          }
        >
          {state.message}
        </span>
      ) : null}
      {state.status === "error" ? (
        <span aria-live="polite" className="domain-action-note is-error">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
