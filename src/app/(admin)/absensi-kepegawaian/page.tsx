import type { Metadata } from "next";
import Link from "next/link";

import { getDashboardAbsensiData } from "@/features/kepegawaian/application/use-cases";

import { AbsensiKepegawaianNav } from "./nav";
import styles from "./absensi-kepegawaian.module.css";

export const metadata: Metadata = { title: "Absensi & Kepegawaian" };
const angka = new Intl.NumberFormat("id-ID");

export default async function DashboardAbsensiPage() {
  const data = await getDashboardAbsensiData();
  const statusLabel: Record<string, string> = { hadir: "Hadir", izin: "Izin", cuti: "Cuti", tidak_hadir: "Tidak Hadir" };
  const maxTrend = Math.max(1, ...data.trendRows.map((x) => Number(x.total)));
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">ABSENSI & KEPEGAWAIAN</span><h1>Absensi & Kepegawaian</h1><p>Monitoring kehadiran, data pegawai, dan administrasi kepegawaian perangkat desa.</p></div></div>
    <AbsensiKepegawaianNav active="/absensi-kepegawaian"/>
    <section className={styles["ak-kpi-grid"]}>
      <article className={`${styles["ak-kpi"]} ${styles.primary}`}><span>Total Pegawai</span><strong>{angka.format(data.totalPegawai)} orang</strong><span>Terhubung dengan data perangkat desa</span></article>
      <article className={styles["ak-kpi"]}><span>Hadir Hari Ini</span><strong>{angka.format(data.hadir)} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Izin</span><strong>{angka.format(data.izin)} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Cuti</span><strong>{angka.format(data.cuti)} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Tidak Hadir</span><strong>{angka.format(data.tidakHadir)} orang</strong></article>
      <article className={styles["ak-kpi"]}><span>Tingkat Kehadiran</span><strong>{data.tingkatKehadiran.toLocaleString("id-ID")}%</strong></article>
    </section>
    <div className={styles["ak-grid"]}>
      <section className={styles["ak-card"]}>
        <h2>Statistik Kehadiran (30 Hari Terakhir)</h2><p>Jumlah catatan kehadiran harian yang berstatus hadir.</p>
        {data.trendRows.length ? <div className={styles["ak-bars"]}>{data.trendRows.map((row) => <span key={row.tanggal} style={{height:`${Math.max(8,Number(row.total)/maxTrend*100)}%`}} title={`${row.tanggal}: ${row.total} hadir`}><small>{row.tanggal.slice(5)}</small></span>)}</div> : <div className={styles["ak-empty"]}>Belum ada catatan kehadiran dalam 30 hari terakhir.</div>}
      </section>
      <section className={styles["ak-card"]}>
        <h2>Komposisi Kepegawaian</h2><p>Status pegawai aktif.</p>
        <div className={styles["ak-kpi-grid"]} style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>
          <div><strong>{data.komposisi.tetap}</strong><span>Pegawai Tetap</span></div>
          <div><strong>{data.komposisi.kontrak}</strong><span>Kontrak</span></div>
          <div><strong>{data.komposisi.purnaTugas}</strong><span>Purna Tugas</span></div>
        </div>
        <div className={styles["ak-actions"]}><Link className={styles["ak-button"]} href="/absensi-kepegawaian/pegawai">Kelola Data Pegawai</Link></div>
      </section>
    </div>
    <div className={styles["ak-grid"]} style={{marginTop:16}}>
      <section className={styles["ak-card"]}>
        <h2>Daftar Kehadiran Hari Ini</h2><p>Ringkasan status kehadiran seluruh pegawai aktif.</p>
        <div className={styles["ak-table-wrap"]}><table className={styles["ak-table"]}><thead><tr><th>Nama</th><th>Jabatan</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>
          {data.todayRows.map((row,i)=><tr key={i}><td>{row.pegawai}</td><td>{row.jabatan ?? "—"}</td><td>{row.jamMasuk ?? "—"}</td><td>{row.jamKeluar ?? "—"}</td><td><span className={`${styles["ak-badge"]} ${styles[row.status] ?? ""}`}>{statusLabel[row.status] ?? row.status}</span></td></tr>)}
        </tbody></table></div>
        <div className={styles["ak-actions"]}><Link className={styles["ak-button"]} href="/absensi-kepegawaian/absensi">Lihat Rekap Absensi</Link></div>
      </section>
      <section className={styles["ak-card"]}>
        <h2>Aksi Cepat</h2><p>Akses langsung ke pengelolaan modul.</p>
        <div className={styles["ak-actions"]}><Link className={styles["ak-button"]} href="/absensi-kepegawaian/absensi">Absensi Manual</Link><Link className={styles["ak-button"]} href="/absensi-kepegawaian/pegawai">Tambah Pegawai</Link><Link className={styles["ak-button"]} href="/absensi-kepegawaian/cuti-izin">Ajukan Cuti/Izin</Link></div>
        <h2>Informasi Kepegawaian</h2><p>Data pegawai disinkronkan dari Perangkat Desa. Pegawai kontrak/staf tambahan dapat dikelola melalui Data Pegawai.</p>
      </section>
    </div>
  </div>;
}
