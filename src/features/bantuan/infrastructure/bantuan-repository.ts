import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  like,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  bantuanPeserta,
  bantuanProgram,
  families,
  kelompok,
  kelompokAnggota,
  regions,
  residents,
  rumahTangga,
} from "@/db/schema";
import {
  SASARAN_KELOMPOK,
  SASARAN_KELUARGA,
  SASARAN_PENDUDUK,
  SASARAN_RUMAH_TANGGA,
  type BantuanDTO,
  type BantuanFormInput,
  type BantuanListRow,
  type BantuanReferenceOption,
  type PesertaBantuanRow,
  type PesertaFormInput,
  type SasaranOption,
} from "@/features/bantuan/domain/bantuan";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";

export interface ListBantuanParams {
  villageId: number;
  search: string;
  page: number;
  pageSize: number;
}

export interface BantuanListResult {
  rows: BantuanListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Ubah teks kosong menjadi `NULL` agar basis data tidak menyimpan string kosong. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Petakan baris `bantuan_program` → DTO domain (kosakata Indonesia). */
function toDto(row: typeof bantuanProgram.$inferSelect): BantuanDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sasaran: row.sasaran,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    asalDana: row.asalDana,
  };
}

/** Program bantuan yang terkait dengan penduduk langsung atau keanggotaannya. */
export async function listBantuanDiterimaWarga(
  villageId: number,
  residentId: number,
): Promise<BantuanDTO[]> {
  const targetProgram = or(
    and(eq(bantuanProgram.sasaran, SASARAN_PENDUDUK), eq(bantuanPeserta.residentId, residentId)),
    and(
      eq(bantuanProgram.sasaran, SASARAN_KELUARGA),
      isNotNull(families.id),
      isNotNull(residents.familyId),
      eq(bantuanPeserta.familyId, residents.familyId),
    ),
    and(
      eq(bantuanProgram.sasaran, SASARAN_RUMAH_TANGGA),
      isNotNull(rumahTangga.id),
      isNotNull(residents.rtmId),
      eq(bantuanPeserta.rtmId, residents.rtmId),
    ),
    and(
      eq(bantuanProgram.sasaran, SASARAN_KELOMPOK),
      isNotNull(kelompok.id),
      isNotNull(kelompokAnggota.id),
      eq(bantuanPeserta.kelompokId, kelompokAnggota.kelompokId),
    ),
  );

  if (!targetProgram) return [];

  return db
    .selectDistinct({
      id: bantuanProgram.id,
      name: bantuanProgram.name,
      slug: bantuanProgram.slug,
      sasaran: bantuanProgram.sasaran,
      description: bantuanProgram.description,
      startDate: bantuanProgram.startDate,
      endDate: bantuanProgram.endDate,
      asalDana: bantuanProgram.asalDana,
    })
    .from(bantuanPeserta)
    .innerJoin(
      bantuanProgram,
      and(
        eq(bantuanProgram.id, bantuanPeserta.programId),
        eq(bantuanProgram.villageId, villageId),
      ),
    )
    .innerJoin(residents, and(eq(residents.id, residentId), eq(residents.villageId, villageId)))
    .leftJoin(
      families,
      and(eq(families.id, residents.familyId), eq(families.villageId, villageId)),
    )
    .leftJoin(
      rumahTangga,
      and(eq(rumahTangga.id, residents.rtmId), eq(rumahTangga.villageId, villageId)),
    )
    .leftJoin(
      kelompok,
      and(eq(kelompok.id, bantuanPeserta.kelompokId), eq(kelompok.villageId, villageId)),
    )
    .leftJoin(
      kelompokAnggota,
      and(
        eq(kelompokAnggota.villageId, villageId),
        eq(kelompokAnggota.residentId, residentId),
        eq(kelompokAnggota.kelompokId, bantuanPeserta.kelompokId),
      ),
    )
    .where(
      and(
        eq(bantuanPeserta.villageId, villageId),
        eq(bantuanProgram.villageId, villageId),
        targetProgram,
      ),
    )
    .orderBy(asc(bantuanProgram.name), asc(bantuanProgram.id));
}

