import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getLaporanPenduduk } from "@/features/penduduk/application/laporan-penduduk-use-cases";
import { listRiwayat } from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import { getRingkasanPendudukData } from "@/features/penduduk/application/use-cases";
import { MUTATION_TYPE_LABELS } from "@/features/penduduk/domain/riwayat-penduduk";

export const metadata: Metadata = { title: "Dashboard Kependudukan" };
const number = new Intl.NumberFormat("id-ID");
const date = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const month = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" });

function iso(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
function monthWindow(now: Date, offset: number) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 0));
  return { label: month.format(start), from: iso(start), to: iso(end) };
}
function monthName(value: string) {
  return date.format(new Date(value + "T00:00:00"));
}

export default async function DashboardKependudukanPage() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "1";
  const now = new Date(
    Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day"))),
  );
  const first = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const today = iso(now);
  const windows = Array.from({ length: 6 }, (_, index) => monthWindow(now, 5 - index));
  const [summary, age, gender, area, latest, thisMonth, trend] = await Promise.all([
    getRingkasanPendudukData(),
    getLaporanPenduduk("kelompok-umur"),
    getLaporanPenduduk("jenis-kelamin"),
    getLaporanPenduduk("wilayah"),
    listRiwayat({ page: 1, perPage: 8 }),
    listRiwayat({ from: first, to: today, page: 1, perPage: 1 }),
    Promise.all(
      windows.map(async (item) => ({
        label: item.label,
        total: (await listRiwayat({ from: item.from, to: item.to, page: 1, perPage: 1 })).total,
      })),
    ),
  ]);
  const total = gender.statistik.total.jumlah;
  const maxAge = Math.max(1, ...age.statistik.baris.map((row) => row.jumlah));
  const maxArea = Math.max(1, ...area.statistik.baris.map((row) => row.jumlah));
  const maxTrend = Math.max(1, ...trend.map((item) => item.total));
  const male = gender.statistik.total.lakiLaki;
  const female = gender.statistik.total.perempuan;
  const malePct = total ? (male / total) * 100 : 0;
  const femalePct = total ? (female / total) * 100 : 0;
  const events = latest.rows;
  return (
    <div className="modul-page data-kependudukan-page">
      <DataKependudukanNav active="/penduduk/dashboard" />
      <header className="page-heading">
        <div>
          <span className="eyebrow">Data Kependudukan</span>
          <h1>Dashboard Kependudukan</h1>
          <p>Ringkasan data penduduk dan demografi berdasarkan pencatatan desa saat ini.</p>
        </div>
        <Link className="button button-secondary" href="/statistik/penduduk">
          Lihat statistik lengkap
        </Link>
      </header>
      <section className="data-kependudukan-kpis">
        <article className="data-kpi data-kpi-primary">
          <span>Total Penduduk</span>
          <strong>{number.format(total)} jiwa</strong>
          <small>Seluruh status kependudukan</small>
        </article>
        <article className="data-kpi">
          <span>Kepala Keluarga</span>
          <strong>{number.format(summary.keluarga)} KK</strong>
          <small>Kartu keluarga terdaftar</small>
        </article>
        <article className="data-kpi" data-tone="blue">
          <span>Laki-laki</span>
          <strong>{number.format(male)} jiwa</strong>
          <small>{malePct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total</small>
        </article>
        <article className="data-kpi" data-tone="pink">
          <span>Perempuan</span>
          <strong>{number.format(female)} jiwa</strong>
          <small>
            {femalePct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total
          </small>
        </article>
      </section>
      <div className="data-kependudukan-grid data-dashboard-grid">
        <section className="platform-card data-panel">
          <header>
            <h2>Komposisi Penduduk</h2>
            <p>Perbandingan penduduk laki-laki dan perempuan</p>
          </header>
          <div className="data-composition">
            <div
              className="data-donut"
              style={{
                background: `conic-gradient(#1683f7 0% ${malePct}%,#ef4aa9 ${malePct}% 100%)`,
              }}
            >
              <div>
                <strong>{number.format(total)}</strong>
                <span>jiwa</span>
              </div>
            </div>
            <div className="data-legend">
              <div>
                <i data-tone="blue" />
                <span>Laki-laki</span>
                <strong>{number.format(male)}</strong>
                <small>{malePct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</small>
              </div>
              <div>
                <i data-tone="pink" />
                <span>Perempuan</span>
                <strong>{number.format(female)}</strong>
                <small>{femalePct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</small>
              </div>
            </div>
          </div>
        </section>
        <section className="platform-card data-panel">
          <header>
            <h2>Piramida / Kelompok Umur</h2>
            <p>Komposisi penduduk aktif menurut kelompok umur</p>
          </header>
          {age.statistik.baris.map((row) => (
            <div className="data-age-row" key={row.label}>
              <span>{row.label}</span>
              <div className="data-age-bars">
                <i data-tone="blue" style={{ width: (row.lakiLaki / maxAge) * 100 + "%" }} />
                <i data-tone="pink" style={{ width: (row.perempuan / maxAge) * 100 + "%" }} />
              </div>
              <strong>{number.format(row.jumlah)}</strong>
            </div>
          ))}
          <div className="data-chart-legend">
            <span>
              <i data-tone="blue" />
              Laki-laki
            </span>
            <span>
              <i data-tone="pink" />
              Perempuan
            </span>
          </div>
        </section>
        <section className="platform-card data-panel">
          <header>
            <h2>Sebaran Penduduk per Wilayah</h2>
            <p>Kelompok wilayah dengan jumlah penduduk terbanyak</p>
          </header>
          {area.statistik.baris.slice(0, 8).map((row) => (
            <div className="data-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div>
                <i style={{ width: (row.jumlah / maxArea) * 100 + "%" }} />
              </div>
              <strong>{number.format(row.jumlah)}</strong>
            </div>
          ))}
          {area.statistik.baris.length === 0 ? (
            <p className="modul-empty">Belum ada data wilayah penduduk.</p>
          ) : null}
          <footer>
            <span>
              {number.format(area.statistik.total.tanpaKategori)} belum memiliki kategori wilayah
            </span>
            <Link href="/statistik/penduduk?jenis=wilayah">Detail</Link>
          </footer>
        </section>
        <section className="platform-card data-panel">
          <header>
            <h2>Aktivitas Mutasi 6 Bulan Terakhir</h2>
            <p>Jumlah peristiwa yang tercatat per bulan, bukan estimasi total penduduk</p>
          </header>
          <div className="data-month-chart">
            {trend.map((item) => (
              <div className="data-month-column" key={item.label}>
                <strong>{number.format(item.total)}</strong>
                <i style={{ height: Math.max(4, (item.total / maxTrend) * 100) + "%" }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <footer>
            <span>{number.format(thisMonth.total)} peristiwa bulan ini</span>
            <Link href="/mutasi-penduduk">Lihat mutasi</Link>
          </footer>
        </section>
        <section className="platform-card data-panel data-activity-panel">
          <header>
            <h2>Aktivitas Terbaru</h2>
            <p>Delapan catatan kependudukan terakhir</p>
          </header>
          {events.length ? (
            <div className="data-activity-list">
              {events.map((row) => (
                <div className="data-activity-item" key={row.id}>
                  <span className="data-activity-mark">
                    {MUTATION_TYPE_LABELS[row.type]?.slice(0, 1) ?? "•"}
                  </span>
                  <div>
                    <strong>{MUTATION_TYPE_LABELS[row.type] ?? row.type}</strong>
                    <span>
                      {row.residentName ?? "Penduduk tidak terhubung"}
                      {row.reason ? " · " + row.reason : ""}
                    </span>
                  </div>
                  <time>{monthName(row.eventDate)}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="modul-empty">Belum ada aktivitas mutasi.</p>
          )}
          <footer>
            <Link href="/mutasi-penduduk">Lihat semua aktivitas</Link>
          </footer>
        </section>
      </div>
    </div>
  );
}
