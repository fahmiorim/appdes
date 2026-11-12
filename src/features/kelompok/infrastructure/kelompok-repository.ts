import "server-only";

import { and, asc, count, eq, inArray, like, ne, notInArray, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { kelompok, kelompokAnggota, kelompokMaster, residents } from "@/db/schema";
import {
  isKelompokTipe,
  JABATAN_KETUA,
  type KategoriKelompokDTO,
  type KategoriKelompokFormInput,
  type KelompokAnggotaPublik,
  type KelompokDTO,
  type KelompokFormInput,
  type KelompokListRow,
  type KelompokMember,
  type KelompokReferenceData,
} from "@/features/kelompok/domain/kelompok";
import type { AnggotaLaporanRow } from "@/features/kelompok/domain/laporan-anggota";
import type { LabelOption } from "@/lib/forms";

export interface ListKelompokParams {
  villageId: number;
  search: string;
  /** Saring menurut tipe ("kelompok"/"lembaga"); kosong berarti semua. */
  tipe: string;
  categoryId: number | null;
  page: number;
  pageSize: number;
}

export interface KelompokListResult {
  rows: KelompokListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Ubah teks kosong menjadi `NULL` agar basis data tidak menyimpan string kosong. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Petakan baris `kelompok` → DTO domain. */
function toDto(row: typeof kelompok.$inferSelect): KelompokDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    categoryId: row.categoryId,
    code: row.code,
    decreeNumber: row.decreeNumber,
    description: row.description,
  };
}

