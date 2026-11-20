"use client";

import { useMemo, useState } from "react";
import type { JenisSuratDTO, KlasifikasiSuratDTO } from "@/features/surat/domain/surat";
import type { SyaratSuratDTO } from "@/features/surat/domain/isian";
import { SURAT_PLACEHOLDERS, DEFAULT_NUMBER_FORMAT } from "@/features/surat/domain/surat";
import { simpanJenisSuratAction } from "./actions";

type Props = { jenis: JenisSuratDTO | null; klasifikasi: KlasifikasiSuratDTO[]; syarat: SyaratSuratDTO[] };
const CONTOH = [
  { key: "nomor", label: "Nomor surat" }, { key: "kode_surat", label: "Kode jenis" },
  { key: "kode_desa", label: "Kode desa" }, { key: "tahun", label: "Tahun" },
  { key: "bulan_romawi", label: "Bulan Romawi" },
];
export function JenisSuratForm({ jenis, klasifikasi, syarat }: Props) {
  const [template, setTemplate] = useState(jenis?.templateBody ?? "Yang bertanda tangan di bawah ini, Kepala Desa [nama_desa], menerangkan bahwa:\n\nNama: [nama]\nNIK: [nik]\nAlamat: [alamat]\n\nDemikian surat keterangan ini dibuat untuk [keperluan].");
  const [fields, setFields] = useState(jenis?.formIsian ?? "[]");
  const [selectedSyarat, setSelectedSyarat] = useState<number[]>(() => {
    try { const value: unknown = JSON.parse(jenis?.syaratSurat ?? "[]"); return Array.isArray(value) ? value.map(Number).filter((id) => Number.isInteger(id) && id > 0) : []; } catch { return []; }
  });
  const [error, setError] = useState("");
  const [fieldDraft, setFieldDraft] = useState({ kode: "", label: "", tipe: "text", required: false, opsi: "" });
  const parsedFields = useMemo(() => { try { const value: unknown = JSON.parse(fields); return Array.isArray(value) ? value as Array<{kode:string;label:string;tipe:string;required:boolean;opsi?:string[]}> : []; } catch { return []; } }, [fields]);
  function insertToken(token: string) { setTemplate((current) => current + `[${token}]`); }
  function addField() {
    if (!fieldDraft.kode.trim() || !fieldDraft.label.trim()) { setError("Kode dan label isian harus diisi."); return; }
    if (!/^[a-z0-9_]+$/.test(fieldDraft.kode)) { setError("Kode hanya boleh huruf kecil, angka, dan garis bawah."); return; }
    if (parsedFields.some((item) => item.kode === fieldDraft.kode)) { setError("Kode isian sudah ada."); return; }
    const next = [...parsedFields, { kode: fieldDraft.kode, label: fieldDraft.label, tipe: fieldDraft.tipe, required: fieldDraft.required, opsi: fieldDraft.tipe === "select" ? fieldDraft.opsi.split("\n").map((item) => item.trim()).filter(Boolean) : [] }];
    setFields(JSON.stringify(next, null, 2)); setFieldDraft({ kode: "", label: "", tipe: "text", required: false, opsi: "" }); setError("");
  }
  return (
    <form action={simpanJenisSuratAction} className="modul-form" onSubmit={(event) => {
      const parsed = (() => { try { return JSON.parse(fields); } catch { return null; } })();
      if (!Array.isArray(parsed)) { event.preventDefault(); setError("Format isian dinamis harus berupa JSON array yang valid."); }
    }}>
      {jenis ? <input type="hidden" name="id" value={jenis.id} /> : null}
      <div className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Identitas jenis surat</h2><p className="modul-muted">Kode, klasifikasi, dan pengaturan dasar.</p></div></div>
        <div className="modul-form-grid">
          <label>Kode surat<input name="code" required maxLength={30} defaultValue={jenis?.code ?? ""} placeholder="SKTM" /></label>
          <label>Nama jenis surat<input name="name" required maxLength={150} defaultValue={jenis?.name ?? ""} placeholder="Surat Keterangan Tidak Mampu" /></label>
          <label>Klasifikasi<select name="classificationId" defaultValue={jenis?.classificationId ?? "none"}><option value="none">Tanpa klasifikasi</option>{klasifikasi.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
          <label>Urutan tampil<input name="sortOrder" type="number" min="0" max="9999" defaultValue={jenis?.sortOrder ?? 0} /></label>
          <label>Masa berlaku (bulan)<input name="validityMonths" type="number" min="0" max="120" defaultValue={jenis?.validityMonths ?? 1} /></label>
          <label>Varian template<input name="templateVariant" maxLength={50} defaultValue={jenis?.templateVariant ?? "default"} /></label>
        </div>
        <div className="modul-form-checks">
          <label><input type="checkbox" name="requiresResident" defaultChecked={jenis?.requiresResident ?? true} /> Wajib memilih penduduk</label>
          <label><input type="checkbox" name="isActive" defaultChecked={jenis?.isActive ?? true} /> Aktif digunakan</label>
        </div>
      </div>
      <div className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Editor template surat</h2><p className="modul-muted">Gunakan placeholder dalam tanda kurung siku. Nilainya akan diisi otomatis saat surat dibuat.</p></div><span className="beranda-chip" data-tone="ungu">Template utama</span></div>
        <div className="template-token-groups">
          <strong>Data otomatis</strong>
          <div className="template-token-list">{SURAT_PLACEHOLDERS.map((item) => <button type="button" key={item.key} className="template-token" onClick={() => insertToken(item.key)} title={item.label}>[{item.key}]</button>)}</div>
          <strong>Penomoran</strong>
          <div className="template-token-list">{CONTOH.map((item) => <button type="button" key={item.key} className="template-token" onClick={() => insertToken(item.key)} title={item.label}>[{item.key}]</button>)}</div>
        </div>
        <label className="template-editor-label">Isi template<textarea name="templateBody" required maxLength={20000} rows={15} value={template} onChange={(event) => setTemplate(event.target.value)} spellCheck={false} /></label>
        <label className="template-editor-label">Template alternatif (opsional)<textarea name="templateBodyAlt" maxLength={20000} rows={5} defaultValue={jenis?.templateBodyAlt ?? ""} /></label>
      </div>
      <div className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Formulir isian dinamis</h2><p className="modul-muted">Tambahkan data khusus yang perlu diisi petugas untuk jenis surat ini.</p></div></div>
        <div className="modul-form-grid">
          <label>Kode isian<input value={fieldDraft.kode} onChange={(e) => setFieldDraft((v) => ({...v,kode:e.target.value}))} placeholder="nama_usaha" /></label>
          <label>Label pada formulir<input value={fieldDraft.label} onChange={(e) => setFieldDraft((v) => ({...v,label:e.target.value}))} placeholder="Nama usaha" /></label>
          <label>Tipe isian<select value={fieldDraft.tipe} onChange={(e) => setFieldDraft((v) => ({...v,tipe:e.target.value}))}><option value="text">Teks pendek</option><option value="textarea">Teks panjang</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="select">Pilihan</option><option value="checkbox">Centang</option></select></label>
          <label className="modul-inline-check"><input type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft((v) => ({...v,required:e.target.checked}))} /> Wajib diisi</label>
        </div>
        {fieldDraft.tipe === "select" ? <label>Opsi pilihan (satu per baris)<textarea rows={3} value={fieldDraft.opsi} onChange={(e) => setFieldDraft((v) => ({...v,opsi:e.target.value}))} /></label> : null}
        <button type="button" className="button button-secondary" onClick={addField}>＋ Tambahkan isian</button>
        <div className="template-field-list">{parsedFields.map((item) => <div className="template-field-row" key={item.kode}><span><strong>{item.label}</strong><small>[{item.kode}] · {item.tipe}{item.required ? " · wajib" : ""}</small></span><button type="button" className="button button-ghost" onClick={() => setFields(JSON.stringify(parsedFields.filter((field) => field.kode !== item.kode), null, 2))}>Hapus</button></div>)}</div>
        <details><summary>Pengaturan lanjutan JSON</summary><textarea value={fields} onChange={(event) => setFields(event.target.value)} rows={6} spellCheck={false} /></details>
        <input type="hidden" name="formIsian" value={fields} />
      </div>
      <div className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Persyaratan & penomoran</h2><p className="modul-muted">Persyaratan ini menjadi acuan pemeriksaan sebelum verifikasi.</p></div></div>
        <div className="template-requirements">{syarat.map((item) => <label key={item.id}><input type="checkbox" name="syaratSurat" value={item.id} checked={selectedSyarat.includes(item.id)} onChange={(event) => setSelectedSyarat((current) => event.target.checked ? [...current,item.id] : current.filter((id) => id !== item.id))} /><span><strong>{item.name}</strong><small>{item.description ?? "Persyaratan dokumen"}</small></span></label>)}</div>
        <label>Format nomor surat<input name="numberFormat" maxLength={100} defaultValue={jenis?.numberFormat ?? DEFAULT_NUMBER_FORMAT} /></label>
        <p className="modul-muted">Token: [kode_surat], [nomor], [kode_desa], [tahun], [bulan_romawi]. Nomor resmi tetap dibuat saat persetujuan akhir Kepala Desa.</p>
        <label>Konfigurasi layout JSON<textarea name="layoutConfig" rows={3} defaultValue={jenis?.layoutConfig ?? "{}"} spellCheck={false} /></label>
      </div>
      {error ? <p role="alert" className="modul-error">{error}</p> : null}
      <div className="page-actions"><a href="/persuratan/jenis-surat" className="button button-secondary">Kembali</a><button className="button button-primary" type="submit">Simpan jenis surat</button></div>
    </form>
  );
}
