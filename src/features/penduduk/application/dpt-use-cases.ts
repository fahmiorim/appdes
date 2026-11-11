import "server-only";

import { getIdentitas } from "@/features/desa/application/get-identitas";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  buildDptCsv,
  buildDptRekapCsv,
  dptFilename,
  dptRekapFilename,
  hitungRekapDpt,
  keDptPublik,
  type DptFilter,
  type DptRekap,
  type ElectionDTO,
  type ElectionFormInput,
  type ListDptParams,
  type ListDptPublikResult,
  type ListDptResult,
} from "@/features/penduduk/domain/dpt";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import {
  adaPemilihanAktifLain,
  getActiveElection,
  deleteElection as hapusPemilihan,
  insertElection,
  listDpt,
  listDptExport,
  listDptRingkas,
  queryElectionById,
  queryElections,
  updateElection,
  type BarisPemilihan,
} from "@/features/penduduk/infrastructure/dpt-repository";
import { requirePermission } from "@/lib/dal";
import { notFound } from "@/lib/errors";

function keElectionDto(row: BarisPemilihan): ElectionDTO {
  return {
    id: row.id,
    villageId: row.villageId,
    judul: row.judul,
    status: row.status,
    tanggal: row.tanggal,
    keterangan: row.keterangan,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listElections(): Promise<ElectionDTO[]> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const rows = await queryElections(villageId);
  return rows.map(keElectionDto);
}

/** Detail pemilihan by ID. */
export async function getElectionById(id: number): Promise<ElectionDTO | null> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const row = await queryElectionById(villageId, id);
  return row ? keElectionDto(row) : null;
}

/** Simpan pemilihan (buat/ubah). Hanya satu aktif per desa. */
export async function saveElection(input: ElectionFormInput, id?: number): Promise<ElectionDTO> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  // Validasi: hanya satu aktif per desa
  if (input.status === "aktif" && (await adaPemilihanAktifLain(villageId, id))) {
    throw new Error("Sudah ada pemilihan aktif untuk desa ini.");
  }

  let electionId: number;

  if (id) {
    await updateElection(villageId, id, {
      judul: input.judul,
      status: input.status,
      tanggal: input.tanggal,
      keterangan: input.keterangan ?? null,
    });
    electionId = id;
  } else {
    electionId = await insertElection(villageId, {
      judul: input.judul,
      status: input.status,
      tanggal: input.tanggal,
      keterangan: input.keterangan ?? null,
    });
  }

  const saved = await getElectionById(electionId);
  if (!saved) throw new Error("Gagal menyimpan pemilihan.");
  return saved;
}

/** Hapus pemilihan. */
export async function deleteElection(id: number): Promise<void> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  await hapusPemilihan(villageId, id);
}

/**
 * DPT publik: pemilihan aktif dan satu halaman daftar dari desa host.
 *
 * Dua lapis perlindungan diterapkan di use case, bukan di JSX: NIK tidak ikut
 * dipetakan ke DTO publik, dan pencarian hanya mencocokkan nama sehingga NIK
 * tidak bisa dipakai untuk menebak apakah seseorang terdaftar.
 */
export async function getDptPublik(
  villageId: number,
  params: ListDptParams,
): Promise<{ election: ElectionDTO | null; result: ListDptPublikResult }> {
  const [election, result] = await Promise.all([
    getActiveElection(villageId),
    listDpt(villageId, params, { cariNamaSaja: true }),
  ]);

  return {
    election,
    result: { ...result, rows: result.rows.map(keDptPublik) },
  };
}

/** Daftar DPT dengan filter + pagination. */
export async function getDpt(params: ListDptParams): Promise<ListDptResult> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listDpt(villageId, params);
}

/** Ekspor DPT CSV. */
export async function exportDpt(params: ListDptParams): Promise<{
  csv: string;
  filename: string;
}> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [rows, desa, election] = await Promise.all([
    listDptExport(villageId, params),
    getIdentitas(),
    getActiveElection(villageId),
  ]);

  if (!election) {
    throw notFound("Tidak ada pemilihan aktif untuk desa ini.");
  }

  return {
    csv: buildDptCsv({
      namaDesa: desa?.namaDesa ?? null,
      judulPemilihan: election.judul,
      tanggalPemilihan: election.tanggal,
      rows,
    }),
    filename: dptFilename(desa?.namaDesa ?? null, election.judul),
  };
}

/** Identitas pemilihan aktif + rekapitulasi pemilih per wilayah. */
export interface DptRekapData {
  rekap: DptRekap;
  election: ElectionDTO | null;
  namaDesa: string | null;
}

/** Rekapitulasi DPT (per dusun) mengikuti filter yang sama dengan daftar. */
export async function getRekapDpt(params: DptFilter = {}): Promise<DptRekapData> {
  const user = await requirePermission(PENDUDUK_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [rows, election, desa] = await Promise.all([
    listDptRingkas(villageId, params),
    getActiveElection(villageId),
    getIdentitas(),
  ]);

  return {
    rekap: hitungRekapDpt(rows),
    election,
    namaDesa: desa?.namaDesa ?? null,
  };
}

/** Ekspor rekapitulasi DPT sebagai CSV. */
export async function exportRekapDpt(params: DptFilter = {}): Promise<{
  csv: string;
  filename: string;
}> {
  const data = await getRekapDpt(params);

  if (!data.election) {
    throw notFound("Tidak ada pemilihan aktif untuk desa ini.");
  }

  return {
    csv: buildDptRekapCsv({
      namaDesa: data.namaDesa,
      judulPemilihan: data.election.judul,
      tanggalPemilihan: data.election.tanggal,
      rekap: data.rekap,
    }),
    filename: dptRekapFilename(data.namaDesa, data.election.judul),
  };
}
