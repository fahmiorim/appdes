import "server-only";

import { and, asc, count, eq, like, ne, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { regions } from "@/db/schema";
import type { WilayahDTO, WilayahFormInput } from "@/features/wilayah/domain/wilayah";

export interface WilayahListParams {
  villageId: number;
  search: string;
  page: number;
  pageSize: number;
}

export interface WilayahListResult {
  rows: WilayahDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Petakan baris `regions` → DTO domain (kosakata Indonesia). */
function toDto(row: typeof regions.$inferSelect): WilayahDTO {
  return {
    id: row.id,
    dusun: row.dusun ?? "",
    rw: row.rw ?? "",
    rt: row.rt ?? "",
    urut: row.sortOrder,
  };
}

function buildWhere(villageId: number, search: string, excludeId?: number): SQL {
  const villageFilter = eq(regions.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(
      like(regions.dusun, term),
      like(regions.rw, term),
      like(regions.rt, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  if (excludeId !== undefined) {
    filters.push(ne(regions.id, excludeId));
  }

  return and(...filters) ?? villageFilter;
}

export async function listWilayah(params: WilayahListParams): Promise<WilayahListResult> {
  const { villageId, search, page, pageSize } = params;
  const where = buildWhere(villageId, search);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(regions)
      .where(where)
      .orderBy(asc(regions.sortOrder), asc(regions.dusun), asc(regions.rw), asc(regions.rt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(regions).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    rows: rows.map(toDto),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function findWilayahById(villageId: number, id: number): Promise<WilayahDTO | null> {
  const [row] = await db
    .select()
    .from(regions)
    .where(and(eq(regions.villageId, villageId), eq(regions.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

/**
 * Seluruh wilayah desa tanpa paginasi.
 *
 * Dipakai fitur lain (penduduk, keluarga) untuk mengisi pilihan wilayah pada
 * formulir, sehingga pengetahuan tentang tabel `regions` tetap terpusat di sini.
 */
export async function listWilayahOptions(villageId: number): Promise<WilayahDTO[]> {
  const rows = await db
    .select()
    .from(regions)
    .where(eq(regions.villageId, villageId))
    .orderBy(asc(regions.sortOrder), asc(regions.dusun), asc(regions.rw), asc(regions.rt));

  return rows.map(toDto);
}

/** Apakah kombinasi dusun/RW/RT sudah dipakai (kecuali `excludeId`). */
export async function wilayahExists(
  villageId: number,
  input: WilayahFormInput,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [
    eq(regions.villageId, villageId),
    eq(regions.dusun, input.dusun),
    eq(regions.rw, input.rw),
    eq(regions.rt, input.rt),
  ];

  if (excludeId !== null) {
    filters.push(ne(regions.id, excludeId));
  }

  const duplicates = await db
    .select({ id: regions.id })
    .from(regions)
    .where(and(...filters))
    .limit(1);

  return duplicates.length > 0;
}

export async function insertWilayah(villageId: number, input: WilayahFormInput): Promise<number> {
  const [inserted] = await db
    .insert(regions)
    .values({
      villageId,
      dusun: input.dusun,
      rw: input.rw,
      rt: input.rt,
      sortOrder: input.urut,
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data wilayah.");
  return inserted.id;
}

export async function updateWilayah(id: number, input: WilayahFormInput): Promise<void> {
  await db
    .update(regions)
    .set({ dusun: input.dusun, rw: input.rw, rt: input.rt, sortOrder: input.urut })
    .where(eq(regions.id, id));
}

export async function deleteWilayah(id: number): Promise<void> {
  await db.delete(regions).where(eq(regions.id, id));
}
