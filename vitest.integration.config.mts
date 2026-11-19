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
      "src/db/b2-bantuan-composite-fk.integration.test.ts",
      "src/db/b2-dtks-suplemen-composite-fk.integration.test.ts",
      "src/db/b2-migration-guard-rollback.integration.test.ts",
      "src/db/b2-resident-composite-fk.integration.test.ts",
      "src/db/b2-resident-migration-guard.integration.test.ts",
      "src/db/b3-inventaris-composite-fk.integration.test.ts",
      "src/db/b3-inventaris-migration-guard.integration.test.ts",
      "src/db/b4-cascade-relations-composite-fk.integration.test.ts",
      "src/db/b4-tenant-migration-guard.integration.test.ts",
      "src/db/b4b-cascade-relations-composite-fk.integration.test.ts",
      "src/db/b4b-tenant-migration-guard.integration.test.ts",
      "src/db/b4c1-restrict-relations-composite-fk.integration.test.ts",
      "src/db/b4c1-tenant-migration-guard.integration.test.ts",
      "src/db/b4c2a-letter-classification-composite-fk.integration.test.ts",
      "src/db/b4c2a-tenant-migration-guard.integration.test.ts",
      "src/db/b4c2b-remaining-relations-composite-fk.integration.test.ts",
      "src/db/b4c2b-tenant-migration-guard.integration.test.ts",
      "src/db/b5-set-null-relations-composite-fk.integration.test.ts",
      "src/db/b5-tenant-migration-guard.integration.test.ts",
      "src/db/m0016-tenant-child-tables.integration.test.ts",
      "src/db/m0017-role-tenant-constraint.integration.test.ts",
      "src/db/tenant-composite-fk.integration.test.ts",
      "src/features/agenda/infrastructure/agenda-repository.integration.test.ts",
      "src/features/bantuan/integrasi-warga.test.ts",
      "src/features/inventaris/infrastructure/inventaris-tenant-isolation.integration.test.ts",
      "src/features/kehadiran/infrastructure/rekap-kehadiran-tenant-isolation.integration.test.ts",
      "src/features/keuangan/infrastructure/apbdes-import-concurrency.integration.test.ts",
      "src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts",
      "src/features/layanan-mandiri/infrastructure/permohonan-status-concurrency.integration.test.ts",
      "src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts",
      "src/features/kontak/application/kontak-tenant-isolation.integration.test.ts",
      "src/features/keluarga/infrastructure/keluarga-tenant-isolation.integration.test.ts",
      "src/features/database/infrastructure/verifikasi-restore.integration.test.ts",
      "src/features/gis/infrastructure/gis-repository.integration.test.ts",
      "src/features/isolasi-village.integration.test.ts",
      "src/features/konten/dokumen-publik.integration.test.ts",
      "src/features/layanan-mandiri/integrasi-warga.test.ts",
      "src/features/multi-desa/isolasi-host.integration.test.ts",
      "src/features/multi-desa/kelola-domain.integration.test.ts",
      "src/features/multi-desa/lifecycle-tenant.integration.test.ts",
      "src/features/multi-desa/provisioning-template.integration.test.ts",
      "src/features/multi-desa/template-ekspor.integration.test.ts",
      "src/features/multi-desa/cleanup-ekspor.integration.test.ts",
      "src/features/multi-desa/platform-konsol.integration.test.ts",
      "src/features/penduduk/infrastructure/dtks-tenant-isolation.integration.test.ts",
      "src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts",
      "src/features/penduduk/infrastructure/riwayat-penduduk-tenant-isolation.integration.test.ts",
      "src/features/penduduk/infrastructure/suplemen-tenant-isolation.integration.test.ts",
      "src/features/publik/application/pengumuman-publik.integration.test.ts",
      "src/features/publik/infrastructure/media-quota-concurrency.integration.test.ts",
      "src/features/pesan-warga/integrasi-pesan-warga.test.ts",
      "src/features/rumah-tangga/infrastructure/rumah-tangga-tenant-isolation.integration.test.ts",
      "src/features/statistik/infrastructure/statistik-tenant-isolation.integration.test.ts",
      "src/features/rbac/infrastructure/rbac-tenant-isolation.integration.test.ts",
      "src/features/layanan-mandiri/permohonan-tenant-relations.integration.test.ts",
      "src/features/surat/infrastructure/penomoran-archive.integration.test.ts",
    ],
    setupFiles: ["./src/testing/setup-integration.ts"],
    // Suite migration membuat beberapa database dan menjalankan DDL; pada
    // Windows dengan suite paralel, beforeAll dapat melewati 120 detik.
    hookTimeout: 300_000,
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
