import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import { SINERGI_RESOURCE, sinergiSchema, type SinergiInput } from "../domain/sinergi";
import {
  createSinergi,
  deleteSinergi,
  listSinergi,
  updateSinergi,
} from "../infrastructure/sinergi-repository";

/** Ubah isian formulir (string kosong) menjadi nilai kolom yang bersih. */
function nilaiKolom(parsed: SinergiInput) {
  return {
    nama: parsed.nama,
    mitra: parsed.mitra || null,
    tahun: parsed.tahun ?? null,
    tanggalMulai: parsed.tanggalMulai || null,
    tanggalSelesai: parsed.tanggalSelesai || null,
    keterangan: parsed.keterangan || null,
  };
}

async function konteksSinergi(action: "read" | "update" | "delete"): Promise<number> {
  const user = await requirePermission(SINERGI_RESOURCE, action);
  return resolveVillageId(user);
}

function validasiId(id: number): void {
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("VALIDATION", "ID tidak valid.");
  }
}

export async function daftarSinergi() {
  const villageId = await konteksSinergi("read");
  return listSinergi(villageId);
}

/** Daftar program untuk situs publik; tenant ditentukan oleh host. */
export async function daftarSinergiPublik(villageId: number) {
  return listSinergi(villageId);
}

export async function tambahSinergi(input: unknown) {
  const villageId = await konteksSinergi("update");
  const parsed = sinergiSchema.parse(input);
  const id = await createSinergi({ villageId, ...nilaiKolom(parsed) });
  return { id };
}

export async function ubahSinergi(id: number, input: unknown) {
  validasiId(id);
  const villageId = await konteksSinergi("update");
  const parsed = sinergiSchema.parse(input);
  await updateSinergi(id, villageId, nilaiKolom(parsed));
}

export async function hapusSinergi(id: number) {
  validasiId(id);
  const villageId = await konteksSinergi("delete");
  await deleteSinergi(id, villageId);
}
