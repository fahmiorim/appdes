import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bumindesKader, bumindesPembangunan } from "@/db/schema/bumindes-pembangunan";

export interface PembangunanValues {
  tahun: number;
  namaKegiatan: string;
  lokasi: string | null;
  volume: string | null;
  sumberDana: string | null;
  biaya: string;
  pelaksana: string | null;
  status: string;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  hasil: string | null;
  keterangan: string | null;
}

export interface KaderValues {
  nama: string;
  jabatan: string | null;
  bidang: string | null;
  alamat: string | null;
  noHp: string | null;
  keterangan: string | null;
}

export async function listBumindesPembangunan(villageId: number, tahun?: number) {
  const kondisi = [eq(bumindesPembangunan.villageId, villageId)];
  if (tahun) kondisi.push(eq(bumindesPembangunan.tahun, tahun));
  return db
    .select()
    .from(bumindesPembangunan)
    .where(and(...kondisi))
    .orderBy(desc(bumindesPembangunan.tahun), asc(bumindesPembangunan.id));
}

export async function getBumindesPembangunan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesPembangunan)
    .where(and(eq(bumindesPembangunan.villageId, villageId), eq(bumindesPembangunan.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesPembangunan(villageId: number, values: PembangunanValues) {
  const [row] = await db
    .insert(bumindesPembangunan)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan pembangunan.");
  return row.id;
}

export async function updateBumindesPembangunan(
  villageId: number,
  id: number,
  values: PembangunanValues,
) {
  const [result] = await db
    .update(bumindesPembangunan)
    .set(values)
    .where(and(eq(bumindesPembangunan.villageId, villageId), eq(bumindesPembangunan.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesPembangunan(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesPembangunan)
    .where(and(eq(bumindesPembangunan.villageId, villageId), eq(bumindesPembangunan.id, id)));
  return result.affectedRows > 0;
}

export async function listBumindesKader(villageId: number) {
  return db
    .select()
    .from(bumindesKader)
    .where(eq(bumindesKader.villageId, villageId))
    .orderBy(asc(bumindesKader.nama), asc(bumindesKader.id));
}

export async function getBumindesKader(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesKader)
    .where(and(eq(bumindesKader.villageId, villageId), eq(bumindesKader.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesKader(villageId: number, values: KaderValues) {
  const [row] = await db
    .insert(bumindesKader)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan kader.");
  return row.id;
}

export async function updateBumindesKader(villageId: number, id: number, values: KaderValues) {
  const [result] = await db
    .update(bumindesKader)
    .set(values)
    .where(and(eq(bumindesKader.villageId, villageId), eq(bumindesKader.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesKader(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesKader)
    .where(and(eq(bumindesKader.villageId, villageId), eq(bumindesKader.id, id)));
  return result.affectedRows > 0;
}
