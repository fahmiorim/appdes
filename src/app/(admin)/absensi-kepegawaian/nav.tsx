import Link from "next/link";

const items = [
  { href: "/absensi-kepegawaian", label: "Dashboard" },
  { href: "/absensi-kepegawaian/absensi", label: "Absensi" },
  { href: "/absensi-kepegawaian/pegawai", label: "Data Pegawai" },
  { href: "/absensi-kepegawaian/cuti-izin", label: "Cuti & Izin" },
];

export function AbsensiKepegawaianNav({ active }: { active: string }) {
  return <nav className="ak-nav" aria-label="Navigasi Absensi dan Kepegawaian">
    {items.map((item) => <Link key={item.href} href={item.href} className={active === item.href ? "active" : ""}>{item.label}</Link>)}
  </nav>;
}
