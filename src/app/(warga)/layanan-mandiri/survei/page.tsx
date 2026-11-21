import Link from "next/link";
import { getSurveiWargaPageData } from "@/features/pelayanan/application/survei-use-cases";
export const metadata={title:"Survei Masyarakat"};
export default async function Page(){
 const rows=await getSurveiWargaPageData();
 return <main className="warga-page"><header className="page-heading"><div><span className="eyebrow">Layanan Mandiri</span><h1>Survei Masyarakat</h1><p>Bantu desa meningkatkan mutu pelayanan dengan menyampaikan penilaian dan saran.</p></div></header>
 <div className="warga-survey-list">{rows.map(row=><article className="modul-card" key={row.id}><span className="eyebrow">{row.sasaran??"Seluruh masyarakat"}</span><h2>{row.judul}</h2><p>{row.deskripsi??"Silakan berpartisipasi dalam survei ini."}</p><small>Periode: {row.mulai??"Terbuka"} – {row.selesai??"Tanpa batas"}</small><Link className="button button-primary" href={"/layanan-mandiri/survei/"+row.id}>Isi Survei</Link></article>)}</div>
 {rows.length===0?<p className="modul-empty">Belum ada survei yang sedang dibuka.</p>:null}
 </main>;
}
