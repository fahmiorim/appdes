"use client";

import { useMemo, useState } from "react";

import { ajukanLayananWargaAction } from "./actions";

type Service = {
  id: number;
  nama: string;
  biaya: number;
  persyaratan: string | null;
  estimasiHari: number;
  deskripsi: string | null;
};
export function PengajuanForm({
  layanan,
  telepon,
  email,
}: {
  layanan: Service[];
  telepon: string | null;
  email: string;
}) {
  const [serviceId, setServiceId] = useState("");
  const selected = useMemo(
    () => layanan.find((item) => String(item.id) === serviceId) ?? null,
    [layanan, serviceId],
  );
  const requirements = (selected?.persyaratan ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <form
      action={ajukanLayananWargaAction}
      className="modul-form-grid"
      encType="multipart/form-data"
    >
      <label className="modul-field">
        <span>Pilih layanan *</span>
        <select
          name="layananId"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">Pilih layanan</option>
          {layanan.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nama} —{" "}
              {item.biaya === 0 ? "Gratis" : item.biaya.toLocaleString("id-ID") + " rupiah"}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="modul-field">
          <span>Informasi layanan</span>
          <p>{selected.deskripsi || "Tidak ada deskripsi."}</p>
          <small>Estimasi penyelesaian: {selected.estimasiHari} hari kerja</small>
        </div>
      ) : null}
      <label className="modul-field">
        <span>Nomor telepon / WhatsApp aktif *</span>
        <input
          name="telepon"
          type="tel"
          required
          minLength={8}
          maxLength={30}
          defaultValue={telepon ?? ""}
        />
      </label>
      <label className="modul-field">
        <span>Email (opsional)</span>
        <input name="email" type="email" maxLength={150} defaultValue={email} />
      </label>
      <label className="modul-field" style={{ gridColumn: "1 / -1" }}>
        <span>Keperluan / keterangan *</span>
        <textarea
          name="keperluan"
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          placeholder="Jelaskan keperluan layanan Anda secara rinci"
        />
      </label>
      {selected ? (
        <section className="modul-field" style={{ gridColumn: "1 / -1" }}>
          <h3>Dokumen Persyaratan</h3>
          {requirements.length === 0 ? (
            <p>
              Layanan ini tidak menetapkan dokumen wajib. Anda dapat mengirim pengajuan tanpa
              lampiran.
            </p>
          ) : (
            <>
              {requirements.map((requirement, index) => (
                <label className="modul-field" key={index}>
                  <span>
                    {index + 1}. {requirement} *
                  </span>
                  <input
                    name={`berkas_${selected.id}_${index}`}
                    type="file"
                    accept="application/pdf,.pdf"
                    required
                  />
                  <small>PDF maksimal 20 MB.</small>
                </label>
              ))}
            </>
          )}
        </section>
      ) : (
        <p style={{ gridColumn: "1 / -1" }}>
          Pilih layanan untuk menampilkan dokumen persyaratan yang wajib diunggah.
        </p>
      )}
      <div style={{ gridColumn: "1 / -1" }}>
        <button className="button button-primary" type="submit">
          Kirim Pengajuan
        </button>
      </div>
    </form>
  );
}
