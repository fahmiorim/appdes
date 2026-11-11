import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sinergiProgram, type NewSinergiProgram, type SinergiProgram } from "@/db/schema/sinergi";

export async function listSinergi(villageId: number): Promise<SinergiProgram[]> {
  return db
    .select()
    .from(sinergiProgram)
    .where(eq(sinergiProgram.villageId, villageId))
    .orderBy(desc(sinergiProgram.id));
}

export async function createSinergi(data: NewSinergiProgram): Promise<number> {
  const result = await db.insert(sinergiProgram).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateSinergi(
  id: number,
  villageId: number,
  data: Partial<NewSinergiProgram>,
): Promise<void> {
  await db
    .update(sinergiProgram)
    .set(data)
    .where(and(eq(sinergiProgram.id, id), eq(sinergiProgram.villageId, villageId)));
}

export async function deleteSinergi(id: number, villageId: number): Promise<void> {
  await db
    .delete(sinergiProgram)
    .where(and(eq(sinergiProgram.id, id), eq(sinergiProgram.villageId, villageId)));
}
