import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AUDIT_EVENT_LABELS, type AuditEvent } from "@/features/audit/domain/audit";
import type { DetailDomainPlatform } from "@/features/multi-desa/application/pemantauan-domain-use-cases";
import { klasifikasiJenisDomain } from "@/features/multi-desa/domain/jenis-domain";
import { LABEL_STATUS_DNS, type DataDns } from "@/features/multi-desa/domain/status-dns";
import {
  hariMenujuKedaluwarsaSsl,
  LABEL_STATUS_SSL,
  type DataSsl,
} from "@/features/multi-desa/domain/status-ssl";
import type { DomainDesaRow } from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import type { ActionState } from "@/lib/action-state";

import { DetailDomainNetworkActions } from "./detail-domain-network-actions";
import { PlatformCard, PlatformEmpty } from "./platform-ui";

export type TabDetailDomain = "informasi" | "dns" | "ssl" | "redirect" | "verifikasi" | "riwayat";

export interface RiwayatDomainRow {
  id: number;
  event: string;
  actorName: string | null;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: Date;
}

const TAB: readonly { id: TabDetailDomain; label: string }[] = [
  { id: "informasi", label: "Informasi & Overview" },
  { id: "dns", label: "DNS Records" },
  { id: "ssl", label: "SSL & Keamanan" },
  { id: "redirect", label: "Redirect & Alias" },
  { id: "verifikasi", label: "Verifikasi Domain" },
  { id: "riwayat", label: "Riwayat Perubahan" },
];

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const tanggalWaktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;

  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || segment.includes(".."))
  ) {
    return null;
  }

  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function tanggalAtau(nilai: Date | null | undefined, kosong = "Belum tersedia"): string {
  return nilai ? tanggal.format(nilai) : kosong;
}

function tanggalWaktuAtau(nilai: Date | null | undefined, kosong = "Belum diperiksa"): string {
  return nilai ? tanggalWaktu.format(nilai) : kosong;
}

function labelPeristiwa(event: string): string {
  return event in AUDIT_EVENT_LABELS ? AUDIT_EVENT_LABELS[event as AuditEvent] : event;
}

function detailPeristiwa(row: RiwayatDomainRow): string {
  if (row.details) {
    try {
      const parsed = JSON.parse(row.details) as Record<string, unknown>;
      const domain = parsed.domain;
      const aksi = parsed.aksi;
      if (typeof domain === "string") {
        return [typeof aksi === "string" ? aksi : null, domain].filter(Boolean).join(" · ");
      }
    } catch {
      // Detail audit bukan JSON yang dapat dibaca; jatuh ke resource di bawah.
    }
  }

  return [row.resource, row.resourceId].filter(Boolean).join(" · ") || "—";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return <span className={`domain-badge is-${tone}`}>{children}</span>;
}

