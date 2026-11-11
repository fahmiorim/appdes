import "server-only";

import { getIdentitas } from "@/features/desa/application/get-identitas";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { listPendudukOptions } from "@/features/penduduk/infrastructure/penduduk-repository";
import {
  bangunNomorRtm,
  buildRtmRekapCsv,
  hitungRekapRtm,
  rtmRekapFilename,
  RUMAH_TANGGA_RESOURCE,
  type RtmFilter,
  type RtmRekap,
  type RumahTanggaFormInput,
  type RumahTanggaMember,
  type RumahTanggaReferenceData,
} from "@/features/rumah-tangga/domain/rumah-tangga";
import {
  countRumahTangga,
  deleteRumahTangga as deleteRumahTanggaRow,
  findRumahTanggaById,
  insertRumahTangga,
  listKelasSosialOptions,
  listRtmRingkas,
  listRumahTanggaMembers as listRumahTanggaMembersRows,
  listRumahTangga as listRumahTanggaRows,
  rumahTanggaNumberExists,
  setAnggotaRumahTangga,
  updateRumahTangga as updateRumahTanggaRow,
  type RumahTanggaListResult,
} from "@/features/rumah-tangga/infrastructure/rumah-tangga-repository";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";
import { listWilayahOptions } from "@/features/wilayah/infrastructure/wilayah-repository";
import { requirePermission } from "@/lib/dal";
import { notFound } from "@/lib/errors";

/**
 * Lapisan aplikasi (use case) untuk rumah tangga.
 *
 * Setiap use case menegakkan izinnya sendiri lewat `requirePermission`, jadi
 * pemanggil mana pun (Server Action, Route Handler, skrip) otomatis terlindungi.
 * Nomor RTM dibangkitkan di sini — bukan di UI — agar konsisten bagi semua jalur
 * pembuatan data.
 */

export interface ListRumahTanggaParams {
  /** Filter lanjutan daftar RTM (lihat `parseFilterRtm`). */
  filter: RtmFilter;
  page: number;
  pageSize: number;
}

export async function listRumahTangga(
  params: ListRumahTanggaParams,
): Promise<RumahTanggaListResult> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listRumahTanggaRows({ villageId, ...params });
}

/**
 * Data referensi untuk mengisi formulir rumah tangga (butuh izin baca).
 *
 * `penduduk` dipakai dialog anggota agar pengguna dapat memilih siapa yang
 * ditautkan; daftarnya sengaja memuat NIK untuk memudahkan pencocokan.
 */
export async function getRumahTanggaReference(): Promise<RumahTanggaReferenceData> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [regions, penduduk] = await Promise.all([
    listWilayahOptions(villageId),
    listPendudukOptions(villageId),
  ]);

  return {
    regions: regions.map((region) => ({ id: region.id, label: formatWilayahLabel(region) })),
    penduduk: penduduk.map((row) => ({
      id: row.id,
      label: row.nationalId ? `${row.name} — ${row.nationalId}` : row.name,
    })),
  };
}

/** Anggota sebuah RTM; dipakai dialog rincian pada UI. */
/**
 * Data referensi tambahan untuk filter daftar RTM.
 *
 * Kelas sosial & daftar wilayah diambil dari data desa yang benar-benar ada,
 * sehingga pilihan filter selalu relevan.
 */
export interface RtmFilterOptions {
  kelasSosial: number[];
  dusun: string[];
  rw: string[];
  rt: string[];
}

export async function getRtmFilterOptions(): Promise<RtmFilterOptions> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [kelasSosial, wilayah] = await Promise.all([
    listKelasSosialOptions(villageId),
    listWilayahOptions(villageId),
  ]);

  const unik = (nilai: string[]): string[] =>
    [...new Set(nilai.filter((item) => item !== ""))].sort((a, b) => a.localeCompare(b, "id"));

  return {
    kelasSosial,
    dusun: unik(wilayah.map((row) => row.dusun)),
    rw: unik(wilayah.map((row) => row.rw)),
    rt: unik(wilayah.map((row) => row.rt)),
  };
}

