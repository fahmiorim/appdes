import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi integration test.
 *
 * Berbeda dari `vitest.config.mts`, konfigurasi ini tidak memberi nilai
 * `DATABASE_URL` sama sekali. `src/testing/setup-integration.ts` memvalidasi
 * `TEST_DATABASE_URL` + `TEST_DATABASE_ACK` lalu menetapkan `DATABASE_URL` dari
 * nilai yang sudah lolos guard. Bila validasi gagal, setup melempar error dan
 * seluruh suite gagal (tidak ada skip diam-diam).
 *
 * Jalankan hanya dengan `npm run test:integration` setelah database disposable
 * disiapkan. Lihat `.env.example` untuk variabel yang dibutuhkan.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/features/bantuan/integrasi-warga.test.ts",
      "src/features/database/infrastructure/verifikasi-restore.integration.test.ts",
      "src/features/gis/infrastructure/gis-repository.integration.test.ts",
      "src/features/isolasi-village.integration.test.ts",
      "src/features/konten/dokumen-publik.integration.test.ts",
      "src/features/layanan-mandiri/integrasi-warga.test.ts",
      "src/features/multi-desa/isolasi-host.integration.test.ts",
      "src/features/penduduk/infrastructure/riwayat-penduduk-tenant-isolation.integration.test.ts",
      "src/features/pesan-warga/integrasi-pesan-warga.test.ts",
      "src/features/surat/infrastructure/penomoran-archive.integration.test.ts",
    ],
    setupFiles: ["./src/testing/setup-integration.ts"],
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      BETTER_AUTH_SECRET: "rahasia-uji-coba-minimal-32-karakter",
      TRUST_PROXY: "true",
    },
    alias: {
      "server-only": fileURLToPath(new URL("./src/testing/server-only.ts", import.meta.url)),
    },
  },
});
