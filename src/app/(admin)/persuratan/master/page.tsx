import type { Metadata } from "next";
import Link from "next/link";
import { getMasterReferensiSuratData } from "@/features/surat/application/jenis-surat-use-cases";
import { hapusKlasifikasiSuratAction, hapusSyaratSuratAction, simpanKlasifikasiSuratAction, simpanSyaratSuratAction } from "../jenis-surat/actions";

export const metadata: Metadata = { title: "Master Referensi Surat" };
type SearchParams = Promise<{ berhasil?: string }>;

export default async function MasterReferensiSuratPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ klasifikasi, syarat, canCreateKlasifikasi, canUpdateKlasifikasi, canDeleteKlasifikasi, canCreateSyarat, canUpdateSyarat, canDeleteSyarat }, params] = await Promise.all([getMasterReferensiSuratData(), searchParams]);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Administrasi Surat / Data Pendukung</span><h1>Master Referensi Surat</h1><p>Kelola klasifikasi dan persyaratan dokumen yang digunakan bersama oleh jenis surat di desa.</p></div><div className="page-heading-actions"><Link href="/persuratan/jenis-surat" className="button button-secondary">Kembali ke Jenis Surat</Link></div></div>
    {params.berhasil ? <div className="alert alert-info" role="status">Perubahan master referensi berhasil diproses.</div> : null}
    <section className="modul-card">
      <div className="beranda-card-head"><div><h2 className="beranda-card-title">Klasifikasi Surat</h2><p className="modul-muted">{klasifikasi.length} klasifikasi terdaftar.</p></div></div>
      {canCreateKlasifikasi ? <form action={simpanKlasifikasiSuratAction} className="modul-form-grid" style={{alignItems:"end",marginBottom:20}}>
        <label>Kode klasifikasi<input name="code" required maxLength={20} placeholder="400" /></label>
        <label>Nama klasifikasi<input name="name" required maxLength={150} placeholder="Pemerintahan" /></label>
        <button className="button button-primary" type="submit">＋ Tambah klasifikasi</button>
      </form> : null}
      {klasifikasi.length===0 ? <p className="modul-muted">Belum ada klasifikasi.</p> : <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Kode</th><th>Nama</th><th>Perbarui</th><th>Aksi</th></tr></thead><tbody>{klasifikasi.map((item)=><tr key={item.id}><td className="modul-mono">{item.code}</td><td>{item.name}</td><td>{canUpdateKlasifikasi ? <form action={simpanKlasifikasiSuratAction} style={{display:"flex",gap:6,flexWrap:"wrap"}}><input type="hidden" name="id" value={item.id}/><input name="code" aria-label="Kode klasifikasi" required maxLength={20} defaultValue={item.code}/><input name="name" aria-label="Nama klasifikasi" required maxLength={150} defaultValue={item.name}/><button className="button button-secondary" type="submit">Simpan</button></form> : <span className="modul-muted">—</span>}</td><td>{canDeleteKlasifikasi ? <form action={hapusKlasifikasiSuratAction}><input type="hidden" name="id" value={item.id}/><button className="button button-danger-ghost" type="submit">Hapus</button></form> : <span className="modul-muted">—</span>}</td></tr>)}</tbody></table></div>}
      <p className="modul-muted">Klasifikasi yang masih digunakan oleh jenis surat tidak dapat dihapus. Referensi surat masuk/keluar yang tidak terkait jenis surat akan dilepas oleh proses penghapusan master.</p>
    </section>
    <section className="modul-card">
      <div className="beranda-card-head"><div><h2 className="beranda-card-title">Persyaratan Dokumen</h2><p className="modul-muted">{syarat.length} persyaratan terdaftar.</p></div></div>
      {canCreateSyarat ? <form action={simpanSyaratSuratAction} className="modul-form-grid" style={{alignItems:"end",marginBottom:20}}>
        <label>Nama persyaratan<input name="name" required maxLength={150} placeholder="Fotokopi Kartu Keluarga" /></label>
        <label>Keterangan<input name="description" maxLength={255} placeholder="Unggah dokumen yang masih berlaku" /></label>
        <label>Urutan<input name="sortOrder" type="number" min="0" max="9999" defaultValue="0" /></label>
        <label className="modul-inline-check"><input type="checkbox" name="isActive" defaultChecked/> Aktif</label>
        <button className="button button-primary" type="submit">＋ Tambah persyaratan</button>
      </form> : null}
      {syarat.length===0 ? <p className="modul-muted">Belum ada persyaratan dokumen.</p> : <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Persyaratan</th><th>Keterangan</th><th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{syarat.map((item)=><tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.description ?? "—"}</td><td>{item.sortOrder}</td><td><span className="beranda-chip" data-tone={item.isActive?"hijau":"netral"}>{item.isActive?"Aktif":"Nonaktif"}</span></td><td><div style={{display:"grid",gap:8,minWidth:240}}>{canUpdateSyarat ? <form action={simpanSyaratSuratAction} style={{display:"grid",gap:6}}><input type="hidden" name="id" value={item.id}/><input name="name" aria-label="Nama persyaratan" required maxLength={150} defaultValue={item.name}/><input name="description" aria-label="Keterangan persyaratan" maxLength={255} defaultValue={item.description ?? ""}/><input name="sortOrder" aria-label="Urutan persyaratan" type="number" min="0" max="9999" defaultValue={item.sortOrder}/><label className="modul-inline-check"><input type="checkbox" name="isActive" defaultChecked={item.isActive}/> Aktif</label><button className="button button-secondary" type="submit">Simpan</button></form> : null}{canDeleteSyarat ? <form action={hapusSyaratSuratAction}><input type="hidden" name="id" value={item.id}/><button className="button button-danger-ghost" type="submit">Hapus</button></form> : null}</div></td></tr>)}</tbody></table></div>}
      <p className="modul-muted">Persyaratan yang sedang dipakai oleh jenis surat tidak dapat dihapus. Nonaktifkan jika tidak ingin digunakan lagi.</p>
    </section>
  </div>;
}
