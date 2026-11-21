import type { Metadata } from "next";
import { getStatistikDesa } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { LaporanStatistikNav } from "../nav";
import { PrintButton } from "../print-button";
import styles from "../laporan-statistik.module.css";
export const metadata: Metadata = { title: "Statistik Desa" };
function totalOf(rows:{label:string;total:number}[]){return rows.reduce((sum,row)=>sum+row.total,0);}
function ChartCard({title,description,rows}:{title:string;description:string;rows:{label:string;total:number}[]}) {
 const total=totalOf(rows), max=Math.max(1,...rows.map(r=>r.total));
 return <section className={styles["ls-card"]}><header><div><h2>{title}</h2><p>{description}</p></div></header>
  {rows.length?rows.map(row=><div className={styles["ls-bar"]} key={row.label}><span>{row.label}</span><div><i style={{width:(row.total/max*100)+"%"}}/></div><strong>{row.total.toLocaleString("id-ID")} ({total?(row.total/total*100).toLocaleString("id-ID",{maximumFractionDigits:1}):0}%)</strong></div>):<p className={styles["ls-empty"]}>Belum ada data untuk kategori ini.</p>}
 </section>;
}
export default async function Page() {
 const [gender,age,education,occupation,dusun]=await Promise.all([getStatistikDesa("gender"),getStatistikDesa("umur"),getStatistikDesa("pendidikan"),getStatistikDesa("pekerjaan"),getStatistikDesa("dusun")]);
 const total=totalOf(gender), male=gender.find(r=>r.label==="Laki-laki")?.total??0, female=gender.find(r=>r.label==="Perempuan")?.total??0;
 const metrics=[{label:"Total Penduduk Aktif",value:total.toLocaleString("id-ID")+" Jiwa",note:"Berdasarkan data penduduk aktif"},{label:"Laki-laki",value:male.toLocaleString("id-ID")+" Jiwa",note:total?(male/total*100).toLocaleString("id-ID",{maximumFractionDigits:1})+"% dari total":"Data belum tersedia"},{label:"Perempuan",value:female.toLocaleString("id-ID")+" Jiwa",note:total?(female/total*100).toLocaleString("id-ID",{maximumFractionDigits:1})+"% dari total":"Data belum tersedia"},{label:"Jumlah Dusun Terdata",value:dusun.filter(r=>r.label!=="Belum diisi").length.toLocaleString("id-ID"),note:"Dusun dengan penduduk tercatat"}];
 const conclusion=total?"Tercatat "+total.toLocaleString("id-ID")+" penduduk aktif. "+male.toLocaleString("id-ID")+" laki-laki dan "+female.toLocaleString("id-ID")+" perempuan. Sebaran pendidikan, pekerjaan, kelompok umur, dan dusun ditampilkan berdasarkan isian data penduduk.":"Belum terdapat data penduduk aktif yang dapat dianalisis.";
 return <div className={styles["ls-page"]}>
  <header className={styles["ls-heading"]}><div><span className={styles["ls-eyebrow"]}>DEMOGRAFI DAN PROFIL DESA</span><h1>Statistik Desa</h1><p>Visualisasi dan analisis data kependudukan berdasarkan kategori yang tersedia.</p></div><PrintButton/></header>
  <LaporanStatistikNav active="/laporan-statistik/statistik-desa"/>
  <nav className={styles["ls-subnav"]} aria-label="Kategori statistik"><a href="#ringkasan">Ringkasan</a><a href="#demografi">Kependudukan</a><a href="#pendidikan">Pendidikan</a><a href="#pekerjaan">Pekerjaan</a><a href="#wilayah">Sebaran Dusun</a></nav>
  <section className={styles["ls-kpis"]} id="ringkasan">{metrics.map((m,i)=><article className={i===0?styles["ls-primary"]:""} key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.note}</small></article>)}</section>
  <div className={styles["ls-grid"]} id="demografi"><ChartCard title="Komposisi Penduduk" description="Distribusi jenis kelamin penduduk aktif." rows={gender}/><ChartCard title="Kelompok Umur" description="Kelompok umur dihitung dari tanggal lahir yang tercatat." rows={age}/></div>
  <div className={styles["ls-grid"]} id="pendidikan"><ChartCard title="Tingkat Pendidikan" description="Rekap pendidikan terakhir penduduk aktif." rows={education}/><ChartCard title="Mata Pencaharian" description="Rekap pekerjaan penduduk aktif." rows={occupation}/></div>
  <div id="wilayah"><ChartCard title="Sebaran Penduduk per Dusun" description="Jumlah penduduk aktif berdasarkan dusun pada data wilayah." rows={dusun}/></div>
  <section className={styles["ls-card"]}><header><div><h2>Ringkasan & Catatan Data</h2><p>Kesimpulan hanya menggunakan angka yang tersedia di basis data.</p></div></header><p className={styles["ls-analysis-text"]}>{conclusion}</p><small className={styles["ls-muted"]}>Indikator seperti angka kemiskinan, rumah layak huni, stunting, dan elektrifikasi tidak ditampilkan karena sumber datanya belum terhubung pada modul ini.</small></section>
 </div>;
}
