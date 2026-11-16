# AUD-011 — Family Join and Aggregate Tenant Scope

**Status:** Implementasi selesai; validasi runtime menunggu. Perubahan sudah ada di `main` dan diverifikasi ulang pada 16 November 2026 (`src/features/keluarga/infrastructure/keluarga-repository.ts` membatasi `head.villageId`); PR penggabungnya tidak dicatat di laporan ini.
**Base:** branch `task/AUD-004-keluarga-region-ownership` (perbaikan AUD-004 kemudian di-merge melalui PR #29).

## Perubahan
File: `src/features/keluarga/infrastructure/keluarga-repository.ts`

- Join alias kepala keluarga kini mensyaratkan `head.villageId = villageId` selain relasi keluarga dan ID keluarga.
- Agregasi jumlah anggota kini membatasi `residents.villageId = villageId` bersama filter daftar family ID.
- Join wilayah yang sudah diperbaiki pada AUD-004 tetap dipertahankan.

## Validasi
- Review statis perubahan: PASS.
- Unit/integration, typecheck, lint/format, build: SKIPPED — belum dijalankan.
- Tidak ada migrasi skema.
- Belum ada PR, merge, atau deploy.

Catatan: branch ini diturunkan dari branch AUD-004 agar perbaikan sebelumnya tidak tertimpa. Integrasikan AUD-004 terlebih dahulu sebelum branch ini digabungkan ke main.
