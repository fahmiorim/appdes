# AUD-034 Batch 4C-2b — Composite FK RESTRICT untuk empat relasi `SET NULL` terakhir

- **Task:** AUD-034 Batch 4C-2b — menutup empat relasi `ON DELETE SET NULL` yang parent-nya punya jalur hapus aplikasi: `analisis_indikator.kategori_id`, `area.ref_polygon`, `inventaris.kategori_id`, `kelompok.category_id`.
- **Tanggal:** 16 November 2026.
- **Branch:** `task/AUD-034-b4c2b-remaining-four`.
- **Base commit `origin/main`:** `e8d761cbf7b41fe09e5b7e02a4ea9dddda30c77f`.
- **Commit pekerjaan:** satu commit di ujung branch ini (schema, migration `0010`, test, repository, laporan); SHA dicatat pada penyerahan/PR agar tidak berubah saat amend.
- **Status:** siap review. Migration belum dijalankan pada database mana pun, belum di-merge, belum di-deploy.

## 1. Kondisi awal

Keempat relasi masih memakai FK single-column `ON DELETE SET NULL` pada base `e8d761c`, sehingga database menerima baris desa A yang menunjuk parent desa B:

| Child → Parent | FK lama | Aturan delete |
| --- | --- | --- |
| `analisis_indikator.kategori_id` → `analisis_kategori.id` | `analisis_indikator_kategori_id_analisis_kategori_id_fk` | `SET NULL` |
| `area.ref_polygon` → `polygon.id` | `area_ref_polygon_polygon_id_fk` | `SET NULL` |
| `inventaris.kategori_id` → `inventaris_kategori.id` | `inventaris_kategori_id_inventaris_kategori_id_fk` | `SET NULL` |
| `kelompok.category_id` → `kelompok_master.id` | `kelompok_category_id_kelompok_master_id_fk` | `SET NULL` |

Keempat child memiliki `village_id NOT NULL`. Pada composite FK, `SET NULL` diterapkan ke semua kolom FK termasuk `village_id`, sehingga composite `SET NULL` tidak dapat dipakai tanpa mengubah nullability. Keputusan batch sebelumnya (tercatat pada laporan 4C-1) berlaku: **`RESTRICT` di database + transaksi aplikasi** yang melepas referensi sebelum parent dihapus, sehingga efek bisnis `SET NULL` tetap sama untuk jalur aplikasi.

Keempat parent **memiliki** jalur hapus di repository aplikasi: `deleteAnalisisKategori`, `deletePolygon`, `deleteInventarisKategori`, `deleteKategori`. `deleteAnalisisKategori` belum dipanggil use case mana pun saat ini, tetapi tetap disesuaikan agar tidak menjadi jebakan saat modul analisis menambah hapus kategori.

`users.role_id` tetap **tidak** dijadikan composite FK: role platform sah memiliki `village_id IS NULL`.

## 2. Perubahan

### 2.1 Schema Drizzle

| Tabel | Perubahan |
| --- | --- |
| `analisis_kategori` | tambah `UNIQUE (village_id, id)` bernama `analisis_kategori_village_id_uq` |
| `polygon` | tambah `UNIQUE (village_id, id)` bernama `polygon_village_id_uq` |
| `inventaris_kategori` | tambah `UNIQUE (village_id, id)` bernama `inventaris_kategori_village_id_uq` |
| `kelompok_master` | tambah `UNIQUE (village_id, id)` bernama `kelompok_master_village_id_uq` |
| `analisis_indikator` | lepas `.references()` pada `kategoriId`; tambah index `(village_id, kategori_id)` dan composite FK `analisis_indikator_kategori_tenant_fk` `ON DELETE RESTRICT` |
| `area` | lepas `.references()` pada `refPolygon`; index `(village_id, ref_polygon)` sudah ada (`area_village_polygon_idx`); tambah composite FK `area_polygon_tenant_fk` `ON DELETE RESTRICT` |
| `inventaris` | lepas `.references()` pada `kategoriId`; index `(village_id, kategori_id)` sudah ada (`inv_village_kategori`); tambah composite FK `inventaris_kategori_tenant_fk` `ON DELETE RESTRICT` |
| `kelompok` | lepas `.references()` pada `categoryId`; tambah index `(village_id, category_id)` (`kelompok_village_category_idx`) dan composite FK `kelompok_category_tenant_fk` `ON DELETE RESTRICT` |

Index single-column lama (`kelompok_category_idx`) dipertahankan; menghapusnya di luar scope. Komentar schema pada `analisis-indikator.ts`, `gis.ts`, dan `kelompok.ts` diperbarui agar tidak lagi menjanjikan `SET NULL` di database.

### 2.2 Repository dan use case

