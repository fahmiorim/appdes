"use client";

import { useState } from "react";

import type { IsianField } from "@/features/surat/domain/isian";

interface JenisOption {
  id: number;
  name: string;
  code: string;
  requiresResident: boolean;
  fields: IsianField[];
}

interface PendudukOption {
  id: number;
  name: string;
  nationalId: string;
}

export function SuratForm({
  jenis,
  penduduk,
  tanggalDefault,
  action,
}: {
  jenis: JenisOption[];
  penduduk: PendudukOption[];
  tanggalDefault: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [typeId, setTypeId] = useState(jenis[0]?.id.toString() ?? "");
  const selected = jenis.find((item) => item.id.toString() === typeId) ?? null;

  return (
    <form action={action} className="modul-card" style={{ padding: 22, display: "grid", gap: 20 }}>
      <div>
        <h2 className="beranda-card-title">Informasi Surat</h2>
        <p className="modul-muted">Pilih jenis surat dan lengkapi data penerbitan. Nomor surat akan dibuat saat seluruh tahap verifikasi disetujui.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Jenis surat <span style={{ color: "#dc2626" }}>*</span>
          <select name="typeId" required value={typeId} onChange={(event) => setTypeId(event.target.value)}>
            {jenis.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Penduduk / pemohon
          <select name="residentId" defaultValue="none">
            <option value="none">{selected?.requiresResident ? "Pilih penduduk (wajib)" : "Tanpa penduduk terkait"}</option>
            {penduduk.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.nationalId}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Tanggal surat <span style={{ color: "#dc2626" }}>*</span>
          <input type="date" name="letterDate" required defaultValue={tanggalDefault} />
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Keperluan
          <input type="text" name="purpose" maxLength={255} placeholder="Contoh: Persyaratan administrasi" />
        </label>
      </div>

      {selected && selected.fields.length > 0 ? (
        <section style={{ display: "grid", gap: 14, paddingTop: 18, borderTop: "1px solid var(--color-border)" }}>
          <div>
            <h2 className="beranda-card-title">Isian Tambahan</h2>
            <p className="modul-muted">Isian ini mengikuti format jenis surat yang dipilih.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 14 }}>
            {selected.fields.map((field) => (
              <label key={field.kode} style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700, gridColumn: field.tipe === "textarea" ? "1 / -1" : undefined }}>
                {field.label}{field.required ? <span style={{ color: "#dc2626" }}> *</span> : null}
                {field.tipe === "textarea" ? (
                  <textarea name={`isian.${field.kode}`} required={field.required} rows={3} maxLength={4000} placeholder={field.placeholder ?? ""} />
                ) : field.tipe === "select" ? (
                  <select name={`isian.${field.kode}`} required={field.required} defaultValue="">
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {field.opsi.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.tipe === "checkbox" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38 }}>
                    <input type="hidden" name={`isian.${field.kode}`} value="" />
                    <input type="checkbox" name={`isian.${field.kode}`} value="true" required={field.required} />
                    <span className="modul-muted">{field.placeholder ?? "Centang jika sesuai"}</span>
                  </span>
                ) : (
                  <input
                    type={field.tipe === "number" || field.tipe === "date" ? field.tipe : "text"}
                    name={`isian.${field.kode}`}
                    required={field.required}
                    maxLength={field.tipe === "text" ? 255 : undefined}
                    placeholder={field.placeholder ?? ""}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
        <a href="/persuratan/surat" className="button button-secondary">Batal</a>
        <button type="submit" className="button button-primary" disabled={jenis.length === 0}>Simpan sebagai Konsep</button>
      </div>
    </form>
  );
}
