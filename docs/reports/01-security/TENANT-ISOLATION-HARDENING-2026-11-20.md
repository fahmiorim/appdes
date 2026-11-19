# Tenant Isolation Hardening — 20 November 2026

> **Catatan:** dokumen ini adalah snapshot pekerjaan pada commit `ef1353f`.
> Pekerjaan lanjutan, bukti test modul tambahan, dan status PR #174 ada di
> [Revisi 2](./TENANT-ISOLATION-HARDENING-2026-11-20-REV2.md).

- **Task:** menutup sisa celah isolasi tenant prioritas: composite FK
  `survey_soal.indikator_id`, fallback desa untuk akun platform, dan matriks
  bukti test isolasi per modul.
- **Tanggal:** 20 November 2026.
- **Branch:** `task/tenant-isolation-hardening-2026-11-20`.
- **Base commit:** `4bd4cd684d01d4e197b1d8e4b67302283b49a170` (`main`).
- **Commit hasil:** `ef1353f` (perubahan kode, schema, migration, test, dan
  dokumen pendukung).
- **Status:** siap review; belum di-push, belum di-merge, dan belum dijalankan
  di production.

## Ringkasan kondisi awal

Audit schema menemukan tiga hal yang perlu ditindaklanjuti:

1. `survey_soal.indikator_id` hanya memakai FK satu kolom ke
   `analisis_indikator.id`. Validasi aplikasi sudah memeriksa desa, tetapi
   jalur tulis yang melewati validasi masih dapat menautkan soal desa A ke
   indikator desa B.
2. `resolveVillageId()` memakai desa aktif pertama sebagai fallback untuk akun
   platform tanpa `villageId`. Pada instalasi multi-desa, fallback ini dapat
   memilih tenant yang salah untuk operasi tulis/admin.
3. Bukti test isolasi tenant tersebar di beberapa file, tetapi belum ada
   matriks yang memetakan modul mana yang sudah diuji baca/tulis dan mana yang
   masih hanya dilindungi composite FK.

## Analisis dan pendekatan

### 1. Composite FK indikator survey

`analisis_indikator` mendapat unique index `(village_id, id)` sebagai target
composite FK. `survey_soal.indikator_id` tidak lagi memakai FK satu kolom;
tabel anak mendapat index `(village_id, indikator_id)` dan composite FK
`survey_soal_indikator_tenant_fk` ke `analisis_indikator(village_id, id)` dengan
`ON DELETE RESTRICT`.

`ON DELETE SET NULL` tidak dapat dipertahankan pada composite FK karena akan
ikut mengosongkan `village_id` yang `NOT NULL`. Perilaku bisnis lama
(`indikator_id` menjadi `NULL` saat indikator dihapus) dipindahkan ke
repository: `deleteAnalisisIndikator()` melepas referensi soal sewilayah dalam
satu transaksi sebelum menghapus indikator.

Migration `0018` memakai preflight read-only. Jika ditemukan referensi lintas
desa atau orphan, statement pemicu gagal karena duplicate key dan migration
berhenti sebelum constraint diubah. Tidak ada backfill, update, atau delete
data domain di dalam migration.

### 2. Fallback desa akun platform

`getSoleVillageId()` mengembalikan desa hanya jika tepat satu desa aktif.
`resolveVillageId()` sekarang:

- memakai `user.villageId` bila ada;
- memakai desa tunggal bila instalasi hanya punya satu desa aktif;
- `NOT_FOUND` bila tidak ada desa aktif;
- `FORBIDDEN` bila ada lebih dari satu desa aktif dan akun tidak punya
  penugasan desa.

`getIdentitas()` disamakan agar tidak memakai desa pertama pada instalasi
multi-desa. Ini mencegah identitas desa tampil untuk tenant yang tidak dipilih
secara eksplisit.

### 3. Matriks isolasi tenant

Matriks baru mencatat bukti test yang benar-benar ada, membedakan status
**Kuat**, **Sebagian**, dan **Belum**, serta mencantumkan gap prioritas. Matriks
ini juga menegaskan bahwa composite FK tidak menggantikan filter daftar,
hitungan, atau ekspor.

## File yang diperiksa

- `src/db/schema/analisis-indikator.ts`
- `src/db/schema/survey.ts`
- `src/features/analisis/infrastructure/analisis-repository.ts`
- `src/features/desa/infrastructure/desa-repository.ts`
- `src/features/desa/application/resolve-village.ts`
- `src/features/desa/application/get-identitas.ts`
- `src/features/desa/application/resolve-village.test.ts`
- `src/db/tenant-composite-fk.integration.test.ts`
- `src/db/m0017-role-tenant-constraint.integration.test.ts` (pola migration test)
- `src/features/isolasi-village.integration.test.ts` (pola isolasi lintas modul)
- `scripts/integration-test-map.json`
- `vitest.integration.config.mts`
- `docs/testing/INTEGRATION-TEST-MAP.md`
- `src/db/migrations/meta/_journal.json`
- `src/db/migrations/meta/0017_snapshot.json`

## File yang diubah

