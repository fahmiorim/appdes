import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { analisisIndikator, analisisKategori, surveySoal } from "@/db/schema";

export async function listAnalisisKategori(villageId: number) {
  return db
    .select()
    .from(analisisKategori)
    .where(eq(analisisKategori.villageId, villageId))
    .orderBy(analisisKategori.nama);
}

export async function createAnalisisKategori(data: typeof analisisKategori.$inferInsert) {
  const result = await db.insert(analisisKategori).values(data).$returningId();
  return result[0]?.id ?? 0;
}

export async function updateAnalisisKategori(
  id: number,
  villageId: number,
  data: Partial<typeof analisisKategori.$inferInsert>,
) {
  await db
    .update(analisisKategori)
    .set(data)
    .where(and(eq(analisisKategori.id, id), eq(analisisKategori.villageId, villageId)));
}

/**
 * Composite RESTRICT mencegah referensi lintas desa; lepaskan indikator
 * sewilayah secara atomik sebelum kategori dihapus.
 */
export async function deleteAnalisisKategori(id: number, villageId: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(analisisIndikator)
      .set({ kategoriId: null })
      .where(and(eq(analisisIndikator.villageId, villageId), eq(analisisIndikator.kategoriId, id)));
    await tx
      .delete(analisisKategori)
      .where(and(eq(analisisKategori.id, id), eq(analisisKategori.villageId, villageId)));
  });
}

export async function listAnalisisIndikator(villageId: number, kategoriId?: number) {
  const where = kategoriId
    ? and(eq(analisisIndikator.villageId, villageId), eq(analisisIndikator.kategoriId, kategoriId))
    : eq(analisisIndikator.villageId, villageId);
  return db.select().from(analisisIndikator).where(where).orderBy(analisisIndikator.kode);
}

export async function createAnalisisIndikator(data: typeof analisisIndikator.$inferInsert) {
  const result = await db.insert(analisisIndikator).values(data).$returningId();
  return result[0]?.id ?? 0;
}

export async function updateAnalisisIndikator(
  id: number,
  villageId: number,
  data: Partial<typeof analisisIndikator.$inferInsert>,
) {
  await db
    .update(analisisIndikator)
    .set(data)
    .where(and(eq(analisisIndikator.id, id), eq(analisisIndikator.villageId, villageId)));
}

/**
 * Composite RESTRICT pada `survey_soal.indikator_id` mencegah referensi
 * lintas desa; lepaskan soal sewilayah secara atomik sebelum indikator dihapus.
 */
export async function deleteAnalisisIndikator(id: number, villageId: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(surveySoal)
      .set({ indikatorId: null })
      .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.indikatorId, id)));
    await tx
      .delete(analisisIndikator)
      .where(and(eq(analisisIndikator.id, id), eq(analisisIndikator.villageId, villageId)));
  });
}
