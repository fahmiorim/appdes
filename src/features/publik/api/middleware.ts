import "server-only";

/**
 * Resolver tenant untuk API publik.
 *
 * Alias ini sengaja memakai resolver yang sama dengan halaman publik agar
 * aturan domain, wildcard, dan fallback satu-desa tidak berbeda antar jalur.
 */
export { getIdentitasFromRequest as getTenantFromRequest } from "@/features/desa/application/resolve-village";
