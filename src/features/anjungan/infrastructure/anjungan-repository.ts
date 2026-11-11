import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { anjungan, type Anjungan, type NewAnjungan } from "@/db/schema/anjungan";

export async function listAnjungan(villageId: number, aktifOnly = false): Promise<Anjungan[]> {
  const conditions = [eq(anjungan.villageId, villageId)];
  if (aktifOnly) {
    // Perangkat yang sedang diperbaiki atau dinonaktifkan tidak tampil di halaman publik.
    conditions.push(eq(anjungan.aktif, 1), eq(anjungan.status, "aktif"));
  }
  return db
    .select()
    .from(anjungan)
    .where(and(...conditions))
    .orderBy(desc(anjungan.urutan), desc(anjungan.id));
}

export async function createAnjungan(data: NewAnjungan): Promise<number> {
  const result = await db.insert(anjungan).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateAnjungan(
  id: number,
  villageId: number,
  data: Partial<NewAnjungan>,
): Promise<void> {
  await db
    .update(anjungan)
    .set(data)
    .where(and(eq(anjungan.id, id), eq(anjungan.villageId, villageId)));
}

export async function deleteAnjungan(id: number, villageId: number): Promise<void> {
  await db.delete(anjungan).where(and(eq(anjungan.id, id), eq(anjungan.villageId, villageId)));
}
