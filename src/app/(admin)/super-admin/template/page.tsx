import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { getTemplateTenantPlatform } from "@/features/multi-desa/application/platform-info-use-cases";
import {
  PlatformCard,
  PlatformEmpty,
  PlatformPageHeader,
  PlatformStatus,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Template Tenant",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

export default async function SuperAdminTemplatePage() {
  await pastikanSuperAdmin();

  const template = await getTemplateTenantPlatform();
  const namaInduk = new Map(template.modules.map((modul) => [modul.slug, modul.name]));
  const aksesPerRole = new Map<string, number>();
  for (const grant of template.akses) {
    aksesPerRole.set(grant.roleSlug, (aksesPerRole.get(grant.roleSlug) ?? 0) + 1);
  }

  return (
    <>
      <PlatformPageHeader
        description="Fondasi yang disalin ke setiap desa baru: role, modul, matriks akses, tema, dan menu publik. Katalog surat dan data master desa sengaja tidak termasuk."
        eyebrow="Konsol platform"
        title="Template tenant"
      />

      <div className="platform-stat-grid">
        <Card>
          <div className="stat-card-label">Versi template</div>
          <div className="stat-card-value">{template.versi}</div>
          <div className="stat-card-note">
            Sumber: {template.sumber.jenis} · {template.sumber.dibuatPada}
          </div>
        </Card>
        <Card>
          <div className="stat-card-label">Role</div>
          <div className="stat-card-value">{angka.format(template.roles.length)}</div>
          <div className="stat-card-note">Dibuat ulang untuk setiap tenant</div>
        </Card>
        <Card>
          <div className="stat-card-label">Modul</div>
          <div className="stat-card-value">{angka.format(template.modules.length)}</div>
          <div className="stat-card-note">
            {angka.format(template.modules.filter((modul) => modul.isGroup).length)} grup,{" "}
            {angka.format(template.modules.filter((modul) => !modul.isGroup).length)} item
          </div>
        </Card>
        <Card>
          <div className="stat-card-label">Aturan akses</div>
          <div className="stat-card-value">{angka.format(template.akses.length)}</div>
          <div className="stat-card-note">Pasangan role × modul</div>
        </Card>
      </div>

      <PlatformCard
        description="Jumlah modul yang dapat dibaca atau dikelola tiap role."
        flush
        title="Role dan akses"
      >
        <div className="tenant-table-scroll">
          <table className="tenant-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Slug</th>
                <th scope="col">Sistem</th>
                <th scope="col">Aturan akses</th>
              </tr>
            </thead>
            <tbody>
              {template.roles.map((role) => (
                <tr key={role.slug}>
                  <td>
                    <strong>{role.name}</strong>
                  </td>
                  <td>{role.slug}</td>
                  <td>{role.isSystem ? "Ya" : "Tidak"}</td>
                  <td>{angka.format(aksesPerRole.get(role.slug) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlatformCard>

      <PlatformCard
        description="Modul level platform yang dibuat untuk setiap desa baru."
        flush
        title="Modul dan menu"
      >
        {template.modules.length > 0 ? (
          <div className="tenant-table-scroll">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th scope="col">Modul</th>
                  <th scope="col">Slug</th>
                  <th scope="col">URL</th>
                  <th scope="col">Induk</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {template.modules.map((modul) => (
                  <tr key={modul.slug}>
                    <td>
                      <strong>{modul.name}</strong>
                      {modul.icon ? <span className="tenant-secondary">{modul.icon}</span> : null}
                    </td>
                    <td>{modul.slug}</td>
                    <td>{modul.url ?? <span className="tenant-secondary">—</span>}</td>
                    <td>
                      {modul.parentSlug ? (
                        (namaInduk.get(modul.parentSlug) ?? modul.parentSlug)
                      ) : (
                        <span className="tenant-secondary">Tingkat atas</span>
                      )}
                    </td>
                    <td>
                      <PlatformStatus
                        aktif={modul.isActive}
                        label={modul.isActive ? "Aktif" : "Nonaktif"}
                      />
                      {modul.isHidden ? (
                        <span className="tenant-secondary">Disembunyikan</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PlatformEmpty
            description="Sidebar desa baru akan kosong sampai modul ditambahkan ke template."
            title="Template tidak memuat modul"
          />
        )}
      </PlatformCard>

      <PlatformCard
        description="Nilai awal yang dipakai website desa baru."
        title="Tema dan menu publik"
      >
        <dl className="platform-def">
          <div className="platform-def-row">
            <dt>
              Tema bawaan
              <span>src/db/templates/tenant-template.ts</span>
            </dt>
            <dd>
              {template.tema ? (
                <>
                  {template.tema.nama} · slug <strong>{template.tema.slug}</strong> · versi{" "}
                  {template.tema.versi}
                </>
              ) : (
                "Website desa baru memakai tema bawaan aplikasi."
              )}
            </dd>
          </div>
          <div className="platform-def-row">
            <dt>Menu publik</dt>
            <dd>
              {template.menuPublik.length > 0
                ? template.menuPublik.map((menu) => menu.nama).join(", ")
                : "Belum ada menu publik pada template."}
            </dd>
            <span className="platform-badge">{angka.format(template.menuPublik.length)} menu</span>
          </div>
        </dl>

        <p className="form-help">
          Template dibaca dari <code>src/db/templates/tenant-template.ts</code> dan divalidasi saat
          provisioning. Untuk mengubahnya, gunakan <code>npm run platform:export-template</code>{" "}
          lalu review perubahan di repository — bukan lewat konsol ini.
        </p>
      </PlatformCard>
    </>
  );
}
