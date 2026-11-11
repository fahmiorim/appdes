import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { komentar } from "@/db/schema";

/**
 * Repository komentar publik untuk halaman desa.
 */

export interface FilterKomentar {
  /** Halaman target: 'kontak', 'berita', dll. */
  halaman: string;
  /** Pagination page */
  page?: number;
  /** Items per page */
  pageSize?: number;
}

export interface KomentarRow {
  id: number;
  namaPenulis: string;
  isi: string;
  createdAt: Date;
}

/**
 * Daftar komentar publik aktif pada halaman tertentu.
 * Terurut terbaru lebih dulu.
 */
export async function listKomentarPublik(
  villageId: number,
  filter: FilterKomentar,
): Promise<{
  daftar: KomentarRow[];
  total: number;
}> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: komentar.id,
        namaPenulis: komentar.namaPenulis,
        isi: komentar.isi,
        createdAt: komentar.createdAt,
      })
      .from(komentar)
      .where(
        and(
          eq(komentar.villageId, villageId),
          eq(komentar.halaman, filter.halaman),
          eq(komentar.status, "aktif"),
        ),
      )
      .orderBy(desc(komentar.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(komentar)
      .where(
        and(
          eq(komentar.villageId, villageId),
          eq(komentar.halaman, filter.halaman),
          eq(komentar.status, "aktif"),
        ),
      ),
  ]);

  return {
    daftar: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    })),
    total: countResult[0]?.value ?? 0,
  };
}

/**
 * Simpan komentar baru.
 * @returns id baris baru
 */
export async function insertKomentar(
  villageId: number,
  values: Omit<KomentarRow, "id" | "createdAt">,
): Promise<number> {
  const [result] = await db
    .insert(komentar)
    .values({
      villageId,
      halaman: "kontak",
      namaPenulis: values.namaPenulis,
      isi: values.isi,
      status: "aktif",
    })
    .execute();

  return Number(result.insertId);
}
