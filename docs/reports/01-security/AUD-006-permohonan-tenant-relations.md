# AUD-006 — Tenant Ownership Relasi Permohonan Surat

**Status:** Implementasi dan tes integrasi ditambahkan; menunggu CI dan review.  
**Prioritas:** P1 — Tinggi  
**Branch:** `task/AUD-006-permohonan-tenant-relations-v2`  
**Base:** `main`

## Ringkasan

Boundary permohonan surat harus memastikan penduduk, jenis surat, dan surat dinas yang saling ditautkan berasal dari desa yang sama. Query join juga harus membawa predicate tenant agar data relasi yang tidak konsisten tidak bocor ke hasil baca.

## Perubahan

- Validasi penduduk dengan pasangan `villageId + residentId` sebelum berkas diproses.
- Validasi jenis surat aktif dengan `villageId + letterTypeId`.
- Tambah validasi ulang pada `buatPermohonan()` di dalam transaksi sebelum insert.
- Batasi join daftar permohonan warga/operator ke jenis surat, penduduk, dan surat dinas dengan `villageId`.
- Validasi surat dinas menggunakan `letters.id + letters.villageId` di dalam transaksi sebelum tautan disimpan.
- Tidak mengubah skema database atau menjalankan migrasi. Composite foreign key tenant yang sudah ada tetap menjadi lapisan integritas database.

## Tes integrasi negatif lintas-tenant

File: `src/features/layanan-mandiri/permohonan-tenant-relations.integration.test.ts`

- Penduduk desa A ditemukan hanya pada tenant A.
- Penduduk desa B ditolak ketika dipakai pada permohonan tenant A.
- Jenis surat desa B ditolak ketika dipakai pada permohonan tenant A.
- Surat dinas desa B ditolak ketika ditautkan ke permohonan tenant A.

Suite didaftarkan pada `vitest.integration.config.mts` dan memakai guard `TEST_DATABASE_URL` disposable yang sudah tersedia.

## Validasi

| Pemeriksaan | Status |
|---|---|
| Review statis perubahan | Dilakukan |
| Tes integrasi AUD-006 | Menunggu CI |
| Typecheck | Menunggu CI |
| Lint / format | Menunggu CI |
| Build | Menunggu CI |
| Database development | Tidak disentuh |

## Batasan

- Integration test memerlukan MySQL disposable sesuai guard proyek.
- Tidak ada perubahan schema, migrasi, merge, atau deploy dalam pekerjaan ini.
