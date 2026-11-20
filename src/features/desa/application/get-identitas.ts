import { cache } from "react";

import {
  getIdentitasDesa,
  getSoleVillageId,
  type IdentitasDesa,
} from "@/features/desa/infrastructure/desa-repository";
import { getCurrentUser } from "@/lib/dal";

/**
 * Identitas desa untuk konteks **admin** (di-cache per-permintaan).
 *
 * Urutan tenant: `villageId` sesi → desa tunggal (mode satu-desa). Akun platform
 * tanpa penugasan desa tidak memakai desa pertama saat ada beberapa desa aktif.
 * Halaman publik **tidak** memakai fungsi ini; gunakan `resolveVillageByHost()`
 * agar tenant ditentukan oleh domain, bukan oleh sesi.
 */
export const getIdentitas = cache(async (): Promise<IdentitasDesa | null> => {
  const user = await getCurrentUser();
  if (user?.villageId != null) return getIdentitasDesa(user.villageId);

  const { villageId, jumlah } = await getSoleVillageId();
  if (jumlah !== 1 || villageId === null) return null;

  return getIdentitasDesa(villageId);
});

/** Identitas desa eksplisit untuk satu tenant (dipakai halaman publik). */
export const getIdentitasByVillage = cache(
  async (villageId: number): Promise<IdentitasDesa | null> => {
    return getIdentitasDesa(villageId);
  },
);
