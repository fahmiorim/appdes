import "server-only";

import { listWilayahOptions } from "@/features/wilayah/infrastructure/wilayah-repository";

/** Daftar wilayah untuk situs publik; hasil dibatasi pada desa aktif dari host. */
export async function daftarWilayahPublik(villageId: number) {
  return listWilayahOptions(villageId);
}
