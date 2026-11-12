import "server-only";

import { and, asc, count, desc, eq, inArray, like, sql } from "drizzle-orm";

import { db } from "@/db";
import { families, residents, suplemen, suplemenTerdata } from "@/db/schema";
import {
  type ListSuplemenParams,
  type ListSuplemenResult,
  type SuplemenCreateInput,
  type SuplemenOption,
  type SuplemenTerdataInput,
  type SuplemenTerdataRow,
  type SuplemenUpdateInput,
} from "@/features/penduduk/domain/suplemen";
import { bacaIsian } from "@/features/penduduk/domain/suplemen-berkas";
import { slugify } from "@/lib/utils";

export async function listSuplemen(
  villageId: number,
  params: ListSuplemenParams,
): Promise<ListSuplemenResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 10));
  const offset = (page - 1) * perPage;

  const filters = [eq(suplemen.villageId, villageId)];
  if (params.search) {
    filters.push(like(suplemen.nama, `%${params.search}%`));
  }
  if (params.sasaran) {
    filters.push(eq(suplemen.sasaran, params.sasaran));
  }

  const where = and(...filters);

  const [totalRes, rows] = await Promise.all([
    db.select({ value: count() }).from(suplemen).where(where),
    db
      .select({
        id: suplemen.id,
        nama: suplemen.nama,
        slug: suplemen.slug,
        sasaran: suplemen.sasaran,
        keterangan: suplemen.keterangan,
        updatedAt: suplemen.updatedAt,
        terdataCount: sql<number>`(SELECT COUNT(*) FROM suplemen_terdata WHERE suplemen_terdata.id_suplemen = suplemen.id AND suplemen_terdata.village_id = ${villageId})`,
      })
      .from(suplemen)
      .where(where)
      .orderBy(desc(suplemen.updatedAt))
      .limit(perPage)
      .offset(offset),
  ]);

  const total = totalRes[0]?.value ?? 0;

  return {
    rows: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function createSuplemen(
  villageId: number,
  input: SuplemenCreateInput,
): Promise<number> {
  const slug = slugify(input.nama);
  const [created] = await db.insert(suplemen).values({
    villageId,
    nama: input.nama,
    slug,
    sasaran: input.sasaran,
    keterangan: input.keterangan,
  });
  return Number(created.insertId);
}

export async function updateSuplemen(villageId: number, input: SuplemenUpdateInput): Promise<void> {
  const slug = slugify(input.nama);
  await db
    .update(suplemen)
    .set({
      nama: input.nama,
      slug,
      sasaran: input.sasaran,
      keterangan: input.keterangan,
    })
    .where(and(eq(suplemen.id, input.id), eq(suplemen.villageId, villageId)));
}

export async function deleteSuplemen(villageId: number, id: number): Promise<void> {
  await db.delete(suplemen).where(and(eq(suplemen.id, id), eq(suplemen.villageId, villageId)));
}

export async function getSuplemenById(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(suplemen)
    .where(and(eq(suplemen.id, id), eq(suplemen.villageId, villageId)))
    .limit(1);
  return row ?? null;
}

export async function listSuplemenTerdata(
  villageId: number,
  suplemenId: number,
): Promise<SuplemenTerdataRow[]> {
  const rows = await db
    .select({
      id: suplemenTerdata.id,
      pendudukId: suplemenTerdata.pendudukId,
      keluargaId: suplemenTerdata.keluargaId,
      pendudukName: residents.name,
      pendudukNik: residents.nationalId,
      keluargaNumber: families.number,
      isian: suplemenTerdata.dataFormIsian,
      createdAt: suplemenTerdata.createdAt,
    })
    .from(suplemenTerdata)
    // Parent suplemen dan data terdata harus satu desa; identitas penduduk/KK
    // hanya dibaca dari tenant yang sama.
    .innerJoin(
      suplemen,
      and(eq(suplemen.id, suplemenTerdata.suplemenId), eq(suplemen.villageId, villageId)),
    )
    .leftJoin(
      residents,
      and(eq(suplemenTerdata.pendudukId, residents.id), eq(residents.villageId, villageId)),
    )
    .leftJoin(
      families,
      and(eq(suplemenTerdata.keluargaId, families.id), eq(families.villageId, villageId)),
    )
    .where(
      and(eq(suplemenTerdata.villageId, villageId), eq(suplemenTerdata.suplemenId, suplemenId)),
    )
    .orderBy(desc(suplemenTerdata.id));

  return rows.map((row) => {
    // Jangan keluarkan ID referensi yang gagal di-resolve pada tenant aktif.
    // Ini menutup kebocoran identifier legacy lintas desa dari API.
    const pendudukValid = row.pendudukId !== null && row.pendudukName !== null;
    const keluargaValid = row.keluargaId !== null && row.keluargaNumber !== null;

    return {
      id: row.id,
      pendudukId: pendudukValid ? row.pendudukId : null,
      keluargaId: keluargaValid ? row.keluargaId : null,
      label: row.pendudukId !== null
        ? pendudukValid
          ? `${row.pendudukName}${row.pendudukNik ? ` — ${row.pendudukNik}` : ""}`
          : "Penduduk tidak tersedia"
        : keluargaValid
          ? `KK ${row.keluargaNumber}`
          : "KK tidak tersedia",
      isian: bacaIsian(row.isian),
      createdAt: row.createdAt.toISOString(),
    };
  });
}

/** Id penduduk untuk sekumpulan NIK pada desa ini (dipakai impor). */
export async function findPendudukIdsByNik(
  villageId: number,
  nik: readonly string[],
): Promise<Map<string, number>> {
  if (nik.length === 0) return new Map();

  const rows = await db
    .select({ id: residents.id, nationalId: residents.nationalId })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), inArray(residents.nationalId, [...nik])));

  return new Map(rows.map((row) => [row.nationalId ?? "", row.id]));
}

