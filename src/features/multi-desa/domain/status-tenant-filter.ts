import type { StatusRetensi } from "./lifecycle-tenant";

/**
 * Filter status pada konsol tenant. Nilai yang dipakai di query param sama
 * dengan nilai `<option>`, sehingga tautan seperti
 * `/super-admin/tenant?status=siap-purge` langsung membuka daftar terfilter.
 */
export const STATUS_TENANT_FILTER = ["semua", "aktif", "nonaktif", "siap-purge"] as const;

export type StatusTenantFilter = (typeof STATUS_TENANT_FILTER)[number];

function dikenal(nilai: string): nilai is StatusTenantFilter {
  return (STATUS_TENANT_FILTER as readonly string[]).includes(nilai);
}

/** Nilai asing atau kosong jatuh ke `semua`, bukan menampilkan daftar kosong. */
export function parseStatusTenantFilter(nilai?: string | string[]): StatusTenantFilter {
  const tunggal = Array.isArray(nilai) ? nilai[0] : nilai;
  return tunggal && dikenal(tunggal) ? tunggal : "semua";
}

export function cocokStatusTenant(
  desa: { active: boolean; statusRetensi: StatusRetensi },
  filter: StatusTenantFilter,
): boolean {
  switch (filter) {
    case "aktif":
      return desa.active && desa.statusRetensi !== "sudah-purge";
    case "nonaktif":
      return !desa.active && desa.statusRetensi !== "sudah-purge";
    case "siap-purge":
      return desa.statusRetensi === "siap-purge";
    default:
      return true;
  }
}
