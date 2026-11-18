"use client";

import { useState } from "react";

import { DialogHapus } from "@/components/ui/dialog-hapus";
import type { PenggunaDTO, RoleOption } from "@/features/pengguna/domain/pengguna";
import type { ActionState } from "@/lib/action-state";

import { DialogPengguna } from "./dialog-pengguna";

const PER_HALAMAN = 10;

const FORMAT_WAKTU = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((bagian) => bagian[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  rows: PenggunaDTO[];
  roles: RoleOption[];
  currentUserId: string;
  canUpdate: boolean;
  canDelete: boolean;
  aksi: {
    buat: (
      state: ActionState<{ id: string }>,
      formData: FormData,
    ) => Promise<ActionState<{ id: string }>>;
    ubah: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
    hapus: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
  };
}

export function PenggunaConsole({ rows, roles, currentUserId, canUpdate, canDelete, aksi }: Props) {
  const [cari, setCari] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [halaman, setHalaman] = useState(1);

  const kataKunci = cari.trim().toLowerCase();
  const hasil = rows.filter((row) => {
    const cocokCari =
      kataKunci === "" ||
      row.name.toLowerCase().includes(kataKunci) ||
      row.username.toLowerCase().includes(kataKunci) ||
      row.email.toLowerCase().includes(kataKunci);
    const cocokRole = role === "" || String(row.roleId) === role;
    const cocokStatus = status === "" || (status === "aktif" ? row.active : !row.active);
    return cocokCari && cocokRole && cocokStatus;
  });

  const jumlahHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, jumlahHalaman);
  const mulai = (halamanAman - 1) * PER_HALAMAN;
  const baris = hasil.slice(mulai, mulai + PER_HALAMAN);

  return (
    <>
      <div className="tenant-toolbar pengguna-toolbar">
        <label className="tenant-search">
          <span className="sr-only">Cari pengguna</span>
          <input
            className="form-input"
            onChange={(event) => {
              setCari(event.target.value);
              setHalaman(1);
            }}
            placeholder="Cari nama, username, atau email..."
            type="search"
            value={cari}
          />
        </label>

        <select
          aria-label="Filter grup akses"
          className="form-input tenant-filter"
          onChange={(event) => {
            setRole(event.target.value);
            setHalaman(1);
          }}
          value={role}
        >
          <option value="">Semua role</option>
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter status"
          className="form-input tenant-filter"
          onChange={(event) => {
            setStatus(event.target.value);
            setHalaman(1);
          }}
          value={status}
        >
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>

      <div className="tenant-table-scroll">
        <table className="tenant-table pengguna-table">
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">Pengguna</th>
              <th scope="col">Username</th>
              <th scope="col">Role / Hak Akses</th>
              <th scope="col">Kontak</th>
              <th scope="col">Status</th>
              <th scope="col">Terakhir Login</th>
              <th scope="col">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {baris.length === 0 ? (
              <tr>
                <td className="pengguna-kosong" colSpan={8}>
                  Tidak ada pengguna yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              baris.map((row, index) => {
                const diriSendiri = row.id === currentUserId;
                return (
                  <tr key={row.id}>
                    <td className="pengguna-nomor">{mulai + index + 1}</td>
                    <td>
                      <span className="pengguna-identitas">
                        <span aria-hidden="true" className="pengguna-avatar">
                          {inisial(row.name)}
                        </span>
                        <span>
                          <strong>{row.name}</strong>
                          {diriSendiri ? <span className="tenant-secondary">Akun Anda</span> : null}
                        </span>
                      </span>
                    </td>
                    <td className="pengguna-mono">@{row.username || "—"}</td>
                    <td>
                      <span className="pengguna-role">{row.roleName ?? "Tanpa role"}</span>
                    </td>
                    <td className="pengguna-email">{row.email}</td>
                    <td>
                      <span className={`tenant-status ${row.active ? "is-active" : "is-inactive"}`}>
                        <span aria-hidden="true" />
                        {row.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="pengguna-waktu">
                      {row.lastLoginAt ? FORMAT_WAKTU.format(row.lastLoginAt) : "Belum pernah"}
                    </td>
                    <td>
                      <div className="pengguna-aksi">
                        {canUpdate ? (
                          <DialogPengguna
                            aksi={aksi.ubah}
                            currentUserId={currentUserId}
                            label="Ubah"
                            pengguna={row}
                            roles={roles}
                          />
                        ) : null}
                        {canDelete && !diriSendiri ? (
                          <DialogHapus
                            aksi={aksi.hapus}
                            id={row.id}
                            judul="Hapus pengguna?"
                            keterangan={`Akun ${row.name} akan dihapus permanen dan tidak dapat masuk lagi. Riwayat audit tetap tersimpan tanpa nama akun.`}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pengguna-footer">
        <span className="tenant-result-count">
          Menampilkan {baris.length === 0 ? 0 : mulai + 1}–{mulai + baris.length} dari{" "}
          {hasil.length} pengguna
        </span>
        <div className="pengguna-pager">
          <button
            aria-label="Halaman sebelumnya"
            className="pengguna-pager-tombol"
            disabled={halamanAman <= 1}
            onClick={() => setHalaman((nilai) => Math.max(1, nilai - 1))}
            type="button"
          >
            ‹
          </button>
          {Array.from({ length: jumlahHalaman }, (_, index) => index + 1).map((nomor) => (
            <button
              aria-current={nomor === halamanAman ? "page" : undefined}
              className="pengguna-pager-tombol"
              key={nomor}
              onClick={() => setHalaman(nomor)}
              type="button"
            >
              {nomor}
            </button>
          ))}
          <button
            aria-label="Halaman berikutnya"
            className="pengguna-pager-tombol"
            disabled={halamanAman >= jumlahHalaman}
            onClick={() => setHalaman((nilai) => Math.min(jumlahHalaman, nilai + 1))}
            type="button"
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}
