import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getLaporanPenduduk } from "@/features/penduduk/application/laporan-penduduk-use-cases";
import { LAPORAN_PENDUDUK_OPTIONS } from "@/features/penduduk/domain/laporan-penduduk";

export const metadata: Metadata = { title: "Statistik & Laporan Kependudukan" };
const number = new Intl.NumberFormat("id-ID");
const exportKind:Record<string,string>={
  umur:"age_range","jenis-kelamin":"gender",agama:"religion",pendidikan:"education",
  pekerjaan:"occupation","status-kawin":"marital_status",wilayah:"dusun","kelompok-umur":"age_group",
};

export default async function StatistikPendudukPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const jenis=typeof params.jenis==="string"?params.jenis:undefined;
  const laporan=await getLaporanPenduduk(jenis);
  const pilihan=LAPORAN_PENDUDUK_OPTIONS.find((item)=>item.value===laporan.jenis)??LAPORAN_PENDUDUK_OPTIONS[0]!;
  const total=laporan.statistik.total.jumlah;
  const max=Math.max(1,...laporan.statistik.baris.map(row=>row.jumlah));
  const kind=exportKind[laporan.jenis]??"gender";
  const csvHref=`/penduduk/laporan/ekspor?jenis=${laporan.jenis}`;
  const pdfHref=`/statistik/penduduk/ekspor/pdf?kind=${kind}`;
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/statistik/penduduk"/>
    <header className="page-heading"><div><span className="eyebrow">Data Kependudukan</span><h1>Statistik & Laporan Kependudukan</h1><p>Analisis demografi, sebaran penduduk, dan laporan kependudukan desa.</p></div><div className="penduduk-heading-actions"><a className="button button-secondary" href={csvHref}>Unduh CSV</a><a className="button button-primary" href={pdfHref}>Unduh PDF</a></div></header>
    <section className="data-kependudukan-kpis"><article className="data-kpi data-kpi-primary"><span>Total Penduduk</span><strong>{number.format(total)} jiwa</strong><small>Terhitung dalam laporan ini</small></article><article className="data-kpi" data-tone="blue"><span>Laki-laki</span><strong>{number.format(laporan.statistik.total.lakiLaki)}</strong><small>{total?((laporan.statistik.total.lakiLaki/total)*100).toLocaleString("id-ID",{maximumFractionDigits:1}):"0"}%</small></article><article className="data-kpi" data-tone="pink"><span>Perempuan</span><strong>{number.format(laporan.statistik.total.perempuan)}</strong><small>{total?((laporan.statistik.total.perempuan/total)*100).toLocaleString("id-ID",{maximumFractionDigits:1}):"0"}%</small></article><article className="data-kpi"><span>Belum dikategorikan</span><strong>{number.format(laporan.statistik.total.tanpaKategori)}</strong><small>Data kategori kosong</small></article></section>
    <section className="data-report-tabs">{LAPORAN_PENDUDUK_OPTIONS.map(item=><Link aria-current={item.value===laporan.jenis?"page":undefined} className={item.value===laporan.jenis?"is-active":""} href={`?jenis=${item.value}`} key={item.value}>{item.label}</Link>)}</section>
    <div className="data-kependudukan-grid data-statistics-grid">
      <section className="platform-card data-panel"><header><h2>{pilihan.label}</h2><p>{pilihan.deskripsi}</p></header>
        {laporan.statistik.baris.length?laporan.statistik.baris.map(row=><div className="data-bar-row data-report-bar" key={row.label}><span>{row.label}</span><div><i style={{width:(row.jumlah/max*100)+"%"}}/></div><strong>{number.format(row.jumlah)}</strong><small>{total?((row.jumlah/total)*100).toLocaleString("id-ID",{maximumFractionDigits:1}):"0"}%</small></div>):<p className="modul-empty">Belum ada data untuk kategori laporan ini.</p>}
        <footer><span>Data dihitung langsung dari penduduk aktif.</span><span>Total {number.format(total)}</span></footer>
      </section>
      <section className="platform-card data-panel"><header><h2>Rincian Statistik</h2><p>Jumlah berdasarkan jenis kelamin untuk setiap kategori.</p></header>
        {laporan.statistik.baris.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Kategori</th><th>Laki-laki</th><th>Perempuan</th><th>Jumlah</th><th>%</th></tr></thead><tbody>{laporan.statistik.baris.map(row=><tr key={row.label}><td>{row.label}</td><td>{number.format(row.lakiLaki)}</td><td>{number.format(row.perempuan)}</td><td><strong>{number.format(row.jumlah)}</strong></td><td>{total?((row.jumlah/total)*100).toLocaleString("id-ID",{maximumFractionDigits:1}):"0"}%</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{number.format(laporan.statistik.total.lakiLaki)}</th><th>{number.format(laporan.statistik.total.perempuan)}</th><th>{number.format(total)}</th><th>100%</th></tr></tfoot></table></div>:<p className="modul-empty">Belum ada data statistik.</p>}
        <footer><span>Tanpa kategori: {number.format(laporan.statistik.total.tanpaKategori)}</span><Link href={csvHref}>Ekspor data ini</Link></footer>
      </section>
    </div>
  </div>;
}
