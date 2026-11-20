import type { Metadata } from "next";
import Link from "next/link";

import { daftarTemplateWebsite } from "@/features/multi-desa/application/template-website-use-cases";
import { KatalogTemplate } from "@/features/multi-desa/presentation/katalog-template";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Katalog Template",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

export default async function SuperAdminTemplatePage() {
  await pastikanSuperAdmin();

  const templates = await daftarTemplateWebsite();
  const terbit = templates.filter((item) => item.status === "published").length;
  const totalTenant = templates.reduce((total, item) => total + item.jumlahTenant, 0);
  const perluPembaruan = templates.reduce((total, item) => total + item.jumlahTertinggal, 0);

  return (
    <>
      <PlatformPageHeader
        actions={
          <>
            <Link className="button button-secondary" href="/super-admin/template/fondasi">
              Fondasi tenant
            </Link>
            <Link className="button button-primary" href="/super-admin/template/baru">
              + Tambah template
            </Link>
          </>
        }
        path="/super-admin/template"
      />

      <div className="platform-stat-grid template-stat-grid">
        <PlatformStat
          icon={
            <>
              <rect height="12" rx="1.5" width="16" x="4" y="4" />
              <path d="M4 9h16M9.4 9v7M14.6 9v7" />
            </>
          }
          label="Total template"
          note="Metadata tema pada katalog platform"
          tone="ungu"
          value={angka.format(templates.length)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.2" />
              <path d="m8.2 12.2 2.4 2.4 5.2-5.2" />
            </>
          }
          label="Template terbit"
          note="Terbit di katalog platform"
          tone="hijau"
          value={angka.format(terbit)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="8.4" cy="8" r="2.8" />
              <path d="M3 19a5.4 5.4 0 0 1 10.8 0M15.8 6.2a2.8 2.8 0 0 1 0 5.4M17.4 14.2A5.4 5.4 0 0 1 21 19" />
            </>
          }
          label="Total penggunaan"
          note="Tenant dengan tema aktif yang cocok"
          tone="biru"
          value={angka.format(totalTenant)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M6.1 9A7 7 0 0 1 18.7 7.4M17.9 15A7 7 0 0 1 5.3 16.6" />
            </>
          }
          label="Perlu pembaruan"
          note="Tenant yang masih di versi lama"
          tone="oranye"
          value={angka.format(perluPembaruan)}
        />
      </div>

      <PlatformCard
        description="Katalog tema tampilan website. Token tampilan dapat dipratinjau; unggahan kode atau ZIP tidak didukung."
        title="Katalog template"
      >
        {templates.length > 0 ? (
          <KatalogTemplate templates={templates} />
        ) : (
          <div className="template-empty">
            <strong>Belum ada template</strong>
            <p>Tambahkan template pertama untuk mulai membangun katalog tema.</p>
            <Link className="button button-primary" href="/super-admin/template/baru">
              Tambah template
            </Link>
          </div>
        )}
      </PlatformCard>
    </>
  );
}
