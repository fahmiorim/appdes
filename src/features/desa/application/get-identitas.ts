import { cache } from "react";

import {
  getFirstVillageId,
  getIdentitasDesa,
  type IdentitasDesa,
} from "@/features/desa/infrastructure/desa-repository";
import { getCurrentUser } from "@/lib/dal";

/**
 * Identitas desa untuk konteks **admin** (di-cache per-permintaan).
 *
 * Urutan tenant: `villageId` sesi → desa pertama (mode satu-desa). Halaman
 * publik **tidak** memakai fungsi ini; gunakan `resolveVillageByHost()` agar
 * tenant ditentukan oleh domain, bukan oleh sesi.
 */
export const getIdentitas = cache(async (): Promise<IdentitasDesa | null> => {
  const user = await getCurrentUser();
  const villageId = user?.villageId ?? (await getFirstVillageId());
  if (villageId === null) return null;

  return getIdentitasDesa(villageId);
});

/** Identitas desa eksplisit untuk satu tenant (dipakai halaman publik). */
export const getIdentitasByVillage = cache(
  async (villageId: number): Promise<IdentitasDesa | null> => {
    return getIdentitasDesa(villageId);
  },
);
