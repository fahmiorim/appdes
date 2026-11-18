"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";

import type { ActionState } from "@/lib/action-state";

import { PesanDialog } from "./dialog-bagian";

/**
 * Tombol + dialog untuk aksi panel Kelola tenant.
 *
 * Aksi yang meminta input (tambah domain, kuota media, konfirmasi purge)
 * memakai dialog agar isi panel tetap ringkas dan daftar tenant tidak terdorong
 * ke bawah oleh form yang menetap. Server Action dan validasinya tidak berubah:
 * komponen ini hanya memindahkan tampilan dan meneruskan FormData yang sama.
 */
export function DialogFormTenant<T>({
  aksi,
  stateAwal,
  judul,
  deskripsi,
  labelPemicu,
  labelSubmit,
  labelBatal = "Batal",
  labelPending,
  kelasPemicu = "button button-secondary",
  kelasSubmit = "button button-primary",
  tutupSetelahSukses = true,
  pesanSukses,
  nonaktif = false,
  children,
}: {
  aksi: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  stateAwal: ActionState<T>;
  judul: string;
  deskripsi: ReactNode;
  labelPemicu: string;
  labelSubmit: string;
  labelBatal?: string;
  labelPending?: string;
  kelasPemicu?: string;
  kelasSubmit?: string;
  /** `false` bila hasil aksi harus tetap terbaca setelah selesai (mis. purge). */
  tutupSetelahSukses?: boolean;
  pesanSukses?: (data: T) => ReactNode;
  /** Menonaktifkan tombol pemicu, mis. ketika data tenant sudah di-purge. */
  nonaktif?: boolean;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(aksi, stateAwal);
  const selesai = state.status === "success";

  // Aksi yang mengubah data harus langsung terlihat pada baris di belakang dialog.
  useEffect(() => {
    if (!selesai) return;
    router.refresh();
    if (tutupSetelahSukses) dialogRef.current?.close();
  }, [selesai, router, tutupSetelahSukses]);

  return (
    <>
      <button
        className={kelasPemicu}
        disabled={nonaktif}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {labelPemicu}
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
            <h2 id={`${id}-judul`}>{judul}</h2>
            {deskripsi ? <p>{deskripsi}</p> : null}
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
          {children}

          <PesanDialog state={state} />

          {selesai && !tutupSetelahSukses ? (
            <>
              {pesanSukses ? pesanSukses(state.data) : null}
              <div className="platform-dialog-actions">
                <button
                  className="button button-secondary"
                  onClick={() => dialogRef.current?.close()}
                  type="button"
                >
                  Tutup
                </button>
              </div>
            </>
          ) : (
            <div className="platform-dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                {labelBatal}
              </button>
              <button className={kelasSubmit} disabled={pending} type="submit">
                {pending ? (labelPending ?? "Menyimpan...") : labelSubmit}
              </button>
            </div>
          )}
        </form>
      </dialog>
    </>
  );
}
