import type { ReactNode } from "react";

/**
 * Kerangka visual konsol platform.
 *
 * Dipakai seluruh halaman `/super-admin` agar judul, deskripsi, dan kartu
 * section memiliki ritme yang sama. Navigasi antarhalaman cukup lewat sidebar
 * platform; menampilkannya lagi di dalam halaman hanya menduplikasi menu.
 * Komponen ini murni presentasi: otorisasi dan pengambilan data tetap di
 * halaman/use case.
 */

export function PlatformPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="platform-page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="platform-head-actions">{actions}</div> : null}
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
