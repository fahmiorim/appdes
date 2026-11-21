import type { Metadata } from "next";

import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { PlatformPageHeader } from "@/features/multi-desa/presentation/platform-ui";
import {
  TambahDomainWizard,
  type DesaPilihanDomain,
} from "@/features/multi-desa/presentation/tambah-domain-wizard";
import { env } from "@/lib/env";

import { periksaDnsDomainAction, periksaSslDomainAction, tambahDomainAction } from "../../actions";
import { pastikanSuperAdmin } from "../../guard";

export const metadata: Metadata = {
  title: "Tambah Domain",
  robots: { index: false, follow: false },
};

export default async function SuperAdminTambahDomainPage() {
  await pastikanSuperAdmin();

  const desa = await daftarDesaSuperAdmin();
  const pilihan: DesaPilihanDomain[] = desa.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    district: item.district,
    regency: item.regency,
    active: item.active,
    domain: item.domain,
  }));

  return (
    <>
      <PlatformPageHeader
        backHref="/super-admin/domain"
        backLabel="Kembali ke daftar domain"
        judul="Tambah Domain"
        path="/super-admin/domain/tambah"
      />
      <TambahDomainWizard
        aksiDns={periksaDnsDomainAction}
        aksiSsl={periksaSslDomainAction}
        aksiTambah={tambahDomainAction}
        baseDomain={env.DESA_BASE_DOMAIN ?? null}
        desa={pilihan}
      />
    </>
  );
}
