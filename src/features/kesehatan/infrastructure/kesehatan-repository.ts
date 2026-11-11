import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bulananAnak, ibuHamil, kia, posyandu } from "@/db/schema";
import { residents } from "@/db/schema/resident";
import type { KiaRow, Posyandu } from "@/features/kesehatan/domain/kesehatan";

export async function listPosyandu(villageId: number): Promise<Posyandu[]> {
  const rows = await db
    .select()
    .from(posyandu)
    .where(eq(posyandu.villageId, villageId))
    .orderBy(desc(posyandu.id));
  return rows as unknown as Posyandu[];
}

export async function createPosyandu(input: Omit<Posyandu, "id">): Promise<number> {
  const [res] = await db.insert(posyandu).values(input as typeof posyandu.$inferInsert);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updatePosyandu(
  id: number,
  villageId: number,
  input: Partial<Omit<Posyandu, "id" | "villageId">>,
): Promise<void> {
  await db
    .update(posyandu)
    .set(input as Partial<typeof posyandu.$inferInsert>)
    .where(and(eq(posyandu.id, id), eq(posyandu.villageId, villageId)));
}

export async function deletePosyandu(id: number, villageId: number): Promise<void> {
  await db.delete(posyandu).where(and(eq(posyandu.id, id), eq(posyandu.villageId, villageId)));
}

export async function listKia(villageId: number): Promise<KiaRow[]> {
  const rows = await db
    .select({
      id: kia.id,
      villageId: kia.villageId,
      noKia: kia.noKia,
      ibuId: kia.ibuId,
      anakId: kia.anakId,
      hariPerkiraanLahir: kia.hariPerkiraanLahir,
      ibuName: residents.name,
    })
    .from(kia)
    .leftJoin(residents, and(eq(kia.ibuId, residents.id), eq(residents.villageId, villageId)))
    .where(eq(kia.villageId, villageId))
    .orderBy(desc(kia.id));
  return rows as unknown as KiaRow[];
}

export async function createKia(input: {
  villageId: number;
  noKia: string;
  ibuId: number;
  anakId?: number | null;
  hariPerkiraanLahir?: string | null;
}): Promise<number> {
  const [res] = await db.insert(kia).values({
    villageId: input.villageId,
    noKia: input.noKia,
    ibuId: input.ibuId,
    anakId: input.anakId ?? null,
    hariPerkiraanLahir: input.hariPerkiraanLahir ?? null,
  } as typeof kia.$inferInsert);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updateKia(
  id: number,
  villageId: number,
  input: Partial<
    Pick<typeof kia.$inferInsert, "noKia" | "ibuId" | "anakId" | "hariPerkiraanLahir">
  >,
): Promise<void> {
  await db
    .update(kia)
    .set(input)
    .where(and(eq(kia.id, id), eq(kia.villageId, villageId)));
}

export async function deleteKia(id: number, villageId: number): Promise<void> {
  const [h] = await db
    .select({ id: ibuHamil.id })
    .from(ibuHamil)
    .where(eq(ibuHamil.kiaId, id))
    .limit(1);
  if (h) throw new Error("KIA terkait masih digunakan pada ibu hamil/anak");
  const [a] = await db
    .select({ id: bulananAnak.id })
    .from(bulananAnak)
    .where(eq(bulananAnak.kiaId, id))
    .limit(1);
  if (a) throw new Error("KIA terkait masih digunakan pada ibu hamil/anak");
  await db.delete(kia).where(and(eq(kia.id, id), eq(kia.villageId, villageId)));
}

export async function listIbuHamil(villageId: number) {
  return db
    .select()
    .from(ibuHamil)
    .where(eq(ibuHamil.villageId, villageId))
    .orderBy(desc(ibuHamil.id));
}

export async function createIbuHamil(input: typeof ibuHamil.$inferInsert) {
  const [res] = await db.insert(ibuHamil).values(input);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updateIbuHamil(
  id: number,
  villageId: number,
  input: Partial<typeof ibuHamil.$inferInsert>,
) {
  await db
    .update(ibuHamil)
    .set(input)
    .where(and(eq(ibuHamil.id, id), eq(ibuHamil.villageId, villageId)));
}

export async function deleteIbuHamil(id: number, villageId: number) {
  await db.delete(ibuHamil).where(and(eq(ibuHamil.id, id), eq(ibuHamil.villageId, villageId)));
}

export async function listBulananAnak(villageId: number) {
  return db
    .select()
    .from(bulananAnak)
    .where(eq(bulananAnak.villageId, villageId))
    .orderBy(desc(bulananAnak.id));
}

export async function createBulananAnak(input: typeof bulananAnak.$inferInsert) {
  const [res] = await db.insert(bulananAnak).values(input);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updateBulananAnak(
  id: number,
  villageId: number,
  input: Partial<typeof bulananAnak.$inferInsert>,
) {
  await db
    .update(bulananAnak)
    .set(input)
    .where(and(eq(bulananAnak.id, id), eq(bulananAnak.villageId, villageId)));
}

export async function deleteBulananAnak(id: number, villageId: number) {
  await db
    .delete(bulananAnak)
    .where(and(eq(bulananAnak.id, id), eq(bulananAnak.villageId, villageId)));
}
