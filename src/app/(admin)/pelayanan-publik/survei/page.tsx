import Link from "next/link";
import { getHasilSurveiData, getSurveiPageData } from "@/features/pelayanan/application/survei-use-cases";
import { klasifikasiSkor } from "@/features/analisis/domain/skor";
import { hapusSurveiAction } from "./actions";

export const metadata = { title: "Survei & Kepuasan Masyarakat" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tersimpan?: string; dihapus?: string }> }) {
  const [data, params] = await Promise.all([getSurveiPageData(), searchParams]);
  const results = await Promise.all(data.rows.map((row) => getHasilSurveiData(row.id)));
  const active=data.rows.filter(row=>row.aktif===1).length;
  const respondents=data.rows.reduce((sum,row)=>sum+row.totalResponden,0);
  const questions=data.rows.reduce((sum,row)=>sum+row.totalSoal,0);
  const scored=results.reduce((sum,row)=>sum+row.scoredCount,0);
  const weightedScore=results.reduce((sum,row)=>sum+(row.average??0)*row.scoredCount,0);
  const average=scored?Math.round(weightedScore/scored*10)/10:null;
  const distribution=["Sangat Baik","Baik","Cukup","Kurang"].map(label=>({label,total:results.reduce((sum,row)=>sum+(row.distribution.find(item=>item.label===label)?.total??0),0)}));
  const maxDistribution=Math.max(1,...distribution.map(item=>item.total));
  const comments=results.flatMap(row=>row.comments.map(comment=>({...comment,judul:row.row.judul}))).slice(0,8);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Pelayanan Publik</span><h1>Survei & Kepuasan Masyarakat</h1><p>Kelola survei, penilaian, dan analisis tingkat kepuasan masyarakat terhadap pelayanan desa.</p></div>{data.canCreate ? <Link className="button button-primary" href="/pelayanan-publik/survei/baru">＋ Buat Survei Baru</Link> : null}</div>
    <div className="dashboard-stats"><article className="modul-card"><span>Indeks Kepuasan (IKM)</span><strong>{average===null?"—":average.toFixed(1)+" / 100"}</strong><small>{scored.toLocaleString("id-ID")} responden dengan jawaban terukur</small></article><article className="modul-card"><span>Total Responden</span><strong>{respondents.toLocaleString("id-ID")}</strong><small>Akumulasi seluruh survei</small></article><article className="modul-card"><span>Survei Aktif</span><strong>{active.toLocaleString("id-ID")}</strong><small>Sedang menerima tanggapan</small></article><article className="modul-card"><span>Total Pertanyaan</span><strong>{questions.toLocaleString("id-ID")}</strong><small>Seluruh formulir survei</small></article></div>
    <nav className="quick-actions" aria-label="Navigasi survei"><span className="button button-primary">Dashboard Survei</span><Link className="button button-secondary" href="#daftar-survei">Kelola Survei</Link><Link className="button button-secondary" href="#hasil-survei">Hasil Survei</Link><Link className="button button-secondary" href="#ulasan">Ulasan & Saran</Link></nav>
    <div className="dashboard-grid">
      <section className="modul-card"><h2>Komposisi Penilaian Kepuasan</h2><p>Distribusi klasifikasi dari responden yang memiliki skor terukur.</p><div className="survey-results-bars">{distribution.map(item=><div className="survey-result-row" key={item.label}><div><strong>{item.label}</strong><span>{item.total.toLocaleString("id-ID")} responden</span></div><div className="survey-result-track"><i style={{width:(item.total/maxDistribution*100)+"%"}}/></div></div>)}</div>{scored===0?<p className="modul-empty">Belum ada penilaian terukur.</p>:null}</section>
      <section className="modul-card"><h2>Ringkasan Analisis</h2><div className="activity-list"><p><strong>Indeks Kepuasan:</strong> {average===null?"Belum tersedia":average.toFixed(1)+" / 100"}</p><p><strong>Kategori:</strong> {average===null?"Belum tersedia":klasifikasiSkor(average)}</p><p><strong>Responden terukur:</strong> {scored.toLocaleString("id-ID")}</p><p><strong>Survei aktif:</strong> {active.toLocaleString("id-ID")}</p></div></section>
    </div>
    {params.tersimpan ? <div className="alert alert-info">Survei berhasil disimpan.</div> : null}
    {params.dihapus ? <div className="alert alert-info">Survei berhasil dihapus.</div> : null}
    <section className="modul-card" id="hasil-survei"><div className="page-heading"><div><h2>Hasil Survei per Program</h2><p>Rekap responden dan indeks kepuasan berdasarkan survei.</p></div></div><div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nama Survei</th><th>Responden</th><th>IKM (0–100)</th><th>Kategori</th><th>Aksi</th></tr></thead><tbody>{results.map(row=><tr key={row.row.id}><td><strong>{row.row.judul}</strong><br/><small>{row.row.mulai??"Tanpa batas"} – {row.row.selesai??"Tanpa batas"}</small></td><td>{row.totalResponden.toLocaleString("id-ID")}</td><td>{row.average===null?"—":row.average.toFixed(1)}</td><td>{row.klasifikasi}</td><td><Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.row.id+"/hasil"}>Lihat hasil</Link></td></tr>)}</tbody></table></div>{results.length===0?<p className="modul-empty">Belum ada hasil survei.</p>:null}</section>
    <section className="modul-card" id="daftar-survei"><div className="page-heading"><div><h2>Kelola Survei</h2><p>Atur periode, sasaran, pertanyaan, dan status publikasi survei.</p></div></div><div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nama Survei</th><th>Periode</th><th>Soal</th><th>Responden</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      {data.rows.map((row) => <tr key={row.id}><td><strong>{row.judul}</strong><br/><small>{row.sasaran ?? "Semua masyarakat"}</small></td><td>{row.mulai ?? "Tanpa batas"} – {row.selesai ?? "Tanpa batas"}</td><td>{row.totalSoal}</td><td>{row.totalResponden}</td><td>{row.aktif === 1 ? "Aktif" : "Nonaktif"}</td><td><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id}>Detail & Pertanyaan</Link>{data.canUpdate ? <Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id+"/edit"}>Ubah</Link> : null}{data.canDelete ? <form action={hapusSurveiAction}><input type="hidden" name="id" value={row.id}/><button className="button button-danger-ghost">Hapus</button></form> : null}</div></td></tr>)}
    </tbody></table></div>{data.rows.length === 0 ? <p className="modul-empty">Belum ada survei. Buat survei pertama untuk mulai mengumpulkan penilaian masyarakat.</p> : null}<p>Menampilkan {data.rows.length} survei.</p></section>
    <section className="modul-card" id="ulasan"><h2>Ulasan & Saran Masyarakat</h2>{comments.length?<div className="survey-comments">{comments.map((item,index)=><article key={index}><strong>{item.judul} · {item.pertanyaan}</strong><p>{item.jawaban}</p></article>)}</div>:<p className="modul-empty">Belum ada ulasan atau saran teks.</p>}</section>
  </div>;
}
