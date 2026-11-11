import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { sisaLebih, type NewSisaLebih, type SisaLebih } from "@/db/schema/keuangan-sisa";

export async function listSisaLebih(villageId: number): Promise<SisaLebih[]> {
  return db
    .select()
    .from(sisaLebih)
    .where(eq(sisaLebih.villageId, villageId))
    .orderBy(desc(sisaLebih.tahun));
}

export async function getSisaLebih(villageId: number, id: number): Promise<SisaLebih | null> {
  const [row] = await db
    .select()
    .from(sisaLebih)
    .where(and(eq(sisaLebih.villageId, villageId), eq(sisaLebih.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listSisaLebihTahun(villageId: number, tahun: number): Promise<SisaLebih[]> {
  return db
    .select()
    .from(sisaLebih)
    .where(and(eq(sisaLebih.villageId, villageId), eq(sisaLebih.tahun, tahun)));
}

export async function createSisaLebih(data: NewSisaLebih): Promise<number> {
  const result = await db.insert(sisaLebih).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateSisaLebih(
  id: number,
  villageId: number,
  data: Partial<NewSisaLebih>,
): Promise<void> {
  await db
    .update(sisaLebih)
    .set(data)
    .where(and(eq(sisaLebih.id, id), eq(sisaLebih.villageId, villageId)));
}

export async function deleteSisaLebih(id: number, villageId: number): Promise<void> {
  await db.delete(sisaLebih).where(and(eq(sisaLebih.id, id), eq(sisaLebih.villageId, villageId)));
}
