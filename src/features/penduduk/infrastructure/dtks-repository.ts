import "server-only";

import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { db } from "@/db";
import {
  dtks,
  dtksAnggota,
  dtksLampiran,
  dtksPengaturanProgram,
  dtksRefLampiran,
  families,
  regions,
  residents,
  rumahTangga,
  type DtksLampiran,
  type DtksPengaturanProgram,
} from "@/db/schema";
import {
  type DtksAnggotaRow,
  type DtksDetailDTO,
  type DtksListRow,
  type DtksUpdateInput,
  type DtksVersi,
  type ListDtksParams,
  type ListDtksResult,
} from "@/features/penduduk/domain/dtks";
import type { DtksEksporRow } from "@/features/penduduk/domain/dtks-berkas";
import { RTM_LEVEL_KEPALA } from "@/features/rumah-tangga/domain/rumah-tangga";

/** Alias `residents` untuk mengambil kepala rumah tangga tiap RTM. */
const head = alias(residents, "head");

/**
 * Klausa WHERE daftar DTKS.
 *
 * Disatukan agar daftar, ekspor, dan rekapitulasi memakai filter yang sama
 * persis — angka pada laporan selalu cocok dengan tabel yang dilihat pengguna.
 */
function whereDtks(villageId: number, params: ListDtksParams): SQL {
  const filters: SQL[] = [eq(dtks.villageId, villageId)];

  if (params.status) filters.push(eq(dtks.status, params.status));
  if (params.dusun) filters.push(eq(regions.dusun, params.dusun));
  if (params.search) {
    const term = `%${params.search}%`;
    // Pencarian nama/NIK anggota memakai EXISTS agar baris DTKS tidak
    // terduplikasi (satu RTM bisa punya banyak penduduk) dan query hitung
    // tidak merujuk tabel yang tidak di-join.
    filters.push(
      or(
        like(rumahTangga.number, term),
        sql`exists (select 1 from ${residents} where ${residents.rtmId} = ${rumahTangga.id} and ${residents.villageId} = ${villageId} and (${residents.name} like ${term} or ${residents.nationalId} like ${term}))`,
      )!,
    );
  }

  return and(...filters)!;
}

