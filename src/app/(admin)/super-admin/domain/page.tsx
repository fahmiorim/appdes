import type { Metadata } from "next";
import Link from "next/link";

import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  PlatformCard,
  PlatformEmpty,
  PlatformPageHeader,
  PlatformStat,
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
  const desaTanpaDomain = desa.length - desaBerdomain;

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
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M3.6 12h16.8" />
              <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
            </>
          }
          label="Total domain"
          note="Domain utama dan alias"
          value={angka.format(domain.length)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M3.5 20.5V9.2L9 6.3v14.2" />
              <path d="M9 20.5h11.5V11l-6-3.2" />
              <path d="M6 11.4h.01M6 14.8h.01M6 18.2h.01" />
              <path d="M12.5 12.2h.01M12.5 15.4h.01M12.5 18.6h.01M16 12.2h.01" />
            </>
          }
          label="Desa berdomain"
          note={`Dari ${angka.format(desa.length)} desa terdaftar`}
          value={angka.format(desaBerdomain)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M12 7.6v5.2" />
              <path d="M12 16.6h.01" />
            </>
          }
          label="Desa tanpa domain"
          note="Tambahkan dari panel tenant"
          value={angka.format(desaTanpaDomain)}
        />
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