/** Rekapitulasi RTM (per kelas sosial dan per dusun) mengikuti filter. */
export async function getLaporanRumahTangga(
  filter: RtmFilter,
): Promise<{ rekap: RtmRekap; namaDesa: string | null }> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [rows, desa] = await Promise.all([listRtmRingkas(villageId, filter), getIdentitas()]);

  return { rekap: hitungRekapRtm(rows), namaDesa: desa?.namaDesa ?? null };
}

/** Ekspor laporan RTM sebagai CSV. */
export async function exportLaporanRumahTangga(
  filter: RtmFilter,
): Promise<{ csv: string; filename: string }> {
  const { rekap, namaDesa } = await getLaporanRumahTangga(filter);

  return {
    csv: buildRtmRekapCsv({ namaDesa, rekap }),
    filename: rtmRekapFilename(namaDesa),
  };
}

/** Anggota sebuah RTM; dipakai dialog rincian pada UI. */
export async function listRumahTanggaMembers(rtmId: number): Promise<RumahTanggaMember[]> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const rtm = await findRumahTanggaById(villageId, rtmId);
  if (!rtm) throw notFound("Rumah Tangga tidak ditemukan.");

  return listRumahTanggaMembersRows(villageId, rtmId);
}

/**
 * Bangkitkan nomor RTM berikutnya.
 *
 * Nomor urut diambil dari jumlah RTM yang ada + 1, lalu ditambahkan kode desa.
 * Bila kebetulan nomor itu sudah terpakai (mis. setelah penghapusan), nomor
 * dinaikkan sampai bebas — indeks unik `(village_id, number)` tetap menjadi
 * pengaman terakhir.
 */
async function nomorBerikutnya(villageId: number): Promise<string> {
  const desa = await getIdentitas();
  const dasar = (await countRumahTangga(villageId)) + 1;

  for (let langkah = 0; langkah < 200; langkah += 1) {
    const kandidat = bangunNomorRtm(desa?.kodeDesa ?? null, dasar + langkah);
    if (!(await rumahTanggaNumberExists(villageId, kandidat, null))) {
      return kandidat;
    }
  }

  throw new Error("Tidak dapat membangkitkan nomor rumah tangga yang unik.");
}

export async function createRumahTangga(input: RumahTanggaFormInput): Promise<{ id: number }> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const number = await nomorBerikutnya(villageId);
  const id = await insertRumahTangga(villageId, number, input);
  return { id };
}

export async function updateRumahTangga(id: number, input: RumahTanggaFormInput): Promise<void> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await findRumahTanggaById(villageId, id);
  if (!existing) throw notFound("Rumah Tangga tidak ditemukan.");

  await updateRumahTanggaRow(id, input);
}

export async function deleteRumahTangga(id: number): Promise<void> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const existing = await findRumahTanggaById(villageId, id);
  if (!existing) throw notFound("Rumah Tangga tidak ditemukan.");

  await deleteRumahTanggaRow(id);
}

/**
 * Tetapkan seorang penduduk sebagai anggota rumah tangga.
 *
 * Karena keanggotaan RTM eksklusif, penetapan ini otomatis memindahkan penduduk
 * dari RTM lamanya. Ditolak bila penduduk tidak ada di desa yang sama.
 */
export async function assignAnggotaRumahTangga(
  rtmId: number,
  residentId: number,
  level: number,
): Promise<void> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const rtm = await findRumahTanggaById(villageId, rtmId);
  if (!rtm) throw notFound("Rumah Tangga tidak ditemukan.");

  await setAnggotaRumahTangga(villageId, residentId, rtmId, level);
}

/** Lepaskan seorang penduduk dari rumah tangganya. */
export async function removeAnggotaRumahTangga(residentId: number): Promise<void> {
  const user = await requirePermission(RUMAH_TANGGA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await setAnggotaRumahTangga(villageId, residentId, null, null);
}
