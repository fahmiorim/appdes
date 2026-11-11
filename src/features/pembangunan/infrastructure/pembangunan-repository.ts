import "server-only";

import { and, asc, count, desc, eq, like, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { pembangunanDokumentasi, pembangunanProyek } from "@/db/schema";
import {
  type DokumentasiFormInput,
  type PembangunanDokumentasiDTO,
  type PembangunanFormInput,
  type PembangunanProyekDTO,
} from "@/features/pembangunan/domain/pembangunan";

export interface ListPembangunanParams {
  villageId: number;
  search: string;
  tahun: number | null;
  status: string;
  page: number;
  pageSize: number;
}

export interface PembangunanListResult {
  rows: PembangunanProyekDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Teks kosong → `NULL`. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

function toDto(row: typeof pembangunanProyek.$inferSelect): PembangunanProyekDTO {
  return {
    id: row.id,
    judul: row.judul,
    slug: row.slug,
    deskripsi: row.deskripsi,
    lokasi: row.lokasi,
    tahunAnggaran: row.tahunAnggaran,
    sumberDana: row.sumberDana,
    anggaran: row.anggaran,
    volume: row.volume,
    satuan: row.satuan,
    pelaksana: row.pelaksana,
    mulai: row.mulai,
    selesai: row.selesai,
    status: row.status,
    progres: row.progres,
    hasil: row.hasil,
  };
}

function dokumentasiDto(
  row: typeof pembangunanDokumentasi.$inferSelect,
): PembangunanDokumentasiDTO {
  return {
    id: row.id,
    gambar: row.gambar,
    judul: row.judul,
    keterangan: row.keterangan,
    createdAt: row.createdAt ?? null,
  };
}

function buildWhere(params: ListPembangunanParams): SQL {
  const villageFilter = eq(pembangunanProyek.villageId, params.villageId);
  const filters: SQL[] = [villageFilter];

  if (params.search) {
    const term = `%${params.search}%`;
    const searchFilter = or(
      like(pembangunanProyek.judul, term),
      like(pembangunanProyek.deskripsi, term),
      like(pembangunanProyek.lokasi, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  if (params.tahun !== null) {
    filters.push(eq(pembangunanProyek.tahunAnggaran, params.tahun));
  }
  if (params.status !== "") {
    filters.push(eq(pembangunanProyek.status, params.status));
  }

  return and(...filters) ?? villageFilter;
}

export async function listPembangunan(
  params: ListPembangunanParams,
): Promise<PembangunanListResult> {
  const where = buildWhere(params);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(pembangunanProyek)
      .where(where)
      .orderBy(
        desc(pembangunanProyek.tahunAnggaran),
        desc(pembangunanProyek.createdAt),
        desc(pembangunanProyek.id),
      )
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: count() }).from(pembangunanProyek).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;

  return {
    rows: rows.map(toDto),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

/** Daftar tahun anggaran yang pernah dipakai di desa ini. */
export async function listTahunAnggaran(villageId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tahun: pembangunanProyek.tahunAnggaran })
    .from(pembangunanProyek)
    .where(eq(pembangunanProyek.villageId, villageId))
    .orderBy(desc(pembangunanProyek.tahunAnggaran));

  return rows.map((row) => row.tahun);
}

export async function findPembangunanById(
  villageId: number,
  id: number,
): Promise<PembangunanProyekDTO | null> {
  const [row] = await db
    .select()
    .from(pembangunanProyek)
    .where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

export async function findPembangunanBySlug(
  villageId: number,
  slug: string,
): Promise<PembangunanProyekDTO | null> {
  const [row] = await db
    .select()
    .from(pembangunanProyek)
    .where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.slug, slug)))
    .limit(1);

  return row ? toDto(row) : null;
}

export async function pembangunanSlugExists(
  villageId: number,
  slug: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [
    eq(pembangunanProyek.villageId, villageId),
    eq(pembangunanProyek.slug, slug),
  ];
  if (excludeId !== null) {
    filters.push(ne(pembangunanProyek.id, excludeId));
  }

  const rows = await db
    .select({ id: pembangunanProyek.id })
    .from(pembangunanProyek)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

export async function insertPembangunan(
  villageId: number,
  slug: string,
  input: PembangunanFormInput,
): Promise<number> {
  const [inserted] = await db
    .insert(pembangunanProyek)
    .values({
      villageId,
      judul: input.judul,
      slug,
      deskripsi: blankToNull(input.deskripsi),
      lokasi: blankToNull(input.lokasi),
      tahunAnggaran: input.tahunAnggaran,
      sumberDana: blankToNull(input.sumberDana ?? ""),
      anggaran: input.anggaran === null ? null : String(input.anggaran),
      volume: input.volume === null ? null : String(input.volume),
      satuan: blankToNull(input.satuan),
      pelaksana: blankToNull(input.pelaksana),
      mulai: input.mulai,
      selesai: input.selesai,
      status: input.status,
      progres: input.progres,
      hasil: blankToNull(input.hasil),
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data proyek pembangunan.");
  return inserted.id;
}

export async function updatePembangunan(
  id: number,
  slug: string,
  input: PembangunanFormInput,
): Promise<void> {
  await db
    .update(pembangunanProyek)
    .set({
      judul: input.judul,
      slug,
      deskripsi: blankToNull(input.deskripsi),
      lokasi: blankToNull(input.lokasi),
      tahunAnggaran: input.tahunAnggaran,
      sumberDana: blankToNull(input.sumberDana ?? ""),
      anggaran: input.anggaran === null ? null : String(input.anggaran),
      volume: input.volume === null ? null : String(input.volume),
      satuan: blankToNull(input.satuan),
      pelaksana: blankToNull(input.pelaksana),
      mulai: input.mulai,
      selesai: input.selesai,
      status: input.status,
      progres: input.progres,
      hasil: blankToNull(input.hasil),
    })
    .where(eq(pembangunanProyek.id, id));
}

/** Hapus proyek; dokumentasi ikut terhapus lewat `ON DELETE CASCADE`. */
export async function deletePembangunan(id: number): Promise<void> {
  await db.delete(pembangunanProyek).where(eq(pembangunanProyek.id, id));
}

export async function listDokumentasi(proyekId: number): Promise<PembangunanDokumentasiDTO[]> {
  const rows = await db
    .select()
    .from(pembangunanDokumentasi)
    .where(eq(pembangunanDokumentasi.proyekId, proyekId))
    .orderBy(asc(pembangunanDokumentasi.id));

  return rows.map(dokumentasiDto);
}

export async function findDokumentasiScoped(
  villageId: number,
  id: number,
): Promise<{ id: number; gambar: string; proyekId: number } | null> {
  const [row] = await db
    .select({
      id: pembangunanDokumentasi.id,
      gambar: pembangunanDokumentasi.gambar,
      proyekId: pembangunanDokumentasi.proyekId,
    })
    .from(pembangunanDokumentasi)
    .innerJoin(pembangunanProyek, eq(pembangunanDokumentasi.proyekId, pembangunanProyek.id))
    .where(and(eq(pembangunanDokumentasi.id, id), eq(pembangunanProyek.villageId, villageId)))
    .limit(1);

  return row ?? null;
}

export async function insertDokumentasi(
  proyekId: number,
  gambar: string,
  input: DokumentasiFormInput,
): Promise<number> {
  const [inserted] = await db
    .insert(pembangunanDokumentasi)
    .values({
      proyekId,
      gambar,
      judul: blankToNull(input.judul),
      keterangan: blankToNull(input.keterangan),
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan dokumentasi proyek.");
  return inserted.id;
}

export async function deleteDokumentasi(id: number): Promise<void> {
  await db.delete(pembangunanDokumentasi).where(eq(pembangunanDokumentasi.id, id));
}

/** Proyek untuk situs publik (sadar-tenant, tanpa izin admin). */
export async function listPembangunanPublik(
  villageId: number,
  tahun: number | null,
): Promise<PembangunanProyekDTO[]> {
  const filters: SQL[] = [eq(pembangunanProyek.villageId, villageId)];
  if (tahun !== null) filters.push(eq(pembangunanProyek.tahunAnggaran, tahun));

  const rows = await db
    .select()
    .from(pembangunanProyek)
    .where(and(...filters))
    .orderBy(
      desc(pembangunanProyek.tahunAnggaran),
      desc(pembangunanProyek.mulai),
      desc(pembangunanProyek.id),
    );

  return rows.map(toDto);
}

/** Ringkasan agregat proyek untuk halaman publik. */
export interface RingkasanPembangunanPublik {
  total: number;
  selesai: number;
  berjalan: number;
  totalAnggaran: string;
}

export async function getRingkasanPembangunanPublik(
  villageId: number,
  tahun: number | null,
): Promise<RingkasanPembangunanPublik> {
  const filters: SQL[] = [eq(pembangunanProyek.villageId, villageId)];
  if (tahun !== null) filters.push(eq(pembangunanProyek.tahunAnggaran, tahun));

  const [row] = await db
    .select({
      total: count(),
      selesai: sql<number>`sum(case when ${pembangunanProyek.status} = 'selesai' then 1 else 0 end)`,
      berjalan: sql<number>`sum(case when ${pembangunanProyek.status} = 'berjalan' then 1 else 0 end)`,
      totalAnggaran: sql<string>`coalesce(sum(${pembangunanProyek.anggaran}), 0)`,
    })
    .from(pembangunanProyek)
    .where(and(...filters));

  return {
    total: row?.total ?? 0,
    selesai: Number(row?.selesai ?? 0),
    berjalan: Number(row?.berjalan ?? 0),
    totalAnggaran: String(row?.totalAnggaran ?? "0"),
  };
}

/** Apakah desa memiliki proyek pada tahun tertentu (untuk filter tahun publik). */
export async function listTahunPembangunanPublik(villageId: number): Promise<number[]> {
  return listTahunAnggaran(villageId);
}
