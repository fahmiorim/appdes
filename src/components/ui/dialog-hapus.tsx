"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

interface Props {
  aksi: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
  id: string;
  judul: string;
  keterangan: string;
  label?: string;
}

/** Dialog konfirmasi untuk aksi hapus yang tidak dapat dibatalkan. */
export function DialogHapus({ aksi, id, judul, keterangan, label = "Hapus" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const dialogId = useId();
  const [state, formAction, pending] = useActionState(aksi, createIdleActionState<null>());

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
  }, [state, router]);

  return (
    <>
      <button
        className="button button-danger-ghost"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {label}
      </button>

      <dialog
        aria-labelledby={`${dialogId}-judul`}
        className="platform-dialog"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="platform-dialog-head">
          <div>
            <h2 id={`${dialogId}-judul`}>{judul}</h2>
            <p>{keterangan}</p>
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

        <form action={formAction} className="platform-dialog-form">
          <input name="id" type="hidden" value={id} />
          {state.status === "error" ? (
            <p className="alert alert-error" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="platform-dialog-actions">
            <button
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Batal
            </button>
            <button className="button button-danger" disabled={pending} type="submit">
              {pending ? "Menghapus..." : "Ya, hapus"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
