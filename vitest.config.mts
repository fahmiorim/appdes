import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi Vitest.
 *
 * Hanya menguji **logika murni** (domain & utilitas) yang tidak menyentuh
 * database maupun `next/headers`, sehingga berjalan cepat tanpa setup khusus.
 *
 * `test.env` mengisi variabel yang wajib ada karena `src/lib/env.ts` memvalidasi
 * environment saat modulnya di-import (fail fast). Nilainya fiktif — tidak ada
 * koneksi database yang dibuka dalam pengujian unit.
 *
 * Konfigurasi ini hanya untuk unit test. Berkas integration test sengaja
 * dikecualikan; berkas itu memakai `vitest.integration.config.mts` yang
 * mewajibkan `TEST_DATABASE_URL` dan divalidasi guard database uji.
 *
 * Berkas ini memakai ekstensi `.mts` karena `package.json` tidak bertipe module.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration test tidak boleh ikut `npm test`; jalankan lewat
    // `npm run test:integration` pada database disposable.
    exclude: ["**/node_modules/**", "**/*integration.test.ts", "**/*integrasi*.test.ts"],
    // Beberapa berkas integrasi memigrasi `desa_test` secara bergiliran
    // (dikunci lewat `jalankanMigrasiUji`). Migrasi dari nol butuh >10 detik,
    // jadi timeout hook bawaan terlalu pendek.
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      // Unit test tidak membuka koneksi; nama ini sengaja bukan database uji
      // agar tidak pernah tertukar dengan target integration test.
      DATABASE_URL: "mysql://uji:uji@127.0.0.1:3306/desa_unit",
      BETTER_AUTH_SECRET: "rahasia-uji-coba-minimal-32-karakter",
      TRUST_PROXY: "true",
    },
    // Package `server-only` melempar error meski di-import dari Node murni
    // (test integrasi meng-import repository). Alias ke stub kosong.
    alias: {
      "server-only": fileURLToPath(new URL("./src/testing/server-only.ts", import.meta.url)),
    },
  },
});
