import type { Metadata } from "next";
import { getRekapAnalisis } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { LaporanStatistikNav } from "../nav";
import { PrintButton } from "../print-button";
import styles from "../laporan-statistik.module.css";
export const metadata: Metadata = { title: "Rekapitulasi & Analisis Kinerja" };
const rp=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
const pct=(v:number)=>v.toLocaleString("id-ID",{maximumFractionDigits:1})+"%";
export default async function Page({searchParams}:{searchParams:Promise<{tahun?:string}>}) {
 const q=await searchParams, parsed=Number(q.tahun), year=Number.isInteger(parsed)&&parsed>=2002&&parsed<=2100?parsed:new Date().getFullYear(), d=await getRekapAnalisis(year);
 const current=d.trend[2]!, previous=d.trend[1]!;
 const realization=current.budget?current.actual/current.budget*100:0, completion=current.projects?current.done/current.projects*100:0;
 const budgetChange=previous.budget?(current.budget-previous.budget)/previous.budget*100:null;
 const realizationChange=previous.actual?(current.actual-previous.actual)/previous.actual*100:null;
 const projectChange=previous.projects?((current.projects-previous.projects)/previous.projects*100):null;
 const tips=[
  current.budget===0?"Belum ada data APBDes pada tahun "+year+". Lengkapi data anggaran dan realisasi untuk mengaktifkan analisis keuangan.":realization<70?"Realisasi belanja masih di bawah 70%. Tinjau jadwal pelaksanaan dan kendala kegiatan.":"Realisasi belanja mencapai "+pct(realization)+". Pertahankan pemantauan realisasi dan dokumentasi belanja.",
  current.projects===0?"Belum ada data proyek pembangunan pada tahun "+year+". Catat kegiatan dan progres fisik agar dapat dievaluasi.":completion<50?"Penyelesaian proyek masih di bawah 50%. Periksa proyek tertunda dan perbarui progres lapangan.":"Penyelesaian proyek mencapai "+pct(completion)+". Pastikan berita acara dan dokumentasi hasil kegiatan tersedia."
 ];
 return <div className={styles["ls-page"]}>
  <header className={styles["ls-heading"]}><div><span className={styles["ls-eyebrow"]}>EVALUASI KINERJA PEMERINTAHAN</span><h1>Rekapitulasi & Analisis Kinerja</h1><p>Rekap lintas modul, tren tiga tahun, perbandingan periode, dan rekomendasi berbasis data.</p></div><PrintButton/></header>
  <LaporanStatistikNav active="/laporan-statistik/rekap-analisis"/>
  <form method="get" className={styles["ls-period-form"]}><label>Periode Analisis<select name="tahun" defaultValue={String(year)}>{[year-2,year-1,year,year+1].filter(y=>y>=2000&&y<=2100).map(y=><option key={y} value={y}>Tahun {y}</option>)}</select></label><span>Dibandingkan dengan Tahun {year-1}</span><button className="button button-primary">Proses Analisis</button></form>
  <section className={styles["ls-kpis"]}>
   <article className={styles["ls-primary"]}><span>Total Anggaran {year}</span><strong>{rp(current.budget)}</strong><small>{budgetChange===null?"Tidak ada data pembanding":(budgetChange>=0?"↑ ":"↓ ")+pct(Math.abs(budgetChange))+" dari "+(year-1)}</small></article>
   <article><span>Realisasi Anggaran</span><strong>{rp(current.actual)}</strong><small>{pct(realization)} dari pagu · {realizationChange===null?"Tanpa pembanding":(realizationChange>=0?"↑ ":"↓ ")+pct(Math.abs(realizationChange))+" nilai realisasi"}</small></article>
   <article><span>Jumlah Penduduk Proyek</span><strong>{current.projects.toLocaleString("id-ID")} Kegiatan</strong><small>{projectChange===null?"Tidak ada data pembanding":(projectChange>=0?"↑ ":"↓ ")+pct(Math.abs(projectChange))+" jumlah proyek"}</small></article>
   <article><span>Proyek Selesai</span><strong>{current.done.toLocaleString("id-ID")}</strong><small>{pct(completion)} dari seluruh proyek tahun ini</small></article>
  </section>
  <div className={styles["ls-grid"]}>
   <section className={styles["ls-card"]}><header><div><h2>Rekap Keuangan Desa</h2><p>Perbandingan anggaran dan realisasi per tahun.</p></div></header>
    {d.trend.map(row=><div className={styles["ls-finance-row"]} key={row.year}><div><strong>{row.year}</strong><span>{rp(row.actual)} / {rp(row.budget)}</span></div><div className={styles["ls-progress"]}><i style={{width:(row.budget?Math.min(100,row.actual/row.budget*100):0)+"%"}}/></div><b>{pct(row.budget?row.actual/row.budget*100:0)}</b></div>)}
   </section>
   <section className={styles["ls-card"]}><header><div><h2>Indikator Kinerja Desa</h2><p>Indikator terukur dari sumber data yang terhubung.</p></div></header>
    <div className={styles["ls-indicator"]}><span>Realisasi APBDes</span><strong>{pct(realization)}</strong><em>{current.budget?(realization>=90?"Baik":realization>=70?"Perlu dipantau":"Perlu tindak lanjut"):"Belum ada data"}</em></div>
    <div className={styles["ls-indicator"]}><span>Penyelesaian Proyek</span><strong>{pct(completion)}</strong><em>{current.projects?(completion>=80?"Baik":completion>=50?"Perlu dipantau":"Perlu tindak lanjut"):"Belum ada data"}</em></div>
    <div className={styles["ls-indicator"]}><span>Progres Fisik Rata-rata</span><strong>{pct(current.progress)}</strong><em>{current.projects?"Berdasarkan data proyek":"Belum ada data"}</em></div>
   </section>
  </div>
  <section className={styles["ls-card"]}><header><div><h2>Perbandingan Antarperiode</h2><p>Perubahan dari tahun sebelumnya ke tahun terpilih.</p></div></header><div className={styles["ls-table"]}><table><thead><tr><th>Indikator</th><th>{year-1}</th><th>{year}</th><th>Perubahan</th></tr></thead><tbody>
   <tr><td>Total Anggaran</td><td>{rp(previous.budget)}</td><td>{rp(current.budget)}</td><td>{budgetChange===null?"—":(budgetChange>=0?"+":"")+pct(budgetChange)}</td></tr>
   <tr><td>Realisasi Anggaran</td><td>{rp(previous.actual)}</td><td>{rp(current.actual)}</td><td>{realizationChange===null?"—":(realizationChange>=0?"+":"")+pct(realizationChange)}</td></tr>
   <tr><td>Jumlah Proyek</td><td>{previous.projects}</td><td>{current.projects}</td><td>{projectChange===null?"—":(projectChange>=0?"+":"")+pct(projectChange)}</td></tr>
   <tr><td>Proyek Selesai</td><td>{previous.done}</td><td>{current.done}</td><td>{previous.done?((current.done-previous.done)/previous.done*100).toLocaleString("id-ID",{maximumFractionDigits:1})+"%":"—"}</td></tr>
  </tbody></table></div></section>
  <section className={styles["ls-card"]}><header><div><h2>Tren & Rekomendasi</h2><p>Rekomendasi otomatis berdasarkan ambang indikator sederhana, bukan penilaian regulatif.</p></div></header><ol className={styles["ls-note"]}>{tips.map((tip,i)=><li key={i}>{tip}</li>)}</ol><p className={styles["ls-muted"]}>Cakupan saat ini: APBDes dan proyek pembangunan. Indikator kepuasan layanan, serapan per bidang, ketertiban administrasi, dan capaian program belum dihitung karena sumber data lintas modul belum terpetakan.</p></section>
 </div>;
}
