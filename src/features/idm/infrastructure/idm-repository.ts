import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { idmIndikator, idmSdgs } from "@/db/schema";

export async function listIdm(villageId: number, tahun?: number) {
  const where = tahun
    ? and(eq(idmIndikator.villageId, villageId), eq(idmIndikator.tahun, tahun))
    : eq(idmIndikator.villageId, villageId);
  return db.select().from(idmIndikator).where(where).orderBy(idmIndikator.kode);
}

export async function createIdm(data: typeof idmIndikator.$inferInsert) {
  const result = await db.insert(idmIndikator).values(data).$returningId();
  return result[0]?.id ?? 0;
}

export async function updateIdm(
  id: number,
  villageId: number,
  data: Partial<typeof idmIndikator.$inferInsert>,
) {
  await db
    .update(idmIndikator)
    .set(data)
    .where(and(eq(idmIndikator.id, id), eq(idmIndikator.villageId, villageId)));
}

export async function deleteIdm(id: number, villageId: number) {
  await db
    .delete(idmIndikator)
    .where(and(eq(idmIndikator.id, id), eq(idmIndikator.villageId, villageId)));
}

/** Tahun-tahun yang sudah punya indikator, terbaru lebih dulu. */
export async function listTahunIdm(villageId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tahun: idmIndikator.tahun })
    .from(idmIndikator)
    .where(eq(idmIndikator.villageId, villageId))
    .orderBy(sql`${idmIndikator.tahun} DESC`);
  return rows.map((row) => row.tahun);
}

export async function listSdgs(villageId: number, tahun: number) {
  return db
    .select()
    .from(idmSdgs)
    .where(and(eq(idmSdgs.villageId, villageId), eq(idmSdgs.tahun, tahun)))
    .orderBy(idmSdgs.goal);
}

/** Simpan capaian satu tujuan; baris yang sudah ada diperbarui (upsert). */
export async function upsertSdgs(data: typeof idmSdgs.$inferInsert) {
  await db
    .insert(idmSdgs)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        skor: sql`values(skor)`,
        keterangan: sql`values(keterangan)`,
      },
    });
}

export async function deleteSdgs(villageId: number, tahun: number, goal: number) {
  await db
    .delete(idmSdgs)
    .where(and(eq(idmSdgs.villageId, villageId), eq(idmSdgs.tahun, tahun), eq(idmSdgs.goal, goal)));
}

export async function listTahunSdgs(villageId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tahun: idmSdgs.tahun })
    .from(idmSdgs)
    .where(eq(idmSdgs.villageId, villageId))
    .orderBy(sql`${idmSdgs.tahun} DESC`);
  return rows.map((row) => row.tahun);
}
