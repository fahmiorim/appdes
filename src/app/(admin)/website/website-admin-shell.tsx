import Link from "next/link";
import type { ReactNode } from "react";

const tabs = [
  { href: "/website", label: "Dashboard Website" },
  { href: "/website/pengaturan", label: "Pengaturan Website" },
  { href: "/website/halaman", label: "Halaman & Navigasi" },
  { href: "/website/konten", label: "Konten & Publikasi" },
  { href: "/website/dokumen", label: "Dokumen Publik" },
] as const;

export function WebsiteAdminShell({
  title, description, active, children, action,
}: {
  title: string;
  description: string;
  active: (typeof tabs)[number]["href"];
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="modul-page website-admin-page">
      <div className="page-heading website-admin-heading">
        <div><span className="eyebrow">Website Desa</span><h1>{title}</h1><p>{description}</p></div>
        {action ? <div className="website-admin-actions">{action}</div> : null}
      </div>
      <nav className="website-admin-tabs" aria-label="Menu Website Desa">
        {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={active === tab.href ? "page" : undefined}>{tab.label}</Link>)}
      </nav>
      {children}
    </div>
  );
}

export function WebsiteMetric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <article className="website-metric"><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}

export function WebsiteSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="modul-card website-section"><div className="website-section-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}