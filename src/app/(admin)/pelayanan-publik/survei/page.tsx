import Link from "next/link";
import { getSurveiPageData } from "@/features/pelayanan/application/survei-use-cases";
import { hapusSurveiAction } from "./actions";

export const metadata = { title: "Survei & Kepuasan Masyarakat" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tersimpan?: string; dihapus?: string }> }) {
  const [data, params] = await Promise.all([getSurveiPageData(), searchParams]);
  const active=data.rows.filter(row=>row.aktif===1).length;
  const respondents=data.rows.reduce((sum,row)=>sum+row.totalResponden,0);
  const questions=data.rows.reduce((sum,row)=>sum+row.totalSoal,0);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Pelayanan Publik</span><h1>Survei & Kepuasan Masyarakat</h1><p>Kelola survei, penilaian, dan analisis tingkat kepuasan masyarakat terhadap pelayanan desa.</p></div>{data.canCreate ? <Link className="button button-primary" href="/pelayanan-publik/survei/baru">＋ Buat Survei Baru</Link> : null}</div>
    <div className="dashboard-stats"><article className="modul-card"><span>Total Survei</span><strong>{data.rows.length.toLocaleString("id-ID")}</strong><small>Seluruh periode</small></article><article className="modul-card"><span>Survei Aktif</span><strong>{active.toLocaleString("id-ID")}</strong><small>Sedang menerima tanggapan</small></article><article className="modul-card"><span>Total Responden</span><strong>{respondents.toLocaleString("id-ID")}</strong><small>Akumulasi seluruh survei</small></article><article className="modul-card"><span>Total Pertanyaan</span><strong>{questions.toLocaleString("id-ID")}</strong><small>Seluruh formulir survei</small></article></div>
    <nav className="quick-actions" aria-label="Navigasi survei"><span className="button button-primary">Kelola Survei</span><Link className="button button-secondary" href="#daftar-survei">Daftar Survei</Link><Link className="button button-secondary" href="/pelayanan-publik">Ringkasan Pelayanan</Link></nav>
    {params.tersimpan ? <div className="alert alert-info">Survei berhasil disimpan.</div> : null}
    {params.dihapus ? <div className="alert alert-info">Survei berhasil dihapus.</div> : null}
    <section className="modul-card" id="daftar-survei"><div className="page-heading"><div><h2>Daftar Survei</h2><p>Pantau periode, jumlah pertanyaan, responden, dan status setiap survei.</p></div></div>
      <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nama Survei</th><th>Periode</th><th>Soal</th><th>Responden</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {data.rows.map((row) => <tr key={row.id}><td><strong>{row.judul}</strong><br/><small>{row.sasaran ?? "Semua masyarakat"}</small></td><td>{row.mulai ?? "Tanpa batas"} – {row.selesai ?? "Tanpa batas"}</td><td>{row.totalSoal}</td><td>{row.totalResponden}</td><td>{row.aktif === 1 ? "Aktif" : "Nonaktif"}</td><td><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id}>Detail & Pertanyaan</Link><Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id+"/hasil"}>Hasil Survei</Link>{data.canUpdate ? <Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id+"/edit"}>Ubah</Link> : null}{data.canDelete ? <form action={hapusSurveiAction}><input type="hidden" name="id" value={row.id}/><button className="button button-danger-ghost">Hapus</button></form> : null}</div></td></tr>)}
      </tbody></table></div>
      {data.rows.length === 0 ? <p className="modul-empty">Belum ada survei. Buat survei pertama untuk mulai mengumpulkan penilaian masyarakat.</p> : null}
      <p>Menampilkan {data.rows.length} survei.</p>
    </section>
  </div>;
}
