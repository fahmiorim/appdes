"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { GalatField, PesanDialog } from "@/features/multi-desa/presentation/dialog-bagian";
import type { PenggunaDTO, RoleOption } from "@/features/pengguna/domain/pengguna";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

interface Props<T> {
  aksi: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  roles: RoleOption[];
  currentUserId: string;
  pengguna?: PenggunaDTO;
  label: string;
  varian?: "primary" | "secondary";
}

/**
 * Satu form dipakai untuk tambah dan ubah. Pada mode ubah, akun sendiri tidak
 * boleh mengubah role atau menonaktifkan dirinya; kontrolnya dinonaktifkan dan
 * nilai asli tetap dikirim lewat input tersembunyi.
 */
export function DialogPengguna<T>({
  aksi,
  roles,
  currentUserId,
  pengguna,
  label,
  varian = "secondary",
}: Props<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const id = useId();
  const ubah = pengguna !== undefined;
  const diriSendiri = pengguna?.id === currentUserId;
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
            <h2 id={`${id}-judul`}>{ubah ? "Ubah pengguna" : "Tambah pengguna"}</h2>
            <p>
              {ubah
                ? "Kata sandi hanya berubah bila kolom sandi baru diisi."
                : "Akun baru langsung aktif dan dapat masuk memakai username dan sandi ini."}
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
          {ubah ? <input name="id" type="hidden" value={pengguna.id} /> : null}

          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Nama lengkap</span>
              <input
                className="form-input"
                defaultValue={pengguna?.name}
                maxLength={100}
                name="name"
                required
              />
              <GalatField pesan={fieldErrors.name?.[0]} />
            </label>

            <label className="form-field">
              <span className="form-label">Username</span>
              <input
                autoComplete="off"
                className="form-input"
                defaultValue={pengguna?.username}
                maxLength={100}
                minLength={3}
                name="username"
                pattern="[a-zA-Z0-9._-]{3,100}"
                required
              />
              <GalatField pesan={fieldErrors.username?.[0]} />
            </label>

            <label className="form-field">
              <span className="form-label">Email (opsional)</span>
              <input
                className="form-input"
                defaultValue={pengguna?.email}
                maxLength={255}
                name="email"
                type="email"
              />
              <GalatField pesan={fieldErrors.email?.[0]} />
            </label>

            <label className="form-field">
              <span className="form-label">Grup akses</span>
              {diriSendiri ? (
                <>
                  <input name="roleId" type="hidden" value={pengguna.roleId ?? ""} />
                  <select className="form-input" disabled value={pengguna.roleId ?? ""}>
                    <option value={pengguna.roleId ?? ""}>
                      {pengguna.roleName ?? "Tanpa role"}
                    </option>
                  </select>
                  <span className="form-help">Role akun sendiri tidak dapat diubah.</span>
                </>
              ) : (
                <select
                  className="form-input"
                  defaultValue={pengguna?.roleId ?? ""}
                  name="roleId"
                  required
                >
                  <option disabled value="">
                    Pilih grup akses
                  </option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              )}
              <GalatField pesan={fieldErrors.roleId?.[0]} />
            </label>

            <label className="form-field">
              <span className="form-label">
                {ubah ? "Kata sandi baru (opsional)" : "Kata sandi awal"}
              </span>
              <input
                autoComplete="new-password"
                className="form-input"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder={ubah ? "Kosongkan bila tidak diubah" : "Minimal 8 karakter"}
                required={!ubah}
                type="password"
              />
              <GalatField pesan={fieldErrors.password?.[0]} />
            </label>
          </div>

          {diriSendiri ? (
            <input name="active" type="hidden" value="on" />
          ) : (
            <label className="form-check">
              <input defaultChecked={pengguna?.active ?? true} name="active" type="checkbox" />
              <span>Aktif — pengguna dapat masuk ke aplikasi</span>
            </label>
          )}
          <GalatField pesan={fieldErrors.active?.[0]} />

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
              {pending ? "Menyimpan..." : ubah ? "Simpan perubahan" : "Tambah pengguna"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
