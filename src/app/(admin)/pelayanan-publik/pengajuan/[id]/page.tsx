import Link from "next/link";
import { notFound } from "next/navigation";
import { getPengajuanDetailData } from "@/features/pelayanan/application/pengajuan-use-cases";
import { ubahStatusPengajuanAction } from "../actions";
import { listBerkasPengajuanAdminData } from "@/features/pelayanan/application/pengajuan-use-cases";

const labels: Record<string, string> = { diajukan: "Diajukan", diverifikasi: "Diverifikasi", diproses: "Diproses", selesai: "Selesai", ditolak: "Ditolak" };
const transitions: Record<string, string[]> = { diajukan: ["diverifikasi", "ditolak"], diverifikasi: ["diproses", "ditolak"], diproses: ["selesai", "ditolak"], selesai: [], ditolak: [] };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tersimpan?: string }> }) {
  const p = await params;
  const id = Number(p.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const d = await getPengajuanDetailData(id);
  const berkas = await listBerkasPengajuanAdminData(id);
  const r = d.request;
  const s = await searchParams;
  const next = transitions[r.status] ?? [];
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Pelayanan Publik / Pengajuan</span><h1>{r.nomorTiket}</h1><p>Rincian permohonan dan tindak lanjut petugas.</p></div><Link className="button button-secondary" href="/pelayanan-publik/pengajuan">Kembali</Link></div>
    {s.tersimpan ? <div className="alert alert-info">Status pengajuan berhasil diperbarui.</div> : null}
    <section className="modul-card"><h2>Informasi Pemohon</h2><dl>
      <dt>Nama</dt><dd>{r.namaPemohon}</dd><dt>NIK</dt><dd>{r.nik ?? "—"}</dd><dt>Telepon</dt><dd>{r.telepon ?? "—"}</dd><dt>Email</dt><dd>{r.email ?? "—"}</dd><dt>Alamat</dt><dd>{r.alamat ?? "—"}</dd><dt>Layanan</dt><dd>{d.namaLayanan ?? "—"}</dd><dt>Biaya</dt><dd>{d.biaya === 0 ? "Gratis" : (d.biaya ?? 0).toLocaleString("id-ID") + " rupiah"}</dd><dt>Keperluan</dt><dd>{r.keperluan}</dd><dt>Status</dt><dd>{labels[r.status] ?? r.status}</dd><dt>Diajukan</dt><dd>{r.createdAt.toLocaleString("id-ID")}</dd>
      <dt>Dokumen persyaratan</dt><dd>{berkas.length ? <ul>{berkas.map((file) => <li key={file.id}>{file.namaPersyaratan} — <a href={`/api/admin/pelayanan-publik/pengajuan/${id}/berkas/${file.id}`}>Unduh {file.namaAsli}</a></li>)}</ul> : "Tidak ada dokumen"}</dd><dt>Catatan petugas</dt><dd>{r.catatanPetugas ?? "—"}</dd><dt>Alasan penolakan</dt><dd>{r.alasanPenolakan ?? "—"}</dd>
    </dl></section>
    <section className="modul-card"><h2>Riwayat Status</h2>{d.riwayat.length ? <ol className="activity-list">{d.riwayat.map((item) => <li key={item.id}><strong>{item.statusSebelumnya ? labels[item.statusSebelumnya] : "Permohonan dibuat"} → {labels[item.statusBaru] ?? item.statusBaru}</strong><p>{item.catatan ?? "Tidak ada catatan"}</p><small>{item.createdAt.toLocaleString("id-ID")}</small></li>)}</ol> : <p>Belum ada riwayat.</p>}</section>
    {next.length ? <section className="modul-card"><h2>Tindak Lanjut</h2><form action={ubahStatusPengajuanAction} className="modul-form-grid"><input type="hidden" name="id" value={id}/><label className="modul-field"><span>Status berikutnya</span><select name="status" defaultValue={next[0]}>{next.map(v => <option key={v} value={v}>{labels[v]}</option>)}</select></label><label className="modul-field"><span>Catatan petugas</span><textarea name="catatanPetugas" rows={4} defaultValue={r.catatanPetugas ?? ""}/></label><label className="modul-field"><span>Alasan penolakan (wajib jika ditolak)</span><textarea name="alasanPenolakan" rows={3} defaultValue={r.alasanPenolakan ?? ""}/></label><div style={{ gridColumn: "1 / -1" }}><button className="button button-primary">Simpan Perubahan</button></div></form></section> : <section className="modul-card"><h2>Pengajuan Ditutup</h2><p>Pengajuan berstatus {labels[r.status] ?? r.status} dan tidak dapat diubah lagi.</p></section>}
  </div>;
}