/** Id keluarga untuk sekumpulan nomor KK pada desa ini (dipakai impor). */
export async function findKeluargaIdsByNumber(
  villageId: number,
  numbers: readonly string[],
): Promise<Map<string, number>> {
  if (numbers.length === 0) return new Map();

  const rows = await db
    .select({ id: families.id, number: families.number })
    .from(families)
    .where(and(eq(families.villageId, villageId), inArray(families.number, [...numbers])));

  return new Map(rows.map((row) => [row.number, row.id]));
}

/**
 * Tambahkan terdata dari impor dengan data isian dinamis.
 *
 * Idempoten: sasaran yang sudah terdata pada suplemen ini dianggap dilewati.
 */
export async function addSuplemenTerdataImpor(
  villageId: number,
  suplemenId: number,
  sasaranId: { pendudukId: number | null; keluargaId: number | null },
  isian: Record<string, string>,
): Promise<boolean> {
  // Impor tidak boleh melewati validasi kepemilikan: parent suplemen dan
  // sasaran harus berada pada desa yang sama. Tepat satu sasaran wajib diisi.
  const punyaPenduduk = sasaranId.pendudukId !== null;
  const punyaKeluarga = sasaranId.keluargaId !== null;
  if (punyaPenduduk === punyaKeluarga) {
    throw new Error("Sasaran impor harus salah satu: penduduk atau keluarga.");
  }

  const parent = await getSuplemenById(villageId, suplemenId);
  if (!parent) throw new Error("Suplemen tidak ditemukan.");

  if (sasaranId.pendudukId !== null) {
    const [resident] = await db
      .select({ id: residents.id })
      .from(residents)
      .where(and(eq(residents.id, sasaranId.pendudukId), eq(residents.villageId, villageId)))
      .limit(1);
    if (!resident) throw new Error("Penduduk tidak ditemukan.");
  }

  if (sasaranId.keluargaId !== null) {
    const [family] = await db
      .select({ id: families.id })
      .from(families)
      .where(and(eq(families.id, sasaranId.keluargaId), eq(families.villageId, villageId)))
      .limit(1);
    if (!family) throw new Error("Keluarga tidak ditemukan.");
  }

  const kolomCek = sasaranId.pendudukId
    ? eq(suplemenTerdata.pendudukId, sasaranId.pendudukId)
    : eq(suplemenTerdata.keluargaId, sasaranId.keluargaId!);

  const ada = await db
    .select({ id: suplemenTerdata.id })
    .from(suplemenTerdata)
    .where(
      and(
        eq(suplemenTerdata.villageId, villageId),
        eq(suplemenTerdata.suplemenId, suplemenId),
        kolomCek,
      ),
    )
    .limit(1);

  if (ada[0]) return false;

  await db.insert(suplemenTerdata).values({
    villageId,
    suplemenId,
    pendudukId: sasaranId.pendudukId,
    keluargaId: sasaranId.keluargaId,
    dataFormIsian: isian,
  });

  return true;
}

