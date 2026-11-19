import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { StatIcon } from "@/components/ui/stat-icon";
import { headerPlatform } from "@/features/navigation/domain/header-platform";

import type { TitikTrenTenant } from "../domain/tren-tenant";

/**
 * Kerangka visual konsol platform.
 *
 * Identitas halaman dirender sebagai header konten (`PlatformPageHeader`)
 * seperti mockup konsol, sementara top bar hanya memuat breadcrumb dan alat
 * bantu. Komponen di sini murni presentasi: otorisasi dan pengambilan data
 * tetap di halaman/use case.
 */

export function PlatformPageHeader({
  path,
  actions,
}: {
  /** Rute halaman; judul dan deskripsi diambil dari `HEADER_PLATFORM`. */
  path: string;
  /** Aksi tambahan di kanan header, mis. tombol daftar desa. */
  actions?: ReactNode;
}) {
  const { title, description, aksi } = headerPlatform(path);

  return (
    <div className="platform-page-header">
      <div className="platform-page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aksi || actions ? (
        <div className="platform-page-actions">
          {aksi ? (
            <Link className="button button-secondary" href={aksi.href}>
              {aksi.label}
            </Link>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function PlatformCard({
  title,
  description,
  actions,
  flush = false,
  children,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** `true` bila isi kartu berupa tabel penuh tanpa padding. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="platform-card">
      {title ? (
        <div className="platform-card-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={flush ? "platform-card-body is-flush" : "platform-card-body"}>{children}</div>
    </section>
  );
}

/** Tona kartu KPI mengikuti palet mockup; `ungu` adalah kartu utama. */
export type TonaStat = "ungu" | "hijau" | "oranye" | "merah" | "biru";

export function PlatformStat({
  label,
  value,
  note,
  icon,
  tone = "ungu",
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  icon: ReactNode;
  tone?: TonaStat;
}) {
  return (
    <Card className={`platform-stat is-${tone}`}>
      <div className="platform-stat-top">
        <div className="stat-card-label">{label}</div>
        <StatIcon>{icon}</StatIcon>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-note">{note}</div>
    </Card>
  );
}

/**
 * Grafik garis pertumbuhan tenant kumulatif.
 *
 * Angka berasal dari `createdAt` tenant yang sudah dimuat halaman; tidak ada
 * deret contoh. Grafik hanya memperkuat tren, sehingga ringkasan teks
 * disediakan untuk pembaca layar.
 */
export function PlatformTrend({ points }: { points: readonly TitikTrenTenant[] }) {
  const lebar = 320;
  const tinggi = 128;
  const pad = 10;
  const maksimum = Math.max(...points.map((titik) => titik.total), 1);
  const langkah = points.length > 1 ? (lebar - pad * 2) / (points.length - 1) : 0;
  const posisiX = (index: number) => pad + index * langkah;
  const posisiY = (nilai: number) => tinggi - pad - (nilai / maksimum) * (tinggi - pad * 2);

  const garis = points.map((titik, index) => `${posisiX(index)},${posisiY(titik.total)}`).join(" ");
  const area =
    points.length > 0
      ? `M ${posisiX(0)} ${tinggi - pad} L ${garis.replaceAll(" ", " L ")} L ${posisiX(
          points.length - 1,
        )} ${tinggi - pad} Z`
      : "";
  const terakhir = points[points.length - 1];

  return (
    <figure className="platform-trend">
      <svg
        aria-hidden="true"
        className="platform-trend-chart"
        preserveAspectRatio="none"
        viewBox={`0 0 ${lebar} ${tinggi}`}
      >
        <defs>
          <linearGradient id="platform-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((rasio) => (
          <line
            key={rasio}
            stroke="#e9e4f7"
            strokeDasharray="3 5"
            x1={pad}
            x2={lebar - pad}
            y1={pad + (tinggi - pad * 2) * rasio}
            y2={pad + (tinggi - pad * 2) * rasio}
          />
        ))}
        <path d={area} fill="url(#platform-trend-fill)" stroke="none" />
        <polyline
          fill="none"
          points={garis}
          stroke="#7c3aed"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.4}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((titik, index) => (
          <circle
            cx={posisiX(index)}
            cy={posisiY(titik.total)}
            fill="#fff"
            key={titik.kunci}
            r={3}
            stroke="#7c3aed"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="platform-trend-axis" aria-hidden="true">
        {points.map((titik) => (
          <span key={titik.kunci}>{titik.label}</span>
        ))}
      </div>
      <figcaption className="sr-only">
        Pertumbuhan tenant kumulatif enam bulan terakhir, berakhir{" "}
        {terakhir ? `${terakhir.total} tenant pada ${terakhir.judul}` : "tanpa data"}.
      </figcaption>
    </figure>
  );
}

export function PlatformEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="platform-empty">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function PlatformStatus({ aktif, label }: { aktif: boolean; label: string }) {
  return (
    <span className={aktif ? "tenant-status is-active" : "tenant-status is-inactive"}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
