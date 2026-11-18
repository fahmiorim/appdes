import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { StatIcon } from "@/components/ui/stat-icon";
import { dashboardStats } from "@/features/dashboard/application/dashboard-use-cases";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Beranda",
};

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <div className="stat-icon" aria-hidden="true">
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        viewBox="0 0 24 24"
      >
        {children}
      </svg>
    </div>
  );
}

export default async function AdminHomePage() {
  const user = await verifySession();

  if (await isSuperAdminUser(user)) {
    redirect("/super-admin");
  }

  const village = user.villageId === null ? null : await getNamaDesaUseCase(user.villageId);
  const stats = user.villageId === null ? null : await dashboardStats(user.villageId);

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

      {stats ? (
        <>
          <div className="section-heading">
            <div>
              <h2>Data administrasi</h2>
              <p>Angka yang tercatat pada desa Anda saat ini.</p>
            </div>
          </div>
          <div className="stats-grid">
            <Card>
              <StatIcon>
                <circle cx="9" cy="8" r="3.2" />
                <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
                <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
                <path d="M18.3 14.4a6.2 6.2 0 0 1 3.1 5.6" />
              </StatIcon>
              <div className="stat-card-label">Total penduduk</div>
              <div className="stat-card-value">{stats.residents.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">Data penduduk terdaftar di desa</div>
            </Card>
            <Card>
              <StatIcon>
                <path d="M4 10.5 12 4l8 6.5" />
                <path d="M6 9.8V20h12V9.8" />
                <path d="M10 20v-4.6h4V20" />
              </StatIcon>
              <div className="stat-card-label">Kartu keluarga</div>
              <div className="stat-card-value">{stats.families.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">Jumlah KK yang tercatat</div>
            </Card>
            <Card>
              <StatIcon>
                <path d="M6 3.5h8.2L19 8.3V20.5H6z" />
                <path d="M14 3.5v5h5" />
                <path d="M9 13h6" />
                <path d="M9 16.5h4.5" />
              </StatIcon>
              <div className="stat-card-label">Surat desa</div>
              <div className="stat-card-value">{stats.letters.toLocaleString("id-ID")}</div>
              <div className="stat-card-note">Total surat pada sistem</div>
            </Card>
          </div>
        </>
      ) : (
        <section className="dashboard-section">
          <h2>Data desa belum tersedia</h2>
          <p>Akun ini belum terhubung dengan tenant desa.</p>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Mulai bekerja</h2>
        <p>
          Gunakan menu administrasi untuk mengelola data, pelayanan, dan informasi desa sesuai
          dengan hak akses akun Anda.
        </p>
      </section>
    </>
  );
}
