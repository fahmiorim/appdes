# AUD-034 Batch 4C-2a — Composite FK RESTRICT untuk empat relasi `letter_classifications`

- **Task:** AUD-034 Batch 4C-2a — menutup empat relasi `ON DELETE SET NULL` yang menunjuk `letter_classifications` (`incoming_letters`, `letter_dinas`, `letter_types`, `outgoing_letters`) dan menyediakan transaksi hapus di aplikasi.
- **Tanggal:** 16 November 2026.
- **Branch:** `task/AUD-034-batch-4c2a-letter-classification-restrict`, ditumpuk di atas `task/AUD-034-batch-4c1-restrict-relations` (`a98c1e6`) karena migration `0008` belum merged.
- **Base commit `origin/main`:** `6c662de58be07b7a6486ad6da9cc888f11f877db`. Base branch pekerjaan: `a98c1e68` (head Batch 4C-1).
- **Commit pekerjaan:** `27939e4` (schema, migration `0009`, transaksi `deleteKlasifikasi`, test, penyesuaian fixture), lalu commit laporan dan matriks pada branch yang sama.
- **Status:** siap review. Belum di-merge, belum di-deploy, dan migration belum dijalankan pada database produksi.

## 1. Kondisi awal

Keempat relasi masih memakai FK single-column `ON DELETE SET NULL` pada base branch:

| Child → Parent | FK lama | Aturan delete |
| --- | --- | --- |
| `incoming_letters.classification_id` → `letter_classifications.id` | `incoming_letters_classification_id_letter_classifications_id_fk` | `SET NULL` |
| `letter_dinas.classification_id` → `letter_classifications.id` | `letter_dinas_classification_id_letter_classifications_id_fk` | `SET NULL` |
| `letter_types.classification_id` → `letter_classifications.id` | `letter_types_classification_id_letter_classifications_id_fk` | `SET NULL` |
| `outgoing_letters.classification_id` → `letter_classifications.id` | `outgoing_letters_classification_id_letter_classifications_id_fk` | `SET NULL` |

Kolom child nullable, tetapi `village_id` child `NOT NULL`. Pada composite FK, MySQL menerapkan `SET NULL` ke **semua** kolom FK termasuk `village_id`, sehingga composite `SET NULL` tidak mungkin dipakai tanpa melemahkan invariant tenant. Database juga belum memeriksa kesamaan desa: baris desa A dapat menunjuk klasifikasi desa B.

Berbeda dari Batch 4C-1, parent ini **punya** jalur hapus di aplikasi: `deleteKlasifikasi(villageId, id)` di `src/features/surat/infrastructure/master-repository.ts`. Fungsi tersebut sebelumnya menghapus parent langsung dan mengandalkan `SET NULL` database. Saat ini belum ada route/use case surat master yang memanggilnya (UI master surat belum diporting), sehingga perubahan perilaku belum terlihat di UI.

## 2. Kebijakan yang dipakai

Kebijakan `RESTRICT` + transaksi aplikasi yang ditetapkan pada Batch 4C-1 diterapkan sebagai berikut:

1. Database menolak penghapusan klasifikasi yang masih dirujuk (`ON DELETE RESTRICT`), dan menolak referensi lintas desa pada insert maupun update.
2. `deleteKlasifikasi` menjalankan satu transaksi: mengosongkan `classification_id` pada keempat child (dibatasi `village_id`) lalu menghapus klasifikasi. Ini mempertahankan perilaku bisnis lama (`SET NULL`) untuk jalur aplikasi tanpa referensi yatim.
3. Tidak ada backfill dan tidak ada mutasi data di migration.

## 3. Perubahan

### 3.1 Schema Drizzle

| File | Perubahan |
| --- | --- |
| `src/db/schema/letter-classifications.ts` | tambah `UNIQUE (village_id, id)` bernama `letter_classifications_village_id_uq` sebagai parent key |
| `src/db/schema/incoming-letters.ts` | lepas `.references()` pada `classificationId`; tambah index `(village_id, classification_id)` dan composite FK `incoming_letters_classification_tenant_fk` `ON DELETE RESTRICT` |
| `src/db/schema/letter-dinas.ts` | lepas `.references()`; index `letter_dinas_village_classification_idx`; FK `letter_dinas_classification_tenant_fk` |
| `src/db/schema/letter-types.ts` | lepas `.references()`; index `letter_types_village_classification_idx`; FK `letter_types_classification_tenant_fk` |
| `src/db/schema/outgoing-letters.ts` | lepas `.references()`; index `outgoing_letters_village_classification_idx`; FK `outgoing_letters_classification_tenant_fk` |

