import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bukuTamu, type BukuTamu, type NewBukuTamu } from "@/db/schema/buku-tamu";

export async function listBukuTamu(
  villageId: number,
  opts?: { tanggalMulai?: string; tanggalAkhir?: string },
): Promise<BukuTamu[]> {
  const conditions = [eq(bukuTamu.villageId, villageId)];
  if (opts?.tanggalMulai) conditions.push(sql`${bukuTamu.tanggal} >= ${opts.tanggalMulai}`);
  if (opts?.tanggalAkhir) conditions.push(sql`${bukuTamu.tanggal} <= ${opts.tanggalAkhir}`);
  return db
    .select()
    .from(bukuTamu)
    .where(and(...conditions))
    .orderBy(desc(bukuTamu.tanggal), desc(bukuTamu.id));
}

export async function createBukuTamu(data: NewBukuTamu): Promise<number> {
  const result = await db.insert(bukuTamu).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateBukuTamu(
  id: number,
  villageId: number,
  data: Partial<NewBukuTamu>,
): Promise<void> {
  await db
    .update(bukuTamu)
    .set(data)
    .where(and(eq(bukuTamu.id, id), eq(bukuTamu.villageId, villageId)));
}

export async function deleteBukuTamu(id: number, villageId: number): Promise<void> {
  await db.delete(bukuTamu).where(and(eq(bukuTamu.id, id), eq(bukuTamu.villageId, villageId)));
}