function buildWhere(
  villageId: number,
  search: string,
  tipe: string,
  categoryId: number | null,
): SQL {
  const villageFilter = eq(kelompok.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (isKelompokTipe(tipe)) filters.push(eq(kelompok.type, tipe));
  if (categoryId !== null) filters.push(eq(kelompok.categoryId, categoryId));

  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(
      like(kelompok.name, term),
      like(kelompok.code, term),
      like(kelompok.decreeNumber, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  return and(...filters) ?? villageFilter;
}

export async function listKelompok(params: ListKelompokParams): Promise<KelompokListResult> {
  const { villageId, search, tipe, categoryId, page, pageSize } = params;
  const where = buildWhere(villageId, search, tipe, categoryId);

  const [rows, totalRows] = await Promise.all([
    db
      .select({ kelompok: kelompok, categoryName: kelompokMaster.name })
      .from(kelompok)
      .leftJoin(
        kelompokMaster,
        and(eq(kelompok.categoryId, kelompokMaster.id), eq(kelompokMaster.villageId, villageId)),
      )
      .where(where)
      .orderBy(asc(kelompok.name), asc(kelompok.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(kelompok).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;
  const ids = rows.map((row) => row.kelompok.id);

  // Agregasi anggota diambil sekali untuk halaman ini, lalu digabung di memori —
  // menghindari subquery berkorelasi per baris.
  const [memberCounts, leaders] = await Promise.all([
    listMemberCounts(villageId, ids),
    listLeaders(villageId, ids),
  ]);

  return {
    rows: rows.map((row) => ({
      ...toDto(row.kelompok),
      categoryName: row.categoryName ?? null,
      leaderName: leaders.get(row.kelompok.id) ?? null,
      memberCount: memberCounts.get(row.kelompok.id) ?? 0,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Jumlah anggota per kelompok untuk sekumpulan id (satu query). */
async function listMemberCounts(
  villageId: number,
  kelompokIds: readonly number[],
): Promise<Map<number, number>> {
  if (kelompokIds.length === 0) return new Map();

  const rows = await db
    .select({ kelompokId: kelompokAnggota.kelompokId, total: count() })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(residents.id, kelompokAnggota.residentId), eq(residents.villageId, villageId)),
    )
    .where(
      and(
        eq(kelompokAnggota.villageId, villageId),
        inArray(kelompokAnggota.kelompokId, [...kelompokIds]),
      ),
    )
    .groupBy(kelompokAnggota.kelompokId);

  const result = new Map<number, number>();
  for (const row of rows) result.set(row.kelompokId, row.total);
  return result;
}

/**
 * Nama ketua per kelompok (anggota berjabatan KETUA).
 *
 * Ketua diturunkan dari keanggotaan; bila ada lebih dari satu (seharusnya tidak),
 * yang pertama menurut id dipakai demi tampilan yang stabil.
 */
async function listLeaders(
  villageId: number,
  kelompokIds: readonly number[],
): Promise<Map<number, string>> {
  if (kelompokIds.length === 0) return new Map();

  const rows = await db
    .select({ kelompokId: kelompokAnggota.kelompokId, name: residents.name })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
    )
    .where(
      and(
        eq(kelompokAnggota.villageId, villageId),
        eq(kelompokAnggota.position, JABATAN_KETUA),
        inArray(kelompokAnggota.kelompokId, [...kelompokIds]),
      ),
    )
    .orderBy(asc(kelompokAnggota.id));

  const result = new Map<number, string>();
  for (const row of rows) {
    if (!result.has(row.kelompokId)) result.set(row.kelompokId, row.name);
  }
  return result;
}

export async function findKelompokById(villageId: number, id: number): Promise<KelompokDTO | null> {
  const [row] = await db
    .select()
    .from(kelompok)
    .where(and(eq(kelompok.villageId, villageId), eq(kelompok.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

/** Apakah slug sudah dipakai kelompok lain di desa yang sama. */
export async function kelompokSlugExists(
  villageId: number,
  slug: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(kelompok.villageId, villageId), eq(kelompok.slug, slug)];
  if (excludeId !== null) filters.push(ne(kelompok.id, excludeId));

  const rows = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}

/** Apakah kode sudah dipakai kelompok lain di desa yang sama. */
export async function kelompokCodeExists(
  villageId: number,
  code: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(kelompok.villageId, villageId), eq(kelompok.code, code)];
  if (excludeId !== null) filters.push(ne(kelompok.id, excludeId));

  const rows = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}

async function assertKategoriTenant(villageId: number, categoryId: number | null): Promise<void> {
  if (categoryId === null) return;
  const [category] = await db
    .select({ id: kelompokMaster.id })
    .from(kelompokMaster)
    .where(and(eq(kelompokMaster.id, categoryId), eq(kelompokMaster.villageId, villageId)))
    .limit(1);
  if (!category) throw new Error("Kategori kelompok tidak ditemukan pada desa aktif.");
}

export async function insertKelompok(
  villageId: number,
  slug: string,
  input: KelompokFormInput,
): Promise<number> {
  await assertKategoriTenant(villageId, input.kategoriId);

  const [inserted] = await db
    .insert(kelompok)
    .values({
      villageId,
      name: input.nama,
      slug,
      type: input.tipe,
      categoryId: input.kategoriId,
      code: blankToNull(input.kode),
      decreeNumber: blankToNull(input.nomorSk),
      description: blankToNull(input.keterangan),
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data kelompok.");
  return inserted.id;
}

export async function updateKelompok(
  villageId: number,
  id: number,
  slug: string,
  input: KelompokFormInput,
): Promise<void> {
  await assertKategoriTenant(villageId, input.kategoriId);

  await db
    .update(kelompok)
    .set({
      name: input.nama,
      slug,
      type: input.tipe,
      categoryId: input.kategoriId,
      code: blankToNull(input.kode),
      decreeNumber: blankToNull(input.nomorSk),
      description: blankToNull(input.keterangan),
    })
    .where(and(eq(kelompok.villageId, villageId), eq(kelompok.id, id)));
}

/**
 * Hapus kelompok beserta anggotanya (cascade di basis data).
 *
 * Penduduk **tidak** ikut terhapus: `kelompok_anggota.resident_id` memakai
 * `ON DELETE CASCADE` pada baris keanggotaan saja.
 */
export async function deleteKelompok(villageId: number, id: number): Promise<void> {
  await db.delete(kelompok).where(and(eq(kelompok.villageId, villageId), eq(kelompok.id, id)));
}

/** Jumlah anggota sebuah kelompok (dipakai penjaga hapus di use-case). */
export async function countKelompokAnggota(villageId: number, kelompokId: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(residents.id, kelompokAnggota.residentId), eq(residents.villageId, villageId)),
    )
    .where(
      and(eq(kelompokAnggota.villageId, villageId), eq(kelompokAnggota.kelompokId, kelompokId)),
    );

  return row?.total ?? 0;
}

/** Anggota sebuah kelompok, terurut menurut jabatan lalu nama. */
export async function listKelompokMembers(
  villageId: number,
  kelompokId: number,
): Promise<KelompokMember[]> {
  const rows = await db
    .select({
      id: kelompokAnggota.id,
      residentId: kelompokAnggota.residentId,
      name: residents.name,
      nationalId: residents.nationalId,
      position: kelompokAnggota.position,
      memberNumber: kelompokAnggota.memberNumber,
      decreeNumber: kelompokAnggota.decreeNumber,
      tampilPublik: kelompokAnggota.tampilPublik,
    })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
    )
    .where(
      and(eq(kelompokAnggota.villageId, villageId), eq(kelompokAnggota.kelompokId, kelompokId)),
    );

  return rows
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "id") || a.id - b.id)
    .map((row) => ({
      id: row.id,
      residentId: row.residentId,
      name: row.name,
      nationalId: row.nationalId ?? null,
      position: row.position,
      memberNumber: row.memberNumber ?? null,
      decreeNumber: row.decreeNumber ?? null,
      tampilPublik: row.tampilPublik,
    }));
}

/** Apakah penduduk sudah menjadi anggota kelompok ini. */
export async function kelompokMemberExists(
  villageId: number,
  kelompokId: number,
  residentId: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: kelompokAnggota.id })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(residents.id, kelompokAnggota.residentId), eq(residents.villageId, villageId)),
    )
    .where(
      and(
        eq(kelompokAnggota.villageId, villageId),
        eq(kelompokAnggota.kelompokId, kelompokId),
        eq(kelompokAnggota.residentId, residentId),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/** Apakah penduduk berstatus hidup dan berasal dari desa ini. */
export async function residentExists(villageId: number, residentId: number): Promise<boolean> {
  const rows = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.id, residentId)))
    .limit(1);

  return rows.length > 0;
}

/** Tambah seorang penduduk sebagai anggota kelompok. */
export async function addKelompokMember(
  villageId: number,
  kelompokId: number,
  residentId: number,
  position: number,
  memberNumber: string | null,
  decreeNumber: string | null,
): Promise<void> {
  const [group] = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(eq(kelompok.id, kelompokId), eq(kelompok.villageId, villageId)))
    .limit(1);
  const [resident] = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(eq(residents.id, residentId), eq(residents.villageId, villageId)))
    .limit(1);
  if (!group || !resident)
    throw new Error("Kelompok atau penduduk tidak ditemukan pada desa aktif.");

  await db.insert(kelompokAnggota).values({
    villageId,
    kelompokId,
    residentId,
    position,
    memberNumber,
    decreeNumber,
  });
}

export async function removeKelompokMember(
  villageId: number,
  kelompokId: number,
  memberId: number,
): Promise<void> {
  const [group] = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(eq(kelompok.id, kelompokId), eq(kelompok.villageId, villageId)))
    .limit(1);
  if (!group) return;

  await db
    .delete(kelompokAnggota)
    .where(
      and(
        eq(kelompokAnggota.villageId, villageId),
        eq(kelompokAnggota.kelompokId, kelompokId),
        eq(kelompokAnggota.id, memberId),
      ),
    );
}

/** Tampilkan/sembunyikan satu anggota di situs publik. */
export async function setKelompokMemberPublic(
  villageId: number,
  kelompokId: number,
  memberId: number,
  tampilPublik: boolean,
): Promise<boolean> {
  const [group] = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(eq(kelompok.id, kelompokId), eq(kelompok.villageId, villageId)))
    .limit(1);
  if (!group) return false;

  const [result] = await db
    .update(kelompokAnggota)
    .set({ tampilPublik })
    .where(
      and(
        eq(kelompokAnggota.villageId, villageId),
        eq(kelompokAnggota.kelompokId, kelompokId),
        eq(kelompokAnggota.id, memberId),
      ),
    );

  return result.affectedRows > 0;
}