export async function listDtks(villageId: number, params: ListDtksParams): Promise<ListDtksResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 10));
  const offset = (page - 1) * perPage;

  const filters: SQL[] = [eq(dtks.villageId, villageId)];

  if (params.status) {
    filters.push(eq(dtks.status, params.status));
  }
  if (params.dusun) {
    filters.push(eq(regions.dusun, params.dusun));
  }
  if (params.search) {
    const term = `%${params.search}%`;
    // Pencarian nama/NIK anggota memakai EXISTS agar baris DTKS tidak
    // terduplikasi (satu RTM bisa punya banyak penduduk) dan query hitung
    // tidak merujuk tabel yang tidak di-join.
    filters.push(
      or(
        like(rumahTangga.number, term),
        sql`exists (select 1 from ${residents} where ${residents.rtmId} = ${rumahTangga.id} and ${residents.villageId} = ${villageId} and (${residents.name} like ${term} or ${residents.nationalId} like ${term}))`,
      )!,
    );
  }

  const where = and(...filters);

  const [totalRes, kepalaRtmList, anggotaCounts] = await Promise.all([
    db
      .select({ value: count() })
      .from(dtks)
      // JOIN tenant-scoped: relasi legacy lintas desa tidak boleh ikut
      // menghitung atau menampilkan identitas desa lain.
      .leftJoin(
        rumahTangga,
        and(eq(dtks.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
      )
      .leftJoin(families, and(eq(dtks.keluargaId, families.id), eq(families.villageId, villageId)))
      .leftJoin(
        regions,
        and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)),
      )
      .where(where),
    // Ambil kepala RTM
    db
      .select({
        rtmId: rumahTangga.id,
        nama: residents.name,
        nik: residents.nationalId,
      })
      .from(rumahTangga)
      .innerJoin(
        residents,
        and(
          eq(residents.rtmId, rumahTangga.id),
          eq(residents.rtmLevel, 1),
          eq(residents.villageId, villageId),
        ),
      )
      .where(eq(rumahTangga.villageId, villageId)),
    // Hitung jumlah anggota DTKS per form
    db
      .select({
        dtksId: dtksAnggota.dtksId,
        count: count(),
      })
      .from(dtksAnggota)
      .innerJoin(dtks, and(eq(dtksAnggota.dtksId, dtks.id), eq(dtks.villageId, villageId)))
      .where(eq(dtksAnggota.villageId, villageId))
      .groupBy(dtksAnggota.dtksId),
  ]);

  const total = totalRes[0]?.value ?? 0;
  const kepalaMap = new Map(kepalaRtmList.map((k) => [k.rtmId, { name: k.nama, nik: k.nik }]));
  const countMap = new Map(anggotaCounts.map((c) => [c.dtksId, c.count]));

  const detailedRows = await db
    .select({
      id: dtks.id,
      rtmId: dtks.rtmId,
      villageId: dtks.villageId,
      rtmNumber: rumahTangga.number,
      dusun: regions.dusun,
      rw: regions.rw,
      rt: regions.rt,
      versiKuisioner: dtks.versiKuisioner,
      status: dtks.status,
      updatedAt: dtks.updatedAt,
      keluargaNumber: families.number,
    })
    .from(dtks)
    .leftJoin(
      rumahTangga,
      and(eq(dtks.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
    )
    .leftJoin(families, and(eq(dtks.keluargaId, families.id), eq(families.villageId, villageId)))
    .leftJoin(regions, and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)))
    .where(where)
    .orderBy(desc(dtks.updatedAt))
    .limit(perPage)
    .offset(offset);

  const mappedRows: DtksListRow[] = detailedRows.map((r) => {
    const krt = kepalaMap.get(r.rtmId);
    return {
      id: r.id,
      villageId: r.villageId,
      rtmNumber: r.rtmNumber ?? "-",
      rtmKepalaName: krt?.name ?? "-",
      rtmKepalaNik: krt?.nik ?? null,
      keluargaNumber: r.keluargaNumber ?? null,
      keluargaKepalaName: null,
      dusun: r.dusun ?? null,
      rw: r.rw ?? null,
      rt: r.rt ?? null,
      versiKuisioner: r.versiKuisioner,
      status: r.status,
      anggotaCount: countMap.get(r.id) ?? 0,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return {
    rows: mappedRows,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getDtksDetail(villageId: number, id: number): Promise<DtksDetailDTO | null> {
  const row = await db
    .select()
    .from(dtks)
    .where(and(eq(dtks.id, id), eq(dtks.villageId, villageId)))
    .limit(1);

  if (!row[0]) return null;

  return {
    ...row[0],
    tanggalPencacahan: row[0].tanggalPencacahan,
    tanggalPemeriksaan: row[0].tanggalPemeriksaan,
    createdAt: row[0].createdAt.toISOString(),
    updatedAt: row[0].updatedAt.toISOString(),
  };
}

export async function listDtksAnggota(
  villageId: number,
  dtksId: number,
): Promise<DtksAnggotaRow[]> {
  const rows = await db
    .select({
      id: dtksAnggota.id,
      pendudukId: dtksAnggota.pendudukId,
      name: residents.name,
      nationalId: residents.nationalId,
      gender: residents.gender,
      birthDate: residents.birthDate,
      hubunganId: dtksAnggota.hubunganId,
      statusAnggota: dtksAnggota.statusAnggota,
      keterangan: dtksAnggota.keterangan,
    })
    .from(dtksAnggota)
    // Parent DTKS harus milik tenant yang sama, dan identitas penduduk hanya
    // dibaca dari residents tenant tersebut.
    .innerJoin(dtks, and(eq(dtksAnggota.dtksId, dtks.id), eq(dtks.villageId, villageId)))
    .innerJoin(
      residents,
      and(eq(dtksAnggota.pendudukId, residents.id), eq(residents.villageId, villageId)),
    )
    .where(and(eq(dtksAnggota.dtksId, dtksId), eq(dtksAnggota.villageId, villageId)));

  return rows;
}

/** Buat DTKS baru dari RTM atau sinkronisasi anggota RTM ke anggota DTKS. */
export async function createOrGetDtks(
  villageId: number,
  rtmId: number,
  versiKuisioner: DtksVersi = "regsos_ek2022_k",
): Promise<number> {
  // Cek apakah sudah ada
  const existing = await db
    .select({ id: dtks.id })
    .from(dtks)
    .where(
      and(
        eq(dtks.villageId, villageId),
        eq(dtks.rtmId, rtmId),
        eq(dtks.versiKuisioner, versiKuisioner),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  // Buat baru
  const [created] = await db.insert(dtks).values({
    villageId,
    rtmId,
    versiKuisioner,
    status: "draf",
  });

  const dtksId = Number(created.insertId);

  // Otomatis masukkan seluruh penduduk dalam RTM ke dtks_anggota
  const rtmResidents = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.rtmId, rtmId)));

  if (rtmResidents.length > 0) {
    await db.insert(dtksAnggota).values(
      rtmResidents.map((res) => ({
        villageId,
        dtksId,
        pendudukId: res.id,
        statusAnggota: "aktif",
      })),
    );
  }

  return dtksId;
}

export async function deleteDtks(villageId: number, id: number): Promise<void> {
  await db.delete(dtks).where(and(eq(dtks.id, id), eq(dtks.villageId, villageId)));
}

export async function updateDtks(
  villageId: number,
  id: number,
  input: DtksUpdateInput,
): Promise<void> {
  await db
    .update(dtks)
    .set({
      status: input.status,
      tanggalPencacahan: input.tanggalPencacahan || null,
      tanggalPemeriksaan: input.tanggalPemeriksaan || null,
      namaPetugasPencacahan: input.namaPetugasPencacahan || null,
      namaResponden: input.namaResponden || null,
      keterangan: input.keterangan || null,
      updatedAt: new Date(),
    })
    .where(and(eq(dtks.id, id), eq(dtks.villageId, villageId)));
}

// --- Ekspor & laporan ------------------------------------------------------

/**
 * Seluruh baris DTKS (tanpa pagination) untuk ekspor CSV dan rekapitulasi.
 *
 * Jumlah anggota diambil dari tabel anggota (bukan RTM) supaya angka pada
 * laporan sama dengan yang dilihat pengguna di formulir.
 */
export async function listDtksEkspor(
  villageId: number,
  params: ListDtksParams,
): Promise<DtksEksporRow[]> {
  const where = whereDtks(villageId, params);

  const rows = await db
    .select({
      id: dtks.id,
      noRtm: rumahTangga.number,
      kepalaRtm: head.name,
      status: dtks.status,
      dusun: regions.dusun,
      namaPetugas: dtks.namaPetugasPencacahan,
      namaResponden: dtks.namaResponden,
      tanggalPencacahan: dtks.tanggalPencacahan,
      namaKk: families.number,
    })
    .from(dtks)
    .leftJoin(
      rumahTangga,
      and(eq(dtks.rtmId, rumahTangga.id), eq(rumahTangga.villageId, villageId)),
    )
    .leftJoin(regions, and(eq(rumahTangga.regionId, regions.id), eq(regions.villageId, villageId)))
    .leftJoin(families, and(eq(dtks.keluargaId, families.id), eq(families.villageId, villageId)))
    .leftJoin(
      head,
      and(
        eq(head.rtmId, dtks.rtmId),
        eq(head.rtmLevel, RTM_LEVEL_KEPALA),
        eq(head.villageId, villageId),
      ),
    )
    .where(where)
    .orderBy(asc(rumahTangga.number));

  // Query agregat, bukan subquery berkorelasi: Drizzle merender kolom subquery
  // tanpa kualifikasi tabel sehingga `id` menunjuk `dtks_anggota.id`.
  const anggotaRows =
    rows.length === 0
      ? []
      : await db
          .select({ dtksId: dtksAnggota.dtksId, jumlah: count() })
          .from(dtksAnggota)
          .innerJoin(dtks, and(eq(dtksAnggota.dtksId, dtks.id), eq(dtks.villageId, villageId)))
          .where(
            and(
              eq(dtksAnggota.villageId, villageId),
              inArray(
                dtksAnggota.dtksId,
                rows.map((row) => row.id),
              ),
            ),
          )
          .groupBy(dtksAnggota.dtksId);
  const anggotaByDtks = new Map(anggotaRows.map((row) => [row.dtksId, Number(row.jumlah ?? 0)]));

  return rows.map((row) => ({
    id: row.id,
    noRtm: row.noRtm ?? "-",
    kepalaRtm: row.kepalaRtm ?? null,
    status: row.status,
    jumlahAnggota: anggotaByDtks.get(row.id) ?? 0,
    dusun: row.dusun ?? null,
    namaPetugas: row.namaPetugas ?? null,
    namaResponden: row.namaResponden ?? null,
    tanggalPencacahan: row.tanggalPencacahan ?? null,
    namaKk: row.namaKk ?? null,
  }));
}

/** Id RTM untuk sekumpulan nomor RTM pada desa ini (dipakai impor). */
export async function findRtmIdsByNumbers(
  villageId: number,
  numbers: readonly string[],
): Promise<Map<string, number>> {
  if (numbers.length === 0) return new Map();

  const rows = await db
    .select({ id: rumahTangga.id, number: rumahTangga.number })
    .from(rumahTangga)
    .where(and(eq(rumahTangga.villageId, villageId), inArray(rumahTangga.number, [...numbers])));

  return new Map(rows.map((row) => [row.number, row.id]));
}

// --- Lampiran --------------------------------------------------------------

/** Lampiran milik desa, terbaru lebih dahulu. */
export async function listLampiranDtks(villageId: number): Promise<DtksLampiran[]> {
  return db
    .select()
    .from(dtksLampiran)
    .where(eq(dtksLampiran.villageId, villageId))
    .orderBy(desc(dtksLampiran.createdAt));
}

/** Lampiran yang sudah ditautkan ke sebuah DTKS. */
export async function listLampiranTerpasang(
  villageId: number,
  dtksId: number,
): Promise<DtksLampiran[]> {
  return db
    .select({
      id: dtksLampiran.id,
      villageId: dtksLampiran.villageId,
      nama: dtksLampiran.nama,
      berkas: dtksLampiran.berkas,
      keterangan: dtksLampiran.keterangan,
      createdAt: dtksLampiran.createdAt,
    })
    .from(dtksRefLampiran)
    .innerJoin(
      dtksLampiran,
      and(
        eq(dtksRefLampiran.lampiranId, dtksLampiran.id),
        eq(dtksRefLampiran.villageId, dtksLampiran.villageId),
      ),
    )
    .innerJoin(
      dtks,
      and(eq(dtksRefLampiran.dtksId, dtks.id), eq(dtksRefLampiran.villageId, dtks.villageId)),
    )
    .where(and(eq(dtksRefLampiran.dtksId, dtksId), eq(dtksRefLampiran.villageId, villageId)))
    .orderBy(desc(dtksLampiran.createdAt));
}

export async function insertLampiranDtks(input: {
  villageId: number;
  nama: string;
  berkas: string;
  keterangan: string | null;
}): Promise<number> {
  const [inserted] = await db.insert(dtksLampiran).values(input).$returningId();
  return inserted?.id ?? 0;
}

export async function deleteLampiranDtks(villageId: number, id: number): Promise<void> {
  await db
    .delete(dtksLampiran)
    .where(and(eq(dtksLampiran.id, id), eq(dtksLampiran.villageId, villageId)));
}

/**
 * Pastikan DTKS dan lampiran benar-benar milik desa yang sama sebelum relasi
 * dibuat atau dilepas. Tabel relasi tidak memiliki `village_id`, sehingga
 * kepemilikan harus diverifikasi dari kedua parent.
 */
async function pastikanLampiranDanDtksSatuDesa(
  villageId: number,
  dtksId: number,
  lampiranId: number,
): Promise<void> {
  const [dtksRow] = await db
    .select({ id: dtks.id })
    .from(dtks)
    .where(and(eq(dtks.id, dtksId), eq(dtks.villageId, villageId)))
    .limit(1);
  if (!dtksRow) throw new Error("Data DTKS tidak ditemukan.");

  const [lampiranRow] = await db
    .select({ id: dtksLampiran.id })
    .from(dtksLampiran)
    .where(and(eq(dtksLampiran.id, lampiranId), eq(dtksLampiran.villageId, villageId)))
    .limit(1);
  if (!lampiranRow) throw new Error("Lampiran tidak ditemukan.");
}

export async function tautkanLampiran(
  villageId: number,
  dtksId: number,
  lampiranId: number,
): Promise<void> {
  await pastikanLampiranDanDtksSatuDesa(villageId, dtksId, lampiranId);
  await db.insert(dtksRefLampiran).ignore().values({ villageId, dtksId, lampiranId }).execute();
}

export async function lepasLampiran(
  villageId: number,
  dtksId: number,
  lampiranId: number,
): Promise<void> {
  await pastikanLampiranDanDtksSatuDesa(villageId, dtksId, lampiranId);
  await db
    .delete(dtksRefLampiran)
    .where(
      and(
        eq(dtksRefLampiran.villageId, villageId),
        eq(dtksRefLampiran.dtksId, dtksId),
        eq(dtksRefLampiran.lampiranId, lampiranId),
      ),
    );
}

// --- Pengaturan program -----------------------------------------------------

/** Daftar program bansos yang dikonfigurasi untuk desa. */
export async function listPengaturanProgram(villageId: number): Promise<DtksPengaturanProgram[]> {
  return db
    .select()
    .from(dtksPengaturanProgram)
    .where(eq(dtksPengaturanProgram.villageId, villageId))
    .orderBy(asc(dtksPengaturanProgram.namaProgram));
}

/**
 * Tambah/ubah program berdasarkan kode programnya.
 *
 * Kode program unik per desa, jadi operasi ini bersifat "simpan atau perbarui"
 * tanpa perlu pengguna memilih id lama.
 */
export async function upsertPengaturanProgram(input: {
  villageId: number;
  kodeProgram: string;
  namaProgram: string;
  aktif: boolean;
}): Promise<void> {
  await db
    .insert(dtksPengaturanProgram)
    .values({
      villageId: input.villageId,
      kodeProgram: input.kodeProgram,
      namaProgram: input.namaProgram,
      aktif: input.aktif ? 1 : 0,
    })
    .onDuplicateKeyUpdate({
      set: {
        namaProgram: input.namaProgram,
        aktif: input.aktif ? 1 : 0,
      },
    });
}

export async function deletePengaturanProgram(villageId: number, id: number): Promise<void> {
  await db
    .delete(dtksPengaturanProgram)
    .where(and(eq(dtksPengaturanProgram.id, id), eq(dtksPengaturanProgram.villageId, villageId)));
}

/** Apakah RTM dengan id tersebut milik desa ini. */
export async function adaRumahTangga(villageId: number, rtmId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: rumahTangga.id })
    .from(rumahTangga)
    .where(and(eq(rumahTangga.id, rtmId), eq(rumahTangga.villageId, villageId)))
    .limit(1);

  return Boolean(row);
}

/** Seluruh RTM desa beserta nama/NIK kepala rumah tangganya. */
export async function listRumahTanggaDenganKepala(
  villageId: number,
): Promise<{ id: number; number: string; kepalaName: string | null; kepalaNik: string | null }[]> {
  return db
    .select({
      id: rumahTangga.id,
      number: rumahTangga.number,
      kepalaName: residents.name,
      kepalaNik: residents.nationalId,
    })
    .from(rumahTangga)
    .leftJoin(
      residents,
      and(
        eq(residents.rtmId, rumahTangga.id),
        eq(residents.rtmLevel, 1),
        eq(residents.villageId, villageId),
      ),
    )
    .where(eq(rumahTangga.villageId, villageId));
}