| Fungsi | Perubahan |
| --- | --- |
| `deleteAnalisisKategori(id, villageId)` | satu transaksi: `UPDATE analisis_indikator SET kategori_id = NULL` untuk `(village_id, kategori_id)` yang cocok, lalu hapus kategori |
| `deletePolygon(villageId, id)` | satu transaksi: `UPDATE area SET ref_polygon = NULL` untuk `(village_id, ref_polygon)`, lalu hapus polygon |
| `deleteInventarisKategori(villageId, id)` | satu transaksi: lepas `inventaris.kategori_id` (termasuk barang soft-deleted), hapus kategori, pertahankan `notFound` bila 0 baris terhapus |
| `deleteKategori(villageId, id)` | satu transaksi: `UPDATE kelompok SET category_id = NULL` untuk `(village_id, category_id)`, lalu hapus `kelompok_master` |

Semua pelepasan referensi dibatasi `village_id`, sehingga repository tidak dapat melepas atau menghapus baris tenant lain meskipun menerima id lintas desa.

Aturan use case **tidak dilonggarkan**: `hapusInventarisKategori` tetap menolak kategori yang masih dipakai barang (`conflict`), dan `deleteKategori` kelompok tetap menolak kategori yang masih dipakai kelompok. Transaksi repository hanya menjaga baris yang lolos dari guard (mis. barang soft-deleted) agar penghapusan tidak gagal `1451`.

Selain itu, validasi `kategoriId` pada `saveInventaris` tetap ada; komentarnya diperbarui karena database kini juga menegakkan tenant.

### 2.3 Migration `0010_b4c2b_remaining_relations_restrict.sql`

Urutan: preflight → drop 4 FK lama → tambah 4 unique parent → tambah 2 index child → tambah 4 composite FK `ON DELETE RESTRICT ON UPDATE NO ACTION`.

Preflight read-only terhadap data domain: menghitung `orphan` dan `cross-tenant` untuk keempat relasi (memakai `IS NOT NULL` karena kolom nullable), menulis temuan ke `_b4c2b_tenant_preflight_findings`, lalu memicu duplicate-key error pada `_b4c2b_tenant_preflight_abort` bila ada temuan. Pesan berawalan `B4C2B` dan memuat relasi, jenis, serta jumlah baris. Migration berhenti **sebelum** satu pun constraint diubah; tabel helper sengaja ditinggalkan untuk diagnosis dan di-`DROP IF EXISTS` pada awal retry. Tidak ada backfill dan tidak ada perubahan baris domain.

Snapshot `0010_snapshot.json` dihasilkan `npx drizzle-kit generate`. Generate awal sempat menghasilkan beberapa indeks perantara (`0010`–`0012`); SQL/snapshot perantara dihapus, dan journal ditulis ulang menjadi satu entri `idx: 10` dengan tag `0010_b4c2b_remaining_relations_restrict`. Rantai `prevId` diverifikasi menunjuk snapshot `0009` (`d5a183f7-39a1-403c-988d-d2346c9c50ec`), dan snapshot memuat keempat unique parent, dua index baru, empat composite FK baru, serta tidak lagi memuat keempat FK single-column lama.

### 2.4 Test

| Berkas | Isi |
| --- | --- |
| `src/db/b4c2b-remaining-relations-composite-fk.integration.test.ts` (baru, 5 tes) | insert lintas desa ditolak `1452` pada keempat relasi; insert sewilayah dan `NULL` diterima; update yang memindahkan relasi ke desa lain ditolak; hapus parent yang masih dirujuk ditolak `1451`; hapus lewat repository melepas referensi desa sendiri dan **tidak** menyentuh referensi desa lain |
| `src/db/b4c2b-tenant-migration-guard.integration.test.ts` (baru, 3 tes) | migrasi sampai `0009`, sisipkan data legacy cross-tenant + orphan (`FOREIGN_KEY_CHECKS=0`), jalankan `0010`: migration gagal dengan pesan `B4C2B`, 8 temuan (2 per relasi) tercatat, FK lama tetap ada, dan unique parent belum terpasang |
| `src/db/tenant-composite-fk.integration.test.ts` | daftar `*_tenant_fk` diperluas dengan empat constraint baru (urut sesuai `ORDER BY` query) |
| `vitest.integration.config.mts` | dua berkas test baru didaftarkan; entri `b4c2a-tenant-migration-guard` yang sempat hilang saat penyuntingan dipulihkan |

## 3. Security dan tenant

- Composite FK mengikat `village_id` child dan parent, sehingga pasangan lintas desa ditolak database, bukan hanya application layer (AGENTS.md §3).
- Semua `UPDATE` pelepasan referensi dibatasi `(village_id, kolom relasi)`, sehingga menerima id parent milik desa lain tidak melepas atau menghapus data tenant lain.
- Keempat fungsi hapus tetap memakai `villageId` dari sesi/`resolveVillageId` pada lapisan di atasnya; tidak ada `villageId` dari body/query yang menjadi bukti otorisasi.
- Guard use case "kategori masih dipakai" tidak dihapus atau dilonggarkan; `RESTRICT` menjadi lapisan kedua bila guard terlewat.
- `UNIQUE (village_id, id)` pada parent tidak mengubah keunikan karena `id` sudah primary key.
- Preflight dan test hanya menyimpan nama relasi, jenis, dan jumlah baris; tidak ada NIK, data pribadi, atau secret pada migration, fixture, maupun laporan.
- Test negatif lintas tenant tersedia untuk insert **dan** update pada keempat relasi, serta pembuktian bahwa referensi desa lain tidak ikut dilepas.

