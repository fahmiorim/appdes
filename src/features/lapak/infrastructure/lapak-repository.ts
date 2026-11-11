import "server-only";

import { and, count, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { lapak, type Lapak, type NewLapak } from "@/db/schema/lapak";
import { lapakProduk } from "@/db/schema/lapak-produk";
import { residents } from "@/db/schema/resident";

export const LAPAK_PAGE_SIZE = 20;

export interface LapakPage {
  rows: Array<{
    id: number;
    villageId: number;
    residentId: number | null;
    nama: string;
    pemilik: string | null;
    kategori: string | null;
    alamat: string | null;
    keterangan: string | null;
    produkCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listLapak(
  villageId: number,
  opts?: { kategori?: string; q?: string; page?: number; pageSize?: number },
): Promise<LapakPage> {
  const where = [eq(lapak.villageId, villageId)];
  if (opts?.kategori) where.push(eq(lapak.kategori, opts.kategori));
  if (opts?.q) {
    where.push(
      or(
        like(lapak.nama, `%${opts.q}%`),
        like(lapak.pemilik ?? "", `%${opts.q}%`),
        like(lapak.alamat ?? "", `%${opts.q}%`),
        like(lapak.keterangan ?? "", `%${opts.q}%`),
      )!,
    );
  }
  const pageSize = Math.min(Math.max(opts?.pageSize ?? LAPAK_PAGE_SIZE, 1), 100);
  const [totalRows] = await db
    .select({ value: count() })
    .from(lapak)
    .where(and(...where));
  const total = totalRows?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(opts?.page ?? 1, 1), pageCount);
  const rows = await db
    .select({
      id: lapak.id,
      villageId: lapak.villageId,
      residentId: lapak.residentId,
      nama: lapak.nama,
      pemilik: lapak.pemilik,
      kategori: lapak.kategori,
      alamat: lapak.alamat,
      keterangan: lapak.keterangan,
      produkCount: sql<number>`(
        SELECT COUNT(*) FROM ${lapakProduk}
        WHERE ${lapakProduk}.lapak_id = ${lapak}.id
          AND ${lapakProduk}.village_id = ${lapak}.village_id
          AND ${lapakProduk}.aktif = 1 )`.as("produkCount"),
    })
    .from(lapak)
    .where(and(...where))
    .orderBy(desc(lapak.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageSize, pageCount };
}

export async function findLapak(villageId: number, id: number): Promise<Lapak | null> {
  const rows = await db
    .select()
    .from(lapak)
    .where(and(eq(lapak.id, id), eq(lapak.villageId, villageId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Daftar ID lapak publik untuk sitemap, dibatasi per desa. */
export async function listLapakPublikSitemap(
  villageId: number,
  limit: number,
): Promise<Array<{ id: number }>> {
  return db
    .select({ id: lapak.id })
    .from(lapak)
    .where(eq(lapak.villageId, villageId))
    .orderBy(desc(lapak.id))
    .limit(Math.min(Math.max(limit, 0), 50_000));
}

export async function createLapak(data: NewLapak): Promise<number> {
  const result = await db.insert(lapak).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updateLapak(
  id: number,
  villageId: number,
  data: Partial<NewLapak>,
): Promise<void> {
  await db
    .update(lapak)
    .set(data)
    .where(and(eq(lapak.id, id), eq(lapak.villageId, villageId)));
}

export async function deleteLapak(id: number, villageId: number): Promise<void> {
  await db.delete(lapak).where(and(eq(lapak.id, id), eq(lapak.villageId, villageId)));
}

/** Lapak milik satu warga. */
export async function listLapakWarga(villageId: number, residentId: number): Promise<Lapak[]> {
  return db
    .select()
    .from(lapak)
    .where(and(eq(lapak.villageId, villageId), eq(lapak.residentId, residentId)))
    .orderBy(desc(lapak.id));
}

export async function findLapakWarga(
  villageId: number,
  residentId: number,
  id: number,
): Promise<Lapak | null> {
  const [row] = await db
    .select()
    .from(lapak)
    .where(and(eq(lapak.villageId, villageId), eq(lapak.residentId, residentId), eq(lapak.id, id)))
    .limit(1);
  return row ?? null;
}

export async function updateLapakWarga(
  id: number,
  villageId: number,
  residentId: number,
  data: Partial<NewLapak>,
): Promise<void> {
  await db
    .update(lapak)
    .set(data)
    .where(and(eq(lapak.id, id), eq(lapak.villageId, villageId), eq(lapak.residentId, residentId)));
}

export async function deleteLapakWarga(
  id: number,
  villageId: number,
  residentId: number,
): Promise<void> {
  await db
    .delete(lapak)
    .where(and(eq(lapak.id, id), eq(lapak.villageId, villageId), eq(lapak.residentId, residentId)));
}

/** Nama penduduk untuk kolom pemilik lapak. */
export async function namaPenduduk(villageId: number, residentId: number): Promise<string | null> {
  const [row] = await db
    .select({ nama: residents.name })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.id, residentId)))
    .limit(1);
  return row?.nama ?? null;
}

export async function listKategoriLapak(villageId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ kategori: lapak.kategori })
    .from(lapak)
    .where(and(eq(lapak.villageId, villageId)));
  return rows.map((r) => r.kategori).filter((k): k is string => k !== null && k !== "");
}
