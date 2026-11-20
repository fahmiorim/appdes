# Tenant Isolation Hardening — Revisi 2 (20 November 2026)

- **Task:** menutup item lanjutan dari hardening isolasi tenant: bukti test
  modul yang belum tercakup, preflight migration 0018, audit referensi aktor,
  dan pembersihan fallback desa lama.
- **Tanggal:** 20 November 2026.
- **Branch:** `task/tenant-isolation-hardening-2026-11-20`.
- **Base commit:** `4bd4cd684d01d4e197b1d8e4b67302283b49a170` (`main`).
- **Commit kode:** `8ef5717dd78acd9126f593145d10130bb93bef54`.
- **Commit sebelumnya:** `ef1353f` (schema, migration, resolver, test awal) dan
  `b25414d` (laporan revisi 1).
- **Pull request:** [#174](https://github.com/fahmiorim/appdes/pull/174).
- **Status:** siap review; belum di-merge dan belum dijalankan di production.

## Ringkasan kondisi awal

Revisi 1 sudah menutup composite FK `survey_soal.indikator_id` dan fallback
desa akun platform, tetapi masih meninggalkan pekerjaan yang diketahui:

1. Modul IDM, pengaduan, BUMDes, API eksternal, pelanggan, dan plugin belum
   memiliki integration test isolasi tenant khusus.
2. Preflight migration 0018 belum diuji dengan data lama yang benar-benar
   lintas desa.
3. Referensi aktor/`created_by` belum diaudit tuntas.
4. `getFirstVillageId()` masih tersisa meskipun tidak lagi dipakai.
5. Matriks dan laporan belum mencerminkan bukti baru.

## Analisis dan pendekatan

### 1. Test isolasi modul tambahan

File `src/features/isolasi-modul-tambahan.integration.test.ts` membuat dua desa
dan data paralel untuk setiap modul. Test memeriksa daftar/detail hanya membaca
desa sendiri dan operasi tulis dengan ID desa lain tidak mengubah baris apa pun.

Cakupan:

- IDM: daftar indikator, daftar tahun, SDGs, create/update/delete, upsert dan
  delete SDGs.
- Pengaduan: daftar, detail, daftar publik, hitungan tiket, tanggapan, status
  publik, dan delete.
- BUMDes: buku, item, peraturan, aparat, tanah kas, mutasi tanah kas,
  pembangunan, dan kader; jalur tulis yang diuji adalah item.
- API eksternal: daftar, pencarian, dan penonaktifan kunci.
- Pelanggan: daftar, detail, update, dan delete.
- Plugin: status per desa tidak saling menimpa dan hapus terbatas desa.

### 2. Preflight migration 0018

Test `src/db/m0018-preflight.integration.test.ts` membuat database uji khusus,
menjalankan seluruh migration, lalu:

1. melepas composite FK baru;
2. membuat soal desa A yang menunjuk indikator desa B;
3. menjalankan isi migration 0018 statement demi statement;
4. memastikan migration berhenti dengan duplicate key;
5. memastikan temuan `cross-tenant` tercatat dan baris domain tidak berubah.

Database khusus dipakai karena migration sengaja berhenti setelah melepas
constraint. Menjalankannya pada database integration test bersama akan merusak
schema untuk file test lain yang berjalan paralel. Database anak dibuat dari
nama `desa_test_preflight_<pid>` dan dihapus di `afterAll`.

### 3. Audit aktor

Pencarian `actorId`/`createdBy` pada jalur produksi menunjukkan mayoritas use
case sudah memakai `user.id` dari `requirePermission`. Ditemukan parameter
`actorId?: string | null` pada lima use case riwayat penduduk
(`catatKelahiran`, `catatKematian`, `catatPindahKeluar`, `catatPerubahan`,
`catatDatang`). Parameter itu memungkinkan pemanggil mengganti aktor tercatat.

Parameter tersebut dihapus; semua mutasi sekarang menulis `actorId: user.id`.
`catatPerubahanAnggotaKk` masih menerima `actorId` internal, tetapi pemanggil
produksinya adalah use case penduduk yang sudah lolos otorisasi dan meneruskan
`user.id`.

### 4. Pembersihan fallback lama

`getFirstVillageId()` dihapus dari `desa-repository.ts` karena tidak lagi
dipakai setelah resolver dan identitas memakai desa tunggal. Komentar
`susunPetaDesa` diperbarui agar tidak merujuk fungsi yang sudah tidak ada.

## File yang diperiksa

- `src/db/schema/idm.ts`, `src/db/schema/pengaduan.ts`,
  `src/db/schema/bumindes*.ts`, `src/db/schema/api-keys.ts`,
  `src/db/schema/pelanggan.ts`, `src/db/schema/plugin-registry.ts`
- `src/features/{idm,pengaduan,bumindes,api-eksternal,pelanggan,plugin}/infrastructure/*`
- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts`
- `src/features/keluarga/application/catat-anggota-kk.ts`
- `src/features/surat/infrastructure/surat-repository.ts`
- `src/features/audit/{application,infrastructure}/*`
- `src/features/desa/{application,infrastructure,domain}/*`
- `src/db/migrations/0018_survey_indicator_tenant_fk.sql`
- `scripts/integration-test-map.json`
- `vitest.integration.config.mts`

## File yang diubah

| File | Alasan |
|---|---|
| `src/features/isolasi-modul-tambahan.integration.test.ts` | Test isolasi enam modul yang sebelumnya belum tercakup. |
| `src/db/m0018-preflight.integration.test.ts` | Test preflight 0018 dengan data lintas desa pada database khusus. |
| `src/features/penduduk/application/riwayat-penduduk-use-cases.ts` | Menghapus `actorId` opsional; aktor selalu `user.id`. |
| `src/features/desa/infrastructure/desa-repository.ts` | Menghapus `getFirstVillageId()` yang tidak dipakai. |
| `src/features/desa/domain/tenant.ts` | Memperbarui komentar yang merujuk fungsi lama. |
| `scripts/integration-test-map.json` | Mendaftarkan dua test baru dan memperluas cakupan modul. |
| `vitest.integration.config.mts` | Menjalankan dua test baru pada suite integration. |
| `docs/testing/INTEGRATION-TEST-MAP.md` | Memperbarui jumlah menjadi 59 test dan 26 test lintas modul. |
| `docs/testing/TENANT-ISOLATION-MATRIX.md` | Memperbarui status IDM, pengaduan, BUMDes, API, pelanggan, plugin, agenda, dan pemilihan. |

## Hasil pemeriksaan

- Test isolasi modul tambahan: 6 test lulus.
- Test preflight: 1 test lulus; migration berhenti dengan duplicate key dan
  temuan `cross-tenant=1` tetap tersedia.
- Suite gabungan empat file: 21 test lulus pada database
  `desa_test_final_20261120`, termasuk saat file preflight berjalan paralel
  dengan test schema lain.
- Unit test seluruh proyek: 231 file, 1.997 test lulus.
- Peta integration test: 59 test, 20 modul, 26 test lintas modul.

## Validasi yang dijalankan

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit` lulus. |
| `npm run lint` | **PASS** — 0 error; 2 warning lama `no-console` di `scripts/wilayah/generate-wilayah.mjs`. |
| `npm run format:check` | **PASS** — seluruh file sesuai Prettier. |
| `npm test` | **PASS** — 231 file, 1.997 test. |
| `TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/desa_test_modul_20261120 TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/isolasi-modul-tambahan.integration.test.ts` | **PASS** — 1 file, 6 test. |
| `TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/desa_test_preflight_20261120 TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/db/m0018-preflight.integration.test.ts` | **PASS** — 1 file, 1 test. |
| `TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/desa_test_final_20261120 TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/db/m0018-preflight.integration.test.ts src/db/m0018-survey-indicator-tenant-fk.integration.test.ts src/db/tenant-composite-fk.integration.test.ts src/features/isolasi-modul-tambahan.integration.test.ts` | **PASS** — 4 file, 21 test. |
| `node scripts/integration-test-map.mjs --check` | **PASS** — 59 test, 20 modul, 26 test lintas modul. |
| `git diff --check` | **PASS** — tidak ada whitespace error. |

## Risiko dan hal yang belum diverifikasi

- Preflight baru menguji temuan `cross-tenant`; cabang `orphan` belum diuji
  langsung.
- Migration 0018 tetap belum dijalankan pada salinan database produksi.
  Deployment memerlukan backup dan pemeriksaan preflight di staging.
- BUMDes baru menguji jalur tulis item; tulis peraturan, aparat, tanah kas,
  pembangunan, dan kader belum diuji isolasinya.
- Lampiran pengaduan belum diuji unduh/hapus lintas desa.
- Pemilihan belum memiliki repository/use case; baru ada domain dan schema.
- Sekitar 16 referensi aktor/`created_by` pada schema tidak membawa
  `village_id`. Audit application layer menunjukkan jalur produksi memakai
  `user.id`, tetapi validasi tenant eksplisit untuk akun platform masih perlu
  ditinjau terpisah.
- Filter tenant pada repository tetap bergantung pada kode aplikasi. Composite
  FK menjaga relasi, bukan daftar, hitungan, atau ekspor.

## Rekomendasi langkah berikutnya

1. Jalankan preflight 0018 pada salinan data staging dan siapkan rollback.
2. Tambahkan test tulis BUMDes untuk tabel anak selain item.
3. Tambahkan test unduh/hapus lampiran pengaduan lintas desa.
4. Perluas test surat, keuangan, bantuan, dan kesehatan/KIA.
5. Tinjau kebutuhan `village_id` pada referensi aktor akun platform.

## Kesimpulan

Item lanjutan yang sebelumnya diketahui belum dikerjakan kini sudah ditutup:
enam modul memiliki bukti isolasi tenant, preflight 0018 diuji dengan data
lintas desa, parameter aktor yang dapat dipalsukan dihapus, dan fallback desa
lama dibersihkan. Semua validasi relevan lulus. Perubahan sudah berada di
branch PR #174 dan menunggu review maintainer; belum di-merge.
