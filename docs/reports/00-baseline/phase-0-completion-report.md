# Laporan — Penyelesaian Fase 0

- **Task:** Fase 0 — Baseline, kualitas, dan lingkungan
- **Tanggal:** 17 November 2026
- **Repository:** `fahmiorim/appdes`
- **Branch:** `task/phase-0-completion-2026-11-17`
- **Base commit:** `f19267d6aba583c1ad1765b54dbd03eb8737b700` (`main`)
- **Commit pekerjaan:** `c2e9885` (perbaikan CI setelah commit awal `21c2c34`)
- **PR:** [#95](https://github.com/fahmiorim/appdes/pull/95)
- **Status:** siap review/merge; CI PR hijau dan branch protection sudah aktif

## 1. Tujuan

Menutup pekerjaan dan kriteria selesai Fase 0 di `docs/MASTER_ROADMAP.md`:

- baseline commit dan snapshot database;
- pipeline CI untuk install, typecheck, lint, format, dan test;
- pemisahan unit/integration test dengan status skip eksplisit;
- dokumentasi environment, secret, Node, dan deployment;
- inventaris route, action, repository, dan use case per modul;
- quality gate yang berjalan pada setiap pull request.

## 2. Kondisi awal

Sebelum perubahan, repository sudah memiliki:

- `.github/workflows/ci.yml` dengan job quality dan integration MySQL;
- guard database uji disposable (`src/testing/db-test-guard.ts`);
- dokumentasi deployment di `docs/deployment/`;
- baseline report historis dan feature map level modul.

Celah yang ditemukan:

1. CI tidak memiliki job build dan melewati PR yang hanya mengubah dokumentasi
   karena `paths-ignore`.
2. `npm run test:integration` gagal keras tanpa environment database; belum ada
   status `SKIPPED` eksplisit untuk pemakaian lokal.
3. `docs/deployment/README.md` masih menyatakan tidak ada `page.tsx`/`layout.tsx`
   dan tidak ada halaman Super Admin, padahal UI sudah ada.
4. Belum ada inventaris route/action/repository/use case per modul.
5. Baseline commit belum memiliki manifest migrasi yang dapat diverifikasi.
6. `main` belum dilindungi required status check.

## 3. File yang diperiksa

- `.github/workflows/ci.yml`
- `package.json`, `vitest.integration.config.mts`
- `src/testing/setup-integration.ts`, `src/testing/migrasi-uji.ts`
- `src/lib/env.ts`, `drizzle.config.ts`
- `src/db/migrations/*.sql`
- `src/app/**/page.tsx`, `src/app/**/route.ts`, `src/app/**/layout.tsx`
- `src/features/*/application/**`, `src/features/*/infrastructure/*repository*.ts`
- `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`
- `docs/deployment/README.md`, `DATABASE.md`, `OPERATIONS.md`,
  `BACKUP-RESTORE.md`, `ENVIRONMENT.md`
- `docs/reports/00-baseline/baseline-report.md`,
  `deployment-documentation-report.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `.github/workflows/ci.yml` | Semua PR menjalankan CI; menambah job build; integration memakai mode wajib DB; ringkasan mencakup build |
| `package.json` | `test:integration` memakai runner skip eksplisit; `test:integration:ci` mewajibkan DB |
| `scripts/run-integration-tests.mjs` | Runner baru untuk status `SKIPPED` lokal dan kegagalan di CI |
| `scripts/generate-module-inventory.mjs` | Generator inventaris dari kode aktual |
| `docs/architecture/MODULE-INVENTORY.md` | Inventaris 109 route, 2 action, 68 repository, 83 berkas application |
| `docs/deployment/README.md` | Menyegarkan snapshot UI, Node, migrasi, bootstrap, dan link staging |
| `docs/deployment/OPERATIONS.md` | Menghapus klaim halaman login/root tidak ada |
| `docs/deployment/DATABASE.md` | Memperbarui jumlah migrasi dan status bootstrap/Super Admin |
| `docs/deployment/STAGING.md` | Prosedur build/verifikasi staging dengan database terpisah |
| `docs/SID_FEATURE_MAP.md` | Status UI Super Admin dan link inventaris |
| `docs/reports/00-baseline/phase-0-baseline.json` | Manifest commit, Node, jumlah aplikasi, dan SHA-256 12 migrasi |
| `docs/reports/00-baseline/baseline-report.md` | Addendum agar status FAIL historis tidak disalahartikan |
| `docs/reports/00-baseline/deployment-documentation-report.md` | Addendum kondisi UI historis |
| `docs/reports/00-baseline/phase-0-completion-report.md` | Laporan ini |

Tidak ada perubahan pada schema, migration, source aplikasi, atau data tenant.

## 5. Perubahan

### 5.1 CI dan quality gate

- `pull_request` ke `main` tidak lagi memakai `paths-ignore`; PR dokumentasi juga
  menjalankan quality gate.
- Job `Build produksi` menjalankan `npm ci` dan `npm run build` dengan environment
  build-only (tanpa koneksi database).
- Job `Ringkasan CI` menunggu quality, integration, dan build; gagal bila salah
  satu tidak sukses.
- Integration CI memakai `npm run test:integration:ci`, yang gagal bila
  `TEST_DATABASE_URL`/`TEST_DATABASE_ACK` tidak tersedia.

### 5.2 Integration test

- `npm run test:integration` tanpa database mencetak:
  `[integration-db] SKIPPED ... Integration test TIDAK dijalankan dan status ini
  bukan bukti integrasi lulus.` lalu keluar 0.
- `npm run test:integration:ci` tanpa database mencetak alasan yang sama dan
  keluar 1, sehingga CI tidak dapat lulus karena skip.
- Guard database uji yang sudah ada tetap dijalankan sebelum koneksi.

### 5.3 Dokumentasi dan inventaris

- Snapshot deployment diperbarui ke `f19267d`: 29 halaman, 2 layout, login,
  dashboard admin, halaman publik, dan `/super-admin`.
- Bootstrap Super Admin/tenant pertama tetap dinyatakan belum tersedia; dashboard
  hanya menampilkan tenant.
- Node minimum diperbarui menjadi `>=22.12.0`; CI memakai 22.22.1.
- Jumlah migrasi diperbarui menjadi 12 (baseline + `0001`–`0011`).
- `STAGING.md` menambahkan prosedur database terpisah, build, health check,
  integration disposable, dan checklist.
- Inventaris dibuat dari kode aktual, bukan asumsi: 52 modul fitur, 109 route
  (29 halaman + 80 route handler), 2 Server Action, 68 repository, dan 83 berkas
  application/use case non-test.

### 5.4 Baseline

- Baseline commit: `f19267d6aba583c1ad1765b54dbd03eb8737b700`.
- `phase-0-baseline.json` mencatat SHA-256 setiap dari 12 file migrasi dan
  jumlah artefak aplikasi.
- Dump database staging adalah artefak operasional di luar repository; prosedur
  backup/restore dan staging sudah didokumentasikan. Dump live tidak dibuat pada
  environment ini karena tidak ada database staging/disposable yang dapat
  diakses (Docker daemon tidak aktif; MySQL lokal tidak diverifikasi sebagai
  disposable).

## 6. Security dan tenant

- Tidak ada perubahan jalur autentikasi, otorisasi, query tenant, atau schema.
- CI build memakai DSN build-only dan tidak membuka koneksi database.
- Integration CI tetap memakai MySQL disposable dan guard nama database
  `desa_test*` di loopback.
- Tidak ada secret, password, NIK, atau data pribadi yang ditambahkan ke
  repository. Password pada contoh dokumen adalah placeholder.
- `STAGING.md` mewajibkan database/kredensial terpisah dan melarang data
  production.
- Branch protection belum diaktifkan pada saat laporan ditulis; ini akan
  dilakukan setelah CI PR hijau.

## 7. Validasi

Perintah dijalankan di Windows/Git Bash, Node `v26.2.0` (runtime lokal), pada
commit `21c2c34`.

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (exit 0) |
| Lint | `npm run lint` | **PASS** (exit 0; 0 error, 7 warning `<img>` lama) |
| Format | `npm run format:check` | **PASS** (semua file sesuai Prettier) |
| Unit test | `npm run test:unit` | **PASS** (203 berkas, 1.789 test) |
| Build | `npm run build` dengan environment build-only | **PASS** (exit 0) |
| Integration lokal tanpa DB | `npm run test:integration` | **SKIPPED** eksplisit (exit 0, bukan bukti integrasi) |
| Integration mode CI tanpa DB | `TEST_DATABASE_ACK=1 npm run test:integration:ci` | **FAIL** sesuai desain (exit 1) |
| Integration MySQL | CI job PR | **PASS** ([run 44099212925](https://github.com/fahmiorim/appdes/actions/runs/44099212925)) |
| Build CI | CI job PR | **PASS** ([run 44099212925](https://github.com/fahmiorim/appdes/actions/runs/44099212925)) |
| Visual QA | CI job PR | **PASS** (desktop/mobile) |
| Branch protection | GitHub API | **PASS** — required checks quality, integration, build, ringkasan; admin termasuk |
| Deployment staging live | server staging | **TIDAK DIJALANKAN** — tidak ada akses server |

Catatan: build lokal memakai `DATABASE_URL` build-only dan tidak membuktikan
koneksi database. Integration test pada MySQL disposable diverifikasi oleh CI,
bukan oleh run lokal ini. Build CI sempat gagal karena `NODE_ENV=production` di
level job membuat `npm ci` melewatkan `husky`; perbaikan membatasi `NODE_ENV` ke
step build dan run berikutnya lulus.

## 8. Risiko dan keterbatasan

- **Dump database staging belum dibuat.** Manifest migrasi menetapkan baseline
  skema, tetapi snapshot data staging harus dibuat operator dari instalasi
  staging. Repository tidak menyimpan dump karena dapat berisi data pribadi.
- **Deployment staging live belum diuji.** Prosedur build sudah diverifikasi
  lokal; server, DNS, TLS, MySQL staging, dan bootstrap tenant tetap memerlukan
  environment nyata.
- **Bootstrap tenant/Super Admin pertama masih belum tersedia.** Ini berada di
  luar scope Fase 0 dan tetap menjadi penghambat pemakaian produksi; dokumentasi
  sudah menyatakannya.
- **CI build memakai environment palsu.** Job membuktikan kompilasi, bukan
  koneksi database atau render dengan data nyata.
- **Node lokal berbeda dari CI.** Lokal memakai Node 26.2.0; CI memakai 22.22.1.
  Build/typecheck CI tetap harus menjadi bukti utama.
- Branch protection sudah aktif dan mencakup admin, sehingga perubahan berikutnya
  harus melewati keempat required check CI.

## 9. Kesimpulan

Seluruh deliverable repository-side Fase 0 sudah diimplementasikan dan
diverifikasi: CI lengkap berjalan pada semua PR, skip integration test eksplisit,
build job, dokumen deployment/staging yang sesuai kondisi kode, inventaris
modul, manifest baseline, dan branch protection. Dua bukti operasional masih
bergantung pada environment eksternal: dump database staging dan deployment
staging live. Keduanya bukan artefak yang dapat dibuat dari repository ini dan
tidak diklaim selesai.
