"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { GalatField, PesanDialog } from "./dialog-bagian";

/**
 * Dialog tambah domain dari halaman Desa & Domain.
 *
 * Desa dipilih dari daftar yang dikirim server; domain tetap divalidasi ulang
 * oleh use case (Zod + kepemilikan desa + super admin), bukan oleh UI.
 */
export function DialogTambahDomain({
  aksi,
  desa,
}: {
  aksi: (
    state: ActionState<{ id: number }>,
    formData: FormData,
  ) => Promise<ActionState<{ id: number }>>;
  desa: readonly { id: number; name: string | null }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: number }>(),
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

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
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Tambah Domain
      </button>

      <dialog
        aria-labelledby={`${id}-judul`}
        className="platform-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        ref={dialogRef}
      >
        <div className="platform-dialog-head">
          <div>
            <h2 id={`${id}-judul`}>Tambah domain</h2>
            <p>
              Domain pertama desa otomatis menjadi domain utama. Domain berikutnya tersimpan sebagai
              alias dan tetap harus unik lintas desa.
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
          <label className="form-field">
            <span className="form-label">Desa / tenant</span>
            <select className="form-input" name="villageId" required>
              <option value="">Pilih desa</option>
              {desa.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? `Desa #${item.id}`}
                </option>
              ))}
            </select>
            <GalatField pesan={fieldErrors.villageId?.[0]} />
          </label>
          <label className="form-field">
            <span className="form-label">Domain</span>
            <input
              autoComplete="off"
              className="form-input"
              maxLength={255}
              name="domain"
              placeholder="desa-sukamaju.id"
              required
            />
            <GalatField pesan={fieldErrors.domain?.[0]} />
          </label>

          <PesanDialog state={state} />

          <div className="platform-dialog-actions">
            <button
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Batal
            </button>
            <button className="button button-primary" disabled={pending} type="submit">
              {pending ? "Menambahkan..." : "Tambah domain"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
