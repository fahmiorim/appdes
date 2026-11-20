import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ambilTemplateWebsite } from "@/features/multi-desa/application/template-website-use-cases";
import {
  LABEL_KATEGORI_TEMPLATE,
  LABEL_STATUS_TEMPLATE,
  type KategoriTemplate,
} from "@/features/multi-desa/domain/template-website";
import {
  AksiStatusTemplate,
  FormDistribusiTemplate,
} from "@/features/multi-desa/presentation/aksi-template";
import { FormTemplate } from "@/features/multi-desa/presentation/form-template";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";
import { TemplatePreview } from "@/features/multi-desa/presentation/template-preview";

import { pastikanSuperAdmin } from "../../guard";
import { distribusiTemplateAction, ubahStatusTemplateAction, ubahTemplateAction } from "../actions";

export const metadata: Metadata = {
  title: "Detail Template",
  robots: { index: false, follow: false },
};

type Tab = "konfigurasi" | "penggunaan" | "versi";
const TAB: readonly Tab[] = ["konfigurasi", "penggunaan", "versi"];

function tabDari(value: string | string[] | undefined): Tab {
  const tab = Array.isArray(value) ? value[0] : value;
  return TAB.find((item) => item === tab) ?? "konfigurasi";
}

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const angka = new Intl.NumberFormat("id-ID");

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function SuperAdminDetailTemplatePage({ params, searchParams }: Props) {
  await pastikanSuperAdmin();

  const { templateId } = await params;
  if (!/^\d{1,9}$/.test(templateId)) notFound();
  const id = Number.parseInt(templateId, 10);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [detail, query] = await Promise.all([ambilTemplateWebsite(id), searchParams]);
  if (!detail) notFound();

  const { template, versi, penggunaan } = detail;
  const tab = tabDari(query.tab);
  const penggunaanTampil = penggunaan.map((item) => ({
    villageId: item.villageId,
    namaDesa: item.namaDesa,
    domain: item.domain,
    themeNama: item.themeNama,
    versi: item.versi,
    diperbaruiPada: tanggal.format(new Date(item.diperbaruiPada)),
  }));

  return (
    <>
      <PlatformPageHeader
        actions={
          <div className="platform-row-actions">
            <Link className="button button-secondary" href="/super-admin/template">
              Katalog
            </Link>
            <Link
              className="button button-secondary"
              href={`/super-admin/template/penggunaan?template=${template.id}`}
            >
              Penggunaan
            </Link>
            <AksiStatusTemplate
              aksi={ubahStatusTemplateAction}
              id={template.id}
              status={template.status}
              versiTertinggal={template.jumlahTertinggal}
            />
          </div>
        }
        backHref="/super-admin/template"
        backLabel="Kembali ke katalog template"
        judul={template.name}
        path={`/super-admin/template/${template.id}`}
      />

      <div className="template-detail-hero">
        <div className="template-detail-preview">
          <TemplatePreview name={template.name} tokens={template.tokens} />
          <p className="form-help">
            Pratinjau komposisi dari token template. Situs publik belum memakai token ini secara
            otomatis.
          </p>
        </div>

        <section className="platform-card template-detail-meta">
          <div className="platform-card-head">
            <div>
              <h2>{template.name}</h2>
              <p>{template.description}</p>
            </div>
            <span className={`template-status is-${template.status}`}>
              {LABEL_STATUS_TEMPLATE[template.status]}
            </span>
          </div>
          <div className="platform-card-body">
            <dl className="platform-def">
              <div className="platform-def-row">
                <dt>Kategori</dt>
                <dd>
                  {LABEL_KATEGORI_TEMPLATE[template.category as KategoriTemplate] ??
                    template.category}
                </dd>
              </div>
              <div className="platform-def-row">
                <dt>Slug</dt>
                <dd>
                  <code>{template.slug}</code>
                </dd>
              </div>
              <div className="platform-def-row">
                <dt>Versi aktif</dt>
                <dd>
                  <strong>v{template.version}</strong>
                </dd>
              </div>
              <div className="platform-def-row">
                <dt>Dibuat</dt>
                <dd>{tanggal.format(new Date(template.createdAt))}</dd>
              </div>
              <div className="platform-def-row">
                <dt>Diperbarui</dt>
                <dd>{tanggal.format(new Date(template.updatedAt))}</dd>
              </div>
            </dl>

            <div className="template-tags">
              <span>
                {LABEL_KATEGORI_TEMPLATE[template.category as KategoriTemplate] ?? "Umum"}
              </span>
              {template.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </section>

        <div className="platform-stat-grid template-detail-stats">
          <PlatformStat
            icon={
              <>
                <circle cx="8.4" cy="8" r="2.8" />
                <path d="M3 19a5.4 5.4 0 0 1 10.8 0M15.8 6.2a2.8 2.8 0 0 1 0 5.4M17.4 14.2A5.4 5.4 0 0 1 21 19" />
              </>
            }
            label="Tenant memakai"
            note="Tema aktif dengan slug yang sama"
            tone="biru"
            value={angka.format(template.jumlahTenant)}
          />
          <PlatformStat
            icon={
              <>
                <path d="M6 3.8h9.2L19 7.6v12.6H6z" />
                <path d="M14.6 3.8v4h4" />
              </>
            }
            label="Versi katalog"
            note={versi.length > 0 ? `${versi.length} versi tercatat` : "Belum ada riwayat"}
            tone="ungu"
            value={`v${template.version}`}
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
            tone={template.jumlahTertinggal > 0 ? "oranye" : "hijau"}
            value={angka.format(template.jumlahTertinggal)}
          />
        </div>
      </div>

      <nav aria-label="Bagian detail template" className="template-tabs">
        <Link
          aria-current={tab === "konfigurasi" ? "page" : undefined}
          className={tab === "konfigurasi" ? "is-active" : undefined}
          href={`/super-admin/template/${template.id}?tab=konfigurasi`}
        >
          Konfigurasi
        </Link>
        <Link
          aria-current={tab === "penggunaan" ? "page" : undefined}
          className={tab === "penggunaan" ? "is-active" : undefined}
          href={`/super-admin/template/${template.id}?tab=penggunaan`}
        >
          Penggunaan ({penggunaan.length})
        </Link>
        <Link
          aria-current={tab === "versi" ? "page" : undefined}
          className={tab === "versi" ? "is-active" : undefined}
          href={`/super-admin/template/${template.id}?tab=versi`}
        >
          Versi & riwayat
        </Link>
      </nav>

      {tab === "konfigurasi" ? (
        <FormTemplate
          aksi={ubahTemplateAction}
          awal={{
            id: template.id,
            name: template.name,
            slug: template.slug,
            category: template.category,
            description: template.description,
            version: template.version,
            tags: template.tags,
            tokens: template.tokens,
          }}
          mode="ubah"
        />
      ) : null}

      {tab === "penggunaan" ? (
        <div className="platform-split">
          <PlatformCard
            description="Tenant yang memakai tema dengan slug ini. Hanya tenant pada daftar ini yang dapat menerima pembaruan."
            title="Penggunaan template"
          >
            <FormDistribusiTemplate
              aksi={distribusiTemplateAction}
              id={template.id}
              penggunaan={penggunaanTampil}
              versi={template.version}
            />
          </PlatformCard>

          <PlatformCard
            description="Versi katalog dan catatan perubahannya."
            title="Versi template"
          >
            <ol className="template-version-list">
              {versi.map((item, index) => (
                <li key={item.id}>
                  <span
                    className={index === 0 ? "template-version is-current" : "template-version"}
                  >
                    v{item.version}
                  </span>
                  <div>
                    <strong>{index === 0 ? "Versi aktif" : "Rilis sebelumnya"}</strong>
                    <p>{item.changelog}</p>
                    <small>{tanggal.format(new Date(item.createdAt))}</small>
                  </div>
                </li>
              ))}
            </ol>
          </PlatformCard>
        </div>
      ) : null}

      {tab === "versi" ? (
        <PlatformCard
          description="Snapshot token disimpan per versi. Mengubah konfigurasi tanpa menaikkan versi tidak membuat rilis baru."
          title="Riwayat versi"
        >
          <ol className="template-version-list">
            {versi.map((item, index) => (
              <li key={item.id}>
                <span className={index === 0 ? "template-version is-current" : "template-version"}>
                  v{item.version}
                </span>
                <div>
                  <strong>{item.changelog}</strong>
                  <small>{tanggal.format(new Date(item.createdAt))}</small>
                </div>
              </li>
            ))}
          </ol>
        </PlatformCard>
      ) : null}
    </>
  );
}
