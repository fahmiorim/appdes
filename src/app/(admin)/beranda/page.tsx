import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { dashboardStats } from "@/features/dashboard/application/dashboard-use-cases";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Beranda",
};

export default async function AdminHomePage() {
  const user = await verifySession();
  const village =
    user.villageId === null ? null : await getNamaDesaUseCase(user.villageId);
  const stats =
    user.villageId === null ? null : await dashboardStats(user.villageId);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Ringkasan desa</span>
          <h1>Selamat datang, {user.name.split(" ")[0]}</h1>
          <p>
            {village
              ? `Berikut gambaran data administrasi ${village}.`
              : "Anda masuk sebagai administrator platform."}
          </p>
        </div>
      </div>

      {stats ? (
        <div className="stats-grid">
          <Card>
            <div className="stat-card-label">Total penduduk</div>
            <div className="stat-card-value">
              {stats.residents.toLocaleString("id-ID")}
            </div>
            <div className="stat-card-note">
              Data penduduk terdaftar di desa
            </div>
          </Card>
          <Card>
            <div className="stat-card-label">Kartu keluarga</div>
            <div className="stat-card-value">
              {stats.families.toLocaleString("id-ID")}
            </div>
            <div className="stat-card-note">Jumlah KK yang tercatat</div>
          </Card>
          <Card>
            <div className="stat-card-label">Surat desa</div>
            <div className="stat-card-value">
              {stats.letters.toLocaleString("id-ID")}
            </div>
            <div className="stat-card-note">Total surat pada sistem</div>
          </Card>
        </div>
      ) : (
        <section className="dashboard-section">
          <h2>Area platform</h2>
          <p>
            Akun platform terdeteksi. Dashboard pengelolaan tenant akan dibuat
            pada tahap Super Admin; data desa tidak ditampilkan di area ini.
          </p>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Mulai bekerja</h2>
        <p>
          Fondasi dashboard sudah aktif. Halaman operasional akan dibuka
          bertahap dengan pemeriksaan sesi, izin, dan isolasi desa pada sisi
          server.
        </p>
        <div className="quick-links">
          <span className="button button-secondary">
            Data penduduk · segera hadir
          </span>
          <span className="button button-secondary">
            Persuratan · segera hadir
          </span>
          <span className="button button-secondary">
            Inventaris · segera hadir
          </span>
        </div>
      </section>
    </>
  );
}