function Tabs({
  domainId,
  tab,
  jumlahDns,
  jumlahAlias,
  jumlahRiwayat,
}: {
  domainId: number;
  tab: TabDetailDomain;
  jumlahDns: number;
  jumlahAlias: number;
  jumlahRiwayat: number;
}) {
  const jumlah: Partial<Record<TabDetailDomain, number>> = {
    dns: jumlahDns,
    redirect: jumlahAlias,
    riwayat: jumlahRiwayat,
  };

  return (
    <nav aria-label="Bagian detail domain" className="domain-detail-tabs">
      {TAB.map((item) => {
        const href =
          item.id === "informasi"
            ? `/super-admin/domain/${domainId}`
            : `/super-admin/domain/${domainId}?tab=${item.id}`;
        const aktif = item.id === tab;
        const total = jumlah[item.id];

        return (
          <Link
            aria-current={aktif ? "page" : undefined}
            className={`domain-detail-tab${aktif ? " is-active" : ""}`}
            href={href}
            key={item.id}
          >
            <span>{item.label}</span>
            {typeof total === "number" && total > 0 ? (
              <span className="domain-detail-tab-count">{total}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusDomainCard({ data }: { data: DetailDomainPlatform }) {
  const domainUtama = data.aliases.find((item) => item.isPrimary)?.domain ?? data.domain.domain;
  const jenis = data.domain.isPrimary ? "Domain utama" : "Alias";
  const pemeriksaan = [data.dns.checkedAt, data.ssl.checkedAt]
    .filter((nilai): nilai is Date => nilai instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <PlatformCard title="Status Domain">
      <dl className="domain-detail-kv">
        <div>
          <dt>Status tenant</dt>
          <dd>
            <Badge tone={data.desa.active ? "success" : "danger"}>
              {data.desa.active ? "Aktif" : "Nonaktif"}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Peran domain</dt>
          <dd>
            <Badge tone={data.domain.isPrimary ? "info" : "neutral"}>{jenis}</Badge>
          </dd>
        </div>
        <div>
          <dt>Domain utama</dt>
          <dd>
            <a
              className="domain-detail-link"
              href={`https://${domainUtama}`}
              rel="noreferrer"
              target="_blank"
            >
              {domainUtama}
              <span aria-hidden="true">↗</span>
            </a>
          </dd>
        </div>
        <div>
          <dt>Akses website</dt>
          <dd>
            <a
              className="domain-detail-link"
              href={`https://${data.domain.domain}`}
              rel="noreferrer"
              target="_blank"
            >
              Buka Website
              <span aria-hidden="true">↗</span>
            </a>
          </dd>
        </div>
        <div>
          <dt>Dibuat</dt>
          <dd>{tanggalWaktuAtau(data.domain.createdAt)}</dd>
        </div>
        <div>
          <dt>Pemeriksaan terakhir</dt>
          <dd>{tanggalWaktuAtau(pemeriksaan)}</dd>
        </div>
      </dl>
    </PlatformCard>
  );
}

function StatusSslCard({ ssl }: { ssl: DataSsl }) {
  const hari = hariMenujuKedaluwarsaSsl(ssl.validTo);
  const tone =
    ssl.status === "aktif"
      ? "success"
      : ssl.status === "segera-expired"
        ? "warning"
        : ssl.status === "bermasalah"
          ? "danger"
          : "neutral";

  return (
    <PlatformCard
      actions={
        <Link className="platform-card-link" href="?tab=ssl">
          Detail →
        </Link>
      }
      title="Status SSL"
    >
      <dl className="domain-detail-kv">
        <div>
          <dt>Status</dt>
          <dd>
            <Badge tone={tone}>{LABEL_STATUS_SSL[ssl.status]}</Badge>
          </dd>
        </div>
        <div>
          <dt>Masa berlaku</dt>
          <dd>
            {ssl.validTo ? (
              <>
                {tanggalAtau(ssl.validTo)}
                {hari !== null ? <span className="domain-detail-muted"> ({hari} hari)</span> : null}
              </>
            ) : (
              "Belum terbaca"
            )}
          </dd>
        </div>
        <div>
          <dt>Penerbit</dt>
          <dd>{ssl.issuer ?? "Belum terbaca"}</dd>
        </div>
        <div>
          <dt>Auto renew</dt>
          <dd className="domain-detail-muted">Tidak dikelola aplikasi</dd>
        </div>
        <div>
          <dt>Diperiksa</dt>
          <dd>{tanggalWaktuAtau(ssl.checkedAt)}</dd>
        </div>
      </dl>
      {ssl.error ? (
        <p className="domain-detail-alert" role="status">
          {ssl.error}
        </p>
      ) : null}
      <p className="domain-detail-note">
        Aplikasi hanya memeriksa sertifikat yang sudah terpasang. Penerbitan dan perpanjangan
        sertifikat tetap dilakukan di server/reverse proxy.
      </p>
    </PlatformCard>
  );
}

function PreviewCard({ data }: { data: DetailDomainPlatform }) {
  const logo = mediaUrl(data.desa.logo, data.desa.id);
  const lokasi = [data.desa.district, data.desa.regency, data.desa.province]
    .filter(Boolean)
    .join(", ");
  const inisial = (data.desa.name ?? "Desa").trim().charAt(0).toUpperCase();

  return (
    <PlatformCard
      actions={
        <a
          className="platform-card-link"
          href={`https://${data.domain.domain}`}
          rel="noreferrer"
          target="_blank"
        >
          Buka Website →
        </a>
      }
      title="Pratinjau Website"
    >
      <div className="domain-site-preview">
        <div className="domain-site-browser">
          <span aria-hidden="true" className="domain-site-dots">
            <i />
            <i />
            <i />
          </span>
          <span>{data.domain.domain}</span>
        </div>
        <div className="domain-site-hero">
          <span className="domain-site-eyebrow">Website Resmi Desa</span>
          <div className="domain-site-title">
            {logo ? (
              <Image alt="" height={44} src={logo} unoptimized width={44} />
            ) : (
              <span aria-hidden="true" className="domain-site-logo">
                {inisial}
              </span>
            )}
            <div>
              <h3>{data.desa.name ?? `Desa #${data.desa.id}`}</h3>
              <p>{lokasi || "Wilayah desa belum diisi"}</p>
            </div>
          </div>
          <span className="domain-site-cta">Lihat Profil Desa →</span>
        </div>
        <dl className="domain-site-meta">
          <div>
            <dt>Domain</dt>
            <dd>{data.domain.domain}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{data.desa.active ? "Aktif" : "Nonaktif"}</dd>
          </div>
          <div>
            <dt>SSL</dt>
            <dd>{LABEL_STATUS_SSL[data.ssl.status]}</dd>
          </div>
        </dl>
      </div>
      <p className="domain-detail-note">
        Pratinjau disusun dari identitas tenant dan domain aktif, bukan tangkapan layar situs.
      </p>
    </PlatformCard>
  );
}

function DnsRecords({ dns, ringkas = false }: { dns: DataDns; ringkas?: boolean }) {
  const records = dns.addresses.map((address, index) => ({
    key: `${address}-${index}`,
    tipe: address.includes(":") ? "AAAA" : "A",
    host: "@",
    nilai: address,
  }));

  if (records.length === 0) {
    return (
      <PlatformEmpty
        description={
          dns.error ??
          "Jalankan Cek DNS untuk menyimpan alamat hasil resolusi. Tidak ada alamat contoh yang ditampilkan."
        }
        title="Belum ada record tersimpan"
      />
    );
  }

  return (
    <div className="domain-detail-table-wrap">
      <table className="tenant-table domain-record-table">
        <thead>
          <tr>
            <th>Tipe</th>
            <th>Nama Host</th>
            <th>Nilai / Tujuan</th>
            {ringkas ? null : <th>TTL</th>}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.key}>
              <td>
                <Badge tone="info">{record.tipe}</Badge>
              </td>
              <td>{record.host}</td>
              <td className="domain-record-value">{record.nilai}</td>
              {ringkas ? null : <td className="domain-detail-muted">Tidak disimpan</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DnsOverviewCard({ dns }: { dns: DataDns }) {
  return (
    <PlatformCard
      actions={
        <Link className="platform-card-link" href="?tab=dns">
          Detail DNS →
        </Link>
      }
      title="DNS Records"
    >
      <div className="domain-detail-card-toolbar">
        <Badge
          tone={
            dns.status === "normal" ? "success" : dns.status === "bermasalah" ? "danger" : "neutral"
          }
        >
          {LABEL_STATUS_DNS[dns.status]}
        </Badge>
        <span className="domain-detail-muted">
          {dns.addresses.length > 0 ? `${dns.addresses.length} alamat tersimpan` : "Belum ada data"}
        </span>
      </div>
      <DnsRecords dns={dns} ringkas />
      <p className="domain-detail-note">
        Cache pemeriksaan menyimpan alamat A/AAAA. Record CNAME/TXT/MX dan TTL belum disimpan.
      </p>
    </PlatformCard>
  );
}

function RingkasanTeknisCard({ dns }: { dns: DataDns }) {
  const alamat =
    dns.addresses.length === 0
      ? "Belum diperiksa"
      : dns.addresses.length === 1
        ? dns.addresses[0]
        : `${dns.addresses[0]} +${dns.addresses.length - 1}`;

  return (
    <PlatformCard title="Ringkasan Teknis">
      <dl className="domain-detail-kv is-compact">
        <div>
          <dt>Arahkan ke (IP)</dt>
          <dd className="domain-detail-mono">{alamat}</dd>
        </div>
        <div>
          <dt>Web server</dt>
          <dd className="domain-detail-muted">Tidak tersedia</dd>
        </div>
        <div>
          <dt>Status DNS</dt>
          <dd>
            <Badge
              tone={
                dns.status === "normal"
                  ? "success"
                  : dns.status === "bermasalah"
                    ? "danger"
                    : "neutral"
              }
            >
              {LABEL_STATUS_DNS[dns.status]}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Propagasi DNS</dt>
          <dd className="domain-detail-muted">Tidak diukur</dd>
        </div>
        <div>
          <dt>Masa respons</dt>
          <dd className="domain-detail-muted">Tidak diukur</dd>
        </div>
      </dl>
    </PlatformCard>
  );
}

function PengaturanCard({ data }: { data: DetailDomainPlatform }) {
  const domainUtama = data.aliases.find((item) => item.isPrimary)?.domain ?? data.domain.domain;

  return (
    <PlatformCard title="Pengaturan Domain">
      <ul className="domain-setting-list">
        <li>
          <div>
            <strong>Domain utama</strong>
            <span>{domainUtama}</span>
          </div>
          {data.domain.isPrimary ? (
            <Badge tone="success">Aktif</Badge>
          ) : (
            <Badge tone="neutral">Diatur di Konsol Tenant</Badge>
          )}
        </li>
        <li>
          <div>
            <strong>Redirect ke HTTPS</strong>
            <span>Belum tersedia sebagai pengaturan konsol.</span>
          </div>
          <Badge tone="neutral">Belum tersedia</Badge>
        </li>
        <li>
          <div>
            <strong>WWW → Non-WWW</strong>
            <span>Belum tersedia sebagai pengaturan konsol.</span>
          </div>
          <Badge tone="neutral">Belum tersedia</Badge>
        </li>
        <li>
          <div>
            <strong>Akses maintenance</strong>
            <span>Belum tersedia sebagai pengaturan domain.</span>
          </div>
          <Badge tone="neutral">Belum tersedia</Badge>
        </li>
      </ul>
      <p className="domain-detail-note">
        Pengaturan domain utama dan alias dikelola dari Konsol Tenant. Toggle redirect dan
        maintenance belum disimpan oleh aplikasi.
      </p>
    </PlatformCard>
  );
}

function RiwayatTable({ rows }: { rows: readonly RiwayatDomainRow[] }) {
  if (rows.length === 0) {
    return (
      <PlatformEmpty
        description="Belum ada peristiwa audit tenant yang tercatat untuk domain ini."
        title="Riwayat masih kosong"
      />
    );
  }

  return (
    <div className="domain-detail-table-wrap">
      <table className="tenant-table domain-history-table">
        <thead>
          <tr>
            <th>Tanggal &amp; Waktu</th>
            <th>Aktivitas</th>
            <th>Detail</th>
            <th>Oleh</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{tanggalWaktu.format(row.createdAt)}</td>
              <td>
                <Badge tone="info">{labelPeristiwa(row.event)}</Badge>
              </td>
              <td>{detailPeristiwa(row)}</td>
              <td>{row.actorName ?? "Sistem"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiwayatOverviewCard({
  rows,
  total,
}: {
  rows: readonly RiwayatDomainRow[];
  total: number;
}) {
  return (
    <PlatformCard
      actions={
        <Link className="platform-card-link" href="?tab=riwayat">
          Lihat semua ({total}) →
        </Link>
      }
      title="Riwayat Perubahan Terbaru"
    >
      <RiwayatTable rows={rows.slice(0, 5)} />
    </PlatformCard>
  );
}

function InformasiOverview({
  data,
  riwayat,
  totalRiwayat,
}: {
  data: DetailDomainPlatform;
  riwayat: readonly RiwayatDomainRow[];
  totalRiwayat: number;
}) {
  return (
    <div className="domain-detail-grid">
      <div className="domain-detail-column">
        <StatusDomainCard data={data} />
        <StatusSslCard ssl={data.ssl} />
      </div>
      <div className="domain-detail-column is-wide">
        <PreviewCard data={data} />
        <DnsOverviewCard dns={data.dns} />
        <RiwayatOverviewCard rows={riwayat} total={totalRiwayat} />
      </div>
      <div className="domain-detail-column">
        <RingkasanTeknisCard dns={data.dns} />
        <PengaturanCard data={data} />
      </div>
    </div>
  );
}

function TabDns({ data }: { data: DetailDomainPlatform }) {
  return (
    <div className="domain-detail-tab-layout">
      <PlatformCard
        actions={
          <Badge
            tone={
              data.dns.status === "normal"
                ? "success"
                : data.dns.status === "bermasalah"
                  ? "danger"
                  : "neutral"
            }
          >
            {LABEL_STATUS_DNS[data.dns.status]}
          </Badge>
        }
        title="DNS Records"
      >
        <DnsRecords dns={data.dns} />
        <p className="domain-detail-note">
          Sumber data adalah cache pemeriksaan DNS terakhir. Pemeriksa menyimpan alamat A/AAAA saja;
          TTL, CNAME, TXT, MX, dan record lain belum diambil.
        </p>
        {data.dns.error ? (
          <p className="domain-detail-alert" role="status">
            {data.dns.error}
          </p>
        ) : null}
      </PlatformCard>
      <RingkasanTeknisCard dns={data.dns} />
    </div>
  );
}

function TabSsl({ data }: { data: DetailDomainPlatform }) {
  return (
    <div className="domain-detail-tab-layout">
      <StatusSslCard ssl={data.ssl} />
      <PlatformCard title="Yang diperiksa">
        <dl className="domain-detail-kv is-compact">
          <div>
            <dt>Valid dari</dt>
            <dd>{tanggalAtau(data.ssl.validFrom)}</dd>
          </div>
          <div>
            <dt>Valid sampai</dt>
            <dd>{tanggalAtau(data.ssl.validTo)}</dd>
          </div>
          <div>
            <dt>Penerbit</dt>
            <dd>{data.ssl.issuer ?? "Belum terbaca"}</dd>
          </div>
          <div>
            <dt>Pemeriksaan</dt>
            <dd>{tanggalWaktuAtau(data.ssl.checkedAt)}</dd>
          </div>
        </dl>
        <p className="domain-detail-note">
          Pemeriksaan TLS memakai handshake dengan verifikasi sertifikat. Aplikasi tidak mematikan
          verifikasi TLS dan tidak menerbitkan sertifikat.
        </p>
      </PlatformCard>
    </div>
  );
}

function DaftarAlias({
  aliases,
  domainId,
}: {
  aliases: readonly DomainDesaRow[];
  domainId: number;
}) {
  return (
    <div className="domain-detail-table-wrap">
      <table className="tenant-table domain-alias-table">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Peran</th>
            <th>Ditambahkan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {aliases.map((alias) => (
            <tr key={alias.id}>
              <td>
                <a
                  className="domain-detail-link"
                  href={`https://${alias.domain}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {alias.domain}
                  <span aria-hidden="true">↗</span>
                </a>
              </td>
              <td>
                <Badge tone={alias.isPrimary ? "success" : "neutral"}>
                  {alias.isPrimary ? "Utama" : "Alias"}
                </Badge>
              </td>
              <td>{tanggalAtau(alias.createdAt)}</td>
              <td>
                {alias.id === domainId ? (
                  <span className="domain-detail-muted">Sedang dilihat</span>
                ) : alias.isPrimary ? (
                  <span className="domain-detail-muted">—</span>
                ) : (
                  <Link className="domain-detail-link" href={`/super-admin/domain/${alias.id}`}>
                    Lihat detail
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabRedirect({ data }: { data: DetailDomainPlatform }) {
  return (
    <div className="domain-detail-tab-layout is-single">
      <PlatformCard
        actions={
          <Link className="button button-secondary" href="/super-admin/domain/tambah">
            Tambah Domain
          </Link>
        }
        title={`Domain & Alias (${data.aliases.length})`}
      >
        <DaftarAlias aliases={data.aliases} domainId={data.domain.id} />
        <p className="domain-detail-note">
          Semua host di atas milik tenant yang sama. Perubahan domain utama dan penghapusan alias
          dilakukan dari Konsol Tenant. Redirect HTTPS, WWW, dan maintenance belum tersedia sebagai
          pengaturan konsol.
        </p>
      </PlatformCard>
    </div>
  );
}

function TabVerifikasi({ data }: { data: DetailDomainPlatform }) {
  const dnsSiap = data.dns.status === "normal";
  const sslSiap = data.ssl.status === "aktif" || data.ssl.status === "segera-expired";

  return (
    <div className="domain-detail-tab-layout is-single">
      <PlatformCard title="Verifikasi Domain">
        <p className="domain-detail-lead">
          Verifikasi kepemilikan domain belum diimplementasikan. Pemeriksaan DNS hanya memastikan
          host mengarah ke alamat publik; pemeriksaan itu tidak membuktikan kontrol atas domain.
        </p>
        <ul className="domain-check-list">
          <li>
            <span className={`domain-check-icon${dnsSiap ? " is-done" : ""}`} aria-hidden="true">
              {dnsSiap ? "✓" : "!"}
            </span>
            <div>
              <strong>DNS mengarah ke alamat publik</strong>
              <span>{dnsSiap ? "Terpenuhi berdasarkan cache DNS." : "Belum terpenuhi."}</span>
            </div>
            <Badge tone={dnsSiap ? "success" : "warning"}>
              {dnsSiap ? "Terpenuhi" : "Perlu dicek"}
            </Badge>
          </li>
          <li>
            <span className={`domain-check-icon${sslSiap ? " is-done" : ""}`} aria-hidden="true">
              {sslSiap ? "✓" : "!"}
            </span>
            <div>
              <strong>Sertifikat TLS dapat diverifikasi</strong>
              <span>
                {sslSiap ? "Sertifikat terbaca dari handshake nyata." : "Belum terpenuhi."}
              </span>
            </div>
            <Badge tone={sslSiap ? "success" : "warning"}>
              {sslSiap ? "Terpenuhi" : "Perlu dicek"}
            </Badge>
          </li>
          <li>
            <span className="domain-check-icon" aria-hidden="true">
              ×
            </span>
            <div>
              <strong>Challenge kepemilikan domain</strong>
              <span>Belum ada record TXT atau endpoint HTTP challenge yang dikelola aplikasi.</span>
            </div>
            <Badge tone="neutral">Belum tersedia</Badge>
          </li>
        </ul>
        <p className="domain-detail-note">
          Jangan menampilkan status “terverifikasi” sebelum mekanisme challenge dan pencatatan
          hasilnya benar-benar tersedia.
        </p>
      </PlatformCard>
    </div>
  );
}

function TabRiwayat({
  rows,
  total,
  villageId,
}: {
  rows: readonly RiwayatDomainRow[];
  total: number;
  villageId: number;
}) {
  return (
    <div className="domain-detail-tab-layout is-single">
      <PlatformCard
        actions={
          <Link className="button button-secondary" href={`/super-admin/audit?desa=${villageId}`}>
            Buka audit trail
          </Link>
        }
        description={`${total} peristiwa tenant terbaru. Tabel ini memuat peristiwa tenant, bukan hanya perubahan domain.`}
        title="Riwayat Perubahan"
      >
        <RiwayatTable rows={rows} />
      </PlatformCard>
    </div>
  );
}

export function DetailDomainView({
  data,
  tab,
  riwayat,
  totalRiwayat,
  aksiDns,
  aksiSsl,
  baseDomain,
}: {
  data: DetailDomainPlatform;
  tab: TabDetailDomain;
  riwayat: readonly RiwayatDomainRow[];
  totalRiwayat: number;
  aksiDns: (domainId: number) => Promise<ActionState<DataDns>>;
  aksiSsl: (domainId: number) => Promise<ActionState<DataSsl>>;
  baseDomain: string;
}) {
  const lokasi = [data.desa.district, data.desa.regency].filter(Boolean).join(", ");
  const domainUtama = data.aliases.find((item) => item.isPrimary)?.domain ?? data.domain.domain;
  const judul = data.desa.name ?? `Desa #${data.desa.id}`;
  const jenisDomain = klasifikasiJenisDomain(data.domain.domain, baseDomain, data.desa.slug);

  return (
    <>
      <div className="platform-page-header domain-detail-page-header">
        <div className="platform-page-heading">
          <Link
            aria-label="Kembali ke daftar domain"
            className="platform-page-back"
            href="/super-admin/domain"
          >
            ←
          </Link>
          <div>
            <h1>Detail Domain — {judul}</h1>
            <p>Informasi dan pengaturan domain, DNS, SSL, serta riwayat perubahan.</p>
          </div>
        </div>
        <div className="platform-page-actions domain-detail-actions">
          <a
            className="button button-secondary"
            href={`https://${data.domain.domain}`}
            rel="noreferrer"
            target="_blank"
          >
            <span aria-hidden="true">↗</span> Buka Website
          </a>
          <DetailDomainNetworkActions
            aksiDns={aksiDns}
            aksiSsl={aksiSsl}
            domainId={data.domain.id}
          />
          <details className="domain-more">
            <summary className="button button-primary">••• Aksi Lainnya</summary>
            <div className="domain-more-menu">
              <Link href={`/super-admin/tenant?q=${encodeURIComponent(judul)}`}>Kelola tenant</Link>
              <Link href="/super-admin/domain">Kembali ke daftar domain</Link>
            </div>
          </details>
        </div>
      </div>

      <section aria-labelledby="identitas-domain" className="domain-detail-hero">
        <div className="domain-detail-identity">
          {mediaUrl(data.desa.logo, data.desa.id) ? (
            <Image
              alt=""
              className="domain-detail-logo"
              height={64}
              src={mediaUrl(data.desa.logo, data.desa.id) ?? "/images/logo.png"}
              unoptimized
              width={64}
            />
          ) : (
            <span aria-hidden="true" className="domain-detail-logo is-fallback">
              {judul.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <span className="domain-detail-eyebrow">Tenant desa</span>
            <h2 id="identitas-domain">{judul}</h2>
            <p>{lokasi || "Wilayah desa belum diisi"}</p>
            <p className="domain-detail-muted">
              Tenant #{data.desa.id}
              {data.desa.code ? ` · Kode desa ${data.desa.code}` : ""}
            </p>
            <p className="domain-detail-current">
              <span className="domain-detail-mono">{data.domain.domain}</span>
              <Badge tone={data.domain.isPrimary ? "success" : "info"}>
                {data.domain.isPrimary ? "Utama" : "Alias"}
              </Badge>
            </p>
          </div>
        </div>
        <dl className="domain-detail-hero-facts">
          <div>
            <dt>Domain utama</dt>
            <dd>
              <a
                className="domain-detail-link"
                href={`https://${domainUtama}`}
                rel="noreferrer"
                target="_blank"
              >
                {domainUtama}
                <span aria-hidden="true">↗</span>
              </a>
            </dd>
          </div>
          <div>
            <dt>Jenis domain</dt>
            <dd>
              <Badge tone="info">{jenisDomain === "subdomain" ? "Subdomain" : "Custom"}</Badge>
              <span className="domain-detail-muted">
                {data.domain.isPrimary ? "Domain utama" : "Alias"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Status tenant</dt>
            <dd>
              <Badge tone={data.desa.active ? "success" : "danger"}>
                {data.desa.active ? "Aktif" : "Nonaktif"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt>SSL</dt>
            <dd>
              <Badge
                tone={
                  data.ssl.status === "aktif"
                    ? "success"
                    : data.ssl.status === "segera-expired"
                      ? "warning"
                      : data.ssl.status === "bermasalah"
                        ? "danger"
                        : "neutral"
                }
              >
                {LABEL_STATUS_SSL[data.ssl.status]}
              </Badge>
            </dd>
          </div>
        </dl>
      </section>

      <Tabs
        domainId={data.domain.id}
        jumlahAlias={data.aliases.length}
        jumlahDns={data.dns.addresses.length}
        jumlahRiwayat={totalRiwayat}
        tab={tab}
      />

      {tab === "informasi" ? (
        <InformasiOverview data={data} riwayat={riwayat} totalRiwayat={totalRiwayat} />
      ) : null}
      {tab === "dns" ? <TabDns data={data} /> : null}
      {tab === "ssl" ? <TabSsl data={data} /> : null}
      {tab === "redirect" ? <TabRedirect data={data} /> : null}
      {tab === "verifikasi" ? <TabVerifikasi data={data} /> : null}
      {tab === "riwayat" ? (
        <TabRiwayat rows={riwayat} total={totalRiwayat} villageId={data.domain.villageId} />
      ) : null}
    </>
  );
}
