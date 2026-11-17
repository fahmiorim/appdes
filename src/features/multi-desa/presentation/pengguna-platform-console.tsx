"use client";

import { useActionState, useId, useState } from "react";

import { createIdleActionState, type ActionState } from "@/lib/action-state";

/**
 * Konsol pengguna platform.
 *
 * Setiap baris memakai `useActionState` sendiri agar kegagalan satu aksi tidak
 * mengosongkan form atau pesan baris lain. Server Action diterima lewat prop
 * supaya lapisan presentation tidak bergantung pada folder route.
 */

export interface PenggunaPlatformRowTampil {
  id: string;
  name: string;
  email: string;
  username: string | null;
  roleName: string | null;
  roleSlug: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  sesiAktif: number;
}

export interface HasilResetSandi {
  username: string | null;
  email: string;
  sandiSementara: string;
}

interface AksiPengguna {
  buat: (
    state: ActionState<{ id: string }>,
    formData: FormData,
  ) => Promise<ActionState<{ id: string }>>;
  status: (
    state: ActionState<{ active: boolean }>,
    formData: FormData,
  ) => Promise<ActionState<{ active: boolean }>>;
  reset: (
    state: ActionState<HasilResetSandi>,
    formData: FormData,
  ) => Promise<ActionState<HasilResetSandi>>;
  cabut: (
    state: ActionState<{ jumlah: number }>,
    formData: FormData,
  ) => Promise<ActionState<{ jumlah: number }>>;
}

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const angka = new Intl.NumberFormat("id-ID");

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

function FormTambahPengguna({ aksi }: { aksi: AksiPengguna["buat"] }) {
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: string }>(),
  );
  const [terbuka, setTerbuka] = useState(false);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const id = useId();

  return (
    <div className="platform-create">
      <button
        aria-controls={`${id}-form`}
        aria-expanded={terbuka}
        className="button button-secondary"
        onClick={() => setTerbuka((nilai) => !nilai)}
        type="button"
      >
        {terbuka ? "Tutup formulir" : "+ Tambah pengguna platform"}
      </button>

      {terbuka ? (
        <form action={formAction} className="form-stack platform-create-form" id={`${id}-form`}>
          <p className="form-help">
            Akun baru langsung memakai role <strong>super-admin</strong> platform (tanpa desa) dan
            dapat mengakses seluruh konsol.
          </p>

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
          <div className="platform-form-actions">
            <button className="button button-primary" disabled={pending} type="submit">
              {pending ? "Menyimpan..." : "Buat pengguna"}
            </button>
          </div>
        </form>
      ) : (
        <Pesan state={state} />
      )}
    </div>
  );
}

function BarisPengguna({
  pengguna,
  idSaya,
  aksi,
}: {
  pengguna: PenggunaPlatformRowTampil;
  idSaya: string;
  aksi: AksiPengguna;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    aksi.status,
    createIdleActionState<{ active: boolean }>(),
  );
  const [resetState, resetAction, resetPending] = useActionState(
    aksi.reset,
    createIdleActionState<HasilResetSandi>(),
  );
  const [cabutState, cabutAction, cabutPending] = useActionState(
    aksi.cabut,
    createIdleActionState<{ jumlah: number }>(),
  );

  const diriSendiri = pengguna.id === idSaya;

  return (
    <tr>
      <td>
        <strong>{pengguna.name}</strong>
        <span className="tenant-secondary">{pengguna.email}</span>
      </td>
      <td>
        {pengguna.username ?? <span className="tenant-secondary">—</span>}
        {diriSendiri ? <span className="tenant-secondary">Akun Anda</span> : null}
      </td>
      <td>
        {pengguna.roleName ?? <span className="tenant-secondary">Tanpa role</span>}
        {pengguna.roleSlug ? <span className="tenant-secondary">{pengguna.roleSlug}</span> : null}
      </td>
      <td>
        <span className={pengguna.active ? "tenant-status is-active" : "tenant-status is-inactive"}>
          <span aria-hidden="true" />
          {pengguna.active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td>{angka.format(pengguna.sesiAktif)}</td>
      <td>
        {pengguna.lastLoginAt ? (
          tanggal.format(new Date(pengguna.lastLoginAt))
        ) : (
          <span className="tenant-secondary">Belum pernah</span>
        )}
      </td>
      <td>
        <div className="platform-row-actions">
          <form action={statusAction}>
            <input name="id" type="hidden" value={pengguna.id} />
            <input name="active" type="hidden" value={pengguna.active ? "false" : "true"} />
            <button
              className="button button-secondary platform-action-button"
              disabled={statusPending || (diriSendiri && pengguna.active)}
              title={
                diriSendiri && pengguna.active
                  ? "Akun yang sedang dipakai tidak dapat dinonaktifkan"
                  : undefined
              }
              type="submit"
            >
              {pengguna.active ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </form>
          <form action={resetAction}>
            <input name="id" type="hidden" value={pengguna.id} />
            <button
              className="button button-secondary platform-action-button"
              disabled={resetPending}
              type="submit"
            >
              {resetPending ? "Mereset..." : "Reset sandi"}
            </button>
          </form>
          <form action={cabutAction}>
            <input name="id" type="hidden" value={pengguna.id} />
            <button
              className="button button-secondary platform-action-button"
              disabled={cabutPending || pengguna.sesiAktif === 0}
              type="submit"
            >
              {cabutPending ? "Mencabut..." : "Cabut sesi"}
            </button>
          </form>
        </div>

        <Pesan state={statusState} />
        <Pesan state={resetState} />
        <Pesan state={cabutState} />
        {resetState.status === "success" ? (
          <p className="tenant-secret" aria-live="polite">
            Sandi sementara untuk{" "}
            <strong>{resetState.data.username ?? resetState.data.email}</strong>:{" "}
            <code>{resetState.data.sandiSementara}</code>
          </p>
        ) : null}
      </td>
    </tr>
  );
}

export function PenggunaPlatformConsole({
  pengguna,
  idSaya,
  aksi,
}: {
  pengguna: PenggunaPlatformRowTampil[];
  idSaya: string;
  aksi: AksiPengguna;
}) {
  return (
    <>
      <FormTambahPengguna aksi={aksi.buat} />

      <div className="tenant-table-scroll">
        <table className="tenant-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Username</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Sesi</th>
              <th scope="col">Login terakhir</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pengguna.length > 0 ? (
              pengguna.map((item) => (
                <BarisPengguna aksi={aksi} idSaya={idSaya} key={item.id} pengguna={item} />
              ))
            ) : (
              <tr>
                <td className="tenant-empty" colSpan={7}>
                  Belum ada akun platform. Tambahkan pengguna pertama lewat formulir di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
