"use client";

import Link from "next/link";
import { useState } from "react";

import type { IsianField } from "@/features/surat/domain/isian";
import type { PendudukLuarSurat } from "@/features/surat/domain/pengikut";

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
  nationalId: string | null;
}

export function SuratForm({
  jenis,
  penduduk,
  tanggalDefault,
  initial,
  action,
}: {
  jenis: JenisOption[];
  penduduk: PendudukOption[];
  tanggalDefault: string;
  initial?: {
    id?: number;
    typeId: number;
    residentId: number | null;
    letterDate: string;
    purpose: string | null;
    isiSurat: Record<string, string>;
    pengikut: number[];
    luar: PendudukLuarSurat[];
  };
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [typeId, setTypeId] = useState(initial?.typeId.toString() ?? jenis[0]?.id.toString() ?? "");
  const selected = jenis.find((item) => item.id.toString() === typeId) ?? null;

  return (
    <form action={action} className="modul-card" style={{ padding: 22, display: "grid", gap: 20 }}>
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {initial?.pengikut.map((residentId) => (
        <input key={residentId} type="hidden" name="pengikut" value={residentId} />
      ))}
      {initial?.luar.map((item, index) => (
        <input key={index} type="hidden" name="luar" value={JSON.stringify(item)} />
      ))}
      <div>
        <h2 className="beranda-card-title">Informasi Surat</h2>
        <p className="modul-muted">
          Pilih jenis surat dan lengkapi data penerbitan. Nomor surat akan dibuat saat seluruh tahap
          verifikasi disetujui.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
          gap: 16,
        }}
      >
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Jenis surat <span style={{ color: "#dc2626" }}>*</span>
          <select
            name="typeId"
            required
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            {jenis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Penduduk / pemohon
          <select
            name="residentId"
            required={selected?.requiresResident ?? false}
            defaultValue={initial?.residentId?.toString() ?? "none"}
          >
            <option value="none" disabled={selected?.requiresResident ?? false}>
              {selected?.requiresResident ? "Pilih penduduk (wajib)" : "Tanpa penduduk terkait"}
            </option>
            {penduduk.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.nationalId}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Tanggal surat <span style={{ color: "#dc2626" }}>*</span>
          <input
            type="date"
            name="letterDate"
            required
            defaultValue={initial?.letterDate ?? tanggalDefault}
          />
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
          Keperluan
          <input
            type="text"
            name="purpose"
            maxLength={255}
            defaultValue={initial?.purpose ?? ""}
            placeholder="Contoh: Persyaratan administrasi"
          />
        </label>
      </div>

      {selected && selected.fields.length > 0 ? (
        <section
          style={{
            display: "grid",
            gap: 14,
            paddingTop: 18,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div>
            <h2 className="beranda-card-title">Isian Tambahan</h2>
            <p className="modul-muted">Isian ini mengikuti format jenis surat yang dipilih.</p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
              gap: 14,
            }}
          >
            {selected.fields.map((field) => (
              <label
                key={field.kode}
                style={{
                  display: "grid",
                  gap: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  gridColumn: field.tipe === "textarea" ? "1 / -1" : undefined,
                }}
              >
                {field.label}
                {field.required ? <span style={{ color: "#dc2626" }}> *</span> : null}
                {field.tipe === "textarea" ? (
                  <textarea
                    name={`isian.${field.kode}`}
                    required={field.required}
                    rows={3}
                    maxLength={4000}
                    defaultValue={initial?.isiSurat[field.kode] ?? ""}
                    placeholder={field.placeholder ?? ""}
                  />
                ) : field.tipe === "select" ? (
                  <select
                    name={`isian.${field.kode}`}
                    required={field.required}
                    defaultValue={initial?.isiSurat[field.kode] ?? ""}
                  >
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {field.opsi.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.tipe === "checkbox" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38 }}>
                    <input type="hidden" name={`isian.${field.kode}`} value="" />
                    <input
                      type="checkbox"
                      name={`isian.${field.kode}`}
                      value="true"
                      required={field.required}
                      defaultChecked={
                        initial?.isiSurat[field.kode] === "Ya" ||
                        initial?.isiSurat[field.kode] === "true"
                      }
                    />
                    <span className="modul-muted">
                      {field.placeholder ?? "Centang jika sesuai"}
                    </span>
                  </span>
                ) : (
                  <input
                    type={field.tipe === "number" || field.tipe === "date" ? field.tipe : "text"}
                    name={`isian.${field.kode}`}
                    required={field.required}
                    maxLength={field.tipe === "text" ? 255 : undefined}
                    placeholder={field.placeholder ?? ""}
                    defaultValue={initial?.isiSurat[field.kode] ?? ""}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "flex-end",
          paddingTop: 16,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <Link href="/persuratan/surat" className="button button-secondary">
          Batal
        </Link>
        <button type="submit" className="button button-primary" disabled={jenis.length === 0}>
          {initial ? "Simpan Perubahan" : "Simpan sebagai Konsep"}
        </button>
      </div>
    </form>
  );
}
