# Laporan — Skip Startup MySQL bila Integration Tidak Relevan

- **Task:** Hindari startup service MySQL pada PR yang melewati integration
- **Tanggal:** 17 November 2026
- **Branch:** `task/skip-mysql-startup-2026-11-17`
- **Base commit:** `c270a911b679eee46bd87348447b09b22e98b13a` (`main`)
- **Status:** menunggu PR dan validasi GitHub Actions

## 1. Kondisi awal

Job `Integration test (MySQL 8)` memiliki service container MySQL pada level job.
Step install dan test sudah dilewati untuk perubahan yang tidak memerlukan
integration, tetapi GitHub tetap menginisialisasi service container. Pada PR
docs-only #100, job integration tetap menghabiskan 42 detik.

## 2. Perubahan

- Memindahkan MySQL service, install dependency, dan integration test ke job
  `Jalankan integration test (MySQL 8)` yang hanya berjalan bila output
  classifier `integration=true`.
- Mempertahankan job ringan bernama persis `Integration test (MySQL 8)` sebagai
  required check branch protection. Job tersebut menunggu job test kondisional
  dan gagal bila perubahan memerlukan integration tetapi job test tidak sukses.
- Untuk docs/UI yang tidak memerlukan integration, job required selesai sukses
  tanpa memulai container database.
- Ringkasan CI tetap membaca status job gate required, bukan job implementasi.

## 3. File berubah

| File | Alasan |
|---|---|
| `.github/workflows/ci.yml` | Pisahkan required gate dari job dengan service MySQL |
| `docs/reports/00-baseline/skip-mysql-startup-2026-11-17.md` | Laporan ini |

Tidak ada perubahan source aplikasi, database, migration, dependency, atau
branch protection.

## 4. Security dan tenant

Perubahan mempertahankan gate integrasi untuk semua path yang diklasifikasikan
memerlukan integration. Bila `integration=true`, job MySQL dan test tetap wajib
sukses sebelum required gate berstatus hijau. Tidak ada perubahan ke guard
identitas database test disposable.

## 5. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format workflow | `npx prettier --check .github/workflows/ci.yml` | **PASS** |
| Diff whitespace | `git diff --check` | **PASS** |
| Peta test | `node scripts/integration-test-map.mjs --check` | **PASS**: 47 test |
| CI PR docs-only | GitHub Actions | **PENDING** — harus menunjukkan job integration MySQL tidak dijalankan |
| CI perubahan repository | GitHub Actions | **PENDING** — harus menunjukkan job integration MySQL berjalan dan gate menunggunya |

## 6. Risiko

- Status required bernama `Integration test (MySQL 8)` sekarang berasal dari job
gate kecil; nama ini dipertahankan agar branch protection tidak perlu diubah.
- Job test sesungguhnya bernama `Jalankan integration test (MySQL 8)` dan tidak
  menjadi required check secara langsung, tetapi required gate bergantung pada
  hasilnya saat classifier meminta integration.
- Perubahan workflow perlu dibuktikan pada PR docs-only dan perubahan repository
  sebelum dianggap aman.

## 7. Kesimpulan

Pemisahan mempertahankan nama/status required check, sekaligus mencegah MySQL
menyala untuk PR yang tidak membutuhkan integration. Hasil kedua jalur CI
wajib dicatat setelah GitHub Actions berjalan.
