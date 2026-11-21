import Link from "next/link";

import { KELUARGA_RESOURCE } from "@/features/keluarga/domain/keluarga";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { verifySession } from "@/lib/dal";

const links = [
  { href: "/penduduk/dashboard", label: "Dashboard", resource: PENDUDUK_RESOURCE },
  { href: "/penduduk", label: "Data Penduduk", resource: PENDUDUK_RESOURCE },
  { href: "/keluarga", label: "Kartu Keluarga", resource: KELUARGA_RESOURCE },
  { href: "/mutasi-penduduk", label: "Mutasi Penduduk", resource: RESOURCES.mutasiPenduduk },
  {
    href: "/statistik/penduduk",
    label: "Statistik & Laporan",
    resource: RESOURCES.laporanPenduduk,
  },
];

export async function DataKependudukanNav({ active }: { active: string }) {
  const user = await verifySession();
  const visible = links.filter((item) => hasPermission(user.permissions, item.resource, "read"));
  return (
    <nav aria-label="Navigasi Data Kependudukan" className="data-kependudukan-nav">
      {visible.map((item) => (
        <Link
          aria-current={active === item.href ? "page" : undefined}
          className={active === item.href ? "is-active" : ""}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
