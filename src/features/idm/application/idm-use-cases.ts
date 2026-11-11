import "server-only";

import { requirePermission } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import { IDM_RESOURCE, idmFormSchema, SDGS_RESOURCE, sdgsFormSchema } from "../domain/idm";
import {
  createIdm,
  deleteIdm,
  deleteSdgs,
  listIdm,
  listSdgs,
  listTahunIdm,
  listTahunSdgs,
  updateIdm,
  upsertSdgs,
} from "../infrastructure/idm-repository";

export async function daftarIdm(villageId: number, tahun?: number) {
  await requirePermission(IDM_RESOURCE, "read");
  return listIdm(villageId, tahun);
}

export async function daftarTahunIdm(villageId: number) {
  await requirePermission(IDM_RESOURCE, "read");
  return listTahunIdm(villageId);
}

/** Nilai kolom yang sudah dibersihkan dari isian formulir. */
function nilaiIndikator(parsed: {
  tahun: number;
  kode: string;
  nama: string;
  skor?: number | null;
  kategori?: string | null;
  keterangan?: string | null;
}) {
  return {
    tahun: parsed.tahun,
    kode: parsed.kode,
    nama: parsed.nama,
    skor: parsed.skor ?? 0,
    kategori: parsed.kategori || null,
    keterangan: parsed.keterangan || null,
  };
}

/** Tambah indikator baru atau perbarui indikator yang sudah ada. */
export async function simpanIdm(villageId: number, input: unknown) {
  await requirePermission(IDM_RESOURCE, "update");
  const parsed = idmFormSchema.parse(input);
  const values = nilaiIndikator(parsed);

  if (parsed.id) {
    await updateIdm(parsed.id, villageId, values);
    return { id: parsed.id };
  }

  const id = await createIdm({ villageId, ...values });
  return { id };
}

export async function hapusIdm(villageId: number, id: number) {
  await requirePermission(IDM_RESOURCE, "delete");
  if (!id || id < 1) throw new AppError("NOT_FOUND", "ID tidak valid.");
  await deleteIdm(id, villageId);
}

export async function daftarSdgs(villageId: number, tahun: number) {
  await requirePermission(SDGS_RESOURCE, "read");
  return listSdgs(villageId, tahun);
}

export async function daftarTahunSdgs(villageId: number) {
  await requirePermission(SDGS_RESOURCE, "read");
  return listTahunSdgs(villageId);
}

export async function simpanSdgs(villageId: number, input: unknown) {
  await requirePermission(SDGS_RESOURCE, "update");
  const parsed = sdgsFormSchema.parse(input);

  await upsertSdgs({
    villageId,
    tahun: parsed.tahun,
    goal: parsed.goal,
    skor: parsed.skor,
    keterangan: parsed.keterangan || null,
  });

  return { goal: parsed.goal };
}

export async function hapusSdgs(villageId: number, tahun: number, goal: number) {
  await requirePermission(SDGS_RESOURCE, "delete");
  await deleteSdgs(villageId, tahun, goal);
}

/**
 * Data untuk halaman publik.
 *
 * Tanpa RBAC karena tidak ada sesi; `villageId` berasal dari host (tenant),
 * dan tahun mengikuti data terbaru yang tersedia agar situs tidak kosong pada
 * awal tahun anggaran.
 */
export async function ringkasanIdmPublik(villageId: number, tahunDiminta?: number) {
  const [tahunIdm, tahunSdgs] = await Promise.all([
    listTahunIdm(villageId),
    listTahunSdgs(villageId),
  ]);

  // Admin yang membuka tahun tertentu (dari tautan IDM) harus melihat tahun itu,
  // bukan selalu tahun terbaru. Tanpa pilihan tahun, publik memakai data terbaru.
  const tahun =
    ((tahunDiminta && tahunDiminta > 2000 ? tahunDiminta : undefined) ??
      Math.max(tahunIdm[0] ?? 0, tahunSdgs[0] ?? 0)) ||
    new Date().getFullYear();
  const [indikator, sdgs] = await Promise.all([
    listIdm(villageId, tahun),
    listSdgs(villageId, tahun),
  ]);

  return { tahun, indikator, sdgs };
}
