import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { domainSslChecks } from "@/db/schema";
import type { DataSsl } from "@/features/multi-desa/domain/status-ssl";

/** Hasil TLS terakhir untuk satu domain. */
export interface HasilSslRow extends DataSsl {
  domainId: number;
  checkedAt: Date;
}

/** Seluruh cache hasil pemeriksaan; hanya dipakai konsol platform. */
export async function listHasilSsl(): Promise<HasilSslRow[]> {
  return db
    .select({
      domainId: domainSslChecks.domainId,
      status: domainSslChecks.status,
      validFrom: domainSslChecks.validFrom,
      validTo: domainSslChecks.validTo,
      issuer: domainSslChecks.issuer,
      error: domainSslChecks.error,
      checkedAt: domainSslChecks.checkedAt,
    })
    .from(domainSslChecks)
    .orderBy(asc(domainSslChecks.domainId));
}

/** Hasil TLS terakhir untuk satu domain, tanpa memuat cache domain lain. */
export async function getHasilSsl(domainId: number): Promise<HasilSslRow | null> {
  const [row] = await db
    .select({
      domainId: domainSslChecks.domainId,
      status: domainSslChecks.status,
      validFrom: domainSslChecks.validFrom,
      validTo: domainSslChecks.validTo,
      issuer: domainSslChecks.issuer,
      error: domainSslChecks.error,
      checkedAt: domainSslChecks.checkedAt,
    })
    .from(domainSslChecks)
    .where(eq(domainSslChecks.domainId, domainId))
    .limit(1);

  return row ?? null;
}

/**
 * Simpan hasil terakhir untuk satu domain.
 *
 * `domainId` berasal dari daftar domain yang sudah dibaca server, bukan dari
 * input klien. Upsert menjaga satu baris per domain.
 */
export async function simpanHasilSsl(domainId: number, hasil: DataSsl): Promise<void> {
  const nilai = {
    domainId,
    status: hasil.status,
    validFrom: hasil.validFrom,
    validTo: hasil.validTo,
    issuer: hasil.issuer?.slice(0, 255) ?? null,
    error: hasil.error?.slice(0, 255) ?? null,
    checkedAt: hasil.checkedAt ?? new Date(),
  };

  await db
    .insert(domainSslChecks)
    .values(nilai)
    .onDuplicateKeyUpdate({
      set: {
        status: nilai.status,
        validFrom: nilai.validFrom,
        validTo: nilai.validTo,
        issuer: nilai.issuer,
        error: nilai.error,
        checkedAt: nilai.checkedAt,
      },
    });
}
