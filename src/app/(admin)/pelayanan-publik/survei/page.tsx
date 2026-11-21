import Link from "next/link";
import { getSurveiPageData } from "@/features/pelayanan/application/survei-use-cases";
import { hapusSurveiAction } from "./actions";

export const metadata = { title: "Survei & Kepuasan Masyarakat" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tersimpan?: string; dihapus?: string }> }) {
  const [data, params] = await Promise.all([getSurveiPageData(), searchParams]);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Pelayanan Publik</span><h1>Survei & Kepuasan Masyarakat</h1><p>Kelola survei, periode pengisian, responden, dan hasil penilaian masyarakat.</p></div>{data.canCreate ? <Link className="button button-primary" href="/pelayanan-publik/survei/baru">＋ Buat Survei Baru</Link> : null}</div>
    {params.tersimpan ? <div className="alert alert-info">Survei berhasil disimpan.</div> : null}
    {params.dihapus ? <div className="alert alert-info">Survei berhasil dihapus.</div> : null}
    <section className="modul-card">
      <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nama Survei</th><th>Periode</th><th>Soal</th><th>Responden</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        {data.rows.map((row) => <tr key={row.id}><td><strong>{row.judul}</strong><br/><small>{row.sasaran ?? "Semua masyarakat"}</small></td><td>{row.mulai ?? "Tanpa batas"} – {row.selesai ?? "Tanpa batas"}</td><td>{row.totalSoal}</td><td>{row.totalResponden}</td><td>{row.aktif === 1 ? "Aktif" : "Nonaktif"}</td><td><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id}>Detail & Pertanyaan</Link>{data.canUpdate ? <Link className="button button-secondary" href={"/pelayanan-publik/survei/"+row.id+"/edit"}>Ubah</Link> : null}{data.canDelete ? <form action={hapusSurveiAction}><input type="hidden" name="id" value={row.id}/><button className="button button-danger-ghost">Hapus</button></form> : null}</div></td></tr>)}
      </tbody></table></div>
      {data.rows.length === 0 ? <p className="modul-empty">Belum ada survei. Buat survei pertama untuk mulai mengumpulkan penilaian masyarakat.</p> : null}
      <p>Menampilkan {data.rows.length} survei.</p>
    </section>
  </div>;
}
