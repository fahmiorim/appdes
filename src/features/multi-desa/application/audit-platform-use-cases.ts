import "server-only";

import {
  listAuditLogsLintasDesa,
  type AuditLogPlatformPage,
  type AuditLogPlatformRow,
} from "@/features/audit/infrastructure/audit-repository";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";

/** Batas panjang kata kunci pencarian audit agar query tetap ringan. */
const PANJANG_MAKS_PENCARIAN = 120;

/** Batas baris ekspor audit agar unduhan tetap dapat diselesaikan. */
export const BATAS_EKSPOR_AUDIT = 5000;

export interface FilterAuditPlatform {
  page?: unknown;
  search?: unknown;
  /** Id desa dari query string; kosong berarti semua desa. */
  desa?: unknown;
  /** Kode peristiwa; kosong berarti semua peristiwa. */
  event?: unknown;
}

function nomorHalaman(nilai: unknown): number {
  const angka = Number.parseInt(String(nilai ?? "1"), 10);
  return Number.isFinite(angka) && angka > 0 ? angka : 1;
}

function kataKunci(nilai: unknown): string | undefined {
  if (typeof nilai !== "string") return undefined;
  const bersih = nilai.trim().slice(0, PANJANG_MAKS_PENCARIAN);
  return bersih === "" ? undefined : bersih;
}

function idDesa(nilai: unknown): number | undefined {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  if (!/^\d{1,9}$/.test(teks)) return undefined;

  const angka = Number.parseInt(teks, 10);
  return angka > 0 ? angka : undefined;
}

function kodePeristiwa(nilai: unknown): string | undefined {
  if (typeof nilai !== "string") return undefined;
  const bersih = nilai.trim().slice(0, 80);
  return /^[a-z0-9._-]+$/.test(bersih) ? bersih : undefined;
}

function filterDari(input: FilterAuditPlatform) {
  return {
    search: kataKunci(input.search),
    villageId: idDesa(input.desa),
    event: kodePeristiwa(input.event),
  };
}

/**
 * Audit trail lintas tenant untuk konsol platform.
 *
 * Hanya pengelola platform yang boleh membaca; administrator desa tidak pernah
 * mendapat data desa lain lewat jalur ini. Filter berasal dari query string dan
 * dinormalisasi di sini, bukan dipercaya apa adanya.
 */
export async function ambilAuditPlatform(
  input: FilterAuditPlatform,
): Promise<AuditLogPlatformPage> {
  await requireSuperAdmin();

  return listAuditLogsLintasDesa({
    ...filterDari(input),
    page: nomorHalaman(input.page),
    pageSize: 25,
  });
}

/**
 * Ambil seluruh baris audit yang cocok untuk diekspor, dibatasi
 * `BATAS_EKSPOR_AUDIT` baris agar satu permintaan tidak menarik data tanpa
 * batas.
 */
export async function eksporAuditPlatform(input: FilterAuditPlatform): Promise<{
  rows: AuditLogPlatformRow[];
  terpotong: boolean;
}> {
  await requireSuperAdmin();

  const filter = filterDari(input);
  const rows: AuditLogPlatformRow[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const hasil = await listAuditLogsLintasDesa({
      ...filter,
      page,
      pageSize: 100,
    });
    rows.push(...hasil.rows);
    pageCount = hasil.pageCount;
    page += 1;
  } while (page <= pageCount && rows.length < BATAS_EKSPOR_AUDIT);

  if (rows.length > BATAS_EKSPOR_AUDIT) {
    return { rows: rows.slice(0, BATAS_EKSPOR_AUDIT), terpotong: true };
  }

  return { rows, terpotong: false };
}
