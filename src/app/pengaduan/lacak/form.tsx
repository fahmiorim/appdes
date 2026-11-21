"use client";

import { useActionState } from "react";

import { labelKategori, labelStatus } from "@/features/pengaduan/domain/pengaduan";

import { lacakPengaduanAction, type StateLacakPengaduan } from "./actions";

const AWAL: StateLacakPengaduan = { error: null, hasil: null };

export function FormLacakPengaduan() {
  const [state, action, pending] = useActionState(lacakPengaduanAction, AWAL);
  const tanggal = state.hasil?.createdAt
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(
        state.hasil.createdAt,
      )
    : null;

  return (
    <div className="modul-card">
      <form action={action} className="modul-form-grid">
        <label className="modul-field">
          Nomor tiket
          <input name="nomorTiket" required placeholder="PGD-20261121-0001" autoComplete="off" />
        </label>
        <label className="modul-field">
          NIK, nomor telepon, atau email yang digunakan saat mengirim
          <input name="identitas" required minLength={3} autoComplete="off" />
        </label>
        {state.error ? (
          <p role="alert" className="alert alert-info">
            {state.error}
          </p>
        ) : null}
        <div className="modul-form-actions">
          <button className="button button-primary" disabled={pending} type="submit">
            {pending ? "Memeriksa..." : "Lacak Status"}
          </button>
        </div>
      </form>
      {state.hasil ? (
        <section className="dashboard-section" aria-live="polite">
          <p className="eyebrow">Hasil Pelacakan</p>
          <h2>{state.hasil.judul}</h2>
          <p>
            <strong>{state.hasil.nomorTiket}</strong> · {labelKategori(state.hasil.kategori)}
          </p>
          <p>
            Status: <strong>{labelStatus(state.hasil.status)}</strong>
          </p>
          {tanggal ? <p>Dikirim: {tanggal}</p> : null}
          <p>{state.hasil.isi}</p>
          {state.hasil.tanggapan ? (
            <div className="modul-card">
              <strong>Tanggapan petugas desa</strong>
              <p>{state.hasil.tanggapan}</p>
            </div>
          ) : (
            <p>Belum ada tanggapan dari petugas desa.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
