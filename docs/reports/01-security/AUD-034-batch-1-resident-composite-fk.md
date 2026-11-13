# AUD-034 Batch 1 — Composite FK relasi resident cascade

| Item | Nilai |
| --- | --- |
| Task | Issue #34, Batch 1: ganti lima FK `resident_id` single-column dengan composite tenant FK |
| Tujuan | Database menolak dokumen/izin/anggota/verifikasi/pesan yang memasangkan `village_id` dengan resident desa lain, tanpa mengubah perilaku cascade |
| Tanggal | 14 November 2026 |
| Branch | `task/AUD-034-tenant-relation-audit` |
| Base branch commit | `343ef35a7858303eb82afc69c8caca7848a1a8e7` (`origin/main`) |
| Commit implementasi | HEAD branch task pada saat penyerahan (SHA di ringkasan handoff) |

## Kondisi awal dan analisis

Lima tabel memiliki FK `resident_id → residents.id` dengan `ON DELETE CASCADE`, tapi FK tidak mengikat resident ke tenant anak. Parent `residents` sudah memiliki `UNIQUE (village_id, id)` sejak migration 0001, maka setiap relasi dapat ditegakkan langsung tanpa perubahan parent. Semua `village_id`/`resident_id` bersifat `NOT NULL`; aksi delete cascade lama dapat dipertahankan persis.

## File diperiksa

- `src/db/schema/dokumen-warga.ts`, `kehadiran-izin.ts`, `kelompok.ts`, `verifikasi-kontak.ts`, `warga-pesan.ts`
- `src/db/schema/resident.ts` dan constraint parent di `src/db/migrations/0001_aud002_composite_tenant_fk.sql`
- Migration dan test integrasi composite FK sebelumnya (`0002`, `0003`, `b2-bantuan-composite-fk.integration.test.ts`, `b2-migration-guard-rollback.integration.test.ts`)
- `src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts`, yang sengaja menggunakan fixture legacy lintas tenant untuk menguji penyaringan repository

## File berubah dan hasil

- `src/db/schema/dokumen-warga.ts`, `kehadiran-izin.ts`, `kelompok.ts`, `verifikasi-kontak.ts`, `warga-pesan.ts`: deklarasikan FK Drizzle `(village_id, resident_id) → residents(village_id, id)`; hapus deklarasi single-column resident FK. `kelompok_anggota` mendapat index `(village_id, resident_id)` untuk child key.
- `src/db/migrations/0004_b2_resident_composite_fk.sql`: preflight baca-saja orphan/cross-tenant untuk seluruh lima relasi, berhenti gagal-closed sebelum perubahan constraint bila ada data legacy tidak valid, drop FK lama, lalu pasang lima FK composite dengan `ON DELETE CASCADE ON UPDATE NO ACTION`. Tidak melakukan backfill atau mutasi domain.
- `src/db/migrations/meta/_journal.json`, `meta/0004_snapshot.json`: metadata migration Drizzle.
- `src/db/b2-resident-composite-fk.integration.test.ts`: verifikasi versi MySQL 8, pasangan kolom/aturan delete, penolakan referensi lintas desa dan orphan untuk semua child, jalur sah, serta cascade delete untuk kelima tabel.
- `src/db/b2-resident-migration-guard.integration.test.ts`: membuat database test tersendiri, menyisipkan data legacy lintas tenant, membuktikan preflight gagal sebelum FK lama berubah; database test itu dihapus pada teardown.
- `src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts`: tetap mempertahankan fixture lintas tenant yang memang menguji repository, tetapi seed legacy dilakukan pada satu koneksi dengan `FOREIGN_KEY_CHECKS=0` agar tetap dapat menguji data lama setelah guard database diperketat.
- `vitest.integration.config.mts`: mendaftarkan kedua integration test baru.

## Pemeriksaan security/tenant dan dampak migration

