import type { Metadata } from "next";

import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { hariMenujuPurge, statusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import { parseStatusTenantFilter } from "@/features/multi-desa/domain/status-tenant-filter";
import { DialogDaftarDesa } from "@/features/multi-desa/presentation/dialog-daftar-desa";
import { PlatformCard } from "@/features/multi-desa/presentation/platform-ui";
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
  title: "Tenant Desa",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function SuperAdminTenantPage({ searchParams }: Props) {
  await pastikanSuperAdmin();

  const statusAwal = parseStatusTenantFilter((await searchParams).status);

  const [desa, domain] = await Promise.all([daftarDesaSuperAdmin(), daftarSemuaDomain()]);
  const rows = desa.map((item) => ({
    ...item,
    statusRetensi: statusRetensi(item),
    hariMenujuPurge: hariMenujuPurge(item),
  }));

  return (
    <>
      <PlatformCard
        actions={<DialogDaftarDesa aksi={buatDesaAction} />}
        description={`${angka.format(rows.length)} desa terdaftar. Setiap baris dapat dibuka untuk mengubah pengaturan desa; purge bersifat permanen dan hanya tersedia setelah ekspor berlaku.`}
        flush
        title="Daftar tenant"
      >
        <div className="platform-tenant-console">
          <TenantConsole
            key={statusAwal}
            desa={rows}
            domain={domain}
            statusAwal={statusAwal}
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
