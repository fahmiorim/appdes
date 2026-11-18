import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { Card } from "@/components/ui/card";
import { StatIcon } from "@/components/ui/stat-icon";
import {
  dashboardAktivitasTerbaru,
  dashboardPermohonanTerbaru,
  dashboardStats,
  dashboardTrenPermohonan,
} from "@/features/dashboard/application/dashboard-use-cases";
import { labelAktivitas, toneAktivitas } from "@/features/dashboard/domain/aktivitas";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
import { labelPermohonanStatus } from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Beranda",
};

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const FORMAT_WAKTU = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function persen(bagian: number, total: number): number {
  return total === 0 ? 0 : Math.round((bagian / total) * 100);
}

export default async function AdminHomePage() {
  const user = await verifySession();

  if (await isSuperAdminUser(user)) {
    redirect("/super-admin");
  }

  const villageId = user.villageId;

  const data =
    villageId === null
      ? null
      : await Promise.all([
          getNamaDesaUseCase(villageId),
          dashboardStats(villageId),
          getStatistikDesa(villageId),
          dashboardTrenPermohonan(villageId),
          dashboardPermohonanTerbaru(villageId),
          dashboardAktivitasTerbaru(villageId),
        ]);

  const village = data?.[0] ?? null;
  const stats = data?.[1] ?? null;
  const statistik = data?.[2] ?? null;
  const tren = data?.[3] ?? [];
  const permohonan = data?.[4] ?? [];
  const aktivitas = data?.[5] ?? [];

  const totalGender = statistik ? statistik.lakiLaki + statistik.perempuan : 0;
  const derajatLaki = statistik && totalGender > 0 ? (statistik.lakiLaki / totalGender) * 360 : 0;
  const donutStyle: CSSProperties = {
    background:
      totalGender === 0
        ? "conic-gradient(var(--color-border) 0deg 360deg)"
        : `conic-gradient(var(--color-action) 0deg ${derajatLaki}deg, var(--color-action-soft) ${derajatLaki}deg 360deg)`,
  };

  const totalTren = tren.reduce((jumlah, titik) => jumlah + titik.total, 0);
  const maksTren = Math.max(...tren.map((titik) => titik.total), 1);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Ringkasan desa</span>
          <h1>Selamat datang, {user.name.split(" ")[0]}</h1>
          <p>
            {village
              ? `Berikut gambaran data administrasi ${village}.`
              : "Akun ini tidak terhubung dengan desa."}
          </p>
        </div>
      </div>

      {stats && statistik ? (
        <>
          <div className="beranda-kpi-grid">
            <Card className="beranda-kpi">
              <StatIcon>
                <circle cx="9" cy="8" r="3.2" />
                <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
                <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
                <path d="M18.3 14.4a6.2 6.2 0 0 1 3.1 5.6" />
              </StatIcon>
              <div className="stat-card-label">Total penduduk</div>
              <div className="stat-card-value">{stats.residents.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">
                {statistik.lakiLaki.toLocaleString("id-ID")} laki-laki,{" "}
                {statistik.perempuan.toLocaleString("id-ID")} perempuan
              </div>
            </Card>

            <Card className="beranda-kpi">
              <StatIcon>
                <path d="M4 10.5 12 4l8 6.5" />
                <path d="M6 9.8V20h12V9.8" />
                <path d="M10 20v-4.6h4V20" />
              </StatIcon>
              <div className="stat-card-label">Kartu keluarga</div>
              <div className="stat-card-value">{stats.families.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">Kartu keluarga tercatat</div>
            </Card>

            <Card className="beranda-kpi">
              <StatIcon>
                <path d="M6 3.5h8.2L19 8.3V20.5H6z" />
                <path d="M14 3.5v5h5" />
                <path d="M9 13h6" />
                <path d="M9 16.5h4.5" />
              </StatIcon>
              <div className="stat-card-label">Permohonan menunggu</div>
              <div className="stat-card-value">
                {stats.permohonanMenunggu.toLocaleString("id-ID")}
              </div>
              <div className="stat-card-note">
                {stats.letters.toLocaleString("id-ID")} surat pada sistem
              </div>
            </Card>

            <Card className="beranda-kpi">
              <StatIcon>
                <path d="M4 5.5h16v10H9l-5 4z" />
                <path d="M8 9.5h8" />
                <path d="M8 12.5h5" />
              </StatIcon>
              <div className="stat-card-label">Pengaduan masyarakat</div>
              <div className="stat-card-value">{stats.complaints.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">
                {stats.complaintsBaru.toLocaleString("id-ID")} berstatus baru
              </div>
            </Card>
          </div>

          <div className="beranda-grid">
            <section className="beranda-panel beranda-panel-wide" aria-labelledby="tren-surat">
              <div className="beranda-panel-head">
                <div>
                  <h2 id="tren-surat">Tren permohonan surat</h2>
                  <p>Jumlah permohonan yang diajukan warga dalam enam bulan terakhir.</p>
                </div>
              </div>

              {totalTren === 0 ? (
                <p className="beranda-empty">
                  Belum ada permohonan surat pada enam bulan terakhir.
                </p>
              ) : (
                <ul className="beranda-bars" aria-label="Jumlah permohonan surat per bulan">
                  {tren.map((titik) => (
                    <li key={titik.bulan}>
                      <span className="beranda-bar-value">{titik.total}</span>
                      <span className="beranda-bar-track" aria-hidden="true">
                        <span
                          className="beranda-bar-fill"
                          style={{ height: `${Math.max(4, (titik.total / maksTren) * 100)}%` }}
                        />
                      </span>
                      <span className="beranda-bar-label" aria-hidden="true">
                        {titik.label}
                      </span>
                      <span className="sr-only">
                        {titik.label}: {titik.total} permohonan
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="beranda-panel" aria-labelledby="komposisi-penduduk">
              <div className="beranda-panel-head">
                <div>
                  <h2 id="komposisi-penduduk">Komposisi penduduk</h2>
                  <p>Perbandingan jenis kelamin penduduk terdaftar.</p>
                </div>
              </div>

              <div className="beranda-donut-wrap">
                <div
                  className="beranda-donut"
                  style={donutStyle}
                  role="img"
                  aria-label={
                    totalGender === 0
                      ? "Belum ada data jenis kelamin penduduk"
                      : `${persen(statistik.lakiLaki, totalGender)} persen laki-laki dan ${persen(
                          statistik.perempuan,
                          totalGender,
                        )} persen perempuan dari ${totalGender} penduduk`
                  }
                >
                  <span className="beranda-donut-center">
                    <strong>{totalGender.toLocaleString("id-ID")}</strong>
                    <span>penduduk</span>
                  </span>
                </div>

                <ul className="beranda-legend">
                  <li data-tone="laki">
                    <span className="beranda-legend-label">Laki-laki</span>
                    <span className="beranda-legend-value">
                      {statistik.lakiLaki.toLocaleString("id-ID")} (
                      {persen(statistik.lakiLaki, totalGender)}%)
                    </span>
                  </li>
                  <li data-tone="perempuan">
                    <span className="beranda-legend-label">Perempuan</span>
                    <span className="beranda-legend-value">
                      {statistik.perempuan.toLocaleString("id-ID")} (
                      {persen(statistik.perempuan, totalGender)}%)
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <section
              className="beranda-panel beranda-panel-wide"
              aria-labelledby="permohonan-terbaru"
            >
              <div className="beranda-panel-head">
                <div>
                  <h2 id="permohonan-terbaru">Permohonan surat terbaru</h2>
                  <p>Lima permohonan terakhir yang masuk ke desa.</p>
                </div>
              </div>

              {permohonan.length === 0 ? (
                <p className="beranda-empty">Belum ada permohonan surat yang masuk.</p>
              ) : (
                <div className="beranda-table-wrap">
                  <table className="beranda-table">
                    <thead>
                      <tr>
                        <th scope="col">Pemohon</th>
                        <th scope="col">Jenis surat</th>
                        <th scope="col">Diajukan</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permohonan.map((baris) => (
                        <tr key={baris.id}>
                          <td>{baris.pemohon}</td>
                          <td>{baris.jenisSurat}</td>
                          <td>{FORMAT_TANGGAL.format(baris.diajukanPada)}</td>
                          <td>
                            <span className="beranda-chip" data-status={baris.status}>
                              {labelPermohonanStatus(baris.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="beranda-panel" aria-labelledby="aktivitas-terbaru">
              <div className="beranda-panel-head">
                <div>
                  <h2 id="aktivitas-terbaru">Aktivitas terbaru</h2>
                  <p>Jejak tindakan terakhir di ruang kerja desa.</p>
                </div>
              </div>

              {aktivitas.length === 0 ? (
                <p className="beranda-empty">Belum ada aktivitas tercatat.</p>
              ) : (
                <ul className="beranda-feed">
                  {aktivitas.map((catatan) => (
                    <li key={catatan.id}>
                      <span
                        className="beranda-feed-dot"
                        data-tone={toneAktivitas(catatan.event)}
                        aria-hidden="true"
                      />
                      <div className="beranda-feed-body">
                        <strong>{labelAktivitas(catatan.event)}</strong>
                        <span>
                          {catatan.actorName ?? "Sistem"} · {FORMAT_WAKTU.format(catatan.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <section className="dashboard-section">
          <h2>Data desa belum tersedia</h2>
          <p>Akun ini belum terhubung dengan tenant desa.</p>
        </section>
      )}
    </>
  );
}
