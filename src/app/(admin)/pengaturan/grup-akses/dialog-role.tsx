"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { GalatField, PesanDialog } from "@/features/multi-desa/presentation/dialog-bagian";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

interface Props<T> {
  aksi: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  role?: { id: number; name: string };
  label: string;
  varian?: "primary" | "secondary";
}

export function DialogRole<T>({ aksi, role, label, varian = "secondary" }: Props<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const ubah = role !== undefined;
  const [state, formAction, pending] = useActionState(aksi, createIdleActionState<T>());
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
  }, [state, router]);

  return (
    <>
      <button
        className={`button button-${varian}`}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {label}
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
            <h2 id={`${id}-judul`}>{ubah ? "Ubah nama grup" : "Tambah grup akses"}</h2>
            <p>
              {ubah
                ? "Perubahan nama tidak mengubah izin modul yang sudah diberikan."
                : "Grup baru belum memiliki izin; atur matriksnya setelah grup dibuat."}
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
          {ubah ? <input name="roleId" type="hidden" value={role.id} /> : null}
          <label className="form-field">
            <span className="form-label">Nama grup</span>
            <input
              className="form-input"
              defaultValue={role?.name}
              maxLength={100}
              name="name"
              required
            />
            <GalatField pesan={fieldErrors.name?.[0]} />
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
              {pending ? "Menyimpan..." : ubah ? "Simpan nama" : "Tambah grup"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