Semua constraint memuat `village_id` dari child dan parent, sehingga pasangan ID tenant tidak dapat melintasi desa. Nullability tidak berubah. `ON DELETE CASCADE` dan `ON UPDATE NO ACTION` sama dengan perilaku constraint terdahulu.

Migration melakukan DDL `ALTER TABLE` untuk lima FK; MySQL harus memeriksa data dan dapat mengambil metadata lock/menahan operasi pada tabel terdampak selama perubahan. Sebelum deploy, jalankan preflight read-only di environment sasaran dan pastikan nol orphan/cross-tenant; jangan perbaiki data otomatis. Siapkan backup sesuai prosedur operasional. Perubahan FK lama tak menyediakan rollback otomatis yang aman setelah data berubah; inverse migration harus menjadi keputusan/operator terpisah. Migration belum dijalankan pada development bersama atau production.

## Validasi

- **PASS** — `npm run typecheck`
- **PASS** — `npx eslint src/db/b2-resident-composite-fk.integration.test.ts src/db/b2-resident-migration-guard.integration.test.ts src/db/schema/dokumen-warga.ts src/db/schema/kehadiran-izin.ts src/db/schema/kelompok.ts src/db/schema/verifikasi-kontak.ts src/db/schema/warga-pesan.ts src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts vitest.integration.config.mts`
- **PASS** — `npx prettier --check` atas seluruh file berubah, migration SQL, journal, dan snapshot
- **PASS** — `source .aud034-env.sh && npx vitest run --config vitest.integration.config.mts src/db/b2-resident-composite-fk.integration.test.ts src/db/b2-resident-migration-guard.integration.test.ts src/db/b2-migration-guard-rollback.integration.test.ts src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts src/features/bantuan/integrasi-warga.test.ts src/features/pesan-warga/integrasi-pesan-warga.test.ts`; helper lokal hanya mengarahkan `TEST_DATABASE_URL` ke `desa_test_aud034` dan tidak termasuk commit. Guard mengonfirmasi database disposable di loopback; test memverifikasi server MySQL 8:
  - `src/db/b2-resident-composite-fk.integration.test.ts`
  - `src/db/b2-resident-migration-guard.integration.test.ts`
  - `src/db/b2-migration-guard-rollback.integration.test.ts`
  - `src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts`
  - `src/features/bantuan/integrasi-warga.test.ts`
  - `src/features/pesan-warga/integrasi-pesan-warga.test.ts`
  - Hasil final: **6 test files passed, 23 tests passed**, termasuk uji guard migration dengan database terisolasi yang dibuat dan dibuang oleh test.
- **PASS** — `git diff --check`
- **SKIPPED** — full unit suite dan full integration suite: perubahan dibatasi pada constraint/schema dan focused integration suite telah dijalankan.
- **SKIPPED** — build produksi dan lint seluruh repository: tidak diperlukan untuk migration/schema terfokus; typecheck dan lint semua file TS terdampak dijalankan.

Percobaan awal menemukan dua masalah yang diperbaiki sebelum hasil final: pesan guard terlalu panjang untuk kolom `varchar(64)`, dan fixture kelompok lintas tenant tertolak oleh constraint baru. Pesan dipendekkan; fixture legacy tetap diuji melalui koneksi test terjaga dengan `FOREIGN_KEY_CHECKS=0`, tanpa mengubah assertion repository. Suite final diulang setelah perbaikan dan lulus.

## Keterbatasan dan status penyerahan

- Preflight test menggunakan fixture sintetis pada MySQL 8 disposable, bukan salinan data tenant bersama/production. Data legacy nyata belum diperiksa.
- Build produksi, full unit suite, dan seluruh integration suite tidak dijalankan.
- Task tidak membuat PR, tidak merge, dan tidak deploy.

**Kesimpulan:** implementasi dan focused verification lulus pada database test MySQL 8. Siap untuk review maintainer setelah pemeriksaan ulang diff dan pengambilan keputusan deployment/preflight data aktual.
