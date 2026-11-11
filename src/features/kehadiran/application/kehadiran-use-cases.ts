import "server-only";

import { requirePermission } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import {
  KEHADIRAN_RESOURCE,
  kehadiranFormSchema,
  kehadiranStatusSchema,
} from "../domain/kehadiran";
import {
  adaPerangkat,
  createKehadiran,
  deleteKehadiran,
  getRekapKehadiran,
  listKehadiran,
  listPerangkatDesa,
  updateKehadiran,
} from "../infrastructure/kehadiran-repository";

export async function daftarKehadiran(
  villageId: number,
  opts?: { bulan?: number; tahun?: number; perangkatId?: number },
) {
  await requirePermission(KEHADIRAN_RESOURCE, "read");
  const [items, perangkatList] = await Promise.all([
    listKehadiran(villageId, opts),
    listPerangkatDesa(villageId),
  ]);
  const perangkatMap = new Map(perangkatList.map((perangkat) => [perangkat.id, perangkat]));

  return items.map((item) => {
    const perangkat = perangkatMap.get(item.perangkatId ?? 0);
    return {
      ...item,
      tanggal: item.tanggal.toISOString().slice(0, 10),
      perangkatNama: perangkat?.nama ?? "-",
      perangkatJabatan: perangkat?.jabatanNama ?? "-",
      status: kehadiranStatusSchema.catch("hadir").parse(item.status),
    };
  });
}
/** Daftar perangkat untuk pilihan formulir kehadiran. */
export async function daftarPerangkatDesa(villageId: number) {
  await requirePermission(KEHADIRAN_RESOURCE, "read");
  return listPerangkatDesa(villageId);
}

export interface RekapKehadiranDTO {
  perangkatId: number;
  nama: string;
  jabatan: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
}

export async function getRekapKehadiranData(villageId: number, tahun: number, bulan?: number) {
  await requirePermission(KEHADIRAN_RESOURCE, "read");
  return await getRekapKehadiran(villageId, tahun, bulan);
}

export async function tambahKehadiran(villageId: number, input: unknown) {
  await requirePermission(KEHADIRAN_RESOURCE, "update");
  const parsed = kehadiranFormSchema.parse(input);
  return createKehadiran({
    villageId,
    perangkatId: parsed.perangkatId,
    tanggal: new Date(parsed.tanggal),
    jamMasuk: parsed.jamMasuk ?? null,
    jamKeluar: parsed.jamKeluar ?? null,
    status: parsed.status,
  });
}

export async function ubahKehadiran(villageId: number, id: number, input: unknown) {
  await requirePermission(KEHADIRAN_RESOURCE, "update");
  const parsed = kehadiranFormSchema.parse(input);
  await updateKehadiran(id, villageId, {
    perangkatId: parsed.perangkatId,
    tanggal: new Date(parsed.tanggal),
    jamMasuk: parsed.jamMasuk ?? null,
    jamKeluar: parsed.jamKeluar ?? null,
    status: parsed.status,
  });
}

export async function hapusKehadiran(villageId: number, id: number) {
  await requirePermission(KEHADIRAN_RESOURCE, "delete");
  if (!id || id < 1) throw new AppError("NOT_FOUND", "ID tidak valid.");
  await deleteKehadiran(id, villageId);
}

/**
 * Status perangkat hari ini.
 *
 * Aturan:
 *  - Jika ada izin atau sakit: tampilkan status itu.
 *  - Jika ada alpa: tampilkan alpa.
 *  - Jika hadir, tampilkan waktu masuk.
 */
export async function statusPerangkatHariIni(
  villageId: number,
  perangkatId: number,
  hariIni: Date = new Date(),
) {
  await requirePermission(KEHADIRAN_RESOURCE, "read");

  const tanggalHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, "0")}-${String(hariIni.getDate()).padStart(2, "0")}`;

  if (!(await adaPerangkat(villageId, perangkatId))) {
    return { status: "tidak-ditemukan", jamKurang: null };
  }

  const kehadiranHariIni = await daftarKehadiran(villageId, {
    bulan: hariIni.getMonth() + 1,
    tahun: hariIni.getFullYear(),
    perangkatId,
  });
  const statusHariIni = kehadiranHariIni.find((item) => item.tanggal === tanggalHariIni);

  if (!statusHariIni) return { status: "kosong", jamKurang: null };

  return {
    status: statusHariIni.status,
    jamKurang:
      statusHariIni.status === "hadir" && statusHariIni.jamMasuk
        ? new Date(statusHariIni.jamMasuk)
        : null,
  };
}
