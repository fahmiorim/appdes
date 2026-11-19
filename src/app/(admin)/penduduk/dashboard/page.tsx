import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getRingkasanPendudukData } from "@/features/penduduk/application/use-cases";
import { getLaporanPenduduk } from "@/features/penduduk/application/laporan-penduduk-use-cases";

export const metadata: Metadata = { title: "Dashboard Kependudukan" };
const number = new Intl.NumberFormat("id-ID");

export default async function DashboardKependudukanPage() {
  const [summary, age] = await Promise.all([
    getRingkasanPendudukData(),
    getLaporanPenduduk("umur"),
  ]);
  const total = summary.total;
  const genderRows = [
    { label: "Laki-laki", value: summary.lakiLaki, color: "blue" },
    { label: "Perempuan", value: summary.perempuan, color: "pink" },
  ];
  return (
    <div className="modul-page data-kependudukan-page">
      <DataKependudukanNav active="/penduduk/dashboard" />
      <header className="page-heading"><div><span className="eyebrow">Data Kependudukan</span>
        <h1>Dashboard Kependudukan</h1><p>Ringkasan data penduduk dan kondisi demografi desa berdasarkan pencatatan saat ini.</p></div></header>
      <section className="data-kependudukan-kpis">
        <article className="data-kpi data-kpi-primary"><span>Total Penduduk</span><strong>{number.format(total)} jiwa</strong><small>Seluruh data penduduk tercatat</small></article>
        <article className="data-kpi"><span>Kepala Keluarga</span><strong>{number.format(summary.keluarga)} KK</strong><small>Kartu keluarga terdaftar</small></article>
        {genderRows.map((item) => <article className="data-kpi" data-tone={item.color} key={item.label}>
          <span>{item.label}</span><strong>{number.format(item.value)} jiwa</strong>
          <small>{total ? ((item.value / total) * 100).toLocaleString("id-ID",{maximumFractionDigits:1}) : "0"}%</small>
        </article>)}
      </section>
      <div className="data-kependudukan-grid">
        <section className="platform-card data-panel"><header><h2>Komposisi Penduduk</h2><p>Perbandingan berdasarkan jenis kelamin</p></header>
          {genderRows.map((item) => <div className="data-bar-row" key={item.label}><span>{item.label}</span><div><i data-tone={item.color} style={{width: total ? (item.value / total * 100) + "%" : "0%"}} /></div><strong>{number.format(item.value)}</strong></div>)}
          <footer>Total {number.format(total)} jiwa</footer>
        </section>
        <section className="platform-card data-panel"><header><h2>Kelompok Umur</h2><p>Distribusi berdasarkan kategori umur yang tersedia</p></header>
          {age.statistik.baris.map((row) => <div className="data-bar-row" key={row.label}><span>{row.label}</span><div><i style={{width: total ? (row.jumlah / total * 100) + "%" : "0%"}} /></div><strong>{number.format(row.jumlah)}</strong></div>)}
          {age.statistik.baris.length === 0 ? <p className="modul-empty">Belum ada data umur yang dapat dihitung.</p> : null}
        </section>
        <section className="platform-card data-panel"><header><h2>Akses Cepat</h2><p>Kelola data kependudukan desa</p></header>
          <div className="data-quick-links"><Link href="/penduduk">Data Penduduk</Link><Link href="/keluarga">Kartu Keluarga</Link><Link href="/mutasi-penduduk">Catat Mutasi</Link><Link href="/statistik/penduduk">Lihat Statistik & Laporan</Link></div>
        </section>
      </div>
    </div>
  );
}
