import type { Metadata } from "next";
import Link from "next/link";
import { getLaporanDesa, type JenisLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { LaporanStatistikNav } from "../nav";
import { PrintButton } from "../print-button";
import { ReportExplorer } from "./report-explorer";
import { SavedReports } from "./saved-reports";
import styles from "../laporan-statistik.module.css";
export const metadata: Metadata = { title: "Laporan Desa" };
const options: {value:JenisLaporan;label:string;description:string}[]=[
 {value:"penduduk",label:"Kependudukan",description:"Rekap demografi dan sebaran penduduk."},
 {value:"keuangan",label:"Keuangan",description:"Anggaran, realisasi, dan sisa APBDes."},
 {value:"pembangunan",label:"Pembangunan",description:"Kegiatan, sumber dana, status, dan progres."},
 {value:"bantuan",label:"Bantuan",description:"Program, sasaran, periode, dan jumlah peserta."}
];
export default async function Page({searchParams}:{searchParams:Promise<{jenis?:string;tahun?:string}>}) {
 const q=await searchParams, parsed=Number(q.tahun), year=Number.isInteger(parsed)&&parsed>=2000&&parsed<=2100?parsed:new Date().getFullYear();
 const reports=await Promise.all(options.map(async option=>{
   const data=await getLaporanDesa(option.value,year);
   return {key:option.value,title: "Laporan "+option.label,category:option.label,period:"Tahun "+year,rows:data.rows.length,href:"/laporan-statistik/laporan-desa?jenis="+option.value+"&tahun="+year,exportHref:"/api/laporan-statistik/ekspor?jenis="+option.value+"&tahun="+year};
 }));
 const selected=options.some(o=>o.value===q.jenis)?q.jenis as JenisLaporan:"penduduk";
 const detail=await getLaporanDesa(selected,year), selectedLabel=options.find(o=>o.value===selected)!.label;
 return <div className={styles["ls-page"]}>
  <header className={styles["ls-heading"]}><div><span className={styles["ls-eyebrow"]}>DOKUMEN DAN REKAP DATA</span><h1>Laporan Desa</h1><p>Buat, kelola, dan unduh laporan kegiatan, keuangan, aset, kependudukan, dan layanan desa.</p></div><PrintButton/></header>
  <section className={styles["ls-kpis"]}>
   <article className={styles["ls-primary"]}><span>Total Jenis Laporan</span><strong>{reports.length} Kategori</strong><small>Rekap dari modul operasional desa</small></article>
   <article><span>Data Tersedia</span><strong>{reports.filter(r=>r.rows>0).length} Kategori</strong><small>Kategori memiliki baris data</small></article>
   <article><span>Periode</span><strong>{year}</strong><small>Tahun laporan yang dipilih</small></article>
  </section>
  <LaporanStatistikNav active="/laporan-statistik/laporan-desa"/>
  <ReportExplorer items={reports}/>
  <section className={styles["ls-card"]}><header><div><h2>Pratinjau Laporan · {selectedLabel} {year}</h2><p>{detail.rows.length.toLocaleString("id-ID")} baris data dari modul operasional.</p></div><a href={"/api/laporan-statistik/ekspor?jenis="+selected+"&tahun="+year}>Unduh CSV</a></header>{detail.rows.length?<div className={styles["ls-table"]}><table><thead><tr>{detail.columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{detail.rows.slice(0,100).map((row,index)=><tr key={index}>{row.map((cell,j)=><td key={j}>{typeof cell==="number"?new Intl.NumberFormat("id-ID").format(cell):String(cell??"")}</td>)}</tr>)}</tbody></table></div>:<p className={styles["ls-empty"]}>Belum ada data untuk laporan ini.</p>}{detail.rows.length>100&&<p className={styles["ls-muted"]}>Pratinjau dibatasi 100 baris. Unduh CSV untuk seluruh data.</p>}</section>
  <section className={styles["ls-card"]}><header><div><h2>Buat Laporan</h2><p>Pilih kategori untuk membuka laporan operasional sesuai periode.</p></div></header><div className={styles["ls-grid"]}>{options.map(o=><article className={styles["ls-template"]} key={o.value}><h3>{o.label}</h3><p>{o.description}</p><Link href={"/laporan-statistik/laporan-desa?jenis="+o.value+"&tahun="+year}>Buat / Buka Laporan →</Link></article>)}</div></section>
  <SavedReports jenis={selected} tahun={year}/>
 </div>;
}
