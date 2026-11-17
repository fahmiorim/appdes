# Laporan — Peta Integration Test per Modul

- **Task:** Memetakan integration test per modul untuk seleksi yang lebih granular
- **Tanggal:** 17 November 2026
- **Branch:** `task/integration-test-map-2026-11-17`
- **Base commit:** `746547f78da8a22f52d56230cbfbf7fe6c99d78d` (`main`)
- **Status:** siap review; commit dan hasil CI dicatat setelah PR

## 1. Kondisi awal

CI hanya memilih job berdasarkan kategori file. Jika integration dijalankan,
runner selalu menjalankan seluruh 47 test. Belum ada sumber data yang memetakan
test ke modul, sehingga seleksi per modul tidak dapat dilakukan tanpa menebak.

## 2. Hasil pemetaan

- 47 test integration.
- 20 modul fitur.
- 21 test lintas modul:
  - 20 test schema/migration/composite FK di `src/db/`;
  - 1 test isolasi `villageId` yang mencakup `anjungan`, `arsip`,
    `buku-tamu`, `kehadiran`, `keuangan`, dan `lapak`.

Modul dengan test terbanyak: `penduduk` (4), `layanan-mandiri` (3), `publik`
(2). Modul lain memiliki satu test masing-masing.

## 3. File berubah

| File | Alasan |
|---|---|
| `scripts/integration-test-map.json` | Sumber data peta modul dan test |
| `scripts/integration-test-map.mjs` | Validator dan penampil Markdown |
| `docs/testing/INTEGRATION-TEST-MAP.md` | Dokumentasi peta dan kebijakan seleksi |
| `.github/workflows/ci.yml` | Validasi peta di job quality |
| `docs/reports/00-baseline/integration-test-map-2026-11-17.md` | Laporan ini |

Tidak ada test yang dihapus, diubah, atau dilemahkan. Tidak ada dependency baru.

## 4. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format | `npx prettier --check` pada empat file | **PASS** |
| Validasi peta | `node scripts/integration-test-map.mjs --check` | **PASS**: 47 test, 20 modul, 21 lintas modul |
| Lint script | `npx eslint scripts/integration-test-map.mjs` | **PASS** |
| Kesamaan dengan Vitest | validator membandingkan include config | **PASS**, tidak ada test hilang/ekstra |
| Integration test | tidak dijalankan | **SKIPPED**: tidak ada perubahan runtime/DB; butuh MySQL disposable |
| CI PR | GitHub Actions | **PENDING** — diverifikasi setelah PR |

Validator memeriksa file ada, tidak ada duplikat, test modul berada di direktori
modulnya, dan daftar peta sama persis dengan include Vitest.

## 5. Security dan tenant

Peta tidak mengubah query, otorisasi, atau data. Test isolasi tenant tetap
terdaftar. Risiko utama ada pada seleksi yang akan datang: memilih test hanya
berdasarkan modul dapat melewatkan regresi shared code. Karena itu dokumentasi
menetapkan fail-safe: path shared/API/action/dependency yang tidak dikenal harus
menjalankan seluruh 47 test.

## 6. Batas dan langkah berikutnya

Seleksi per modul **belum diaktifkan di CI**. Peta ini adalah fondasi; runner
dan workflow belum memakai peta untuk memilih file test. Mengaktifkannya
memerlukan perubahan runner, uji dengan MySQL disposable, dan strategi fail-safe
yang disepakati.

## 7. Kesimpulan

Seluruh integration test kini terpetakan dan tervalidasi otomatis terhadap
konfigurasi Vitest. Belum ada pengurangan cakupan test yang dilakukan.
