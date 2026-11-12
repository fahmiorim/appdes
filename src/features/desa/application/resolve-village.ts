import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { susunPetaDesa, villageIdDariHost } from "@/features/desa/domain/tenant";
import {
  getFirstVillageId,
  getIdentitasDesa,
  listVillageDomains,
  type IdentitasDesa,
} from "@/features/desa/infrastructure/desa-repository";
import type { CurrentUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { notFound } from "@/lib/errors";

/**
 * Tentukan `village_id` efektif untuk operasi tulis/admin.
 *
 * Prioritas: penugasan desa pada sesi → desa pertama (mode satu-desa). Super
 * admin tanpa penugasan desa tetap bisa bekerja pada instalasi satu-desa.
 */
export async function resolveVillageId(user: CurrentUser): Promise<number> {
  if (user.villageId !== null) return user.villageId;

  const villageId = await getFirstVillageId();
  if (villageId === null) throw notFound("Identitas desa belum dikonfigurasi.");

  return villageId;
}

/**
 * Tentukan desa dari host permintaan (halaman publik).
 *
 * Hanya header Host yang dipakai. X-Forwarded-Host sengaja tidak dibaca karena
 * dapat dipalsukan oleh klien kecuali setiap hop proxy dipastikan menghapus
 * header masuk dan menimpanya dengan nilai yang telah divalidasi.
 *
 * Aturan pemetaan ada di `domain/tenant.ts` (murni, teruji): domain persis →
 * alias `www` → fallback **hanya** bila instalasi benar-benar memiliki satu
 * desa. Bila ada banyak desa dan host tidak dikenal, hasilnya 404 agar tenant
 * tidak bocor.
 */
export const resolveVillageByHost = cache(
  async (host: string | null | undefined): Promise<IdentitasDesa> => {
    const peta = susunPetaDesa(await listVillageDomains(), env.DESA_BASE_DOMAIN ?? null);
    const villageId = villageIdDariHost(host, peta);

    if (villageId !== null) {
      const desa = await getIdentitasDesa(villageId);
      if (desa) return desa;
    }

    throw notFound("Desa untuk domain ini tidak ditemukan.");
  },
);

/** Desa aktif untuk request saat ini, berdasarkan header Host yang diterima server. */
export const getIdentitasFromRequest = cache(async (): Promise<IdentitasDesa> => {
  const requestHeaders = await headers();
  return resolveVillageByHost(requestHeaders.get("host"));
});
