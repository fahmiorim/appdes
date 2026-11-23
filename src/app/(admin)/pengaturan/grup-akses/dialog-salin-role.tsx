"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { GalatField, PesanDialog } from "@/features/multi-desa/presentation/dialog-bagian";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

interface Props {
  role: { id: number; name: string };
  aksi: (
    state: ActionState<{ id: number }>,
    data: FormData,
  ) => Promise<ActionState<{ id: number }>>;
}
export function DialogSalinRole({ role, aksi }: Props) {
  const ref = useRef<HTMLDialogElement>(null),
    router = useRouter(),
    id = useId();
  const [state, action, pending] = useActionState(aksi, createIdleActionState<{ id: number }>());
  useEffect(() => {
    if (state.status === "success") {
      ref.current?.close();
      router.refresh();
    }
  }, [state, router]);
  return (
    <>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => ref.current?.showModal()}
      >
        Salin
      </button>
      <dialog
        ref={ref}
        className="platform-dialog"
        aria-labelledby={id}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="platform-dialog-head">
          <div>
            <h2 id={id}>Salin role</h2>
            <p>Hak akses dari {role.name} akan disalin ke role baru.</p>
          </div>
          <button
            type="button"
            className="platform-dialog-close"
            onClick={() => ref.current?.close()}
          >
            ×
          </button>
        </div>
        <form action={action} className="platform-dialog-form form-stack">
          <input type="hidden" name="sourceRoleId" value={role.id} />
          <label className="form-field">
            <span className="form-label">Nama role baru</span>
            <input
              className="form-input"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={`${role.name} Salinan`}
            />
            <GalatField
              pesan={state.status === "error" ? state.fieldErrors?.name?.[0] : undefined}
            />
          </label>
          <PesanDialog state={state} />
          <div className="platform-dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => ref.current?.close()}
            >
              Batal
            </button>
            <button type="submit" className="button button-primary" disabled={pending}>
              {pending ? "Menyalin..." : "Salin Role"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
