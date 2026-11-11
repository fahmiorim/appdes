import { and, eq, like } from "drizzle-orm";

import { db } from "@/db";
import { rentangUmur } from "@/db/schema/rentang-umur";
import { KELOMPOK_UMUR, type KelompokUmur } from "@/features/penduduk/domain/laporan-penduduk";
import { type RentangUmurDTO } from "@/features/statistik/domain/rentang-umur";

/** Ambil rentang umur aktif per desa; kosong = pakai default `KELOMPOK_UMUR`. */
export async function listRentangUmur(villageId: number): Promise<KelompokUmur[]> {
  const rows = await db
    .select({
      id: rentangUmur.id,
      nama: rentangUmur.nama,
      dari: rentangUmur.dari,
      sampai: rentangUmur.sampai,
    })
    .from(rentangUmur)
    .where(and(eq(rentangUmur.villageId, villageId), eq(rentangUmur.status, true)))
    .orderBy(rentangUmur.dari);

  if (rows.length === 0) return [...KELOMPOK_UMUR];

  return rows.map((r) => ({
    label: r.nama,
    min: r.dari,
    max: r.sampai,
    kode: `${r.dari}-${r.sampai ?? "+"}`,
  }));
}

/** Baris rentang umur untuk halaman pengaturan statistik. */
export async function listRentangUmurRows(params: {
  villageId: number;
  search?: string;
}): Promise<RentangUmurDTO[]> {
  const whereCond = params.search
    ? and(eq(rentangUmur.villageId, params.villageId), like(rentangUmur.nama, `%${params.search}%`))
    : eq(rentangUmur.villageId, params.villageId);

  const rows = await db.select().from(rentangUmur).where(whereCond).orderBy(rentangUmur.dari);

  return rows.map(mapRentangUmurRow);
}

export async function insertRentangUmur(
  villageId: number,
  nilai: { nama: string; dari: number; sampai: number | null },
): Promise<number> {
  const [inserted] = await db
    .insert(rentangUmur)
    .values({ villageId, nama: nilai.nama, dari: nilai.dari, sampai: nilai.sampai, status: true })
    .$returningId();

  if (!inserted) throw new Error("Gagal membuat rentang umur.");
  return inserted.id;
}

export async function updateRentangUmur(
  villageId: number,
  id: number,
  nilai: { nama: string; dari: number; sampai: number | null },
): Promise<void> {
  const [result] = await db
    .update(rentangUmur)
    .set({ nama: nilai.nama, dari: nilai.dari, sampai: nilai.sampai })
    .where(and(eq(rentangUmur.id, id), eq(rentangUmur.villageId, villageId)));

  if (!result || result.affectedRows === 0) throw new Error("Rentang umur tidak ditemukan.");
}

export async function deleteRentangUmur(villageId: number, id: number): Promise<void> {
  const [result] = await db
    .delete(rentangUmur)
    .where(and(eq(rentangUmur.id, id), eq(rentangUmur.villageId, villageId)));

  if (!result || result.affectedRows === 0) throw new Error("Rentang umur tidak ditemukan.");
}

/** Konversi baris DB ke DTO UI. */
export function mapRentangUmurRow(row: {
  id: number;
  villageId: number;
  nama: string;
  dari: number;
  sampai: number | null;
  status: boolean;
}): RentangUmurDTO {
  return {
    id: row.id,
    villageId: row.villageId,
    nama: row.nama,
    dari: row.dari,
    sampai: row.sampai,
    status: row.status,
  };
}
