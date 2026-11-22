import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { denganKunciMysql } from "@/db/kunci-mysql";
import { keuanganBulanan } from "@/db/schema";

export interface KeuanganBulananInput {
  bulan: number;
  target: string;
  realisasi: string;
}
export interface KeuanganBulananRow {
  bulan: number;
  target: string;
  realisasi: string;
}

export async function listKeuanganBulanan(
  villageId: number,
  tahun: number,
): Promise<KeuanganBulananRow[]> {
  return db
    .select({
      bulan: keuanganBulanan.bulan,
      target: keuanganBulanan.target,
      realisasi: keuanganBulanan.realisasi,
    })
    .from(keuanganBulanan)
    .where(
      and(
        eq(keuanganBulanan.villageId, villageId),
        eq(keuanganBulanan.tahun, tahun),
        eq(keuanganBulanan.templateUuid, "5"),
      ),
    )
    .orderBy(asc(keuanganBulanan.bulan));
}

export async function saveKeuanganBulanan(
  villageId: number,
  tahun: number,
  userId: string,
  rows: KeuanganBulananInput[],
): Promise<void> {
  await denganKunciMysql(`keuangan-bulanan:${villageId}:${tahun}`, () =>
    db.transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx
          .select({ id: keuanganBulanan.id })
          .from(keuanganBulanan)
          .where(
            and(
              eq(keuanganBulanan.villageId, villageId),
              eq(keuanganBulanan.tahun, tahun),
              eq(keuanganBulanan.bulan, row.bulan),
              eq(keuanganBulanan.templateUuid, "5"),
            ),
          )
          .limit(1);
        if (existing[0]) {
          await tx
            .update(keuanganBulanan)
            .set({ target: row.target, realisasi: row.realisasi, createdBy: userId })
            .where(eq(keuanganBulanan.id, existing[0].id));
        } else {
          await tx.insert(keuanganBulanan).values({
            villageId,
            tahun,
            bulan: row.bulan,
            templateUuid: "5",
            target: row.target,
            realisasi: row.realisasi,
            createdBy: userId,
          });
        }
      }
    }),
  );
}
