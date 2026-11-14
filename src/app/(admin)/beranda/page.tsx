import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { dashboardStats } from "@/features/dashboard/application/dashboard-use-cases";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Beranda",
};

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
        <div className="stats-grid">
          <Card>
            <div className="stat-card-label">Total penduduk</div>
            <div className="stat-card-value">{stats.residents.toLocaleString("id-ID")}</div>
            <div className="stat-card-note">Data penduduk terdaftar di desa</div>
          </Card>
          <Card>
            <div className="stat-card-label">Kartu keluarga</div>
            <div className="stat-card-value">{stats.families.toLocaleString("id-ID")}</div>
            <div className="stat-card-note">Jumlah KK yang tercatat</div>
          </Card>
          <Card>
            <div className="stat-card-label">Surat desa</div>
            <div className="stat-card-value">{stats.letters.toLocaleString("id-ID")}</div>
            <div className="stat-card-note">Total surat pada sistem</div>
          </Card>
        </div>
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
