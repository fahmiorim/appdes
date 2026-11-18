"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

/**
 * Tombol + dialog penambahan pengguna platform.
 *
 * Form tidak menetap di halaman: pengelolaan akun adalah aksi sesekali,
 * sedangkan daftar akun adalah isi utama. Dialog memakai elemen `<dialog>`
 * native agar fokus terkurung dan Escape menutup tanpa JavaScript tambahan.
 */

type AksiBuatPengguna = (
  state: ActionState<{ id: string }>,
  formData: FormData,
) => Promise<ActionState<{ id: string }>>;

function Pesan({ state }: { state: ActionState<unknown> }) {
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

function GalatField({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <span className="form-help" role="alert">
      {pesan}
    </span>
  );
}

export function DialogTambahPengguna({ aksi }: { aksi: AksiBuatPengguna }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: string }>(),
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  // Akun baru harus langsung terlihat pada daftar di belakang dialog.
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
  }, [state, router]);

  return (
    <>
      <button
        className="button button-primary"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        Tambah pengguna platform
      </button>

      <dialog
        aria-labelledby={`${id}-judul`}
        className="platform-dialog"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="platform-dialog-head">
          <div>
            <h2 id={`${id}-judul`}>Tambah pengguna platform</h2>
            <p>
              Akun baru langsung memakai role <strong>super-admin</strong> platform (tanpa desa) dan
              dapat mengakses seluruh konsol.
            </p>
          </div>
          <button
            aria-label="Tutup dialog"
            className="platform-dialog-close"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="platform-dialog-form form-stack">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Nama lengkap</span>
              <input className="form-input" maxLength={255} minLength={3} name="name" required />
              <GalatField pesan={fieldErrors.name?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Email</span>
              <input className="form-input" maxLength={255} name="email" required type="email" />
              <GalatField pesan={fieldErrors.email?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Username</span>
              <input
                autoComplete="off"
                className="form-input"
                maxLength={50}
                minLength={3}
                name="username"
                pattern="[a-zA-Z0-9._-]{3,50}"
                required
              />
              <GalatField pesan={fieldErrors.username?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Sandi awal (minimal 12 karakter)</span>
              <input
                autoComplete="new-password"
                className="form-input"
                maxLength={72}
                minLength={12}
                name="password"
                required
                type="password"
              />
              <GalatField pesan={fieldErrors.password?.[0]} />
            </label>
          </div>

          <Pesan state={state} />

          <div className="platform-dialog-actions">
            <button
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Batal
            </button>
            <button className="button button-primary" disabled={pending} type="submit">
              {pending ? "Menyimpan..." : "Buat pengguna"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
