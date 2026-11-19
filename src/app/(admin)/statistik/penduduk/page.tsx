import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getLaporanPenduduk } from "@/features/penduduk/application/laporan-penduduk-use-cases";
import { LAPORAN_PENDUDUK_OPTIONS } from "@/features/penduduk/domain/laporan-penduduk";

export const metadata: Metadata = { title: "Statistik & Laporan Kependudukan" };
const number = new Intl.NumberFormat("id-ID");

export default async function StatistikPendudukPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const jenis=typeof params.jenis==="string"?params.jenis:undefined;
  const laporan=await getLaporanPenduduk(jenis);
  const pilihan=LAPORAN_PENDUDUK_OPTIONS.find((item)=>item.value===laporan.jenis)??LAPORAN_PENDUDUK_OPTIONS[0];
  const total=laporan.statistik.total.jumlah;
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/statistik/penduduk"/>
    <header className="page-heading"><div><span className="eyebrow">Data Kependudukan</span><h1>Statistik & Laporan Kependudukan</h1><p>Analisis demografi dan sebaran penduduk berdasarkan data desa yang tercatat.</p></div></header>
    <section className="data-kependudukan-kpis"><article className="data-kpi data-kpi-primary"><span>Total Penduduk</span><strong>{number.format(total)} jiwa</strong><small>Data yang masuk dalam laporan</small></article><article className="data-kpi"><span>Laki-laki</span><strong>{number.format(laporan.statistik.total.lakiLaki)}</strong><small>jiwa</small></article><article className="data-kpi" data-tone="pink"><span>Perempuan</span><strong>{number.format(laporan.statistik.total.perempuan)}</strong><small>jiwa</small></article></section>
    <section className="data-report-tabs">{LAPORAN_PENDUDUK_OPTIONS.map(item=><Link aria-current={item.value===laporan.jenis?"page":undefined} className={item.value===laporan.jenis?"is-active":""} href={`?jenis=${item.value}`} key={item.value}>{item.label}</Link>)}</section>
    <section className="platform-card data-panel"><header><h2>{pilihan.label}</h2><p>{pilihan.deskripsi}</p></header>
      {laporan.statistik.baris.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Kategori</th><th>Laki-laki</th><th>Perempuan</th><th>Jumlah</th><th>Persentase</th></tr></thead><tbody>{laporan.statistik.baris.map(row=><tr key={row.label}><td>{row.label}</td><td>{number.format(row.lakiLaki)}</td><td>{number.format(row.perempuan)}</td><td><strong>{number.format(row.jumlah)}</strong></td><td>{total?((row.jumlah/total)*100).toLocaleString("id-ID",{maximumFractionDigits:1}):"0"}%</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{number.format(laporan.statistik.total.lakiLaki)}</th><th>{number.format(laporan.statistik.total.perempuan)}</th><th>{number.format(total)}</th><th>100%</th></tr></tfoot></table></div>:<p className="modul-empty">Belum ada data untuk kategori laporan ini.</p>}
      <footer className="data-pagination"><span>Data dihitung langsung dari pencatatan penduduk desa.</span><Link href={`/penduduk/laporan?jenis=${laporan.jenis}`}>Buka laporan lengkap</Link></footer>
    </section>
  </div>;
}
