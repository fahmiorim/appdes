import type { Metadata } from "next";
import Link from "next/link";

import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarPemeriksaanDomain } from "@/features/multi-desa/application/pemantauan-domain-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { klasifikasiJenisDomain } from "@/features/multi-desa/domain/jenis-domain";
import { DNS_BELUM_DIPERIKSA } from "@/features/multi-desa/domain/status-dns";
import { SSL_BELUM_DIPERIKSA } from "@/features/multi-desa/domain/status-ssl";
import { DomainConsole } from "@/features/multi-desa/presentation/domain-console";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";
import { TombolPemeriksaan } from "@/features/multi-desa/presentation/tombol-pemeriksaan";
import { env } from "@/lib/env";

import { periksaDnsMassalAction, periksaSslMassalAction } from "../actions";
import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Daftar Domain",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");
const formatPersen = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SuperAdminDomainPage({ searchParams }: Props) {
  await pastikanSuperAdmin();

  const params = await searchParams;
  const kataKunci = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 120) ?? "";

  const [domain, desa, pemeriksaan] = await Promise.all([
    daftarSemuaDomain(),
    daftarDesaSuperAdmin(),
    daftarPemeriksaanDomain(),
  ]);
  const desaById = new Map(desa.map((item) => [item.id, item]));
  const sslById = new Map(pemeriksaan.ssl.map((item) => [item.domainId, item]));
  const dnsById = new Map(pemeriksaan.dns.map((item) => [item.domainId, item]));

  const rows = [...domain]
    .map((item) => {
      const pemilik = desaById.get(item.villageId);

      return {
        id: item.id,
        villageId: item.villageId,
        villageName: pemilik?.name ?? `Desa #${item.villageId}`,
        villageSlug: pemilik?.slug ?? null,
        villageDistrict: pemilik?.district ?? null,
        villageActive: pemilik?.active ?? false,
        domain: item.domain,
        jenis: klasifikasiJenisDomain(item.domain, env.DESA_BASE_DOMAIN, pemilik?.slug),
        isPrimary: item.isPrimary,
        createdAt: item.createdAt,
        dns: dnsById.get(item.id) ?? DNS_BELUM_DIPERIKSA,
        ssl: sslById.get(item.id) ?? SSL_BELUM_DIPERIKSA,
      };
    })
    .sort(
      (a, b) =>
        a.villageName.localeCompare(b.villageName, "id") ||
        Number(b.isPrimary) - Number(a.isPrimary) ||
        a.domain.localeCompare(b.domain, "id"),
    );

  const totalDomain = rows.length;
  const subdomain = rows.filter((item) => item.jenis === "subdomain").length;
  const custom = totalDomain - subdomain;
  const sslAktif = rows.filter((item) => item.ssl.status === "aktif").length;
  const sslSegera = rows.filter((item) => item.ssl.status === "segera-expired").length;
  const sslBermasalah = rows.filter((item) => item.ssl.status === "bermasalah").length;
  const persentase = (jumlah: number) =>
    totalDomain === 0 ? "0,0%" : `${formatPersen.format((jumlah / totalDomain) * 100)}%`;
  const desaBerdomain = new Set(rows.map((item) => item.villageId)).size;
  const desaTanpaDomain = Math.max(0, desa.length - desaBerdomain);

  return (
    <>
      <PlatformPageHeader
        actions={
          <>
            <TombolPemeriksaan
              aksi={periksaSslMassalAction}
              jenis="ssl"
              label="Cek SSL massal"
              labelPending="Memeriksa SSL..."
            />
            <TombolPemeriksaan
              aksi={periksaDnsMassalAction}
              jenis="dns"
              label="Cek DNS massal"
              labelPending="Memeriksa DNS..."
            />
            <Link className="button button-primary" href="/super-admin/domain/tambah">
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Tambah Domain
            </Link>
          </>
        }
        backHref="/super-admin"
        judul="Desa & Domain — Daftar Domain"
        path="/super-admin/domain"
      />
      <div className="platform-stat-grid is-enam is-domain">
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M3.6 12h16.8" />
              <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
            </>
          }
          label="Total Domain"
          note="(Desa/Tenant)"
          tone="ungu"
          value={angka.format(totalDomain)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M10 13a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
              <path d="M14 11a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" />
            </>
          }
          label="Subdomain Aktif"
          note={`${persentase(subdomain)} dari total`}
          tone="hijau"
          value={angka.format(subdomain)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M3.6 12h16.8" />
              <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
            </>
          }
          label="Custom Domain"
          note={`${persentase(custom)} dari total`}
          tone="biru"
          value={angka.format(custom)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M12 3.2 19 6v5.2c0 4.4-2.8 7.6-7 9.6-4.2-2-7-5.2-7-9.6V6Z" />
              <path d="m8.8 12 2.2 2.2 4.2-4.4" />
            </>
          }
          label="SSL Aktif"
          note={`${persentase(sslAktif)} dari total`}
          tone="hijau"
          value={angka.format(sslAktif)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M12 7.4v5.2l3.2 1.8" />
            </>
          }
          label="SSL Segera Expired"
          note="(< 30 hari)"
          tone="oranye"
          value={angka.format(sslSegera)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4" />
            </>
          }
          label="SSL Bermasalah"
          note={`(${persentase(sslBermasalah)})`}
          tone="merah"
          value={angka.format(sslBermasalah)}
        />
      </div>

      <PlatformCard flush>
        <div className="platform-tenant-console domain-console">
          <p className="domain-summary">
            {angka.format(desaBerdomain)} desa berdomain dari {angka.format(desa.length)} desa
            terdaftar
            {desaTanpaDomain > 0
              ? ` · ${angka.format(desaTanpaDomain)} desa belum punya domain`
              : ""}
          </p>
          <DomainConsole key={kataKunci} queryAwal={kataKunci} rows={rows} />
        </div>
      </PlatformCard>
    </>
  );
}
