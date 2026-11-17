import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  PlatformCard,
  PlatformEmpty,
  PlatformPageHeader,
  PlatformStatus,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Domain Platform",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

export default async function SuperAdminDomainPage() {
  await pastikanSuperAdmin();

  const [domain, desa] = await Promise.all([daftarSemuaDomain(), daftarDesaSuperAdmin()]);

  const namaDesa = new Map(desa.map((item) => [item.id, item.name ?? `Desa #${item.id}`]));
  const slugDesa = new Map(desa.map((item) => [item.id, item.slug]));
  const desaBerdomain = new Set(domain.map((item) => item.villageId)).size;
  const domainUtama = domain.filter((item) => item.isPrimary).length;

  const urut = [...domain].sort(
    (a, b) =>
      (namaDesa.get(a.villageId) ?? "").localeCompare(namaDesa.get(b.villageId) ?? "", "id") ||
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.domain.localeCompare(b.domain, "id"),
  );

  return (
    <>
      <PlatformPageHeader
        actions={
          <Link className="button button-secondary" href="/super-admin/tenant">
            Buka konsol tenant
          </Link>
        }
        description="Semua hostname yang mengarah ke desa. Domain utama dipakai untuk mengenali tenant dari host; alias lain mengarah ke desa yang sama."
        eyebrow="Konsol platform"
        title="Domain tenant"
      />

      <div className="platform-stat-grid">
        <Card>
          <div className="stat-card-label">Total domain</div>
          <div className="stat-card-value">{angka.format(domain.length)}</div>
          <div className="stat-card-note">Domain utama dan alias</div>
        </Card>
        <Card>
          <div className="stat-card-label">Domain utama</div>
          <div className="stat-card-value">{angka.format(domainUtama)}</div>
          <div className="stat-card-note">Satu domain utama per desa</div>
        </Card>
        <Card>
          <div className="stat-card-label">Desa berdomain</div>
          <div className="stat-card-value">{angka.format(desaBerdomain)}</div>
          <div className="stat-card-note">Dari {angka.format(desa.length)} desa terdaftar</div>
        </Card>
        <Card>
          <div className="stat-card-label">Desa tanpa domain</div>
          <div className="stat-card-value">{angka.format(desa.length - desaBerdomain)}</div>
          <div className="stat-card-note">Tambahkan dari panel tenant</div>
        </Card>
      </div>

      <PlatformCard
        description="Domain dikelola per desa lewat panel tenant; daftar ini bersifat lintas desa."
        flush
        title="Daftar domain"
      >
        {urut.length > 0 ? (
          <div className="tenant-table-scroll">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th scope="col">Domain</th>
                  <th scope="col">Desa</th>
                  <th scope="col">Jenis</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {urut.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.domain}</strong>
                    </td>
                    <td>
                      {namaDesa.get(item.villageId) ?? `Desa #${item.villageId}`}
                      {slugDesa.get(item.villageId) ? (
                        <span className="tenant-secondary">
                          Slug: {slugDesa.get(item.villageId)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {item.isPrimary ? (
                        <PlatformStatus aktif label="Utama" />
                      ) : (
                        <span className="platform-badge">Alias</span>
                      )}
                    </td>
                    <td>
                      <Link
                        className="button button-secondary platform-action-button"
                        href="/super-admin/tenant"
                      >
                        Kelola desa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PlatformEmpty
            action={
              <Link className="button button-primary" href="/super-admin/tenant">
                Buka konsol tenant
              </Link>
            }
            description="Tambahkan domain saat mendaftarkan desa, atau dari panel desa pada konsol tenant."
            title="Belum ada domain terdaftar"
          />
        )}
      </PlatformCard>
    </>
  );
}
