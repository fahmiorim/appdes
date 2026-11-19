import type { Metadata } from "next";

import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { hariMenujuPurge, statusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import { parseStatusTenantFilter } from "@/features/multi-desa/domain/status-tenant-filter";
import { DialogDaftarDesa } from "@/features/multi-desa/presentation/dialog-daftar-desa";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";
import { TenantConsole } from "@/features/multi-desa/presentation/tenant-console";

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
} from "../actions";
import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Daftar Tenant",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

type Props = { searchParams: Promise<{ status?: string | string[]; q?: string | string[] }> };

export default async function SuperAdminTenantPage({ searchParams }: Props) {
  await pastikanSuperAdmin();

  const params = await searchParams;
  const statusAwal = parseStatusTenantFilter(params.status);
  const kataKunci = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 120) ?? "";

  const [desa, domain] = await Promise.all([daftarDesaSuperAdmin(), daftarSemuaDomain()]);
  const rows = desa.map((item) => ({
    ...item,
    statusRetensi: statusRetensi(item),
    hariMenujuPurge: hariMenujuPurge(item),
  }));

  const jumlahAktif = rows.filter((item) => item.active).length;
  const jumlahNonaktif = rows.filter(
    (item) => !item.active && item.statusRetensi !== "sudah-purge",
  ).length;
  const jumlahSiapPurge = rows.filter((item) => item.statusRetensi === "siap-purge").length;
  const totalPengguna = rows.reduce((total, item) => total + item.pengguna, 0);
  const totalPenduduk = rows.reduce((total, item) => total + item.penduduk, 0);
  const desaBerdomain = new Set(domain.map((item) => item.villageId)).size;
  const desaTanpaDomain = rows.length - desaBerdomain;
  const persentaseAktif = rows.length > 0 ? Math.round((jumlahAktif / rows.length) * 100) : 0;

  return (
    <>
      <PlatformPageHeader
        actions={<DialogDaftarDesa aksi={buatDesaAction} />}
        path="/super-admin/tenant"
      />
      <div className="platform-stat-grid is-enam">
        <PlatformStat
          icon={
            <>
              <path d="M3.5 20.5V9.2L9 6.3v14.2" />
              <path d="M9 20.5h11.5V11l-6-3.2" />
              <path d="M6 11.4h.01M6 14.8h.01M6 18.2h.01" />
              <path d="M12.5 12.2h.01M12.5 15.4h.01M12.5 18.6h.01M16 12.2h.01M16 15.4h.01" />
            </>
          }
          label="Total tenant"
          note={`${angka.format(jumlahAktif)} aktif · ${angka.format(jumlahNonaktif)} nonaktif`}
          tone="ungu"
          value={angka.format(rows.length)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="m8.4 12 2.4 2.4 4.8-5" />
            </>
          }
          label="Tenant aktif"
          note={`${angka.format(persentaseAktif)}% dari total tenant`}
          tone="hijau"
          value={angka.format(jumlahAktif)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M10 8.6v6.8M14 8.6v6.8" />
            </>
          }
          label="Tenant nonaktif"
          note={`${angka.format(jumlahSiapPurge)} siap purge`}
          tone="merah"
          value={angka.format(jumlahNonaktif)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="9" cy="8" r="3.2" />
              <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
              <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
              <path d="M18.3 14.4a6.2 6.2 0 0 1 3.1 5.6" />
            </>
          }
          label="Total pengguna desa"
          note="Akun pengguna lintas tenant"
          tone="biru"
          value={angka.format(totalPengguna)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="8.4" r="3.6" />
              <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
              <path d="M18.8 8.4h2.4M20 7.2v2.4" />
            </>
          }
          label="Total penduduk"
          note="Tercatat pada profil desa"
          tone="oranye"
          value={angka.format(totalPenduduk)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M3.6 12h16.8" />
              <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
            </>
          }
          label="Domain terdaftar"
          note={`${angka.format(desaTanpaDomain)} desa belum berdomain`}
          tone="ungu"
          value={angka.format(domain.length)}
        />
      </div>
      <PlatformCard flush>
        <div className="platform-tenant-console">
          <TenantConsole
            key={`${statusAwal}:${kataKunci}`}
            desa={rows}
            domain={domain}
            statusAwal={statusAwal}
            queryAwal={kataKunci}
            aksi={{
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
        </div>
      </PlatformCard>
    </>
  );
}
