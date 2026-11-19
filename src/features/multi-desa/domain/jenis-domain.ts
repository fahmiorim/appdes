/**
 * Klasifikasi jenis domain untuk tampilan.
 *
 * "Subdomain" hanya bila host merupakan `<slug>.<DESA_BASE_DOMAIN>` yang
 * dikonfigurasi platform. Selain itu dianggap "Custom". Tidak ada tebakan dari
 * pola `.id` atau jumlah titik.
 */

export type JenisDomain = "subdomain" | "custom";

export function klasifikasiJenisDomain(
  domain: string,
  baseDomain: string | null | undefined,
  slug: string | null | undefined,
): JenisDomain {
  if (!baseDomain || !slug) return "custom";

  const host = domain.trim().toLowerCase().replace(/\.$/, "");
  const base = baseDomain.trim().toLowerCase().replace(/\.$/, "").replace(/^\*\./, "");
  const label = slug.trim().toLowerCase();

  if (host === base || !host.endsWith(`.${base}`)) return "custom";
  return host.slice(0, -(base.length + 1)) === label ? "subdomain" : "custom";
}
