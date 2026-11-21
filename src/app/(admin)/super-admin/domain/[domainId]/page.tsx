import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ambilAuditPlatform } from "@/features/multi-desa/application/audit-platform-use-cases";
import { ambilDetailDomainPlatform } from "@/features/multi-desa/application/pemantauan-domain-use-cases";
import {
  DetailDomainView,
  type TabDetailDomain,
} from "@/features/multi-desa/presentation/detail-domain-view";
import { env } from "@/lib/env";

import { periksaDnsDomainAction, periksaSslDomainAction } from "../../actions";
import { pastikanSuperAdmin } from "../../guard";

export const metadata: Metadata = {
  title: "Detail Domain",
  robots: { index: false, follow: false },
};

const TAB_VALID: readonly TabDetailDomain[] = [
  "informasi",
  "dns",
  "ssl",
  "redirect",
  "verifikasi",
  "riwayat",
];

function tabDari(nilai: string | string[] | undefined): TabDetailDomain {
  const tab = Array.isArray(nilai) ? nilai[0] : nilai;
  return TAB_VALID.find((item) => item === tab) ?? "informasi";
}

type Props = {
  params: Promise<{ domainId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function SuperAdminDetailDomainPage({ params, searchParams }: Props) {
  await pastikanSuperAdmin();

  const { domainId } = await params;
  if (!/^\d{1,9}$/.test(domainId)) notFound();

  const id = Number.parseInt(domainId, 10);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const data = await ambilDetailDomainPlatform(id);
  if (!data) notFound();

  const [audit, query] = await Promise.all([
    ambilAuditPlatform({ desa: String(data.domain.villageId) }),
    searchParams,
  ]);

  return (
    <DetailDomainView
      aksiDns={periksaDnsDomainAction}
      aksiSsl={periksaSslDomainAction}
      baseDomain={env.DESA_BASE_DOMAIN ?? ""}
      data={data}
      riwayat={audit.rows}
      tab={tabDari(query.tab)}
      totalRiwayat={audit.total}
    />
  );
}