/**
 * Seluruh anggota berstatus publik, dikelompokkan per kelompok (satu query).
 * NIK tidak diambil karena halaman publik tidak membutuhkannya.
 */
export async function listKelompokAnggotaPublik(
  villageId: number,
): Promise<Map<number, KelompokAnggotaPublik[]>> {
  const rows = await db
    .select({
      id: kelompokAnggota.id,
      kelompokId: kelompokAnggota.kelompokId,
      name: residents.name,
      position: kelompokAnggota.position,
      memberNumber: kelompokAnggota.memberNumber,
    })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
    )
    .where(and(eq(kelompokAnggota.villageId, villageId), eq(kelompokAnggota.tampilPublik, true)));

  const peta = new Map<number, KelompokAnggotaPublik[]>();
  const urut = [...rows].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, "id") || a.id - b.id,
  );

  for (const row of urut) {
    const daftar = peta.get(row.kelompokId) ?? [];
    daftar.push({
      id: row.id,
      name: row.name,
      position: row.position,
      memberNumber: row.memberNumber ?? null,
    });
    peta.set(row.kelompokId, daftar);
  }

  return peta;
}

/**
 * Penduduk yang belum menjadi anggota kelompok ini.
 *
 * Dibatasi agar daftar pilihan tetap ringkas pada desa berpenduduk besar.
 */
