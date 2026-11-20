import Link from "next/link";
import { notFound } from "next/navigation";
import { getPengajuanWargaDetailData, listBerkasPengajuanWargaDetailData } from "@/features/pelayanan/application/pengajuan-warga-use-cases";
import { verifyWargaPage } from "@/lib/dal";

const labels: Record<string,string> = { diajukan:"Diajukan", diverifikasi:"Diverifikasi", diproses:"Diproses", selesai:"Selesai", ditolak:"Ditolak" };
export default async function DetailPengajuanWargaPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{dikirim?:string}>}) {
  await verifyWargaPage();
  const {id:raw}=await params; const id=Number(raw); if(!Number.isSafeInteger(id)||id<1) notFound();
  const d=await getPengajuanWargaDetailData(id); const berkas=await listBerkasPengajuanWargaDetailData(id); const r=d.request; const s=await searchParams;
  return <main className="page-container warga-page"><div className="page-heading"><div><span className="eyebrow">Layanan Mandiri / Pengajuan</span><h1>{r.nomorTiket}</h1><p>Pantau tahapan pelayanan pengajuan Anda.</p></div><Link className="button button-secondary" href="/layanan-mandiri/beranda">Beranda</Link></div>
    {s.dikirim?<div className="alert alert-info">Pengajuan berhasil dikirim. Simpan nomor tiket ini untuk pemantauan.</div>:null}
    <section className="dashboard-section"><h2>Detail Pengajuan</h2><dl><dt>Layanan</dt><dd>{d.namaLayanan??"—"}</dd><dt>Status</dt><dd>{labels[r.status]??r.status}</dd><dt>Tanggal pengajuan</dt><dd>{r.createdAt.toLocaleString("id-ID")}</dd><dt>Keperluan</dt><dd>{r.keperluan}</dd><dt>Telepon</dt><dd>{r.telepon??"—"}</dd><dt>Catatan petugas</dt><dd>{r.catatanPetugas??"Belum ada"}</dd><dt>Alasan penolakan</dt><dd>{r.alasanPenolakan??"—"}</dd><dt>Dokumen persyaratan</dt><dd>{berkas.length?<ul>{berkas.map(file=><li key={file.id}>{file.namaPersyaratan} — <a href={`/layanan-mandiri/pengajuan/${id}/berkas/${file.id}`}>Lihat {file.namaAsli}</a></li>)}</ul>:"Tidak ada dokumen"}</dd></dl></section>
    <section className="dashboard-section"><h2>Riwayat Status</h2><ol>{d.riwayat.map(item=><li key={item.id}><strong>{item.statusSebelumnya?labels[item.statusSebelumnya]:"Pengajuan dibuat"} → {labels[item.statusBaru]??item.statusBaru}</strong><p>{item.catatan??"Tidak ada catatan"}</p><small>{item.createdAt.toLocaleString("id-ID")}</small></li>)}</ol></section>
  </main>;
}
