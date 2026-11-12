# Laporan — Phase 0.1: Integration Test Safety (B-03)

> **Proyek:** Appdes SID (`fahmiorim/appdes`)
> **Tanggal:** 12 November 2026
> **Jenis task:** implementasi guard integration test
> **Base:** `origin/main` @ `c7c2ffc`
> **Branch:** `task/phase-0-integration-safety`
> **Commit implementasi:** `f2d33bd515dd3cecb519733d77a2d5a8f9f73131`
> **Lingkungan verifikasi:** Windows, Git Bash, Node `v26.2.0`, MySQL lokal `127.0.0.1:3306`

## 1. Ringkasan

Integration test sebelumnya membaca `DATABASE_URL`, membuat database, memigrasi, lalu **melewati seluruh test secara diam-diam** (`ctx.skip()`) bila koneksi gagal. `NODE_ENV=test` dan nama database tidak divalidasi, sehingga konfigurasi yang salah dapat menyentuh database pengembangan.

Perubahan ini menambahkan guard `fail-closed` berlapis, memisahkan unit dan integration test ke konfigurasi/script berbeda, dan menghapus seluruh skip diam-diam. Semua pemeriksaan lokal lulus dan integration test dijalankan pada database disposable baru `desa_test_phase01`.

## 2. Desain guard

Sumber kebenaran: `src/testing/db-test-guard.ts`.

| # | Aturan | Alasan |
|---|---|---|
| 1 | `NODE_ENV` wajib `test` | Menolak eksekusi dari konteks aplikasi biasa |
| 2 | `TEST_DATABASE_ACK=1` wajib | Operator menyatakan eksplisit target disposable; nama saja tidak cukup |
| 3 | `TEST_DATABASE_URL` wajib, **tanpa fallback** ke `DATABASE_URL` | `.env` pengembangan tidak pernah terbawa |
| 4 | Protokol wajib `mysql:` | Menolak DSN tak terduga |
| 5 | Host wajib loopback (`127.0.0.1`, `localhost`, `::1`, `[::1]`) | Tidak ada koneksi ke server jaringan/produksi |
| 6 | Nama database cocok `desa_test` atau `desa_test_<suffix>` (huruf kecil/angka/garis bawah) | Allowlist sempit, bukan nama sembarang |
| 7 | Denylist eksplisit (`desa_dev`, `desa`, `production`, `prod`, `test`, `mysql`, `sys`, dll.) | Menolak nama berbahaya meski lolos pola |
| 8 | Suffix `prod`/`production`/`dev`/`development` ditolak | Mencegah `desa_test_prod` menyamar |

Urutan eksekusi `siapkanDatabaseUji()`:

1. `validasiDatabaseUji(process.env)` — semua aturan di atas.
2. `CREATE DATABASE IF NOT EXISTS` hanya untuk nama yang sudah lolos validasi.
3. `jalankanMigrasiUji()` yang **memvalidasi ulang DSN** (protokol, host, nama) sebelum koneksi/migrasi.
4. Migration dijalankan di bawah `GET_LOCK` seperti sebelumnya.

Kegagalan pada langkah mana pun dilempar ke `beforeAll`, sehingga suite **gagal**; tidak ada jalur skip. Pesan error tidak pernah memuat DSN lengkap karena dapat berisi kredensial.

## 3. File yang diperiksa dan diubah

### Diperiksa

- `AGENTS.md` (versi `origin/main` terbaru, termasuk aturan laporan/Git).
- `docs/reports/00-baseline/baseline-report.md`.
- `src/testing/migrasi-uji.ts`, `vitest.config.mts`, `package.json`.
- 9 suite integrasi: bantuan, verifikasi restore, GIS, isolasi village, dokumen publik, layanan mandiri, multi-desa host, pesan warga, penomoran arsip.
- `src/db/index.ts`, `src/lib/env.ts`, `.env.example` (untuk memastikan asal DSN).

### Diubah

| File | Perubahan |
|---|---|
| `src/testing/db-test-guard.ts` | **Baru.** Validasi env + DSN, allowlist/denylist, `validasiDsnUji`, `pastikanNamaDatabaseUji`. |
| `src/testing/db-test-guard.test.ts` | **Baru.** 29 tes: penerimaan, penolakan env, fallback, protokol, host, nama, IPv6, DSN rusak. |
| `src/testing/setup-integration.ts` | **Baru.** Setup Vitest: validasi, set `DATABASE_URL` dari `TEST_DATABASE_URL`, cetak nama DB + host saja. |
| `src/testing/migrasi-uji.ts` | `siapkanDatabaseUji()` baru (guard → create → migrate); `jalankanMigrasiUji()` memvalidasi DSN sebelum koneksi. |
| `vitest.integration.config.mts` | **Baru.** Hanya 9 berkas integrasi, `setupFiles` guard, tanpa `DATABASE_URL` bawaan. |
| `vitest.config.mts` | Unit-only: integrasi dikecualikan; `DATABASE_URL` unit diarahkan ke `desa_unit` (tidak pernah dikoneksikan). |
| `package.json` | `test` → `test:unit`; tambah `test:integration`; `test:watch` memakai config unit. |
| `.env.example` | Dokumentasi `TEST_DATABASE_URL`, `TEST_DATABASE_ACK`, dan peringatan. |
| 9 suite integrasi | Memakai `siapkanDatabaseUji()`; `ctx.skip()`/`dbReady` dihapus; guard fixture melempar error. |