function buildWhere(villageId: number, search: string): SQL {
  const villageFilter = eq(bantuanProgram.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(
      like(bantuanProgram.name, term),
      like(bantuanProgram.slug, term),
      like(bantuanProgram.description, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  return and(...filters) ?? villageFilter;
}

export async function listBantuan(params: ListBantuanParams): Promise<BantuanListResult> {
  const { villageId, search, page, pageSize } = params;
  const where = buildWhere(villageId, search);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(bantuanProgram)
      .where(where)
      .orderBy(desc(bantuanProgram.createdAt), desc(bantuanProgram.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(bantuanProgram).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;
  const ids = rows.map((row) => row.id);

  // Ringkasan peserta diambil sekali untuk halaman ini lalu digabung di memori —
  // menghindari subquery berkorelasi per baris.
  const [pesertaCounts, wilayahCounts] = await Promise.all([
    listPesertaCounts(villageId, ids),
    listWilayahCounts(villageId, ids),
  ]);

  return {
    rows: rows.map((row) => ({
      ...toDto(row),
      pesertaCount: pesertaCounts.get(row.id) ?? 0,
      wilayahCount: wilayahCounts.get(row.id) ?? 0,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Jumlah peserta per program untuk sekumpulan id (satu query). */
async function listPesertaCounts(
  villageId: number,
  programIds: readonly number[],
): Promise<Map<number, number>> {
  if (programIds.length === 0) return new Map();

  const rows = await db
    .select({ programId: bantuanPeserta.programId, total: count() })
    .from(bantuanPeserta)
    .where(
      and(
        eq(bantuanPeserta.villageId, villageId),
        inArray(bantuanPeserta.programId, [...programIds]),
      ),
    )
    .groupBy(bantuanPeserta.programId);

  return new Map(rows.map((row) => [row.programId, row.total]));
}

/**
 * Jumlah wilayah berbeda yang dihuni peserta, per program.
 *
 * Wilayah diambil dari sasaran (penduduk → wilayah domisili, keluarga/RTM →
 * wilayah kartu). Untuk sasaran **kelompok**, wilayah diambil dari domisili
 * anggotanya (gabungan), karena kelompok sendiri tidak punya wilayah.
 */
async function listWilayahCounts(
  villageId: number,
  programIds: readonly number[],
): Promise<Map<number, number>> {
  if (programIds.length === 0) return new Map();

  const ids = [...programIds];
  const filters: SQL[] = [
    eq(bantuanPeserta.villageId, villageId),
    inArray(bantuanPeserta.programId, ids),
  ];

  const [pendudukRows, keluargaRows, rtmRows, kelompokRows] = await Promise.all([
    db
      .select({
        programId: bantuanPeserta.programId,
        regionId: regions.id,
      })
      .from(bantuanPeserta)
      .innerJoin(
        residents,
        and(eq(bantuanPeserta.residentId, residents.id), eq(residents.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters)),
    db
      .select({
        programId: bantuanPeserta.programId,
        regionId: regions.id,
      })
      .from(bantuanPeserta)
      .innerJoin(
        families,
        and(eq(bantuanPeserta.familyId, families.id), eq(families.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(families.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters)),
    db
      .select({
        programId: bantuanPeserta.programId,
        regionId: regions.id,
      })
      .from(bantuanPeserta)
      .innerJoin(
        rumahTangga,
        and(eq(bantuanPeserta.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters)),
    // Wilayah kelompok = domisili anggotanya.
    db
      .select({
        programId: bantuanPeserta.programId,
        regionId: regions.id,
      })
      .from(bantuanPeserta)
      .innerJoin(
        kelompokAnggota,
        and(
          eq(bantuanPeserta.kelompokId, kelompokAnggota.kelompokId),
          eq(kelompokAnggota.villageId, villageId),
        ),
      )
      .innerJoin(
        kelompok,
        and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
      )
      .innerJoin(
        residents,
        and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters)),
  ]);

  // Kumpulkan himpunan wilayah per program, lalu hitung kardinalitasnya.
  const buckets = new Map<number, Set<number | null>>();
  for (const row of [...pendudukRows, ...keluargaRows, ...rtmRows, ...kelompokRows]) {
    const set = buckets.get(row.programId) ?? new Set<number | null>();
    set.add(row.regionId);
    buckets.set(row.programId, set);
  }

  return new Map([...buckets].map(([programId, set]) => [programId, set.size]));
}

export async function findBantuanById(villageId: number, id: number): Promise<BantuanDTO | null> {
  const [row] = await db
    .select()
    .from(bantuanProgram)
    .where(and(eq(bantuanProgram.villageId, villageId), eq(bantuanProgram.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

/** Apakah slug program sudah dipakai program lain di desa yang sama. */
export async function bantuanSlugExists(
  villageId: number,
  slug: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(bantuanProgram.villageId, villageId), eq(bantuanProgram.slug, slug)];

  if (excludeId !== null) {
    filters.push(ne(bantuanProgram.id, excludeId));
  }

  const rows = await db
    .select({ id: bantuanProgram.id })
    .from(bantuanProgram)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

export async function insertBantuan(
  villageId: number,
  slug: string,
  input: BantuanFormInput,
): Promise<number> {
  const [inserted] = await db
    .insert(bantuanProgram)
    .values({
      villageId,
      name: input.nama,
      slug,
      sasaran: input.sasaran ?? SASARAN_PENDUDUK,
      description: blankToNull(input.keterangan),
      startDate: input.tanggalMulai,
      endDate: input.tanggalAkhir,
      asalDana: input.asalDana,
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data program bantuan.");
  return inserted.id;
}

export async function updateBantuan(
  villageId: number,
  id: number,
  slug: string,
  input: BantuanFormInput,
): Promise<void> {
  await db
    .update(bantuanProgram)
    .set({
      name: input.nama,
      slug,
      sasaran: input.sasaran ?? SASARAN_PENDUDUK,
      description: blankToNull(input.keterangan),
      startDate: input.tanggalMulai,
      endDate: input.tanggalAkhir,
      asalDana: input.asalDana,
    })
    .where(and(eq(bantuanProgram.villageId, villageId), eq(bantuanProgram.id, id)));
}

/** Hapus program; peserta ikut terhapus lewat `ON DELETE CASCADE`. */
export async function deleteBantuan(villageId: number, id: number): Promise<void> {
  await db
    .delete(bantuanProgram)
    .where(and(eq(bantuanProgram.villageId, villageId), eq(bantuanProgram.id, id)));
}

/** Jumlah peserta sebuah program (dipakai untuk memblokir penghapusan). */
export async function countPesertaByProgram(villageId: number, programId: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(bantuanPeserta)
    .where(and(eq(bantuanPeserta.villageId, villageId), eq(bantuanPeserta.programId, programId)));

  return row?.total ?? 0;
}

/** Ringkasan program bantuan untuk situs publik (tanpa izin admin, sadar-tenant). */
export interface BantuanProgramPublik {
  id: number;
  nama: string;
  slug: string;
  sasaran: number;
  asalDana: number | null;
}

export async function listBantuanProgramPublik(villageId: number): Promise<BantuanProgramPublik[]> {
  const rows = await db
    .select({
      id: bantuanProgram.id,
      nama: bantuanProgram.name,
      slug: bantuanProgram.slug,
      sasaran: bantuanProgram.sasaran,
      asalDana: bantuanProgram.asalDana,
    })
    .from(bantuanProgram)
    .where(eq(bantuanProgram.villageId, villageId))
    .orderBy(asc(bantuanProgram.name));

  return rows;
}

/** Ringkasan jumlah program dan peserta bantuan untuk statistik publik. */
export async function getRingkasanBantuanPublik(
  villageId: number,
): Promise<{ program: number; peserta: number }> {
  const [programRow, pesertaRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(bantuanProgram)
      .where(eq(bantuanProgram.villageId, villageId)),
    db
      .select({ value: count() })
      .from(bantuanPeserta)
      .where(eq(bantuanPeserta.villageId, villageId)),
  ]);

  return {
    program: programRow[0]?.value ?? 0,
    peserta: pesertaRow[0]?.value ?? 0,
  };
}

/**
 * Peserta sebuah program, diurutkan menurut nama sasaran.
 *
 * Kolom sasaran dipilih sesuai `sasaran` program, sehingga hanya satu join yang
 * dijalankan (bukan tiga join dengan dua di antaranya pasti kosong).
 */
export async function listPesertaProgram(
  villageId: number,
  program: BantuanDTO,
): Promise<PesertaBantuanRow[]> {
  const filters: SQL[] = [
    eq(bantuanPeserta.villageId, villageId),
    eq(bantuanPeserta.programId, program.id),
  ];

  const cardColumns = {
    id: bantuanPeserta.id,
    cardNumber: bantuanPeserta.cardNumber,
    cardName: bantuanPeserta.cardName,
    cardNationalId: bantuanPeserta.cardNationalId,
  };

  if (program.sasaran === SASARAN_KELUARGA) {
    const rows = await db
      .select({ ...cardColumns, targetName: families.number, targetIdentity: families.number })
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        families,
        and(eq(bantuanPeserta.familyId, families.id), eq(families.villageId, villageId)),
      )
      .where(and(...filters))
      .orderBy(asc(families.number));

    return rows.map((row) => ({
      ...row,
      targetName: `KK ${row.targetName}`,
      targetIdentity: row.targetIdentity,
    }));
  }

  if (program.sasaran === SASARAN_RUMAH_TANGGA) {
    const rows = await db
      .select({
        ...cardColumns,
        targetName: rumahTangga.number,
        targetIdentity: rumahTangga.number,
      })
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        rumahTangga,
        and(eq(bantuanPeserta.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
      )
      .where(and(...filters))
      .orderBy(asc(rumahTangga.number));

    return rows.map((row) => ({
      ...row,
      targetName: `RTM ${row.targetName}`,
      targetIdentity: row.targetIdentity,
    }));
  }

  if (program.sasaran === SASARAN_KELOMPOK) {
    // Nama kelompok sudah merupakan nama diri (mis. "Kelompok Tani Mekar"),
    // jadi tidak perlu diberi awalan seperti pada sasaran rumah tangga.
    return db
      .select({ ...cardColumns, targetName: kelompok.name, targetIdentity: kelompok.code })
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        kelompok,
        and(eq(bantuanPeserta.kelompokId, kelompok.id), eq(kelompok.villageId, villageId)),
      )
      .where(and(...filters))
      .orderBy(asc(kelompok.name));
  }

  const rows = await db
    .select({ ...cardColumns, targetName: residents.name, targetIdentity: residents.nationalId })
    .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
    .innerJoin(
        residents,
        and(eq(bantuanPeserta.residentId, residents.id), eq(residents.villageId, villageId)),
      )
    .where(and(...filters))
    .orderBy(asc(residents.name));

  return rows;
}

/** Sebaran wilayah sasaran peserta sebuah program (label → jumlah). */
export async function listSebaranWilayah(
  villageId: number,
  program: BantuanDTO,
): Promise<Array<{ label: string; total: number }>> {
  const filters: SQL[] = [
    eq(bantuanPeserta.villageId, villageId),
    eq(bantuanPeserta.programId, program.id),
  ];

  const regionColumns = {
    regionId: regions.id,
    dusun: regions.dusun,
    rw: regions.rw,
    rt: regions.rt,
    total: count(),
  };

  let rows: Array<{
    regionId: number | null;
    dusun: string | null;
    rw: string | null;
    rt: string | null;
    total: number;
  }>;

  if (program.sasaran === SASARAN_KELUARGA) {
    rows = await db
      .select(regionColumns)
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        families,
        and(eq(bantuanPeserta.familyId, families.id), eq(families.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(families.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters))
      .groupBy(regions.id, regions.dusun, regions.rw, regions.rt);
  } else if (program.sasaran === SASARAN_RUMAH_TANGGA) {
    rows = await db
      .select(regionColumns)
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        rumahTangga,
        and(eq(bantuanPeserta.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters))
      .groupBy(regions.id, regions.dusun, regions.rw, regions.rt);
  } else if (program.sasaran === SASARAN_KELOMPOK) {
    // Sebaran sasaran kelompok mengikuti domisili anggotanya.
    rows = await db
      .select(regionColumns)
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        kelompokAnggota,
        and(
          eq(bantuanPeserta.kelompokId, kelompokAnggota.kelompokId),
          eq(kelompokAnggota.villageId, villageId),
        ),
      )
      .innerJoin(
        kelompok,
        and(eq(kelompok.id, kelompokAnggota.kelompokId), eq(kelompok.villageId, villageId)),
      )
      .innerJoin(
        residents,
        and(eq(kelompokAnggota.residentId, residents.id), eq(residents.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters))
      .groupBy(regions.id, regions.dusun, regions.rw, regions.rt);
  } else {
    rows = await db
      .select(regionColumns)
      .from(bantuanPeserta)
      .innerJoin(
        bantuanProgram,
        and(
          eq(bantuanProgram.id, bantuanPeserta.programId),
          eq(bantuanProgram.villageId, villageId),
        ),
      )
      .innerJoin(
        residents,
        and(eq(bantuanPeserta.residentId, residents.id), eq(residents.villageId, villageId)),
      )
      .leftJoin(
        regions,
        and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(and(...filters))
      .groupBy(regions.id, regions.dusun, regions.rw, regions.rt);
  }

  return rows
    .map((row) => ({
      label:
        row.regionId === null
          ? "Wilayah belum diisi"
          : formatWilayahLabel({ dusun: row.dusun ?? "", rw: row.rw ?? "", rt: row.rt ?? "" }),
      total: row.total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "id"));
}

/** Kandidat sasaran penduduk yang belum menjadi peserta program. */
export async function listPendudukSasaran(
  villageId: number,
  programId: number,
): Promise<SasaranOption[]> {
  const taken = await listTakenIds(villageId, programId, "residentId");

  const rows = await db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(eq(residents.villageId, villageId))
    .orderBy(asc(residents.name), asc(residents.id));

  return rows
    .filter((row) => !taken.has(row.id))
    .map((row) => ({
      id: row.id,
      label: row.nationalId ? `${row.name} — ${row.nationalId}` : row.name,
    }));
}

/** Kandidat sasaran keluarga (KK) yang belum menjadi peserta program. */
export async function listKeluargaSasaran(
  villageId: number,
  programId: number,
): Promise<SasaranOption[]> {
  const taken = await listTakenIds(villageId, programId, "familyId");

  const rows = await db
    .select({ id: families.id, number: families.number, address: families.address })
    .from(families)
    .where(eq(families.villageId, villageId))
    .orderBy(asc(families.number));

  return rows
    .filter((row) => !taken.has(row.id))
    .map((row) => ({
      id: row.id,
      label: row.address ? `KK ${row.number} — ${row.address}` : `KK ${row.number}`,
    }));
}

/** Kandidat sasaran rumah tangga (RTM) yang belum menjadi peserta program. */
export async function listRumahTanggaSasaran(
  villageId: number,
  programId: number,
): Promise<SasaranOption[]> {
  const taken = await listTakenIds(villageId, programId, "rtmId");

  const rows = await db
    .select({
      id: rumahTangga.id,
      number: rumahTangga.number,
      address: rumahTangga.address,
      dusun: regions.dusun,
    })
    .from(rumahTangga)
    .leftJoin(
        regions,
        and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)),
      )
    .where(eq(rumahTangga.villageId, villageId))
    .orderBy(asc(rumahTangga.number));

  return rows
    .filter((row) => !taken.has(row.id))
    .map((row) => ({
      id: row.id,
      label: row.dusun ? `RTM ${row.number} — Dusun ${row.dusun}` : `RTM ${row.number}`,
    }));
}

/** Kandidat sasaran kelompok yang belum menjadi peserta program. */
export async function listKelompokSasaran(
  villageId: number,
  programId: number,
): Promise<SasaranOption[]> {
  const taken = await listTakenIds(villageId, programId, "kelompokId");

  const rows = await db
    .select({ id: kelompok.id, name: kelompok.name, code: kelompok.code })
    .from(kelompok)
    .where(eq(kelompok.villageId, villageId))
    .orderBy(asc(kelompok.name));

  return rows
    .filter((row) => !taken.has(row.id))
    .map((row) => ({
      id: row.id,
      label: row.code ? `${row.name} — ${row.code}` : row.name,
    }));
}

/**
 * Semua sasaran desa beserta kodenya, untuk mencocokkan berkas impor.
 *
 * Berbeda dari `list*Sasaran` (hanya kandidat), fungsi ini memuat seluruh
 * sasaran agar kode yang sudah terdaftar dapat dilaporkan terpisah sebagai
 * "sudah menjadi peserta".
 */
export async function listSasaranImpor(
  villageId: number,
  sasaran: number,
): Promise<Array<{ id: number; kode: string; nama: string }>> {
  if (sasaran === SASARAN_KELUARGA) {
    const rows = await db
      .select({ id: families.id, kode: families.number, nama: families.address })
      .from(families)
      .where(eq(families.villageId, villageId))
      .orderBy(asc(families.number));

    return rows
      .filter((row) => row.kode.trim() !== "")
      .map((row) => ({ id: row.id, kode: row.kode, nama: row.nama || `KK ${row.kode}` }));
  }

  if (sasaran === SASARAN_RUMAH_TANGGA) {
    const rows = await db
      .select({ id: rumahTangga.id, kode: rumahTangga.number, nama: rumahTangga.address })
      .from(rumahTangga)
      .where(eq(rumahTangga.villageId, villageId))
      .orderBy(asc(rumahTangga.number));

    return rows
      .filter((row) => row.kode.trim() !== "")
      .map((row) => ({ id: row.id, kode: row.kode, nama: row.nama || `RTM ${row.kode}` }));
  }

  if (sasaran === SASARAN_KELOMPOK) {
    const rows = await db
      .select({ id: kelompok.id, kode: kelompok.code, nama: kelompok.name })
      .from(kelompok)
      .where(eq(kelompok.villageId, villageId))
      .orderBy(asc(kelompok.name));

    return rows
      .filter((row): row is { id: number; kode: string; nama: string } => Boolean(row.kode))
      .map((row) => ({ id: row.id, kode: row.kode, nama: row.nama }));
  }

  const rows = await db
    .select({ id: residents.id, kode: residents.nationalId, nama: residents.name })
    .from(residents)
    .where(eq(residents.villageId, villageId))
    .orderBy(asc(residents.name), asc(residents.id));

  return rows
    .filter((row): row is { id: number; kode: string; nama: string } => Boolean(row.kode))
    .map((row) => ({ id: row.id, kode: row.kode, nama: row.nama }));
}

/** Id sasaran yang sudah terdaftar sebagai peserta program (semua jenis). */
export async function listPesertaSasaranIds(
  villageId: number,
  programId: number,
  sasaran: number,
): Promise<number[]> {
  const column =
    sasaran === SASARAN_KELUARGA
      ? "familyId"
      : sasaran === SASARAN_RUMAH_TANGGA
        ? "rtmId"
        : sasaran === SASARAN_KELOMPOK
          ? "kelompokId"
          : "residentId";

  return [...(await listTakenIds(villageId, programId, column))];
}

/** Id sasaran yang sudah terdaftar sebagai peserta sebuah program. */
async function listTakenIds(
  villageId: number,
  programId: number,
  column: "residentId" | "familyId" | "rtmId" | "kelompokId",
): Promise<Set<number>> {
  const target = bantuanPeserta[column];
  const rows = await db
    .select({ id: target })
    .from(bantuanPeserta)
    .innerJoin(
      bantuanProgram,
      and(
        eq(bantuanProgram.id, bantuanPeserta.programId),
        eq(bantuanProgram.villageId, villageId),
      ),
    )
    .where(
      and(
        eq(bantuanPeserta.villageId, villageId),
        eq(bantuanPeserta.programId, programId),
        sql`${target} is not null`,
      ),
    );

  return new Set(rows.map((row) => row.id).filter((id): id is number => id !== null));
}

/**
 * Penduduk desa beserta wilayah domisilinya.
 *
 * Dipakai untuk mengisi snapshot kartu peserta dari data master penduduk.
 */
export async function findPendudukSasaran(
  villageId: number,
  residentId: number,
): Promise<{
  name: string;
  nationalId: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  address: string | null;
  dusun: string | null;
  rw: string | null;
  rt: string | null;
} | null> {
  const [row] = await db
    .select({
      name: residents.name,
      nationalId: residents.nationalId,
      birthPlace: residents.birthPlace,
      birthDate: residents.birthDate,
      address: residents.address,
      dusun: regions.dusun,
      rw: regions.rw,
      rt: regions.rt,
    })
    .from(residents)
    .leftJoin(
        regions,
        and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)),
      )
    .where(and(eq(residents.villageId, villageId), eq(residents.id, residentId)))
    .limit(1);

  return row ?? null;
}

/** Nama & kode kelompok (dipakai sebagai snapshot kartu peserta kelompok). */
export async function findKelompokSasaran(
  villageId: number,
  kelompokId: number,
): Promise<{ name: string; code: string | null; decreeNumber: string | null } | null> {
  const [row] = await db
    .select({ name: kelompok.name, code: kelompok.code, decreeNumber: kelompok.decreeNumber })
    .from(kelompok)
    .where(and(eq(kelompok.villageId, villageId), eq(kelompok.id, kelompokId)))
    .limit(1);

  return row ?? null;
}

/** Alamat sasaran keluarga/RTM (dipakai sebagai snapshot alamat kartu). */
export async function findAlamatSasaran(
  villageId: number,
  kind: "keluarga" | "rumah-tangga",
  id: number,
): Promise<string | null> {
  if (kind === "keluarga") {
    const [row] = await db
      .select({ address: families.address })
      .from(families)
      .where(and(eq(families.villageId, villageId), eq(families.id, id)))
      .limit(1);
    return row?.address ?? null;
  }

  const [row] = await db
    .select({ address: rumahTangga.address })
    .from(rumahTangga)
    .where(and(eq(rumahTangga.villageId, villageId), eq(rumahTangga.id, id)))
    .limit(1);
  return row?.address ?? null;
}

/**
 * Simpan seorang peserta.
 *
 * Sasaran yang dipilih dipetakan ke kolom FK sesuai `sasaran` program, sehingga
 * hanya satu kolom yang terisi. Data kartu (bila kosong) diisi dari data master
 * sebagai nilai awal yang tetap boleh disunting.
 */
export async function insertPeserta(
  villageId: number,
  programId: number,
  sasaran: number,
  sasaranId: number,
  input: PesertaFormInput,
): Promise<void> {
  const [program] = await db
    .select({ id: bantuanProgram.id })
    .from(bantuanProgram)
    .where(and(eq(bantuanProgram.id, programId), eq(bantuanProgram.villageId, villageId)))
    .limit(1);
  if (!program) throw new Error("Program bantuan tidak ditemukan pada desa aktif.");

  let sasaranValid = false;
  if (sasaran === SASARAN_KELUARGA) {
    const [target] = await db
      .select({ id: families.id })
      .from(families)
      .where(and(eq(families.id, sasaranId), eq(families.villageId, villageId)))
      .limit(1);
    sasaranValid = Boolean(target);
  } else if (sasaran === SASARAN_RUMAH_TANGGA) {
    const [target] = await db
      .select({ id: rumahTangga.id })
      .from(rumahTangga)
      .where(and(eq(rumahTangga.id, sasaranId), eq(rumahTangga.villageId, villageId)))
      .limit(1);
    sasaranValid = Boolean(target);
  } else if (sasaran === SASARAN_KELOMPOK) {
    const [target] = await db
      .select({ id: kelompok.id })
      .from(kelompok)
      .where(and(eq(kelompok.id, sasaranId), eq(kelompok.villageId, villageId)))
      .limit(1);
    sasaranValid = Boolean(target);
  } else {
    const [target] = await db
      .select({ id: residents.id })
      .from(residents)
      .where(and(eq(residents.id, sasaranId), eq(residents.villageId, villageId)))
      .limit(1);
    sasaranValid = Boolean(target);
  }
  if (!sasaranValid) throw new Error("Sasaran bantuan tidak ditemukan pada desa aktif.");

  const values: typeof bantuanPeserta.$inferInsert = {
    villageId,
    programId,
    residentId: null,
    familyId: null,
    rtmId: null,
    kelompokId: null,
    cardNumber: blankToNull(input.nomorKartu),
    cardNationalId: input.kartuNik,
    cardName: blankToNull(input.kartuNama),
    cardBirthPlace: blankToNull(input.kartuTempatLahir),
    cardBirthDate: input.kartuTanggalLahir,
    cardAddress: blankToNull(input.kartuAlamat),
  };

  if (sasaran === SASARAN_KELUARGA) {
    values.familyId = sasaranId;
  } else if (sasaran === SASARAN_RUMAH_TANGGA) {
    values.rtmId = sasaranId;
  } else if (sasaran === SASARAN_KELOMPOK) {
    values.kelompokId = sasaranId;
  } else {
    values.residentId = sasaranId;
  }

  await db.insert(bantuanPeserta).values(values);
}

/** Hapus seorang peserta (scoped desa + program agar tidak lintas desa). */
export async function deletePeserta(
  villageId: number,
  programId: number,
  pesertaId: number,
): Promise<void> {
  await db
    .delete(bantuanPeserta)
    .where(
      and(
        eq(bantuanPeserta.villageId, villageId),
        eq(bantuanPeserta.programId, programId),
        eq(bantuanPeserta.id, pesertaId),
      ),
    );
}

/**
 * Perbarui snapshot kartu seorang peserta.
 *
 * Hanya kolom `card_*` yang boleh diubah; kolom sasaran (penduduk/keluarga/
 * rumah tangga/kelompok) tidak berubah — ganti peserta berarti keluarkan dulu.
 */
export async function updatePeserta(
  villageId: number,
  programId: number,
  pesertaId: number,
  input: Partial<PesertaFormInput>,
): Promise<boolean> {
  const affected = await db
    .update(bantuanPeserta)
    .set({
      cardNumber: input.nomorKartu !== undefined ? blankToNull(input.nomorKartu) : undefined,
      cardNationalId: input.kartuNik,
      cardName: input.kartuNama !== undefined ? blankToNull(input.kartuNama) : undefined,
      cardBirthPlace:
        input.kartuTempatLahir !== undefined ? blankToNull(input.kartuTempatLahir) : undefined,
      cardBirthDate: input.kartuTanggalLahir,
      cardAddress: input.kartuAlamat !== undefined ? blankToNull(input.kartuAlamat) : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bantuanPeserta.villageId, villageId),
        eq(bantuanPeserta.programId, programId),
        eq(bantuanPeserta.id, pesertaId),
      ),
    );

  return Number((affected as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

/** Hapus semua peserta sebuah program (pembersihan massal, scoped desa). */
export async function deleteAllPesertaByProgram(
  villageId: number,
  programId: number,
): Promise<number> {
  const res = await db
    .delete(bantuanPeserta)
    .where(and(eq(bantuanPeserta.villageId, villageId), eq(bantuanPeserta.programId, programId)));
  return Number((res as { affectedRows?: number }).affectedRows ?? 0);
}

/** Penduduk desa untuk memilih peserta (identitas ringkas + NIK). */
export async function listPendudukRingkas(villageId: number): Promise<BantuanReferenceOption[]> {
  const rows = await db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(eq(residents.villageId, villageId))
    .orderBy(asc(residents.name));

  return rows.map((row) => ({ id: row.id, label: row.name, detail: row.nationalId }));
}
