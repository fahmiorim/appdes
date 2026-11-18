import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { StatIcon } from "@/components/ui/stat-icon";

/**
 * Kerangka visual konsol platform.
 *
 * Judul halaman tidak lagi dirender di dalam konten: identitas halaman tampil
 * di top bar (`PlatformTopbarHead`) agar konten tidak terdorong ke bawah.
 * Navigasi antarhalaman cukup lewat sidebar platform. Komponen di sini murni
 * presentasi: otorisasi dan pengambilan data tetap di halaman/use case.
 */

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

export function PlatformStat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card>
      <StatIcon>{icon}</StatIcon>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-note">{note}</div>
    </Card>
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