Tidak ada dependency baru, perubahan schema, atau migration.

## 4. Perubahan perilaku yang disengaja

- `npm test` **hanya** menjalankan unit test. Integration test tidak lagi ikut, agar CI aman secara default.
- `npm run check` karena itu juga unit-only; integration test harus dipanggil eksplisit.
- Integration test kini **wajib** `TEST_DATABASE_URL` + `TEST_DATABASE_ACK=1`; tanpa itu exit code 1 dengan pesan jelas.
- Bila MySQL tidak tersedia, suite integrasi **gagal**, bukan dilaporkan "hijau dengan 0 test".

## 5. Verifikasi

### Perintah dan hasil

| Pemeriksaan | Perintah | Status |
|---|---|---|
| Typecheck | `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** (exit 0) |
| ESLint | `npm run lint` | **PASS** (exit 0, tanpa error/warning) |
| Format | `npm run format:check` | **PASS** (`All matched files use Prettier code style!`) |
| Unit test | `npm test` | **PASS** — 183 berkas, 1513 tes, 0 gagal, 0 skip |
| Integration test | `npm run test:integration` dengan `TEST_DATABASE_URL=…/desa_test_phase01`, `TEST_DATABASE_ACK=1` | **PASS** — 9 berkas, 34 tes, 0 skip |
| Gabungan | `npm run check` | **PASS** (exit 0) |

### Guard negatif (tanpa koneksi database)

| Kasus | Perintah (ringkas) | Hasil |
|---|---|---|
| Tanpa konfigurasi | `env -u TEST_DATABASE_URL -u TEST_DATABASE_ACK npx vitest run --config vitest.integration.config.mts` | **exit 1**, pesan `TEST_DATABASE_ACK wajib bernilai 1` |
| Nama pengembangan | `TEST_DATABASE_URL=mysql://root:@127.0.0.1:3306/desa_dev TEST_DATABASE_ACK=1 …` | **exit 1**, `Database "desa_dev" ditolak` |
| Host remote | `TEST_DATABASE_URL=mysql://root:@db.contoh.id:3306/desa_test …` | **exit 1**, `Host database … ditolak` |

Tidak ada `CREATE DATABASE` atau migrasi yang berjalan pada ketiga kasus di atas.

### Persiapan database disposable

- `desa_test` lama **tidak disentuh** karena status disposable-nya tidak dapat dibuktikan.
- Target verifikasi dibuat baru: `desa_test_phase01` (belum ada sebelumnya), dibuat oleh `siapkanDatabaseUji()` setelah guard lolos.
- Hasil: 9 suite, 34 tes lulus, 0 skip.

## 6. Cara menjalankan di lokal dan GitHub Actions

Lokal:

```bash
# Siapkan database uji baru, lalu:
TEST_DATABASE_URL="mysql://uji:uji@127.0.0.1:3306/desa_test_lokal" \
TEST_DATABASE_ACK=1 \
npm run test:integration
```

GitHub Actions (belum ditambahkan ke repo; B-01 terpisah) — job terpisah dengan MySQL service:

```yaml
integration:
  runs-on: ubuntu-latest
  services:
    mysql:
      image: mysql:8.4
      env:
        MYSQL_ROOT_PASSWORD: uji
        MYSQL_DATABASE: desa_test
      ports: ["3306:3306"]
      options: >-
        --health-cmd="mysqladmin ping -h 127.0.0.1 -puji"
        --health-interval=5s --health-timeout=5s --health-retries=20
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
    - run: npm run test:integration
      env:
        TEST_DATABASE_URL: mysql://root:uji@127.0.0.1:3306/desa_test
        TEST_DATABASE_ACK: "1"
```

Database service CI bersifat ephemeral, tetapi `TEST_DATABASE_ACK` tetap wajib agar tidak ada jalur otomatis ke database yang tidak dimaksudkan. Job unit test cukup `npm test`.

## 7. Risiko tersisa

| Risiko | Catatan |
|---|---|
| Ack bersifat deklaratif, bukan kriptografis | Operator masih bisa keliru meng-ack database lokal bernama `desa_test` yang berisi data penting. Guard membaca nama + host + ack, bukan isi database. |
| Tidak ada pengecekan database kosong | `CREATE DATABASE IF NOT EXISTS` + migrasi akan gagal bila schema sudah ada, tetapi database kosong bernama benar tetap bisa ditulis. |
| Hanya loopback | Target MySQL remote (staging) tidak didukung; disengaja demi keamanan. |
| Tidak ada teardown | Database uji tidak di-drop otomatis untuk menghindari operasi destruktif; pembersihan manual oleh operator. |
| CI belum ada | Workflow di atas masih contoh; B-01 belum dikerjakan. |
| Perilaku MySQL/MariaDB | Diverifikasi pada MySQL lokal; belum diuji pada versi/image lain. |

## 8. Kesimpulan

- Guard fail-closed telah diimplementasikan dan dibuktikan menolak konfigurasi tidak aman **sebelum** operasi tulis.
- Unit dan integration test terpisah jelas; integration test tidak lagi bisa "hijau" karena skip.
- Integration test berhasil pada database disposable yang baru dibuat, dengan 34 tes lulus.
- **Status: siap review.** Belum di-merge; menunggu keputusan maintainer.
