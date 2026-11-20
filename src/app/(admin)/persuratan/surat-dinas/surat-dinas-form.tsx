import Link from "next/link";
import type { KlasifikasiSuratDTO, SuratDinasDTO } from "@/features/surat/domain/surat";
import { simpanSuratDinasAction } from "./actions";

export function SuratDinasForm({ row, klasifikasi }: {
  row?: SuratDinasDTO | null;
  klasifikasi: KlasifikasiSuratDTO[];
}) {
  return <div className="modul-page">
    <div className="page-heading">
      <div><span className="eyebrow">Administrasi Surat</span><h1>{row ? "Ubah Surat Dinas" : "Buat Surat Dinas"}</h1><p>Catat surat resmi yang diterbitkan perangkat desa dan informasi arsipnya.</p></div>
      <Link className="button button-secondary" href="/persuratan/surat-dinas">Kembali</Link>
    </div>
    <section className="modul-card">
      <form action={simpanSuratDinasAction} className="modul-form-grid">
        {row ? <input type="hidden" name="id" value={row.id}/> : null}
        <label className="modul-field"><span>Nomor surat *</span><input name="letterNumber" required maxLength={100} defaultValue={row?.letterNumber ?? ""}/></label>
        <label className="modul-field"><span>Tanggal surat *</span><input name="letterDate" type="date" required defaultValue={row?.letterDate ?? ""}/></label>
        <label className="modul-field"><span>Penerima</span><input name="recipient" maxLength={150} defaultValue={row?.recipient ?? ""}/></label>
        <label className="modul-field"><span>Alamat penerima</span><input name="recipientAddress" maxLength={255} defaultValue={row?.recipientAddress ?? ""}/></label>
        <label className="modul-field"><span>Perihal *</span><input name="subject" required maxLength={200} defaultValue={row?.subject ?? ""}/></label>
        <label className="modul-field"><span>Klasifikasi</span><select name="classificationId" defaultValue={row?.classificationId?.toString() ?? "none"}><option value="none">Tanpa klasifikasi</option>{klasifikasi.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
        <label className="modul-field" style={{gridColumn:"1 / -1"}}><span>Isi / ringkasan surat</span><textarea name="content" rows={6} maxLength={4000} defaultValue={row?.content ?? ""}/></label>
        <label className="modul-field"><span>Jalur berkas lampiran arsip</span><input name="archiveFile" maxLength={255} placeholder="Contoh: umum/surat-dinas/berkas.pdf" defaultValue={row?.archiveFile ?? ""}/></label>
        <label className="modul-field"><span>Lokasi arsip fisik</span><input name="archiveLocation" maxLength={150} defaultValue={row?.archiveLocation ?? ""}/></label>
        {row?.archiveFile ? <label className="modul-field" style={{gridColumn:"1 / -1",display:"flex",alignItems:"center",gap:8}}><input type="checkbox" name="hapusArsip"/> Hapus referensi lampiran arsip saat disimpan</label> : null}
        <div style={{gridColumn:"1 / -1",display:"flex",justifyContent:"flex-end",gap:10}}><Link className="button button-secondary" href="/persuratan/surat-dinas">Batal</Link><button className="button button-primary" type="submit">Simpan Surat Dinas</button></div>
      </form>
    </section>
  </div>;
}