/** Jumlah terdata per suplemen untuk seluruh suplemen desa (dipakai laporan). */
export async function listSuplemenRekap(villageId: number) {
  const rows = await db
    .select({
      id: suplemen.id,
      nama: suplemen.nama,
      sasaran: suplemen.sasaran,
    })
    .from(suplemen)
    .where(eq(suplemen.villageId, villageId))
    .orderBy(asc(suplemen.nama));

  // Query agregat, bukan subquery berkorelasi: Drizzle merender kolom subquery
  // tanpa kualifikasi tabel sehingga `id` menunjuk `suplemen_terdata.id`.
  const terdataRows = await db
    .select({ suplemenId: suplemenTerdata.suplemenId, jumlah: count() })
    .from(suplemenTerdata)
    .innerJoin(
      suplemen,
      and(eq(suplemen.id, suplemenTerdata.suplemenId), eq(suplemen.villageId, villageId)),
    )
    .where(eq(suplemenTerdata.villageId, villageId))
    .groupBy(suplemenTerdata.suplemenId);
  const terdataBySuplemen = new Map(
    terdataRows.map((row) => [row.suplemenId, Number(row.jumlah ?? 0)]),
  );

  return rows.map((row) => ({ ...row, jumlahTerdata: terdataBySuplemen.get(row.id) ?? 0 }));
}

export async function addSuplemenTerdata(
  villageId: number,
  input: SuplemenTerdataInput,
): Promise<void> {
  const suplemenRow = await getSuplemenById(villageId, input.suplemenId);
  if (!suplemenRow) throw new Error("Suplemen tidak ditemukan.");

  if (suplemenRow.sasaran === 1 && !input.pendudukId) {
    throw new Error("Suplemen ini bersasaran penduduk.");
  }
  if (suplemenRow.sasaran === 2 && !input.keluargaId) {
    throw new Error("Suplemen ini bersasaran keluarga.");
  }

  if (input.pendudukId) {
    const [resident] = await db
      .select({ id: residents.id })
      .from(residents)
      .where(and(eq(residents.id, input.pendudukId), eq(residents.villageId, villageId)))
      .limit(1);
    if (!resident) throw new Error("Penduduk tidak ditemukan.");
  }

  if (input.keluargaId) {
    const [family] = await db
      .select({ id: families.id })
      .from(families)
      .where(and(eq(families.id, input.keluargaId), eq(families.villageId, villageId)))
      .limit(1);
    if (!family) throw new Error("Keluarga tidak ditemukan.");
  }

  const duplicate = await db
    .select({ id: suplemenTerdata.id })
    .from(suplemenTerdata)
    .where(
      and(
        eq(suplemenTerdata.villageId, villageId),
        eq(suplemenTerdata.suplemenId, input.suplemenId),
        input.pendudukId
          ? eq(suplemenTerdata.pendudukId, input.pendudukId)
          : eq(suplemenTerdata.keluargaId, input.keluargaId!),
      ),
    )
    .limit(1);

  if (duplicate[0]) throw new Error("Sasaran tersebut sudah terdata pada suplemen ini.");

  await db.insert(suplemenTerdata).values({
    villageId,
    suplemenId: input.suplemenId,
    pendudukId: input.pendudukId ?? null,
    keluargaId: input.keluargaId ?? null,
    dataFormIsian: input.isian ?? null,
  });
}

export async function removeSuplemenTerdata(villageId: number, id: number): Promise<void> {
  await db
    .delete(suplemenTerdata)
    .where(and(eq(suplemenTerdata.id, id), eq(suplemenTerdata.villageId, villageId)));
}

export async function listSuplemenPendudukOptions(villageId: number): Promise<SuplemenOption[]> {
  const rows = await db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")))
    .orderBy(asc(residents.name), asc(residents.id));

  return rows.map((row) => ({
    id: row.id,
    label: row.nationalId ? `${row.name} — ${row.nationalId}` : row.name,
  }));
}

export async function listSuplemenKeluargaOptions(villageId: number): Promise<SuplemenOption[]> {
  const rows = await db
    .select({ id: families.id, number: families.number, address: families.address })
    .from(families)
    .where(eq(families.villageId, villageId))
    .orderBy(asc(families.number));

  return rows.map((row) => ({
    id: row.id,
    label: row.address ? `KK ${row.number} — ${row.address}` : `KK ${row.number}`,
  }));
}
