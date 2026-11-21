import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { domainDnsChecks } from "@/db/schema";
import type { DataDns } from "@/features/multi-desa/domain/status-dns";

export interface HasilDnsRow extends DataDns {
  domainId: number;
  checkedAt: Date;
}

/** Seluruh cache DNS; hanya dipakai konsol platform. */
export async function listHasilDns(): Promise<HasilDnsRow[]> {
  return db
    .select({
      domainId: domainDnsChecks.domainId,
      status: domainDnsChecks.status,
      addresses: domainDnsChecks.addresses,
      error: domainDnsChecks.error,
      checkedAt: domainDnsChecks.checkedAt,
    })
    .from(domainDnsChecks)
    .orderBy(asc(domainDnsChecks.domainId))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        addresses: row.addresses
          ? row.addresses
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      })),
    );
}

/** Hasil DNS terakhir untuk satu domain, tanpa memuat cache domain lain. */
export async function getHasilDns(domainId: number): Promise<HasilDnsRow | null> {
  const [row] = await db
    .select({
      domainId: domainDnsChecks.domainId,
      status: domainDnsChecks.status,
      addresses: domainDnsChecks.addresses,
      error: domainDnsChecks.error,
      checkedAt: domainDnsChecks.checkedAt,
    })
    .from(domainDnsChecks)
    .where(eq(domainDnsChecks.domainId, domainId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    addresses: row.addresses
      ? row.addresses
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

/** Simpan hasil DNS terakhir untuk satu domain. */
export async function simpanHasilDns(domainId: number, hasil: DataDns): Promise<void> {
  const nilai = {
    domainId,
    status: hasil.status,
    addresses: hasil.addresses.join("\n").slice(0, 4000),
    error: hasil.error?.slice(0, 255) ?? null,
    checkedAt: hasil.checkedAt ?? new Date(),
  };

  await db
    .insert(domainDnsChecks)
    .values(nilai)
    .onDuplicateKeyUpdate({
      set: {
        status: nilai.status,
        addresses: nilai.addresses,
        error: nilai.error,
        checkedAt: nilai.checkedAt,
      },
    });
}