| File | Alasan |
|---|---|
| `src/db/schema/analisis-indikator.ts` | Menambah unique index `(village_id, id)` sebagai target composite FK. |
| `src/db/schema/survey.ts` | Mengganti FK satu kolom dengan composite FK tenant dan index anak. |
| `src/db/migrations/0018_survey_indicator_tenant_fk.sql` | Migration preflight, drop FK lama, unique index parent, index anak, composite FK. |
| `src/db/migrations/meta/0018_snapshot.json` | Snapshot Drizzle untuk migration 0018. |
| `src/db/migrations/meta/_journal.json` | Mendaftarkan migration 0018. |
| `src/features/analisis/infrastructure/analisis-repository.ts` | Melepas referensi soal sewilayah dalam transaksi sebelum menghapus indikator. |
| `src/features/desa/infrastructure/desa-repository.ts` | Menambah `getSoleVillageId()` dengan batas dua baris. |
| `src/features/desa/application/resolve-village.ts` | Fallback fail-closed: hanya desa tunggal; multi-desa tanpa penugasan ditolak. |
| `src/features/desa/application/get-identitas.ts` | Menyamakan fallback identitas dengan aturan desa tunggal. |
| `src/features/desa/application/resolve-village.test.ts` | Test desa sesi, desa tunggal, nol desa, dan lebih dari satu desa. |
| `src/db/m0018-survey-indicator-tenant-fk.integration.test.ts` | Test composite FK, penolakan lintas tenant, RESTRICT, dan pelepasan referensi. |
| `src/db/tenant-composite-fk.integration.test.ts` | Menambah `survey_soal_indikator_tenant_fk` ke daftar 74 composite FK. |
| `scripts/integration-test-map.json` | Mendaftarkan test 0018 pada kelompok `database-schema`. |
| `vitest.integration.config.mts` | Menjalankan test 0018 pada suite integration. |
| `docs/testing/INTEGRATION-TEST-MAP.md` | Memperbarui jumlah test dan tautan ke matriks isolasi. |
| `docs/testing/TENANT-ISOLATION-MATRIX.md` | Matriks bukti isolasi per modul dan gap. |

## Perubahan/hasil pemeriksaan

- Migration 0018 berhasil membuat unique index parent, index anak, dan composite
  FK pada database uji kosong.
- Insert soal desa A ke indikator desa B ditolak MySQL dengan
  `ER_NO_REFERENCED_ROW_2` (1452).
- Delete indikator yang masih dipakai soal ditolak dengan
  `ER_ROW_IS_REFERENCED_2` (1451).
- `deleteAnalisisIndikator()` melepas `indikator_id` soal sewilayah lalu
  menghapus indikator dalam transaksi.
- `resolveVillageId()` menolak akun platform saat ada dua desa aktif dan tetap
  memakai desa tunggal saat hanya satu desa aktif.
- Daftar composite FK yang diharapkan sekarang berjumlah 74 dan test daftar
  constraint lulus.

## Validasi yang dijalankan

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit` lulus setelah perbaikan `noUncheckedIndexedAccess`. |
| `npx eslint` pada 9 file TypeScript yang berubah | **PASS** — tanpa error/warning. |
| `npx prettier --write` pada file yang berubah | **PASS** — file diformat. |
| `npx vitest run --config vitest.config.mts src/features/desa/application/resolve-village.test.ts` | **PASS** — 1 file, 6 test. |
| `TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/desa_test_tenant_0018 TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/db/m0018-survey-indicator-tenant-fk.integration.test.ts src/db/tenant-composite-fk.integration.test.ts` | **PASS** — 2 file, 14 test. Database disposable `desa_test_tenant_0018`. |
| `node scripts/integration-test-map.mjs --check` | **PASS** — 57 test, 20 modul, 24 test lintas modul. |
| `git diff --check` | **PASS** — tidak ada whitespace error. |

## Risiko dan hal yang belum diverifikasi

- Preflight abort untuk data lintas desa yang sudah ada belum diuji langsung.
  Test yang ada membuktikan constraint menolak insert baru, bukan perilaku
  migration saat menemukan data lama yang tidak valid.
- Migration 0018 belum dijalankan pada salinan database berisi data produksi.
  Deployment harus memeriksa preflight dan menyediakan backup/rollback.
- `getIdentitas()` sekarang mengembalikan `null` untuk akun platform pada
  instalasi multi-desa tanpa pemilihan desa. Halaman admin platform yang
  mengandalkan identitas desa perlu memilih desa secara eksplisit.
- `getFirstVillageId()` masih ada sebagai fungsi lama tetapi tidak lagi dipakai
  oleh resolver/identitas. Penghapusan belum dilakukan karena bukan scope task.
- Matriks mencatat modul yang belum punya integration test isolasi khusus:
  IDM, pengaduan, BUMDes, pemilihan, API eksternal, dan pelanggan/plugin.
- Sekitar 16 referensi aktor/`created_by` ke `users.id` masih tidak membawa
  `village_id`; ini dapat sah untuk akun platform, tetapi validasi application
  layer-nya belum diaudit dalam task ini.
- Filter tenant pada repository tetap bergantung pada kode aplikasi. Composite
  FK hanya menjaga relasi, bukan daftar, hitungan, atau ekspor.

## Rekomendasi langkah berikutnya

1. Jalankan migration 0018 pada salinan database dengan data nyata di lingkungan
   staging, lalu periksa hasil preflight sebelum production.
2. Audit referensi aktor/`created_by` dan tentukan validasi tenant eksplisit
   untuk akun desa versus akun platform.
3. Tambahkan integration test isolasi untuk pengaduan/lampiran, IDM, dan BUMDes.
4. Pertimbangkan menghapus atau menandai deprecated `getFirstVillageId()` agar
   tidak ada jalur fallback desa pertama yang muncul kembali.

## Kesimpulan

Tiga prioritas task sudah diimplementasikan dan diuji pada database disposable.
Celah composite FK indikator survey dan fallback desa platform sudah ditutup
pada schema/aplikasi. Matriks isolasi tersedia sebagai peta bukti dan backlog
test. Perubahan belum di-push dan menunggu review maintainer.