export async function listAnggotaKandidat(
  villageId: number,
  kelompokId: number,
  limit = 500,
): Promise<LabelOption[]> {
  const taken = await db
    .select({ residentId: kelompokAnggota.residentId })
    .from(kelompokAnggota)
    .where(
      and(eq(kelompokAnggota.villageId, villageId), eq(kelompokAnggota.kelompokId, kelompokId)),
    );

  const takenIds = taken.map((row) => row.residentId);

  const filters: SQL[] = [eq(residents.villageId, villageId)];
  if (takenIds.length > 0) filters.push(notInArray(residents.id, takenIds));

  const rows = await db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(and(...filters))
    .orderBy(asc(residents.name))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    label: row.nationalId ? `${row.name} — ${row.nationalId}` : row.name,
  }));
}

/**
 * Seluruh keanggotaan kelompok untuk laporan terperinci.
 *
 * Satu query dengan join ke penduduk, kelompok, kategori, dan filter tenant di
 * kedua tabel keanggotaan & kelompok. Anggota yang sudah dihapus tidak muncul
 * karena baris keanggotaan ikut terhapus (cascade).
 */
export async function listLaporanAnggota(
  villageId: number,
  tipe: string,
): Promise<AnggotaLaporanRow[]> {
  const filters: SQL[] = [eq(kelompok.villageId, villageId)];
  if (isKelompokTipe(tipe)) filters.push(eq(kelompok.type, tipe));

  const rows = await db
    .select({
      kelompokId: kelompok.id,
      kelompokNama: kelompok.name,
      kelompokTipe: kelompok.type,
      kategoriNama: kelompokMaster.name,
      nama: residents.name,
      nationalId: residents.nationalId,
      position: kelompokAnggota.position,
      memberNumber: kelompokAnggota.memberNumber,
      decreeNumber: kelompokAnggota.decreeNumber,
    })
    .from(kelompokAnggota)
    .innerJoin(
      kelompok,
      and(eq(kelompokAnggota.kelompokId, kelompok.id), eq(kelompok.villageId, villageId)),
    )
    .innerJoin(
      residents,
      and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
    )
    .leftJoin(
      kelompokMaster,
      and(eq(kelompok.categoryId, kelompokMaster.id), eq(kelompokMaster.villageId, villageId)),
    )
    .where(and(eq(kelompokAnggota.villageId, villageId), ...filters));

  return rows.map((row) => ({
    kelompokId: row.kelompokId,
    kelompokNama: row.kelompokNama,
    kelompokTipe: row.kelompokTipe,
    kategoriNama: row.kategoriNama ?? null,
    nama: row.nama,
    nationalId: row.nationalId ?? null,
    position: row.position,
    memberNumber: row.memberNumber ?? null,
    decreeNumber: row.decreeNumber ?? null,
  }));
}

