"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { GalatField, PesanDialog } from "./dialog-bagian";

/**
 * Tombol + dialog pendaftaran desa baru.
 *
 * Form tidak lagi menetap di halaman tenant: daftar tenant adalah isi utama
 * halaman, sedangkan pendaftaran adalah aksi sesekali. Dialog memakai elemen
 * `<dialog>` native agar fokus terkurung, Escape menutup, dan latar belakang
 * tidak dapat dioperasikan tanpa JavaScript tambahan.
 */

type AksiBuatDesa = (
  state: ActionState<{ id: number }>,
  formData: FormData,
) => Promise<ActionState<{ id: number }>>;

export function DialogDaftarDesa({ aksi }: { aksi: AksiBuatDesa }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: number }>(),
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  // Desa baru harus langsung terlihat pada daftar di belakang dialog.
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
  }, [state, router]);

  function buka() {
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button className="button button-primary" type="button" onClick={buka}>
        Daftarkan desa
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
            <h2 id={`${id}-judul`}>Daftarkan desa baru</h2>
            <p>
              Fondasi tenant (role, modul, tema, menu publik) dibuat dari template platform, bukan
              dari desa lain. Katalog surat dan data master desa tetap diisi administrator desa.
            </p>
          </div>
          <button
            aria-label="Tutup dialog"
            className="platform-dialog-close"
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="platform-dialog-form form-stack">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Nama desa</span>
              <input className="form-input" name="name" required minLength={3} maxLength={100} />
              <GalatField pesan={fieldErrors.name?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Kode desa (10 digit)</span>
              <input
                className="form-input"
                name="code"
                required
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
              />
              <GalatField pesan={fieldErrors.code?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Domain (opsional)</span>
              <input className="form-input" name="domain" placeholder="desa-sukamaju.id" />
              <GalatField pesan={fieldErrors.domain?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Nama administrator</span>
              <input
                className="form-input"
                name="adminName"
                required
                minLength={3}
                maxLength={255}
              />
              <GalatField pesan={fieldErrors.adminName?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Username administrator</span>
              <input
                className="form-input"
                name="adminUsername"
                required
                minLength={3}
                maxLength={50}
              />
              <GalatField pesan={fieldErrors.adminUsername?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Email administrator</span>
              <input
                className="form-input"
                name="adminEmail"
                type="email"
                required
                maxLength={255}
              />
              <GalatField pesan={fieldErrors.adminEmail?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Sandi awal administrator</span>
              <input
                className="form-input"
                name="adminPassword"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
              <GalatField pesan={fieldErrors.adminPassword?.[0]} />
            </label>
            <label className="form-field">
              <span className="form-label">Kuota media (MB, kosong = tanpa batas)</span>
              <input className="form-input" name="kuotaMediaMb" type="number" min={1} step={1} />
              <GalatField pesan={fieldErrors.kuotaMediaMb?.[0]} />
            </label>
          </div>

          <PesanDialog state={state} />

          <div className="platform-dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button className="button button-primary" type="submit" disabled={pending}>
              {pending ? "Membuat..." : "Buat desa"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