Index single-column bawaan FK lama tidak dibuat ulang secara terpisah; index composite baru menjadi index child untuk FK baru. Kolom `classification_id` tetap nullable.

### 3.2 Migration `0009_b4c2a_letter_classification_restrict.sql`

Dihasilkan dengan `npx drizzle-kit generate --name b4c2a_letter_classification_restrict` (snapshot `0009_snapshot.json`, journal idx 9, `prevId` = snapshot `0008`), lalu diberi preflight manual mengikuti pola `0008`:

1. Membuat `_b4c2a_tenant_preflight_findings` dan menghitung `orphan` + `cross-tenant` untuk keempat relasi.
2. Bila ada temuan, insert ke `_b4c2a_tenant_preflight_abort` dengan pesan `B4C2A <kode> <jenis>=<jumlah>`; duplicate key menghentikan migration **sebelum** constraint diubah, dan tabel temuan dipertahankan untuk diagnosis.
3. Bila bersih, drop FK lama, tambah unique parent, tambah empat index composite, lalu tambah empat composite FK `RESTRICT`. Tidak ada `UPDATE`/`DELETE` data domain.

Urutan perintah dibuat agar index child sudah ada sebelum FK ditambahkan, sehingga MySQL tidak membuat index otomatis tambahan.

### 3.3 Transaksi aplikasi

`deleteKlasifikasi(villageId, id)` kini:

1. `UPDATE incoming_letters SET classification_id = NULL WHERE village_id = ? AND classification_id = ?`
2. idem untuk `letter_dinas`, `letter_types`, `outgoing_letters`
3. `DELETE FROM letter_classifications WHERE village_id = ? AND id = ?`

Semua langkah berjalan dalam `db.transaction`, mengikuti pola `deleteKeluarga`/`deleteSurat`. Filter `village_id` memastikan baris desa lain tidak tersentuh.

### 3.4 Test

| File | Isi |
| --- | --- |
| `src/db/b4c2a-letter-classification-composite-fk.integration.test.ts` (baru, 7 tes) | MySQL 8; insert lintas desa ditolak 1452 pada keempat relasi; relasi sewilayah dan `NULL` diterima; update lintas desa ditolak 1452; hapus langsung ditolak 1451 lalu `deleteKlasifikasi` melepas keempat referensi; hapus klasifikasi desa A tidak menyentuh referensi desa B; hapus desa setelah anak dibersihkan |
| `src/db/b4c2a-tenant-migration-guard.integration.test.ts` (baru, 3 tes) | database disposable `desa_test_aud034b4c2ag_*`; migrasi sampai idx 8, data legacy lintas desa + orphan pada keempat relasi, lalu `0009`; memastikan migration gagal-closed, 8 temuan terdeteksi, FK lama utuh, dan unique parent tidak terpasang |
| `src/db/tenant-composite-fk.integration.test.ts` | daftar `*_tenant_fk` diperluas dengan empat constraint baru |
| `src/features/surat/infrastructure/penomoran-archive.integration.test.ts` | cleanup diubah: surat, jenis surat, dan klasifikasi dihapus sebelum `villages` karena cascade antar-anak tidak dijamin MySQL |

`vitest.integration.config.mts` mendaftarkan kedua berkas baru.

### 3.5 Fixture yang gagal setelah migration

Suite integrasi penuh pertama setelah `0009` gagal pada `penomoran-archive`:

```text
Error: Failed query: delete from `villages` where `villages`.`id` = ?
Caused by: ER_ROW_IS_REFERENCED_2 (1451)
letter_types_classification_tenant_fk FOREIGN KEY (`village_id`, `classification_id`)
```

Ini konsekuensi nyata `RESTRICT`: `DELETE FROM villages` tidak selalu meng-cascade anak secara berurutan. Fixture diperbaiki dengan membersihkan child lebih dulu; setelah itu suite penuh lulus. Tidak ada assertion yang dilemahkan.

## 4. Security dan tenant