/** Daftar kategori kelompok milik desa, terurut menurut tipe lalu nama. */
export async function listKategoriKelompok(villageId: number): Promise<KategoriKelompokDTO[]> {
  const [rows, counts] = await Promise.all([
    db
      .select({ id: kelompokMaster.id, name: kelompokMaster.name, type: kelompokMaster.type })
      .from(kelompokMaster)
      .where(eq(kelompokMaster.villageId, villageId))
      .orderBy(asc(kelompokMaster.type), asc(kelompokMaster.name), asc(kelompokMaster.id)),
    db
      .select({ categoryId: kelompok.categoryId, total: count() })
      .from(kelompok)
      .where(eq(kelompok.villageId, villageId))
      .groupBy(kelompok.categoryId),
  ]);

  const countMap = new Map<number, number>();
  for (const row of counts) {
    if (row.categoryId !== null) countMap.set(row.categoryId, row.total);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    kelompokCount: countMap.get(row.id) ?? 0,
  }));
}

/** Apakah kategori sudah ada (desa sama, nama & tipe sama). */
export async function kategoriExists(
  villageId: number,
  name: string,
  type: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [
    eq(kelompokMaster.villageId, villageId),
    eq(kelompokMaster.name, name),
    eq(kelompokMaster.type, type),
  ];
  if (excludeId !== null) filters.push(ne(kelompokMaster.id, excludeId));

  const rows = await db
    .select({ id: kelompokMaster.id })
    .from(kelompokMaster)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

/** Apakah kategori sudah dipakai kelompok (menghalangi hapus). */
export async function kategoriIsUsed(villageId: number, categoryId: number): Promise<boolean> {
  const rows = await db
    .select({ id: kelompok.id })
    .from(kelompok)
    .where(and(eq(kelompok.villageId, villageId), eq(kelompok.categoryId, categoryId)))
    .limit(1);

  return rows.length > 0;
}

export async function findKategoriById(
  villageId: number,
  id: number,
): Promise<{ id: number; name: string; type: string } | null> {
  const [row] = await db
    .select({ id: kelompokMaster.id, name: kelompokMaster.name, type: kelompokMaster.type })
    .from(kelompokMaster)
    .where(and(eq(kelompokMaster.villageId, villageId), eq(kelompokMaster.id, id)))
    .limit(1);

  return row ?? null;
}

export async function insertKategori(
  villageId: number,
  input: KategoriKelompokFormInput,
): Promise<number> {
  const [inserted] = await db
    .insert(kelompokMaster)
    .values({ villageId, name: input.nama, type: input.tipe })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan kategori kelompok.");
  return inserted.id;
}

export async function updateKategori(
  villageId: number,
  id: number,
  input: KategoriKelompokFormInput,
): Promise<void> {
  await db
    .update(kelompokMaster)
    .set({ name: input.nama, type: input.tipe })
    .where(and(eq(kelompokMaster.villageId, villageId), eq(kelompokMaster.id, id)));
}

export async function deleteKategori(villageId: number, id: number): Promise<void> {
  await db
    .delete(kelompokMaster)
    .where(and(eq(kelompokMaster.villageId, villageId), eq(kelompokMaster.id, id)));
}

/**
 * Data referensi dialog anggota: kategori (untuk formulir kelompok) dan
 * penduduk kandidat.
 */
export async function getKelompokReference(
  villageId: number,
  kelompokId: number | null,
): Promise<KelompokReferenceData> {
  const [kategoriRows, penduduk] = await Promise.all([
    db
      .select({ id: kelompokMaster.id, name: kelompokMaster.name, type: kelompokMaster.type })
      .from(kelompokMaster)
      .where(eq(kelompokMaster.villageId, villageId))
      .orderBy(asc(kelompokMaster.type), asc(kelompokMaster.name)),
    kelompokId === null
      ? Promise.resolve([] as LabelOption[])
      : listAnggotaKandidat(villageId, kelompokId),
  ]);

  return {
    kategori: kategoriRows.map((row) => ({
      id: row.id,
      label: isKelompokTipe(row.type) ? `${row.name} (${row.type})` : row.name,
    })),
    penduduk,
  };
}
