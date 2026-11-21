import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getDashboardAbsensiData } from "@/features/kepegawaian/application/use-cases";

import styles from "./absensi-kepegawaian.module.css";
import { AbsensiKepegawaianNav } from "./nav";

export const metadata: Metadata = { title: "Absensi & Kepegawaian" };
const angka = new Intl.NumberFormat("id-ID");

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\\\/]/).filter(Boolean);
  if (
    !segments.length ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  )
    return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}

export default async function DashboardAbsensiPage() {
  const data = await getDashboardAbsensiData();
  const statusLabel: Record<string, string> = {
    hadir: "Hadir",
    izin: "Izin",
    cuti: "Cuti",
    tidak_hadir: "Tidak Hadir",
  };
  const totalStatus = Math.max(1, data.hadir + data.izin + data.cuti + data.tidakHadir);
  const hadirPct = (data.hadir / totalStatus) * 100;
  const izinPct = (data.izin / totalStatus) * 100;
  const cutiPct = (data.cuti / totalStatus) * 100;
  const chartRows = data.trendRows.slice(-18);
  const chartPoints = chartRows.map((row, index) => {
    const x = chartRows.length <= 1 ? 50 : 24 + (index / (chartRows.length - 1)) * 552;
    const rate = data.totalPegawai ? (Number(row.total) / data.totalPegawai) * 100 : 0;
    const y = 142 - Math.max(0, Math.min(100, rate)) * 1.12;
    return {
      x,
      y,
      rate,
      label: new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(row.tanggal + "T12:00:00+07:00")),
      date: row.tanggal,
    };
  });
  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const averageRate = chartRows.length
    ? chartRows.reduce(
        (sum, row) => sum + (data.totalPegawai ? (Number(row.total) / data.totalPegawai) * 100 : 0),
        0,
      ) / chartRows.length
    : 0;
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ABSENSI & KEPEGAWAIAN</span>
          <h1>Absensi & Kepegawaian</h1>
          <p>Monitoring kehadiran, data pegawai, dan administrasi kepegawaian perangkat desa.</p>
        </div>
      </div>
      <AbsensiKepegawaianNav active="/absensi-kepegawaian" />
      <section className={styles["ak-kpi-grid"]}>
        <article className={`${styles["ak-kpi"]} ${styles.primary}`}>
          <span>Total Pegawai</span>
          <strong>{angka.format(data.totalPegawai)} orang</strong>
          <span>Terhubung dengan data perangkat desa</span>
        </article>
        <article className={styles["ak-kpi"]}>
          <span>Hadir Hari Ini</span>
          <strong>{angka.format(data.hadir)} orang</strong>
        </article>
        <article className={styles["ak-kpi"]}>
          <span>Izin</span>
          <strong>{angka.format(data.izin)} orang</strong>
        </article>
        <article className={styles["ak-kpi"]}>
          <span>Cuti</span>
          <strong>{angka.format(data.cuti)} orang</strong>
        </article>
        <article className={styles["ak-kpi"]}>
          <span>Tidak Hadir</span>
          <strong>{angka.format(data.tidakHadir)} orang</strong>
        </article>
        <article className={styles["ak-kpi"]}>
          <span>Tingkat Kehadiran</span>
          <strong>{data.tingkatKehadiran.toLocaleString("id-ID")}%</strong>
        </article>
      </section>
      <div className={styles["ak-grid"]}>
        <section className={styles["ak-card"]}>
          <div className={styles["ak-chart-heading"]}>
            <div>
              <h2>Statistik Kehadiran (30 Hari Terakhir)</h2>
              <p>Persentase pegawai hadir pada hari dengan catatan absensi.</p>
            </div>
            <strong>
              {averageRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
              <small> rata-rata</small>
            </strong>
          </div>
          {chartPoints.length ? (
            <div className={styles["ak-line-chart"]}>
              <svg
                viewBox="0 0 600 180"
                role="img"
                aria-label="Grafik tren persentase kehadiran pegawai"
              >
                {[30, 58, 86, 114, 142].map((y, index) => (
                  <g key={y}>
                    <line x1="24" y1={y} x2="580" y2={y} stroke="#ece7f7" strokeWidth="1" />
                    <text x="16" y={y + 4} textAnchor="end" fontSize="10" fill="#918aa3">
                      {100 - index * 25}%
                    </text>
                  </g>
                ))}
                <polygon
                  points={`24,142 ${chartLine} 580,142`}
                  fill="url(#attendanceArea)"
                  opacity=".7"
                />
                <defs>
                  <linearGradient id="attendanceArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8b24f3" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#8b24f3" stopOpacity=".02" />
                  </linearGradient>
                </defs>
                <polyline
                  points={chartLine}
                  fill="none"
                  stroke="#7922ec"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartPoints.map((point) => (
                  <g key={point.date}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#fff"
                      stroke="#7922ec"
                      strokeWidth="2"
                    >
                      <title>
                        {point.label}:{" "}
                        {point.rate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                      </title>
                    </circle>
                  </g>
                ))}
                {chartPoints
                  .filter((_, i) => i === 0 || i === chartPoints.length - 1 || i % 4 === 0)
                  .map((point) => (
                    <text
                      key={point.date}
                      x={point.x}
                      y="164"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#716b83"
                    >
                      {point.label}
                    </text>
                  ))}
              </svg>
            </div>
          ) : (
            <div className={styles["ak-empty"]}>
              Belum ada catatan kehadiran dalam 30 hari terakhir.
            </div>
          )}
        </section>
        <section className={styles["ak-card"]}>
          <h2>Komposisi Kehadiran Hari Ini</h2>
          <p>Distribusi status kehadiran seluruh pegawai.</p>
          <div className={styles["ak-donut-layout"]}>
            <div
              className={styles["ak-donut"]}
              style={{
                background: `conic-gradient(#22b84b 0 ${hadirPct}%,#ffb21b ${hadirPct}% ${hadirPct + izinPct}%,#8b24f3 ${hadirPct + izinPct}% ${hadirPct + izinPct + cutiPct}%,#f04455 ${hadirPct + izinPct + cutiPct}% 100%)`,
              }}
            >
              <div>
                <strong>{data.totalPegawai}</strong>
                <span>Pegawai</span>
              </div>
            </div>
            <div className={styles["ak-donut-legend"]}>
              <span>
                <i className={styles.green} />
                Hadir <b>{data.hadir} orang</b>
              </span>
              <span>
                <i className={styles.amber} />
                Izin <b>{data.izin} orang</b>
              </span>
              <span>
                <i className={styles.purple} />
                Cuti <b>{data.cuti} orang</b>
              </span>
              <span>
                <i className={styles.red} />
                Tidak Hadir <b>{data.tidakHadir} orang</b>
              </span>
            </div>
          </div>
          <div className={styles["ak-actions"]}>
            <Link className={styles["ak-button"]} href="/absensi-kepegawaian/pegawai">
              Kelola Data Pegawai
            </Link>
          </div>
        </section>
      </div>
      <div className={styles["ak-grid"]} style={{ marginTop: 16 }}>
        <section className={styles["ak-card"]}>
          <div className={styles["ak-card-heading-row"]}>
            <div>
              <h2>Daftar Kehadiran Hari Ini</h2>
              <p>Ringkasan status kehadiran seluruh pegawai aktif.</p>
            </div>
            <Link href="/absensi-kepegawaian/absensi">Lihat Semua →</Link>
          </div>
          <div className={styles["ak-table-wrap"]}>
            <table className={styles["ak-table"]}>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Masuk</th>
                  <th>Pulang</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.todayRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td>
                      <span className={styles["ak-person"]}>
                        <span>
                          {mediaUrl(row.foto, data.villageId) ? (
                            <Image
                              src={mediaUrl(row.foto, data.villageId)!}
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                            />
                          ) : (
                            row.pegawai
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()
                          )}
                        </span>
                        <b>{row.pegawai}</b>
                      </span>
                    </td>
                    <td>{row.jabatan ?? "—"}</td>
                    <td>{row.jamMasuk ?? "—"}</td>
                    <td>{row.jamKeluar ?? "—"}</td>
                    <td>
                      <span className={`${styles["ak-badge"]} ${styles[row.status] ?? ""}`}>
                        {statusLabel[row.status] ?? row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles["ak-actions"]}>
            <Link className={styles["ak-button"]} href="/absensi-kepegawaian/absensi">
              Lihat Rekap Absensi
            </Link>
          </div>
        </section>
        <section className={styles["ak-card"]}>
          <h2>Informasi Kepegawaian</h2>
          <p>Ringkasan pegawai aktif yang terhubung ke data Perangkat Desa.</p>
          <div className={styles["ak-info-list"]}>
            <div>
              <span>♙</span>
              <label>Pegawai Aktif</label>
              <b>{data.totalPegawai} orang</b>
            </div>
            <div>
              <span>♂</span>
              <label>Laki-laki</label>
              <b>{data.jenisKelamin.lakiLaki} orang</b>
            </div>
            <div>
              <span>♀</span>
              <label>Perempuan</label>
              <b>{data.jenisKelamin.perempuan} orang</b>
            </div>
            <div>
              <span>◷</span>
              <label>Rata-rata Masa Kerja</label>
              <b>
                {Math.floor(data.rataMasaKerjaBulan / 12)} thn {data.rataMasaKerjaBulan % 12} bln
              </b>
            </div>
            <div>
              <span>▣</span>
              <label>Pegawai Kontrak</label>
              <b>{data.komposisi.kontrak} orang</b>
            </div>
            <div>
              <span>♙</span>
              <label>Purna Tugas</label>
              <b>{data.komposisi.purnaTugas} orang</b>
            </div>
          </div>
          <div className={styles["ak-actions"]}>
            <Link className={styles["ak-button"]} href="/absensi-kepegawaian/pegawai">
              Kelola Data Pegawai →
            </Link>
          </div>
        </section>
      </div>
      <section
        className={styles["ak-card"] + " " + styles["ak-quick-actions"]}
        style={{ marginTop: 16 }}
      >
        <h2>Aksi Cepat</h2>
        <div className={styles["ak-quick-grid"]}>
          <Link href="/absensi-kepegawaian/absensi">
            <span>◉</span>Absensi Manual
          </Link>
          <Link href="/absensi-kepegawaian/pegawai">
            <span>＋</span>Tambah Pegawai
          </Link>
          <Link href="/absensi-kepegawaian/cuti-izin">
            <span>▣</span>Ajukan Cuti / Izin
          </Link>
          <Link href="/absensi-kepegawaian/absensi">
            <span>▤</span>Rekap Kehadiran
          </Link>
          <Link href="/absensi-kepegawaian/pegawai">
            <span>▥</span>Laporan Pegawai
          </Link>
        </div>
      </section>
    </div>
  );
}
