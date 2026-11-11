import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { families, letters, letterTypes, regions, residents } from "@/db/schema";

/** Query angka beranda publik; seluruhnya dibatasi `villageId` (tenant). */

export interface RingkasanPenduduk {
  ringkas:
    | {
        total: number;
        lakiLaki: number | string | null;
        perempuan: number | string | null;
      }
    | undefined;
  keluarga: number;
  perDusun: { dusun: string | null; total: number }[];
}

export async function queryStatistikDesa(villageId: number): Promise<RingkasanPenduduk> {
  const [rows, keluargaRows, dusunRows] = await Promise.all([
    db
      .select({
        total: count(),
        lakiLaki: sql<number>`sum(case when ${residents.gender} = 'male' then 1 else 0 end)`,
        perempuan: sql<number>`sum(case when ${residents.gender} = 'female' then 1 else 0 end)`,
      })
      .from(residents)
      .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))),
    db.select({ value: count() }).from(families).where(eq(families.villageId, villageId)),
    db
      .select({ dusun: regions.dusun, total: count() })
      .from(residents)
      .leftJoin(regions, eq(residents.regionId, regions.id))
      .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")))
      .groupBy(regions.dusun)
      .orderBy(desc(count())),
  ]);

  return {
    ringkas: rows[0],
    keluarga: keluargaRows[0]?.value ?? 0,
    perDusun: dusunRows,
  };
}

export interface BarisSuratTerbit {
  id: number;
  typeName: string | null;
  issuedAt: Date | null;
  createdAt: Date | null;
}

export async function querySuratTerbitTerbaru(
  villageId: number,
  limit = 5,
): Promise<BarisSuratTerbit[]> {
  return db
    .select({
      id: letters.id,
      typeName: letters.typeName,
      issuedAt: letters.issuedAt,
      createdAt: letters.createdAt,
    })
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .where(and(eq(letters.villageId, villageId), eq(letters.status, "issued")))
    .orderBy(desc(letters.issuedAt), desc(letters.createdAt))
    .limit(limit);
}

export async function queryJumlahSuratTerbit(villageId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(letters)
    .where(and(eq(letters.villageId, villageId), eq(letters.status, "issued")));
  return row?.value ?? 0;
}
