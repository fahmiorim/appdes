import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ambilTemplateWebsite,
  daftarTemplateWebsite,
} from "@/features/multi-desa/application/template-website-use-cases";
import {
  LABEL_KATEGORI_TEMPLATE,
  LABEL_STATUS_TEMPLATE,
  type KategoriTemplate,
} from "@/features/multi-desa/domain/template-website";
import {
  PlatformCard,
  PlatformEmpty,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../../guard";

export const metadata: Metadata = {
  title: "Penggunaan Template",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");
const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

type Props = { searchParams: Promise<{ template?: string | string[] }> };

export default async function SuperAdminPenggunaanTemplatePage({ searchParams }: Props) {
  await pastikanSuperAdmin();

  const [templates, query] = await Promise.all([daftarTemplateWebsite(), searchParams]);
  const templateParam = Array.isArray(query.template) ? query.template[0] : query.template;
  const dipilih = templateParam
    ? templates.find((item) => String(item.id) === templateParam)
    : templates[0];

  if (templateParam && !dipilih) notFound();

  const detail = dipilih ? await ambilTemplateWebsite(dipilih.id) : null;
  const totalPenggunaan = templates.reduce((total, item) => total + item.jumlahTenant, 0);
  const perluPembaruan = templates.reduce((total, item) => total + item.jumlahTertinggal, 0);
  const terbit = templates.filter((item) => item.status === "published").length;
  const penggunaan = detail?.penggunaan ?? [];

  return (
    <>
      <PlatformPageHeader
        backHref="/super-admin/template"
        backLabel="Kembali ke katalog template"
        path="/super-admin/template/penggunaan"
      />

      <div className="platform-stat-grid template-stat-grid">
        <PlatformStat
          icon={
            <>
              <rect height="12" rx="1.5" width="16" x="4" y="4" />
              <path d="M4 9h16M9.4 9v7M14.6 9v7" />
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
          note="Tenant dengan tema aktif"
          tone="biru"
          value={angka.format(totalPenggunaan)}
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
        <PlatformStat
          icon={
            <>
              <path d="M6 3.8h9.2L19 7.6v12.6H6z" />
              <path d="M14.6 3.8v4h4" />
            </>
          }
          label="Template dipilih"
          note={dipilih ? `v${dipilih.version}` : "Belum ada template"}
          tone="ungu"
          value={dipilih ? dipilih.name : "—"}
        />
      </div>

      <PlatformCard
        description="Pilih template untuk melihat tenant yang memakainya dan versi tema masing-masing."
        title="Penggunaan dan pembaruan"
      >
        {templates.length > 0 ? (
          <>
            <form className="template-filter-bar" method="get">
              <label className="form-field">
                <span className="form-label">Template</span>
                <select className="form-input" defaultValue={dipilih?.id ?? ""} name="template">
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · v{item.version} · {LABEL_STATUS_TEMPLATE[item.status]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-secondary" type="submit">
                Tampilkan
              </button>
              {dipilih ? (
                <Link
                  className="button button-primary"
                  href={`/super-admin/template/${dipilih.id}?tab=penggunaan`}
                >
                  Distribusi versi
                </Link>
              ) : null}
            </form>

            {dipilih && detail ? (
              <div className="template-usage-summary">
                <div>
                  <span className={`template-status is-${dipilih.status}`}>
                    {LABEL_STATUS_TEMPLATE[dipilih.status]}
                  </span>
                  <strong>{dipilih.name}</strong>
                  <small>
                    {LABEL_KATEGORI_TEMPLATE[dipilih.category as KategoriTemplate] ??
                      dipilih.category}{" "}
                    · slug <code>{dipilih.slug}</code>
                  </small>
                </div>
                <div>
                  <strong>{angka.format(penggunaan.length)}</strong>
                  <span>tenant memakai tema ini</span>
                </div>
                <div>
                  <strong>{angka.format(dipilih.jumlahTertinggal)}</strong>
                  <span>tenant masih di versi lama</span>
                </div>
              </div>
            ) : null}

            {penggunaan.length > 0 ? (
              <div className="tenant-table-scroll">
                <table className="tenant-table">
                  <thead>
                    <tr>
                      <th scope="col">Desa</th>
                      <th scope="col">Domain</th>
                      <th scope="col">Tema</th>
                      <th scope="col">Versi</th>
                      <th scope="col">Diperbarui</th>
                      <th scope="col">
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {penggunaan.map((item) => (
                      <tr key={item.villageId}>
                        <td>
                          <strong>{item.namaDesa ?? "Tanpa nama"}</strong>
                        </td>
                        <td>
                          {item.domain ?? (
                            <span className="tenant-secondary">Belum ada domain</span>
                          )}
                        </td>
                        <td>{item.themeNama}</td>
                        <td>
                          <span
                            className={
                              item.versi === dipilih?.version
                                ? "template-version"
                                : "template-version is-warning"
                            }
                          >
                            v{item.versi}
                          </span>
                        </td>
                        <td>{tanggal.format(new Date(item.diperbaruiPada))}</td>
                        <td>
                          <Link
                            className="button button-secondary"
                            href={`/super-admin/desa/${item.villageId}`}
                          >
                            Lihat desa
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PlatformEmpty
                description="Tenant akan muncul setelah memilih tema ini sebagai tema aktif."
                title="Belum ada tenant yang memakai template ini"
              />
            )}
          </>
        ) : (
          <PlatformEmpty
            description="Tambahkan template terlebih dahulu untuk melihat penggunaan tenant."
            title="Katalog template masih kosong"
          />
        )}
      </PlatformCard>
    </>
  );
}
