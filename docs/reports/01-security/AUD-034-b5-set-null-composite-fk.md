# AUD-034 Batch B1 — composite tenant FK untuk relasi `ON DELETE SET NULL`

- **Tanggal:** 2026-11-16
- **Branch:** `task/AUD-034-b5-set-null-composite-fk`
- **Base commit:** `30b81de` (`origin/main`, PR #80)
- **Task:** menegakkan isolasi tenant untuk delapan relasi Matriks B1 yang masih dijaga application layer saja.

## 1. Kondisi awal

`docs/reports/01-security/AUD-034-tenant-relation-matrix.md` §5 mencatat delapan relasi dengan `ON DELETE SET NULL`:

| Child | Kolom | Parent |
| --- | --- | --- |
| `kontak` | `resident_id` | `residents` |
| `lapak` | `resident_id` | `residents` |
| `notifikasi_terkirim` | `resident_id` | `residents` |
| `pendapat` | `resident_id` | `residents` |
| `family_member_logs` | `family_id` | `families` |
| `family_member_logs` | `resident_id` | `residents` |
| `users` | `resident_id` | `residents` |
| `letter_number_archive` | `letter_id` | `letters` |

Semuanya hanya foreign key satu kolom, sehingga database menerima child di desa A yang menunjuk parent di desa B. Penghapusan parent juga tidak memeriksa tenant.

## 2. Keputusan desain

1. **`ON DELETE RESTRICT`, bukan `SET NULL`.** Composite FK memuat `village_id` yang `NOT NULL` pada kedelapan child. Bila dipasang `SET NULL`, MySQL akan mencoba mengosongkan `village_id` juga dan operasi gagal/merusak invariant. Ini sama dengan pola Batch 4C-1 (`0008`) dan 4C-2b (`0010`).
2. **Efek `SET NULL` dipertahankan di application layer.** `deletePenduduk`, `deleteKeluarga`, dan `deleteSurat` mengosongkan `*_id` di transaksi yang sama sebelum menghapus parent, sehingga perilaku bisnis lama tidak berubah.
3. **`users.resident_id` juga dijadikan composite FK.** MySQL melewati pemeriksaan FK bila salah satu kolom composite NULL, jadi akun platform (`village_id IS NULL`) tidak terikat. Akibatnya pelepasan referensi untuk `users` sengaja tidak memfilter `village_id`, agar baris platform tidak menyisakan `resident_id` yatim.
4. **Tanpa unique parent baru.** `residents_village_id_uq`, `families_village_id_uq`, dan `letters_village_id_uq` sudah ada sejak migration `0001`.

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/db/schema/kontak.ts`, `lapak.ts`, `notifikasi-terkirim.ts`, `pendapat.ts` | Lepas `.references(... { onDelete: "set null" })`, pasang composite FK `RESTRICT` + index `(village_id, resident_id)`. |
| `src/db/schema/family-log.ts` | Composite FK `RESTRICT` untuk `family_id` dan `resident_id` + index. |
| `src/db/schema/letter-number-archive.ts` | Composite FK `RESTRICT` untuk `letter_id` + index `(village_id, letter_id)`. |
| `src/db/schema/auth.ts` | Composite FK `RESTRICT` `users(village_id, resident_id)` + index. |
| `src/db/migrations/0011_b1_set_null_relations_composite_fk.sql` | Migration baru: preflight fail-closed (`_b1_tenant_preflight_findings` / `_b1_tenant_preflight_abort`), drop 8 FK lama, tambah 7 index, pasang 8 composite FK. Ditulis manual agar urutan index sebelum FK benar. |
| `src/db/migrations/meta/0011_snapshot.json`, `meta/_journal.json` | Hasil `drizzle-kit generate`, entri idx 11. |
| `src/features/penduduk/infrastructure/penduduk-repository.ts` | `deletePenduduk` melepas `kontak`, `lapak`, `notifikasi_terkirim`, `pendapat`, `family_member_logs.resident_id`, dan `users` sebelum menghapus penduduk. |
| `src/features/keluarga/infrastructure/keluarga-repository.ts` | `deleteKeluarga` melepas `family_member_logs.family_id`. |
| `src/features/surat/infrastructure/surat-repository.ts` | `deleteSurat` melepas `letter_number_archive.letter_id`. |
| `src/db/b5-set-null-relations-composite-fk.integration.test.ts` (baru) | Bukti constraint, penolakan lintas tenant (insert/update/delete), penerimaan `NULL`, dan pembersihan lewat repository. |
| `src/db/b5-tenant-migration-guard.integration.test.ts` (baru) | Bukti preflight `0011` gagal-closed dan tidak memasang FK baru saat ada data lintas tenant/yatim. |
| `src/db/tenant-composite-fk.integration.test.ts` | Daftar `%_tenant_fk` diperluas dengan delapan constraint baru. |
| `vitest.integration.config.mts` | Dua file test baru didaftarkan. |
| `docs/reports/01-security/AUD-034-runbook-hapus-desa.md` | §2.4 baru untuk B1; §4.2–§4.4 diperbarui agar urutan hapus desa dan verifikasi mencakup delapan tabel ini. |

## 4. Perubahan perilaku

- Insert/update child yang menunjuk parent desa lain kini gagal dengan `ER_NO_REFERENCED_ROW_2` (1452).
- Delete `residents`/`families`/`letters` yang masih direferensikan gagal dengan `ER_ROW_IS_REFERENCED_2` (1451), bukan lagi mengosongkan kolom secara diam-diam.
- `deletePenduduk`/`deleteKeluarga`/`deleteSurat` tetap berhasil dengan hasil yang sama seperti sebelumnya: referensi menjadi `NULL`, baris parent terhapus.

## 5. Security / tenant

- Constraint memakai `(village_id, id)` sehingga isolasi ditegakkan database, bukan hanya filter repository.
- Negative test mencakup delapan relasi: lintas tenant pada insert, lintas tenant pada update, dan delete parent yang masih direferensikan.
- Akun platform (`village_id NULL`) diuji agar tidak diblokir FK dan tetap dibersihkan lewat `resident_id`.
- Migration `0011` fail-closed: bila ada child yatim atau lintas tenant, migration berhenti sebelum DDL apa pun dan menulis temuan ke `_b1_tenant_preflight_findings`.
- Tidak ada perubahan permission, route, atau handler; tidak ada data produksi yang disentuh.

## 6. Validasi

Dijalankan pada 2026-11-16, database uji disposable `desa_test_b1_local` (MySQL 8.0.30 loopback), bukan database pengembangan/produksi.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint` (3 repository + 2 test baru) | **PASS** |
| `npx prettier --check` (seluruh file berubah) | **PASS** |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | **PASS** — 8 test |
| `npx vitest run --config vitest.integration.config.mts src/db/b5-set-null-relations-composite-fk.integration.test.ts` | **PASS** — 6 test |
| `npx vitest run --config vitest.integration.config.mts src/db/b5-tenant-migration-guard.integration.test.ts` | **PASS** — 3 test |
| `npx vitest run --config vitest.integration.config.mts src/db/tenant-composite-fk.integration.test.ts` | **PASS** — 10 test |
| Seluruh suite `npm run test:integration` | **SKIPPED** — hanya file terkait B1 yang dijalankan agar tidak menyentuh database uji milik suite lain. |

Catatan proses: dua kegagalan nyata muncul pada run pertama (unique `letter_number_archive_letter_uq` dan `users_resident_uq` di fixture) dan sudah diperbaiki di fixture test, bukan dengan melonggarkan assertion.

## 7. Risiko dan keterbatasan

- Migration `0011` belum dijalankan di staging/produksi. Bila data lama berisi referensi lintas tenant atau yatim, migration akan berhenti dan perlu backfill manual lebih dulu.
- FK `users(village_id, resident_id)` tidak memeriksa baris platform; kebersihan `resident_id` pada akun platform tetap bergantung pada `deletePenduduk` (sudah mencakup tanpa filter desa) dan runbook hapus desa.
- Rollback `0011` belum dibuat pada task ini; script rollback `0007`–`0009` dikerjakan pada branch terpisah.
- Suite integrasi penuh tidak dijalankan, sehingga regresi di modul lain yang memakai `deletePenduduk`/`deleteKeluarga`/`deleteSurat` baru diverifikasi lewat CI setelah PR.

## 8. Status

Siap review. Belum di-merge dan belum menyentuh deployment.
