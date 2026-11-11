import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { IDENTITAS_DESA_RESOURCE, type DesaFormInput } from "@/features/desa/domain/desa";
import {
  getIdentitasDesa,
  getNamaDesa,
  updateIdentitasDesa,
  type IdentitasDesa,
} from "@/features/desa/infrastructure/desa-repository";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { requirePermission } from "@/lib/dal";
import { notFound } from "@/lib/errors";

/** Nama desa untuk tenant sesi; `null` bila desa tidak ditemukan. */
export async function getNamaDesaUseCase(villageId: number): Promise<string | null> {
  return getNamaDesa(villageId);
}

export async function getIdentitas(): Promise<IdentitasDesa | null> {
  const user = await requirePermission(IDENTITAS_DESA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return getIdentitasDesa(villageId);
}

/**
 * Simpan identitas desa, dengan dukungan unggahan gambar (logo, tanda tangan,
 * stempel) ke kategori media `umum`.
 *
 * Jenisnya pasangan `field → berkas`; hanya berkas yang dikirim (bukan
 * kosong) yang mengganti jalur pada kolom terkait. Tanpa berkas, nilai teks
 * dari formulir dipakai (memungkinkan dikosongkan manual).
 */
export async function updateIdentitas(
  input: DesaFormInput,
  unggahan: Partial<Record<"logo" | "tandaTangan" | "stempel", BerkasUnggahan | undefined>> = {},
): Promise<{ id: number }> {
  const user = await requirePermission(IDENTITAS_DESA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const existing = await getIdentitasDesa(villageId);
  if (!existing) throw notFound("Identitas desa tidak ditemukan.");

  const payload = { ...input };
  const fieldGambar = ["logo", "tandaTangan", "stempel"] as const;

  for (const field of fieldGambar) {
    const berkas = unggahan[field];
    if (!berkas) continue;
    payload[field] = await simpanBerkasMedia(villageId, berkas, "umum", field);
  }

  await updateIdentitasDesa(villageId, payload);
  return { id: villageId };
}
