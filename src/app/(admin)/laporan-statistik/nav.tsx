import Link from "next/link";

const links = [
  ["/laporan-statistik", "Dashboard"],
  ["/laporan-statistik/laporan-desa", "Laporan Desa"],
  ["/laporan-statistik/statistik-desa", "Statistik Desa"],
  ["/laporan-statistik/rekap-analisis", "Rekap & Analisis"],
] as const;
export function LaporanStatistikNav({ active }: { active: string }) {
  return (
    <nav className="data-report-tabs" aria-label="Navigasi Laporan dan Statistik">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={active === href ? "is-active" : ""}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
