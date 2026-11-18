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

/**
 * Host platform yang diisi eksplisit lewat `PLATFORM_HOSTS` saja.
 *
 * Dipakai untuk keputusan yang tidak boleh menebak, mis. mengalihkan `/masuk`
 * ke login administrator. Tanpa `PLATFORM_HOSTS`, deployment satu-domain tetap
 * memakai `/masuk` sebagai satu-satunya jalan masuk staf desa.
 */
export const hostPlatformEksplisit: readonly string[] = normalisasiDaftarHost(env.PLATFORM_HOSTS);
