"use client";

import { useState, type FormEvent } from "react";

import { ajukanAkunWargaAction } from "./actions";

export function FormPendaftaranWarga() {
  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [pesan, setPesan] = useState("");
  const [berhasil, setBerhasil] = useState(false);
  const [memuat, setMemuat] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan("");
    setBerhasil(false);
    setMemuat(true);
    try {
      const result = await ajukanAkunWargaAction({ nik, nama, noHp });
      setPesan(result.message);
      setBerhasil(result.ok);
      if (result.ok) {
        setNik("");
        setNama("");
        setNoHp("");
      }
    } catch {
      setPesan("Koneksi bermasalah. Periksa jaringan lalu coba kembali.");
      setBerhasil(false);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {pesan ? (
        <div role="status" className={berhasil ? "alert alert-success" : "alert alert-error"}>
          {pesan}
        </div>
      ) : null}
      <label className="form-field">
        <span>NIK</span>
        <input
          className="form-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          minLength={16}
          pattern="[0-9]{16}"
          placeholder="Masukkan 16 digit NIK"
          required
          value={nik}
          onChange={(event) => setNik(event.target.value.replace(/\D/g, "").slice(0, 16))}
        />
        <small>Gunakan NIK yang sudah tercatat pada data kependudukan desa.</small>
      </label>
      <label className="form-field">
        <span>Nama lengkap</span>
        <input
          className="form-input"
          autoComplete="name"
          maxLength={100}
          minLength={3}
          placeholder="Sesuai data kependudukan"
          required
          value={nama}
          onChange={(event) => setNama(event.target.value)}
        />
      </label>
      <label className="form-field">
        <span>Nomor HP / WhatsApp</span>
        <input
          className="form-input"
          autoComplete="tel"
          maxLength={20}
          placeholder="08xxxxxxxxxx"
          value={noHp}
          onChange={(event) => setNoHp(event.target.value)}
        />
      </label>
      <p className="form-hint">
        Akun tidak langsung aktif. Pengajuan akan diverifikasi oleh administrator desa. Jika
        disetujui, username dan PIN awal dapat diambil melalui kantor desa.
      </p>
      <button className="button button-primary" type="submit" disabled={memuat}>
        {memuat ? "Mengirim pengajuan..." : "Kirim Pengajuan"}
      </button>
    </form>
  );
}
