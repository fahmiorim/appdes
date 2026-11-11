import "server-only";

import { and, asc, count, eq, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { regions, residents, rumahTangga } from "@/db/schema";
import {
  RTM_LEVEL_KEPALA,
  type RtmFilter,
  type RtmRekapInput,
  type RumahTanggaDTO,
  type RumahTanggaFormInput,
  type RumahTanggaListRow,
  type RumahTanggaMember,
} from "@/features/rumah-tangga/domain/rumah-tangga";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";

export interface ListRumahTanggaParams {
  villageId: number;
  /** Filter lanjutan (pencarian, kelas sosial, wilayah, kepemilikan BDT). */
  filter: RtmFilter;
  page: number;
  pageSize: number;
}

export interface RumahTanggaListResult {
  rows: RumahTanggaListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Ubah teks kosong menjadi `NULL` agar basis data tidak menyimpan string kosong. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Petakan baris `rtm` → DTO domain (kosakata Indonesia). */
function toDto(row: typeof rumahTangga.$inferSelect): RumahTanggaDTO {
  return {
    id: row.id,
    number: row.number,
    address: row.address,
    regionId: row.regionId,
    kelasSosial: row.kelasSosial,
    bdt: row.bdt,
  };
}

function formatRegionLabel(
  regionId: number | null,
  dusun: string | null,
  rw: string | null,
  rt: string | null,
): string | null {
  if (regionId === null) return null;
  return formatWilayahLabel({ dusun: dusun ?? "", rw: rw ?? "", rt: rt ?? "" });
}

/**
 * Bangun klausa WHERE daftar RTM.
 *
 * Penyaringan wilayah memakai kolom `regions`, jadi pemanggil wajib menyertakan
 * `leftJoin(regions, ...)` pada query-nya.
 */
function buildWhere(villageId: number, filter: RtmFilter): SQL {
  const villageFilter = eq(rumahTangga.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (filter.search) {
    const term = `%${filter.search}%`;
    const searchFilter = or(
      like(rumahTangga.number, term),
      like(rumahTangga.address, term),
      like(rumahTangga.bdt, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  if (filter.kelasSosial !== null) filters.push(eq(rumahTangga.kelasSosial, filter.kelasSosial));
  if (filter.dusun) filters.push(eq(regions.dusun, filter.dusun));
  if (filter.rw) filters.push(eq(regions.rw, filter.rw));
  if (filter.rt) filters.push(eq(regions.rt, filter.rt));

  if (filter.bdt === "ada") {
    filters.push(sql`(${rumahTangga.bdt} is not null and ${rumahTangga.bdt} <> '')`);
  } else if (filter.bdt === "tidak") {
    filters.push(sql`(${rumahTangga.bdt} is null or ${rumahTangga.bdt} = '')`);
  }

  return and(...filters) ?? villageFilter;
}

export async function listRumahTangga(
  params: ListRumahTanggaParams,
): Promise<RumahTanggaListResult> {
  const { villageId, filter, page, pageSize } = params;
  const where = buildWhere(villageId, filter);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        rtm: rumahTangga,
        dusun: regions.dusun,
        rw: regions.rw,
        rt: regions.rt,
      })
      .from(rumahTangga)
      .leftJoin(regions, eq(rumahTangga.regionId, regions.id))
      .where(where)
      .orderBy(asc(rumahTangga.number), asc(rumahTangga.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(rumahTangga)
      .leftJoin(regions, eq(rumahTangga.regionId, regions.id))
      .where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const ids = rows.map((row) => row.rtm.id);

  // Agregasi anggota diambil sekali untuk halaman ini, lalu digabung di memori —
  // menghindari subquery berkorelasi per baris.
  const [counts, heads] = await Promise.all([
    listAnggotaCounts(villageId, ids),
    listKepalaRumahTangga(villageId, ids),
  ]);

  return {
    rows: rows.map((row) => ({
      ...toDto(row.rtm),
      headName: heads.get(row.rtm.id) ?? null,
      memberCount: counts.get(row.rtm.id) ?? 0,
      regionLabel: formatRegionLabel(row.rtm.regionId, row.dusun, row.rw, row.rt),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Jumlah anggota per rumah tangga untuk sekumpulan id (satu query). */
async function listAnggotaCounts(
  villageId: number,
  rtmIds: readonly number[],
): Promise<Map<number, number>> {
  if (rtmIds.length === 0) return new Map();

  const rows = await db
    .select({ rtmId: residents.rtmId, total: count() })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), inArray(residents.rtmId, [...rtmIds])))
    .groupBy(residents.rtmId);

  const result = new Map<number, number>();
  for (const row of rows) {
    if (row.rtmId !== null) result.set(row.rtmId, row.total);
  }
  return result;
}

/** Nama kepala rumah tangga per RTM untuk sekumpulan id (satu query). */
async function listKepalaRumahTangga(
  villageId: number,
  rtmIds: readonly number[],
): Promise<Map<number, string>> {
  if (rtmIds.length === 0) return new Map();

  const rows = await db
    .select({ rtmId: residents.rtmId, name: residents.name })
    .from(residents)
    .where(
      and(
        eq(residents.villageId, villageId),
        eq(residents.rtmLevel, RTM_LEVEL_KEPALA),
        inArray(residents.rtmId, [...rtmIds]),
      ),
    )
    .orderBy(asc(residents.id));

  const result = new Map<number, string>();
  for (const row of rows) {
    if (row.rtmId !== null && !result.has(row.rtmId)) {
      result.set(row.rtmId, row.name);
    }
  }
  return result;
}

export async function findRumahTanggaById(
  villageId: number,
  id: number,
): Promise<RumahTanggaDTO | null> {
  const [row] = await db
    .select()
    .from(rumahTangga)
    .where(and(eq(rumahTangga.villageId, villageId), eq(rumahTangga.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

/** Apakah nomor RTM sudah dipakai rumah tangga lain di desa yang sama. */
export async function rumahTanggaNumberExists(
  villageId: number,
  number: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(rumahTangga.villageId, villageId), eq(rumahTangga.number, number)];

  if (excludeId !== null) {
    filters.push(ne(rumahTangga.id, excludeId));
  }

  const duplicates = await db
    .select({ id: rumahTangga.id })
    .from(rumahTangga)
    .where(and(...filters))
    .limit(1);

  return duplicates.length > 0;
}

/**
 * Jumlah rumah tangga di desa.
 *
 * Dipakai untuk membangkitkan nomor urut berikutnya; dihitung ulang saat
 * menyimpan sehingga celah akibat penghapusan tidak menghasilkan nomor ganda
 * (indeks unik tetap menjadi pengaman terakhir).
 */
export async function countRumahTangga(villageId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(rumahTangga)
    .where(eq(rumahTangga.villageId, villageId));

  return row?.value ?? 0;
}

/** Anggota sebuah RTM, terurut dengan kepala rumah tangga di depan. */
export async function listRumahTanggaMembers(
  villageId: number,
  rtmId: number,
): Promise<RumahTanggaMember[]> {
  const rows = await db
    .select({
      id: residents.id,
      name: residents.name,
      nationalId: residents.nationalId,
      level: residents.rtmLevel,
    })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.rtmId, rtmId)));

  return rows
    .sort((a, b) => {
      const aHead = a.level === RTM_LEVEL_KEPALA ? 0 : 1;
      const bHead = b.level === RTM_LEVEL_KEPALA ? 0 : 1;
      return aHead - bHead || a.name.localeCompare(b.name, "id") || a.id - b.id;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      nationalId: row.nationalId,
      level: row.level,
    }));
}

export async function insertRumahTangga(
  villageId: number,
  number: string,
  input: RumahTanggaFormInput,
): Promise<number> {
  const [inserted] = await db
    .insert(rumahTangga)
    .values({
      villageId,
      number,
      address: blankToNull(input.alamat),
      regionId: input.regionId,
      kelasSosial: input.kelasSosial,
      bdt: blankToNull(input.bdt),
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data rumah tangga.");
  return inserted.id;
}

export async function updateRumahTangga(id: number, input: RumahTanggaFormInput): Promise<void> {
  await db
    .update(rumahTangga)
    .set({
      address: blankToNull(input.alamat),
      regionId: input.regionId,
      kelasSosial: input.kelasSosial,
      bdt: blankToNull(input.bdt),
    })
    .where(eq(rumahTangga.id, id));
}

/**
 * Hapus RTM.
 *
 * Tautan penduduk dilepas otomatis oleh basis data (`ON DELETE SET NULL`),
 * sehingga data penduduk tidak ikut terhapus.
 */
export async function deleteRumahTangga(id: number): Promise<void> {
  await db.delete(rumahTangga).where(eq(rumahTangga.id, id));
}

/** Setel (atau lepas) keanggotaan RTM seorang penduduk beserta tingkatnya. */
export async function setAnggotaRumahTangga(
  villageId: number,
  residentId: number,
  rtmId: number | null,
  level: number | null,
): Promise<void> {
  await db
    .update(residents)
    .set({ rtmId, rtmLevel: rtmId === null ? null : level })
    .where(and(eq(residents.villageId, villageId), eq(residents.id, residentId)));
}

// --- Laporan & filter ------------------------------------------------------

/**
 * Nilai kelas sosial yang benar-benar dipakai data desa.
 *
 * Pilihan filter dibangkitkan dari data agar tidak menawarkan kelas yang tidak
 * pernah ada di desa tersebut.
 */
export async function listKelasSosialOptions(villageId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ kelasSosial: rumahTangga.kelasSosial })
    .from(rumahTangga)
    .where(eq(rumahTangga.villageId, villageId))
    .orderBy(asc(rumahTangga.kelasSosial));

  return rows
    .map((row) => row.kelasSosial)
    .filter((nilai): nilai is number => nilai !== null)
    .sort((a, b) => a - b);
}

/**
 * Baris ringkas seluruh RTM untuk laporan (kelas sosial, dusun, jumlah anggota).
 *
 * Jumlah anggota dihitung satu query agregat, bukan per baris, agar laporan
 * tetap ringan walau RTM-nya banyak.
 */
export async function listRtmRingkas(
  villageId: number,
  filter: RtmFilter,
): Promise<RtmRekapInput[]> {
  const where = buildWhere(villageId, filter);

  const rows = await db
    .select({
      id: rumahTangga.id,
      kelasSosial: rumahTangga.kelasSosial,
      dusun: regions.dusun,
    })
    .from(rumahTangga)
    .leftJoin(regions, eq(rumahTangga.regionId, regions.id))
    .where(where)
    .orderBy(asc(rumahTangga.number));

  const jumlahAnggota = await db
    .select({ rtmId: residents.rtmId, value: count() })
    .from(residents)
    .where(eq(residents.villageId, villageId))
    .groupBy(residents.rtmId);

  const petaAnggota = new Map<number, number>();
  for (const baris of jumlahAnggota) {
    if (baris.rtmId !== null) petaAnggota.set(baris.rtmId, Number(baris.value));
  }

  return rows.map((row) => ({
    kelasSosial: row.kelasSosial,
    dusun: row.dusun,
    anggota: petaAnggota.get(row.id) ?? 0,
  }));
}
