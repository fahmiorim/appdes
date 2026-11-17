import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import {
  daftarDesaSuperAdmin,
  requireSuperAdmin,
} from "@/features/multi-desa/application/provisioning-use-cases";
import { TenantTable } from "@/features/multi-desa/presentation/tenant-table";

export const metadata: Metadata = {
  title: "Dashboard Super Admin",
  robots: { index: false, follow: false },
};

export default async function SuperAdminPage() {
  // Guard di level halaman, bukan hanya di use case, agar halaman ini tidak
  // pernah merender data tenant bila suatu saat pemanggilan use case berubah.
  await requireSuperAdmin();

  const desa = await daftarDesaSuperAdmin();
  const totalAktif = desa.filter((item) => item.active).length;
  const totalPenduduk = desa.reduce((total, item) => total + item.penduduk, 0);
  const totalPengguna = desa.reduce((total, item) => total + item.pengguna, 0);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Konsol platform</span>
          <h1>Dashboard Super Admin</h1>
          <p>Pantau tenant desa dan ringkasan penggunaan platform FlexiDesa.</p>
        </div>
      </div>

      <div className="stats-grid platform-stats-grid">
        <Card>
          <div className="stat-card-label">Total desa</div>
          <div className="stat-card-value">{desa.length.toLocaleString("id-ID")}</div>
          <div className="stat-card-note">Seluruh tenant terdaftar</div>
        </Card>
        <Card>
          <div className="stat-card-label">Desa aktif</div>
          <div className="stat-card-value">{totalAktif.toLocaleString("id-ID")}</div>
          <div className="stat-card-note">Tenant yang dapat mengakses layanan</div>
        </Card>
        <Card>
          <div className="stat-card-label">Total pengguna</div>
          <div className="stat-card-value">{totalPengguna.toLocaleString("id-ID")}</div>
          <div className="stat-card-note">Akun yang terdaftar pada seluruh desa</div>
        </Card>
        <Card>
          <div className="stat-card-label">Total penduduk</div>
          <div className="stat-card-value">{totalPenduduk.toLocaleString("id-ID")}</div>
          <div className="stat-card-note">Data penduduk seluruh tenant</div>
        </Card>
      </div>

      <section className="dashboard-section platform-tenant-section">
        <div className="platform-section-heading">
          <div>
            <h2>Tenant desa</h2>
            <p>{desa.length.toLocaleString("id-ID")} desa terdaftar di platform.</p>
          </div>
        </div>
        <TenantTable desa={desa} />
      </section>
    </>
  );
}
