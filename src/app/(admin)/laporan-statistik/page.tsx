import type { Metadata } from "next";
import Link from "next/link";

import { getDashboardLaporan } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";

import styles from "./laporan-statistik.module.css";
import { LaporanStatistikNav } from "./nav";

export const metadata: Metadata = { title: "Dashboard Laporan & Statistik" };
const n = new Intl.NumberFormat("id-ID");
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const q = await searchParams,
    year = Number(q.tahun),
    d = await getDashboardLaporan(Number.isInteger(year) ? year : undefined);
  return (
    <div className={styles["ls-page"]}>
      <header className={styles["ls-heading"]}>
        <div>
          <span className={styles["ls-eyebrow"]}>PUSAT INFORMASI DESA</span>
          <h1>Laporan & Statistik</h1>
          <p>Ringkasan data kependudukan, keuangan, bantuan, dan pembangunan desa.</p>
        </div>
        <form method="get" className={styles["ls-year"]}>
          <label>
            Tahun Anggaran
            <select name="tahun" defaultValue={String(d.year)}>
              {[d.year - 2, d.year - 1, d.year, d.year + 1].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button className="button button-primary">Terapkan</button>
        </form>
      </header>
      <LaporanStatistikNav active="/laporan-statistik" />
      <section className={styles["ls-kpis"]}>
        <article className={styles["ls-primary"]}>
          <span>Total Penduduk</span>
          <strong>{n.format(d.population.total)} jiwa</strong>
          <small>
            {n.format(d.population.male)} laki-laki · {n.format(d.population.female)} perempuan
          </small>
        </article>
        <article>
          <span>Belanja APBDes</span>
          <strong>{rp(d.finance.budget)}</strong>
          <small>Tahun {d.year}</small>
        </article>
        <article>
          <span>Realisasi Anggaran</span>
          <strong>{rp(d.finance.actual)}</strong>
          <small>
            {d.finance.percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari anggaran
          </small>
        </article>
        <article>
          <span>Program Bantuan</span>
          <strong>{n.format(d.assistance.programs)}</strong>
          <small>{n.format(d.assistance.participants)} peserta tercatat</small>
        </article>
        <article>
          <span>Kegiatan Pembangunan</span>
          <strong>{n.format(d.project.total)}</strong>
          <small>
            {n.format(d.project.done)} selesai · {n.format(d.project.active)} berjalan
          </small>
        </article>
        <article>
          <span>Rata-rata Progres Fisik</span>
          <strong>{d.project.avg.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</strong>
          <small>Tahun {d.year}</small>
        </article>
      </section>
      <div className={styles["ls-grid"]}>
        <section className={styles["ls-card"]}>
          <header>
            <div>
              <h2>Realisasi Belanja APBDes</h2>
              <p>Realisasi dibandingkan pagu anggaran.</p>
            </div>
            <Link href={"/laporan-statistik/laporan-desa?jenis=keuangan&tahun=" + d.year}>
              Lihat laporan
            </Link>
          </header>
          <div className={styles["ls-bar"]}>
            <span>Realisasi</span>
            <div>
              <i style={{ width: Math.min(100, d.finance.percent) + "%" }} />
            </div>
            <strong>
              {d.finance.percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
            </strong>
          </div>
          <p>
            Anggaran: {rp(d.finance.budget)} · Realisasi: {rp(d.finance.actual)}
          </p>
        </section>
        <section className={styles["ls-card"]}>
          <header>
            <div>
              <h2>Ringkasan Pembangunan</h2>
              <p>Status kegiatan tahun {d.year}.</p>
            </div>
            <Link href={"/laporan-statistik/laporan-desa?jenis=pembangunan&tahun=" + d.year}>
              Lihat laporan
            </Link>
          </header>
          <div className={styles["ls-bar"]}>
            <span>Progres rata-rata</span>
            <div>
              <i style={{ width: Math.min(100, d.project.avg) + "%" }} />
            </div>
            <strong>{d.project.avg.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</strong>
          </div>
        </section>
      </div>
      <section className={styles["ls-card"]}>
        <header>
          <div>
            <h2>Pembangunan Terbaru</h2>
            <p>Lima kegiatan terakhir diperbarui.</p>
          </div>
          <Link href="/laporan-statistik/laporan-desa?jenis=pembangunan">Semua kegiatan</Link>
        </header>
        {d.latest.length ? (
          <div className={styles["ls-table"]}>
            <table>
              <thead>
                <tr>
                  <th>Kegiatan</th>
                  <th>Status</th>
                  <th>Progres</th>
                  <th>Anggaran</th>
                </tr>
              </thead>
              <tbody>
                {d.latest.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.status}</td>
                    <td>{r.progress}%</td>
                    <td>{rp(Number(r.budget ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles["ls-empty"]}>Belum ada data pembangunan untuk tahun {d.year}.</p>
        )}
      </section>
    </div>
  );
}
