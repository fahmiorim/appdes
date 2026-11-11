import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bumindesTanahKas, bumindesTanahKasMutasi } from "@/db/schema/bumindes-tanahkas";

export interface TanahKasValues {
  nomorPersil: string;
  asal: string | null;
  luas: string;
  lokasi: string | null;
  status: string | null;
  nilai: string;
  keterangan: string | null;
}

export interface TanahKasMutasiValues {
  tanahKasId: number;
  tanggal: string;
  jenis: string;
  uraian: string;
  luasPerubahan: string | null;
  nilaiPerubahan: string | null;
  keterangan: string | null;
}

export async function listBumindesTanahKas(villageId: number) {
  return db
    .select()
    .from(bumindesTanahKas)
    .where(eq(bumindesTanahKas.villageId, villageId))
    .orderBy(asc(bumindesTanahKas.id));
}

export async function getBumindesTanahKas(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesTanahKas)
    .where(and(eq(bumindesTanahKas.villageId, villageId), eq(bumindesTanahKas.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesTanahKas(villageId: number, values: TanahKasValues) {
  const [row] = await db
    .insert(bumindesTanahKas)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan tanah kas.");
  return row.id;
}

export async function updateBumindesTanahKas(
  villageId: number,
  id: number,
  values: TanahKasValues,
) {
  const [result] = await db
    .update(bumindesTanahKas)
    .set(values)
    .where(and(eq(bumindesTanahKas.villageId, villageId), eq(bumindesTanahKas.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesTanahKas(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesTanahKas)
    .where(and(eq(bumindesTanahKas.villageId, villageId), eq(bumindesTanahKas.id, id)));
  return result.affectedRows > 0;
}

export async function listBumindesTanahKasMutasi(villageId: number, tanahKasId?: number) {
  const kondisi = [eq(bumindesTanahKasMutasi.villageId, villageId)];
  if (tanahKasId) kondisi.push(eq(bumindesTanahKasMutasi.tanahKasId, tanahKasId));
  return db
    .select()
    .from(bumindesTanahKasMutasi)
    .where(and(...kondisi))
    .orderBy(asc(bumindesTanahKasMutasi.tanggal), asc(bumindesTanahKasMutasi.id));
}

export async function insertBumindesTanahKasMutasi(
  villageId: number,
  values: TanahKasMutasiValues,
) {
  const [row] = await db
    .insert(bumindesTanahKasMutasi)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan mutasi tanah kas.");
  return row.id;
}

export async function deleteBumindesTanahKasMutasi(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesTanahKasMutasi)
    .where(and(eq(bumindesTanahKasMutasi.villageId, villageId), eq(bumindesTanahKasMutasi.id, id)));
  return result.affectedRows > 0;
}
