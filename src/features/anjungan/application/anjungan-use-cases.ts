import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { requirePermission } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import { ANJUNGAN_RESOURCE, anjunganFormSchema } from "../domain/anjungan";
import {
  createAnjungan,
  deleteAnjungan,
  listAnjungan,
  updateAnjungan,
} from "../infrastructure/anjungan-repository";

export async function daftarAnjungan(villageId: number, aktifOnly = false) {
  await requirePermission(ANJUNGAN_RESOURCE, "read");
  const rows = await listAnjungan(villageId, aktifOnly);
  return rows.map((row) => ({ ...row, aktif: row.aktif ?? 1, urutan: row.urutan ?? 0 }));
}

export async function daftarAnjunganPublik(villageId: number) {
  return listAnjungan(villageId, true);
}

/**
 * Mencari perangkat kiosk berdasarkan UUID yang disimpan di browser kiosk.
 * Hanya perangkat aktif dengan status `aktif` pada desa tersebut yang dianggap terdaftar.
 */
export async function cariPerangkatKiosk(villageId: number, uuid: string | null | undefined) {
  const kunci = uuid?.trim();
  if (!kunci || !z.string().uuid().safeParse(kunci).success) return null;
  const rows = await listAnjungan(villageId, true);
  return rows.find((row) => row.uuid === kunci) ?? null;
}

export async function tambahAnjungan(villageId: number, input: unknown) {
  await requirePermission(ANJUNGAN_RESOURCE, "update");
  const parsed = anjunganFormSchema.parse(input);
  const uuid = parsed.uuid ?? randomUUID();
  const id = await createAnjungan({
    villageId,
    nama: parsed.nama,
    deskripsi: parsed.deskripsi ?? null,
    aktif: parsed.aktif,
    urutan: parsed.urutan,
    uuid,
    ipAddress: parsed.ipAddress ?? null,
    macAddress: parsed.macAddress ?? null,
    ipAddressPortPrinter: parsed.ipAddressPortPrinter ?? null,
    keyboard: parsed.keyboard ?? 1,
    orientasiLayar: parsed.orientasiLayar ?? 1,
    permohonanSuratTanpaAkun: parsed.permohonanSuratTanpaAkun ?? 0,
    status: parsed.status ?? "aktif",
  });
  return { id };
}

export async function ubahAnjungan(villageId: number, id: number, input: unknown) {
  await requirePermission(ANJUNGAN_RESOURCE, "update");
  const parsed = anjunganFormSchema.parse(input);
  const uuid = parsed.uuid ?? randomUUID();
  await updateAnjungan(id, villageId, {
    nama: parsed.nama,
    deskripsi: parsed.deskripsi ?? null,
    aktif: parsed.aktif,
    urutan: parsed.urutan,
    uuid,
    ipAddress: parsed.ipAddress ?? null,
    macAddress: parsed.macAddress ?? null,
    ipAddressPortPrinter: parsed.ipAddressPortPrinter ?? null,
    keyboard: parsed.keyboard ?? 1,
    orientasiLayar: parsed.orientasiLayar ?? 1,
    permohonanSuratTanpaAkun: parsed.permohonanSuratTanpaAkun ?? 0,
    status: parsed.status ?? "aktif",
  });
}

export async function hapusAnjungan(villageId: number, id: number) {
  await requirePermission(ANJUNGAN_RESOURCE, "delete");
  if (!id || id < 1) throw new AppError("NOT_FOUND", "ID tidak valid.");
  await deleteAnjungan(id, villageId);
}
