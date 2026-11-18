import "server-only";

import { normalisasiDaftarHost } from "@/features/desa/domain/host";
import { env } from "@/lib/env";

/**
 * Host platform (landing page produk).
 *
 * `PLATFORM_HOSTS` diisi eksplisit di produksi bila domain desa memakai induk
 * lain, mis. platform `flexidesa.id` sementara desa `kwalagunung.desa.id`.
 * Bila kosong, host `APP_URL` dipakai agar deployment satu-domain tetap benar
 * tanpa konfigurasi tambahan.
 */
export const hostPlatform: readonly string[] = normalisasiDaftarHost(
  env.PLATFORM_HOSTS ?? env.APP_URL,
);
