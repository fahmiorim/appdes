"use client";

import { useActionState } from "react";

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
                  Belum ada akun platform. Tambahkan pengguna pertama lewat tombol di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
