import "server-only";

import { getIdentitas } from "@/features/desa/application/get-identitas";
import {
  type ListSuplemenParams,
  type ListSuplemenResult,
  type SuplemenCreateInput,
  type SuplemenOption,
  type SuplemenTerdataInput,
  type SuplemenTerdataRow,
  type SuplemenUpdateInput,
} from "@/features/penduduk/domain/suplemen";
import {
  buildSuplemenCsv,
  buildSuplemenRekapCsv,
  hitungRekapSuplemen,
  suplemenFilename,
  suplemenRekapFilename,
} from "@/features/penduduk/domain/suplemen-berkas";
import {
  addSuplemenTerdata,
  addSuplemenTerdataImpor,
  createSuplemen,
  deleteSuplemen,
  findKeluargaIdsByNumber,
  findPendudukIdsByNik,
  getSuplemenById,
  listSuplemen,
  listSuplemenKeluargaOptions,
  listSuplemenPendudukOptions,
  listSuplemenRekap,
  listSuplemenTerdata,
  removeSuplemenTerdata,
  updateSuplemen,
} from "@/features/penduduk/infrastructure/suplemen-repository";

export async function getSuplemenListUseCase(
  villageId: number,
  params: ListSuplemenParams,
): Promise<ListSuplemenResult> {
  return listSuplemen(villageId, params);
}

export async function createSuplemenUseCase(
  villageId: number,
  input: SuplemenCreateInput,
): Promise<number> {
  return createSuplemen(villageId, input);
}

export async function updateSuplemenUseCase(
  villageId: number,
  input: SuplemenUpdateInput,
): Promise<void> {
  await updateSuplemen(villageId, input);
}

export async function deleteSuplemenUseCase(villageId: number, id: number): Promise<void> {
  await deleteSuplemen(villageId, id);
}

export async function getSuplemenTerdataUseCase(
  villageId: number,
  suplemenId: number,
): Promise<SuplemenTerdataRow[]> {
  return listSuplemenTerdata(villageId, suplemenId);
}

export async function addSuplemenTerdataUseCase(
  villageId: number,
  input: SuplemenTerdataInput,
): Promise<void> {
  await addSuplemenTerdata(villageId, input);
}

export async function removeSuplemenTerdataUseCase(villageId: number, id: number): Promise<void> {
  await removeSuplemenTerdata(villageId, id);
}

/** Label sasaran suplemen (1 = penduduk, 2 = keluarga). */
export function labelSasaranSuplemen(sasaran: number): string {
  return sasaran === 2 ? "Keluarga (KK)" : "Penduduk";
}

/** Detail satu suplemen beserta terdata dan kolom isian yang muncul. */
export async function getSuplemenDetailUseCase(villageId: number, suplemenId: number) {
  const suplemen = await getSuplemenById(villageId, suplemenId);
  if (!suplemen) return null;

  const terdata = await listSuplemenTerdata(villageId, suplemenId);
  return { suplemen, terdata };
}

/** Ekspor terdata sebuah suplemen sebagai CSV (kolom isian mengikuti data). */
export async function exportSuplemenUseCase(
  villageId: number,
  suplemenId: number,
): Promise<{ csv: string; filename: string } | null> {
  const detail = await getSuplemenDetailUseCase(villageId, suplemenId);
  if (!detail) return null;

  const desa = await getIdentitas();

  return {
    csv: buildSuplemenCsv({
      namaDesa: desa?.namaDesa ?? null,
      namaSuplemen: detail.suplemen.nama,
      sasaranLabel: labelSasaranSuplemen(detail.suplemen.sasaran),
      rows: detail.terdata.map((row) => ({
        label: row.label,
        isian: row.isian,
      })),
    }),
    filename: suplemenFilename(detail.suplemen.nama),
  };
}

/**
 * Impor terdata suplemen dari berkas.
 *
 * Kolom tetap hanya "NIK / No. KK" (menyesuaikan sasaran); kolom lain di
 * berkas otomatis menjadi isian dinamis.
 */
export async function imporSuplemenUseCase(
  villageId: number,
  suplemenId: number,
  rows: readonly { sasaran: string; isian: Record<string, string> }[],
): Promise<{ ditambahkan: number; dilewati: number; tidakDitemukan: string[] }> {
  const suplemen = await getSuplemenById(villageId, suplemenId);
  if (!suplemen) throw new Error("Suplemen tidak ditemukan.");

  const sasaranPenduduk = suplemen.sasaran !== 2;
  const kunci = rows.map((row) => row.sasaran);

  const peta = sasaranPenduduk
    ? await findPendudukIdsByNik(villageId, kunci)
    : await findKeluargaIdsByNumber(villageId, kunci);

  let ditambahkan = 0;
  let dilewati = 0;
  const tidakDitemukan: string[] = [];

  for (const row of rows) {
    const sasaranId = peta.get(row.sasaran);
    if (!sasaranId) {
      tidakDitemukan.push(row.sasaran);
      continue;
    }

    const berhasil = await addSuplemenTerdataImpor(
      villageId,
      suplemenId,
      sasaranPenduduk
        ? { pendudukId: sasaranId, keluargaId: null }
        : { pendudukId: null, keluargaId: sasaranId },
      row.isian,
    );

    if (berhasil) ditambahkan += 1;
    else dilewati += 1;
  }

  return { ditambahkan, dilewati, tidakDitemukan };
}

/** Rekapitulasi seluruh suplemen desa. */
export async function getRekapSuplemenUseCase(villageId: number) {
  const [rows, desa] = await Promise.all([listSuplemenRekap(villageId), getIdentitas()]);

  return {
    rekap: hitungRekapSuplemen(rows, labelSasaranSuplemen),
    namaDesa: desa?.namaDesa ?? null,
  };
}

/** Ekspor rekapitulasi suplemen sebagai CSV. */
export async function exportRekapSuplemenUseCase(
  villageId: number,
): Promise<{ csv: string; filename: string }> {
  const { rekap, namaDesa } = await getRekapSuplemenUseCase(villageId);

  return {
    csv: buildSuplemenRekapCsv({ namaDesa, rekap }),
    filename: suplemenRekapFilename(namaDesa),
  };
}

export async function getSuplemenReferencesUseCase(villageId: number): Promise<{
  penduduk: SuplemenOption[];
  keluarga: SuplemenOption[];
}> {
  const [penduduk, keluarga] = await Promise.all([
    listSuplemenPendudukOptions(villageId),
    listSuplemenKeluargaOptions(villageId),
  ]);
  return { penduduk, keluarga };
}
