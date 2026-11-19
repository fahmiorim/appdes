import Link from "next/link";

const links = [
  { href: "/penduduk/dashboard", label: "Dashboard" },
  { href: "/penduduk", label: "Data Penduduk" },
  { href: "/keluarga", label: "Kartu Keluarga" },
  { href: "/mutasi-penduduk", label: "Mutasi Penduduk" },
  { href: "/statistik/penduduk", label: "Statistik & Laporan" },
];

export function DataKependudukanNav({ active }: { active: string }) {
  return (
    <nav aria-label="Navigasi Data Kependudukan" className="data-kependudukan-nav">
      {links.map((item) => (
        <Link aria-current={active === item.href ? "page" : undefined}
          className={active === item.href ? "is-active" : ""} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
