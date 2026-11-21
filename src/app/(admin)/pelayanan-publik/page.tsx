import Link from "next/link";
import { getLayananPageData } from "@/features/pelayanan/application/layanan-use-cases";
import { getPengajuanPageData } from "@/features/pelayanan/application/pengajuan-use-cases";
import { getSurveiPageData } from "@/features/pelayanan/application/survei-use-cases";

export const metadata = { title: "Dashboard Pelayanan Publik" };
const statusLabel: Record<string, string> = {
  diajukan: "Menunggu", diverifikasi: "Diverifikasi", diproses: "Diproses",
  selesai: "Selesai", ditolak: "Ditolak",
};
export default async function Page() {
  const [layanan, pengajuan, survei] = await Promise.all([
    getLayananPageData(), getPengajuanPageData(), getSurveiPageData(),
  ]);
  const totalResponden = survei.rows.reduce((sum, row) => sum + row.totalResponden, 0);
  const layananAktif = layanan.rows.filter((row) => row.aktif).length;
  const terbaru = [...pengajuan.rows].slice(0, 5);
  const statusMax = Math.max(1, ...pengajuan.statusSummary.map((item) => item.total));
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Admin Desa / Pelayanan Publik</span><h1>Dashboard Pelayanan Publik</h1><p>Ringkasan layanan, pengajuan masyarakat, dan survei kepuasan desa.</p></div></div>
    <div className="dashboard-stats">
      <article className="modul-card"><span>Total Pengajuan</span><strong>{pengajuan.total.toLocaleString("id-ID")}</strong><small>Seluruh pengajuan pada desa ini</small></article>
      <article className="modul-card"><span>Layanan Aktif</span><strong>{layananAktif.toLocaleString("id-ID")}</strong><small>Dari {layanan.total} layanan terdaftar</small></article>
      <article className="modul-card"><span>Survei Aktif</span><strong>{survei.rows.filter((row) => row.aktif === 1).length}</strong><small>{survei.rows.length} survei terdaftar</small></article>
      <article className="modul-card"><span>Responden Survei</span><strong>{totalResponden.toLocaleString("id-ID")}</strong><small>Akumulasi responden seluruh survei</small></article>
    </div>
    <div className="dashboard-grid">
      <section className="modul-card"><h2>Komposisi Status Pengajuan</h2><div className="service-status-chart">{pengajuan.statusSummary.map((item) => <div className="service-status-row" key={item.status}><span>{statusLabel[item.status] ?? item.status}</span><div><i style={{width:(item.total/statusMax*100)+"%"}}/></div><strong>{item.total}</strong></div>)}</div>{pengajuan.statusSummary.length===0?<p className="modul-empty">Belum ada data pengajuan.</p>:null}</section>
      <section className="modul-card"><div className="page-heading"><div><h2>Pengajuan Terbaru</h2><p>Permohonan layanan masyarakat yang tercatat.</p></div><Link href="/pelayanan-publik/pengajuan">Lihat semua →</Link></div>
        <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nomor</th><th>Pemohon</th><th>Layanan</th><th>Status</th></tr></thead><tbody>{terbaru.map((row) => <tr key={row.id}><td>{row.nomorTiket}</td><td>{row.namaPemohon}</td><td>{row.namaLayanan ?? "Layanan tidak tersedia"}</td><td>{statusLabel[row.status] ?? row.status}</td></tr>)}</tbody></table></div>
        {terbaru.length === 0 ? <p className="modul-empty">Belum ada pengajuan.</p> : null}
      </section>
      <section className="modul-card"><div className="page-heading"><div><h2>Layanan Paling Siap</h2><p>Katalog layanan yang dikelola desa.</p></div><Link href="/pelayanan-publik/layanan">Kelola →</Link></div>
        <ul className="activity-list">{layanan.rows.slice(0, 5).map((row) => <li key={row.id}><strong>{row.nama}</strong><p>{row.kategori} · {row.estimasiHari} hari kerja · {row.aktif ? "Aktif" : "Nonaktif"}</p></li>)}</ul>
        {layanan.rows.length === 0 ? <p className="modul-empty">Belum ada katalog layanan.</p> : null}
      </section>
      <section className="modul-card"><div className="page-heading"><div><h2>Survei & Kepuasan</h2><p>Ringkasan program survei dan jumlah responden.</p></div><Link href="/pelayanan-publik/survei">Kelola survei →</Link></div>
        <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Survei</th><th>Responden</th><th>Status</th></tr></thead><tbody>{survei.rows.slice(0, 5).map((row) => <tr key={row.id}><td>{row.judul}</td><td>{row.totalResponden}</td><td>{row.aktif === 1 ? "Aktif" : "Nonaktif"}</td></tr>)}</tbody></table></div>
        {survei.rows.length === 0 ? <p className="modul-empty">Belum ada survei yang dibuat.</p> : null}
      </section>
      <section className="modul-card"><h2>Akses Cepat</h2><div className="quick-actions"><Link className="button button-primary" href="/pelayanan-publik/layanan/baru">＋ Tambah Layanan</Link><Link className="button button-secondary" href="/pelayanan-publik/pengajuan">Kelola Pengajuan</Link><Link className="button button-secondary" href="/pelayanan-publik/survei/baru">＋ Buat Survei</Link></div></section>
    </div>
  </div>;
}
