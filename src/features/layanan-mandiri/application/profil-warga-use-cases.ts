import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getWargaProfile } from "@/features/warga/infrastructure/warga-repository";
import { requireWarga } from "@/lib/dal";

/**
 * Profil warga untuk halaman layanan mandiri.
 *
 * `villageId` dan `residentId` selalu berasal dari sesi terverifikasi, bukan
 * parameter klien, sehingga warga tidak dapat meminta profil penduduk lain.
 */
export async function ambilProfilWargaData() {
  const user = await requireWarga();
  const villageId = await resolveVillageId(user);
  const profil = await getWargaProfile(villageId, user.residentId);

  return { profil, mustChangePin: user.mustChangePin };
}