## 4. Validasi

Dijalankan lokal pada Windows (bash), tanpa database. Tidak ada database test disposable yang dikonfigurasi pada environment ini, sehingga integration test tidak dijalankan.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** — `next typegen` + `tsc --noEmit` tanpa error |
| `npx eslint <13 berkas berubah>` | **PASS** — tanpa temuan |
| `npx prettier --check <berkas berubah>` | **FAIL** awal pada `b4c2b-remaining-relations-composite-fk.integration.test.ts` → `prettier --write` → **PASS** |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | **PASS** — 8 tes |
| `npx vitest run --config vitest.config.mts src/features/analisis src/features/gis src/features/inventaris src/features/kelompok` | **PASS** — 13 berkas, 177 tes |
| `npm run test:integration -- src/db/b4c2b-*` | **SKIPPED** — `TEST_DATABASE_URL` dan `TEST_DATABASE_ACK` tidak tersedia; guard database disposable tidak dapat dipenuhi |

Catatan proses:

1. `npm run test:unit` penuh tidak dijalankan; unit test yang dijalankan dibatasi pada modul yang berubah dan penjaga paritas migrasi.
2. Integration test (guard migration dan composite FK) **belum terbukti berjalan**. Assertion-nya belum pernah dieksekusi; jangan menganggapnya lulus sampai dijalankan pada database disposable.

## 5. Diff

Berkas berubah:

- `src/db/schema/analisis.ts`
- `src/db/schema/analisis-indikator.ts`
- `src/db/schema/gis.ts`
- `src/db/schema/inventaris.ts`
- `src/db/schema/kelompok.ts`
- `src/db/migrations/0010_b4c2b_remaining_relations_restrict.sql` (baru)
- `src/db/migrations/meta/0010_snapshot.json` (baru)
- `src/db/migrations/meta/_journal.json`
- `src/db/b4c2b-remaining-relations-composite-fk.integration.test.ts` (baru)
- `src/db/b4c2b-tenant-migration-guard.integration.test.ts` (baru)
- `src/db/tenant-composite-fk.integration.test.ts`
- `vitest.integration.config.mts`
- `src/features/analisis/infrastructure/analisis-repository.ts`
- `src/features/gis/infrastructure/gis-repository.ts`
- `src/features/inventaris/infrastructure/inventaris-repository.ts`
- `src/features/inventaris/application/inventaris-use-cases.ts` (komentar)
- `src/features/kelompok/infrastructure/kelompok-repository.ts`
- `docs/reports/01-security/AUD-034-runbook-hapus-desa.md`
- `docs/reports/01-security/AUD-034-tenant-relation-matrix.md`
- `docs/reports/01-security/AUD-034-batch-4c2b-remaining-restrict.md` (laporan ini)

## 6. Risiko dan keterbatasan

1. **Integration test belum dijalankan.** Bukti utama constraint baru (1451/1452, efek transaksi, preflight) belum diverifikasi pada MySQL nyata. Ini keterbatasan terbesar laporan ini.
2. **Urutan hapus desa menjadi tanggung jawab pemanggil.** Setelah `0010`, `DELETE FROM villages` untuk desa yang masih memiliki `analisis_indikator`, `area`, `inventaris`, atau `kelompok` ber-referensi dapat gagal `1451` karena urutan cascade InnoDB tidak dijamin. Runbook hapus desa diperbarui; aplikasi tidak memiliki use case hapus desa, jadi tidak ada jalur produksi yang berubah.
3. **Migration belum dijalankan pada data nyata.** Preflight akan gagal-closed bila produksi memuat baris lintas desa/orphan pada keempat relasi; jumlahnya belum diketahui. Operator perlu mencoba `0010` pada salinan database lebih dulu.
4. **`deleteAnalisisKategori` belum dipakai use case.** Perilaku hapus kategori analisis belum tercakup test aplikasi; hanya diuji lewat integration test repository.
5. **`polygon` bukan tabel master sederhana** — `area.ref_polygon` juga dipakai untuk relasi wilayah; perubahan ini tidak mengubah logika GIS, hanya menambah constraint dan pelepasan referensi transaksional.
6. **Sisa Matriks B2: 1 relasi** — `users.role_id`, yang tetap app-enforced dan dikecualikan secara eksplisit.

## 7. Kesimpulan

Empat relasi `SET NULL` terakhir dengan parent ber-jalur-hapus aplikasi kini dienforce database lewat composite FK `RESTRICT`, dengan preflight fail-closed dan transaksi tenant-scoped yang mempertahankan efek bisnis `SET NULL`. Validasi statis lulus; integration test belum dapat dijalankan dan harus diselesaikan reviewer/CI sebelum merge.

Langkah berikutnya: jalankan `npm run test:integration` pada database disposable (MySQL 8), lalu review diff bersama runbook hapus desa yang diperbarui.
