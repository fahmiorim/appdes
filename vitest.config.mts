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
 * Test unit murni berjalan tanpa setup khusus. Test integrasi menyentuh
 * `desa_test`: migrasi programatik dijalankan sendiri dan suite di-skip
 * bila MySQL tidak tersedia.
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
    // Beberapa berkas integrasi memigrasi `desa_test` secara bergiliran
    // (dikunci lewat `jalankanMigrasiUji`). Migrasi dari nol butuh >10 detik,
    // jadi timeout hook bawaan terlalu pendek.
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "mysql://root:@127.0.0.1:3306/desa_test",
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