- Composite FK menyertakan `village_id`, sehingga referensi child→klasifikasi lintas desa ditolak database pada insert dan update — bukan hanya oleh filter aplikasi.
- `deleteKlasifikasi` membatasi setiap update dan delete dengan `village_id`, sehingga penghapusan tidak dapat melepas referensi desa lain.
- Pesan/constraint tidak membocorkan data tenant lain; test negatif lintas desa disertakan.
- Tidak ada jalur bypass baru, tidak ada perubahan autentikasi/otorisasi, dan tidak ada data pribadi pada fixture (kode/nama sintetis).

## 5. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** |
| ESLint (berkas berubah) | `npx eslint ...` (schema, repository, test, config) | **PASS** |
| Format | `npx prettier --check ...` (berkas berubah) | **PASS** |
| Unit test | `npm run test:unit` | **PASS** — 197 berkas / 1754 tes |
| Integration 4C-2a FK | `TEST_DATABASE_ACK=1 TEST_DATABASE_URL='mysql://root@127.0.0.1:3306/desa_test_b4c1' npx vitest run --config vitest.integration.config.mts src/db/b4c2a-letter-classification-composite-fk.integration.test.ts` | **PASS** — 7 tes |
| Integration guard preflight | perintah sama, berkas `b4c2a-tenant-migration-guard` | **PASS** — 3 tes |
| Integration daftar constraint | perintah sama, berkas `tenant-composite-fk` | **PASS** — 10 tes |
| Integration penuh | `TEST_DATABASE_ACK=1 TEST_DATABASE_URL='mysql://root@127.0.0.1:3306/desa_test_b4c1' npm run test:integration` | **PASS** — 40 berkas / 233 tes |

Kegagalan yang tercatat selama pengerjaan: suite integrasi awal gagal pada `penomoran-archive` (1451, lihat §3.5), lalu diperbaiki dan dijalankan ulang hingga hijau. Migration `0009` hanya dijalankan pada database uji disposable; tidak ada database produksi yang disentuh.

## 6. Diff

Commit `27939e4`: 14 berkas, 19.255 insertions / 21 deletions. Mayoritas baris berasal dari `0009_snapshot.json` (18.439 baris) yang dihasilkan drizzle-kit; kode dan test berubah sekitar 800 baris.

## 7. Risiko tersisa

1. **Migration belum dijalankan pada salinan data nyata.** Preflight akan gagal-closed bila ada referensi lintas desa/orphan pada keempat relasi; jumlahnya belum diukur. Urutan deploy: `0007` → `0008` → `0009`.
2. **Branch ditumpuk.** Branch ini memuat seluruh commit Batch 4B dan 4C-1; PR harus di-review setelah (atau bersama) PR #67 dan #69. Nomor `0009` bergantung pada `0008` yang belum merged.
3. **Penghapusan langsung di luar aplikasi berubah perilaku.** `DELETE` klasifikasi lewat SQL/DBA kini ditolak 1451 selama dirujuk; pembersihan harus melalui `deleteKlasifikasi` atau update manual lebih dulu.
4. **Belum ada route/use case hapus klasifikasi.** `deleteKlasifikasi` belum dipanggil UI karena modul master surat belum diporting; transaksi sudah siap dipakai saat route itu dibuat dan tercakup test integrasi.
5. **Hapus desa manual memerlukan urutan eksplisit** (`incoming_letters`, `letter_dinas`, `letter_types`, `outgoing_letters`, `letter_classifications` sebelum `villages`) sampai runbook hapus desa tersedia.
6. **Drift index `bumindes_item_village_buku_idx`** masih terbuka dan ditangani sebagai task terpisah.

## 8. Kesimpulan

Empat relasi klasifikasi surat kini dienforce database dengan composite FK `RESTRICT`, preflight fail-closed, dan test lintas tenant untuk insert/update/delete. Perilaku bisnis lama (`SET NULL` saat klasifikasi dihapus) dipertahankan lewat transaksi aplikasi `deleteKlasifikasi`, sehingga tidak ada referensi yatim. Seluruh pemeriksaan yang relevan lulus pada database uji disposable.

Langkah berikutnya: review PR ini bersama PR #69/#67, lalu lanjutkan Batch 4C-2b (`analisis_kategori`, `polygon`, `inventaris_kategori`, `kelompok_master`) sebagai PR terpisah.
