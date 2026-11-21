import Link from "next/link";
import { getLayananPageData } from "@/features/pelayanan/application/layanan-use-cases";
import { getPengajuanPageData } from "@/features/pelayanan/application/pengajuan-use-cases";
import { getSurveiPageData } from "@/features/pelayanan/application/survei-use-cases";

export const metadata = { title: "Dashboard Pelayanan Publik" };
const statusLabel: Record<string, string> = {
  diajukan: "Menunggu", diverifikasi: "Diverifikasi", diproses: "Diproses",
  selesai: "Selesai", ditolak: "Ditolak",
};
const number = (value: number) => value.toLocaleString("id-ID");
export default async function Page() {
  const [layanan, pengajuan, survei] = await Promise.all([
    getLayananPageData(), getPengajuanPageData(), getSurveiPageData(),
  ]);
  const totalResponden = survei.rows.reduce((sum, row) => sum + row.totalResponden, 0);
  const layananAktif = layanan.rows.filter((row) => row.aktif).length;
  const statusTotal = pengajuan.statusSummary.reduce((sum, item) => sum + item.total, 0);
  const selesai = pengajuan.statusSummary.find((item) => item.status === "selesai")?.total ?? 0;
  const terbaru = pengajuan.rows.slice(0, 5);
  const statusMax = Math.max(1, ...pengajuan.statusSummary.map((item) => item.total));
  const surveiAktif = survei.rows.filter((row) => row.aktif === 1).length;
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Admin Desa / Pelayanan Publik</span><h1>Dashboard Pelayanan Publik</h1><p>Pantau layanan masyarakat, proses pengajuan, dan tingkat kepuasan warga.</p></div><Link className="button button-secondary" href="/pelayanan-publik/pengajuan">Lihat Pengajuan →</Link></div>
    <div className="dashboard-stats">
      <article className="modul-card"><span>Total Pengajuan</span><strong>{number(statusTotal)}</strong><small>Seluruh pengajuan pada desa ini</small></article>
      <article className="modul-card"><span>Pengajuan Selesai</span><strong>{number(selesai)}</strong><small>{statusTotal ? Math.round(selesai / statusTotal * 100) : 0}% dari total pengajuan</small></article>
      <article className="modul-card"><span>Layanan Aktif</span><strong>{number(layananAktif)}</strong><small>Dari {number(layanan.total)} layanan terdaftar</small></article>
      <article className="modul-card"><span>Responden Survei</span><strong>{number(totalResponden)}</strong><small>{surveiAktif} survei sedang aktif</small></article>
    </div>
    <div className="dashboard-grid">
      <section className="modul-card"><div className="page-heading"><div><h2>Ringkasan Status Pengajuan</h2><p>Distribusi status seluruh permohonan layanan.</p></div><Link href="/pelayanan-publik/pengajuan">Lihat detail →</Link></div><div className="service-status-chart">{pengajuan.statusSummary.map((item) => <div className="service-status-row" key={item.status}><span>{statusLabel[item.status] ?? item.status}</span><div><i style={{width:(item.total/statusMax*100)+"%"}}/></div><strong>{number(item.total)}</strong></div>)}</div>{pengajuan.statusSummary.length===0?<p className="modul-empty">Belum ada data pengajuan.</p>:null}</section>
      <section className="modul-card"><div className="page-heading"><div><h2>Pengajuan Terbaru</h2><p>Permohonan layanan yang baru masuk.</p></div><Link href="/pelayanan-publik/pengajuan">Lihat semua →</Link></div><div className="modul-scroll"><table className="modul-table"><thead><tr><th>No. Tiket</th><th>Pemohon</th><th>Layanan</th><th>Status</th></tr></thead><tbody>{terbaru.map((row) => <tr key={row.id}><td><strong>{row.nomorTiket}</strong></td><td>{row.namaPemohon}</td><td>{row.namaLayanan ?? "Layanan tidak tersedia"}</td><td>{statusLabel[row.status] ?? row.status}</td></tr>)}</tbody></table></div>{terbaru.length===0?<p className="modul-empty">Belum ada pengajuan.</p>:null}</section>
      <section className="modul-card"><div className="page-heading"><div><h2>Layanan Desa</h2><p>Katalog layanan yang tersedia bagi masyarakat.</p></div><Link href="/pelayanan-publik/layanan">Kelola →</Link></div><ul className="activity-list">{layanan.rows.slice(0,5).map((row)=><li key={row.id}><strong>{row.nama}</strong><p>{row.kategori} · {row.estimasiHari} hari kerja · {row.aktif?"Aktif":"Nonaktif"}</p></li>)}</ul>{layanan.rows.length===0?<p className="modul-empty">Belum ada katalog layanan.</p>:null}</section>
      <section className="modul-card"><div className="page-heading"><div><h2>Survei & Kepuasan</h2><p>Partisipasi dan status survei masyarakat.</p></div><Link href="/pelayanan-publik/survei">Lihat survei →</Link></div><div className="dashboard-stats"><div><span>Survei aktif</span><strong>{surveiAktif}</strong></div><div><span>Total responden</span><strong>{number(totalResponden)}</strong></div></div><div className="modul-scroll"><table className="modul-table"><thead><tr><th>Survei</th><th>Responden</th><th>Status</th></tr></thead><tbody>{survei.rows.slice(0,5).map((row)=><tr key={row.id}><td>{row.judul}</td><td>{number(row.totalResponden)}</td><td>{row.aktif===1?"Aktif":"Nonaktif"}</td></tr>)}</tbody></table></div>{survei.rows.length===0?<p className="modul-empty">Belum ada survei yang dibuat.</p>:null}</section>
      <section className="modul-card"><h2>Akses Cepat</h2><div className="quick-actions"><Link className="button button-primary" href="/pelayanan-publik/layanan/baru">＋ Tambah Layanan</Link><Link className="button button-secondary" href="/pelayanan-publik/pengajuan">Kelola Pengajuan</Link><Link className="button button-secondary" href="/pelayanan-publik/survei/baru">＋ Buat Survei</Link></div></section>
    </div>
  </div>;
}
