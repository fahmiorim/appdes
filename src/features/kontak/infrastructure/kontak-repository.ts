import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { anggotaGrupKontak, kontak, kontakGrup } from "@/db/schema";

export async function listKontak(villageId: number) {
  return db.select().from(kontak).where(eq(kontak.villageId, villageId)).orderBy(desc(kontak.id));
}

export async function createKontak(input: typeof kontak.$inferInsert) {
  const [res] = await db.insert(kontak).values(input);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updateKontak(
  id: number,
  villageId: number,
  input: Partial<typeof kontak.$inferInsert>,
) {
  await db
    .update(kontak)
    .set(input)
    .where(and(eq(kontak.id, id), eq(kontak.villageId, villageId)));
}

export async function deleteKontak(id: number, villageId: number) {
  await db.delete(kontak).where(and(eq(kontak.id, id), eq(kontak.villageId, villageId)));
}

export async function listKontakGrup(villageId: number) {
  return db
    .select()
    .from(kontakGrup)
    .where(eq(kontakGrup.villageId, villageId))
    .orderBy(desc(kontakGrup.id));
}

export async function createKontakGrup(input: typeof kontakGrup.$inferInsert) {
  const [res] = await db.insert(kontakGrup).values(input);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function updateKontakGrup(
  id: number,
  villageId: number,
  input: Partial<typeof kontakGrup.$inferInsert>,
) {
  await db
    .update(kontakGrup)
    .set(input)
    .where(and(eq(kontakGrup.id, id), eq(kontakGrup.villageId, villageId)));
}

export async function deleteKontakGrup(id: number, villageId: number) {
  await db
    .delete(kontakGrup)
    .where(and(eq(kontakGrup.id, id), eq(kontakGrup.villageId, villageId)));
}

export async function listAnggotaGrup(villageId: number, grupId: number) {
  return db
    .select()
    .from(anggotaGrupKontak)
    .where(and(eq(anggotaGrupKontak.villageId, villageId), eq(anggotaGrupKontak.grupId, grupId)))
    .orderBy(desc(anggotaGrupKontak.id));
}

export async function addAnggotaGrup(input: typeof anggotaGrupKontak.$inferInsert) {
  const [res] = await db.insert(anggotaGrupKontak).values(input);
  const result = res as { insertId: bigint | number };
  return Number(result.insertId);
}

export async function removeAnggotaGrup(id: number, villageId: number) {
  await db
    .delete(anggotaGrupKontak)
    .where(and(eq(anggotaGrupKontak.id, id), eq(anggotaGrupKontak.villageId, villageId)));
}

export async function listAnggotaGrupDetail(villageId: number, grupId: number) {
  return db
    .select({
      id: anggotaGrupKontak.id,
      kontakId: kontak.id,
      nama: kontak.nama,
      telepon: kontak.telepon,
      email: kontak.email,
      telegram: kontak.telegram,
    })
    .from(anggotaGrupKontak)
    .innerJoin(kontak, eq(anggotaGrupKontak.kontakId, kontak.id))
    .where(and(eq(anggotaGrupKontak.villageId, villageId), eq(anggotaGrupKontak.grupId, grupId)))
    .orderBy(desc(anggotaGrupKontak.id));
}
