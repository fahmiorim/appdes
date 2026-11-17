import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import {
  daftarDesaSuperAdmin,
  requireSuperAdmin,
} from "@/features/multi-desa/application/provisioning-use-cases";
import { hariMenujuPurge, statusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import { TenantConsole } from "@/features/multi-desa/presentation/tenant-console";
import { isAppError } from "@/lib/errors";

import {
  buatDesaAction,
  eksporDataAction,
  hapusDomainAction,
  jadikanUtamaAction,
  purgeAction,
  resetAdminAction,
  tambahDomainAction,
  ubahKuotaAction,
  ubahStatusAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Dashboard Super Admin",
  robots: { index: false, follow: false },
};

/**
 * Gerbang halaman: tampilkan halaman 403 berisi penjelasan untuk pengguna yang
 * sudah login tetapi tidak berhak, dan arahkan pengguna tanpa sesi ke masuk.
 * Guard tetap dijalankan di level halaman, bukan hanya di use case data.
 */
async function pastikanSuperAdmin(): Promise<void> {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      forbidden();
    }

    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/masuk");
    }

    throw error;
  }
}

export default async function SuperAdminPage() {
  await pastikanSuperAdmin();

  const desa = await daftarDesaSuperAdmin();
  const domain = await daftarSemuaDomain();
  const rows = desa.map((item) => ({
    ...item,
    statusRetensi: statusRetensi(item),
    hariMenujuPurge: hariMenujuPurge(item),
  }));

  const totalAktif = desa.filter((item) => item.active).length;
  const totalPenduduk = desa.reduce((total, item) => total + item.penduduk, 0);
  const totalPengguna = desa.reduce((total, item) => total + item.pengguna, 0);
  const totalSiapPurge = rows.filter((item) => item.statusRetensi === "siap-purge").length;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Konsol platform</span>
          <h1>Dashboard Super Admin</h1>
          <p>Kelola tenant desa, retensi data, dan ringkasan penggunaan platform FlexiDesa.</p>
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
          <div className="stat-card-label">Siap purge</div>
          <div className="stat-card-value">{totalSiapPurge.toLocaleString("id-ID")}</div>
          <div className="stat-card-note">
            Masa tenggang selesai · {totalPenduduk.toLocaleString("id-ID")} penduduk tercatat
          </div>
        </Card>
      </div>

      <section className="dashboard-section platform-tenant-section">
        <div className="platform-section-heading">
          <div>
            <h2>Tenant desa</h2>
            <p>{desa.length.toLocaleString("id-ID")} desa terdaftar di platform.</p>
          </div>
        </div>
        <TenantConsole
          desa={rows}
          domain={domain}
          aksi={{
            buat: buatDesaAction,
            status: ubahStatusAction,
            kuota: ubahKuotaAction,
            reset: resetAdminAction,
            ekspor: eksporDataAction,
            purge: purgeAction,
            tambahDomain: tambahDomainAction,
            hapusDomain: hapusDomainAction,
            jadikanUtama: jadikanUtamaAction,
          }}
        />
      </section>
    </>
  );
}
