# AUD-011 — Family Join and Aggregate Tenant Scope

**Status:** Implementasi selesai; validasi runtime menunggu.  
**Base:** branch `task/AUD-004-keluarga-region-ownership` (membawa perbaikan AUD-004 yang belum di-merge).

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
