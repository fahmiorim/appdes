# Laporan — Phase 0.2: GitHub Actions CI (B-01)

> **Proyek:** Appdes SID (`fahmiorim/appdes`)
> **Tanggal:** 12 November 2026
> **Jenis task:** implementasi pipeline CI (B-01), tanpa perubahan fitur
> **Base acuan `main`:** `c7c2ffc7957744b27badef94eec52d4985527a0a`
> **Base branch:** `task/phase-0-integration-safety-hardening` @ `4946fd0` (Phase 0.1 approved; `main` adalah ancestor)
> **Branch:** `task/phase-0-github-actions-ci`
> **Commit implementasi:** `db0d70985b70a46cdd11a694fd6ee33d40906af6`

## 1. Tujuan dan ruang lingkup

Menyediakan CI GitHub Actions untuk setiap Pull Request ke `main` dan setiap push ke branch kerja, mencakup:

- quality gate: install, typecheck, lint, format check, unit test;
- integration test pada MySQL 8 disposable dengan guard Phase 0.1;
- ringkasan status antar-job.

Ruang lingkup hanya B-01. Tidak ada perubahan schema, migration, source code fitur, dependency, guard integration test, secret production, deployment, atau merge.

## 2. Kondisi awal dan keputusan base

Repository belum memiliki direktori `.github` maupun workflow CI. `package-lock.json` tersedia, sehingga `npm ci` dan cache npm dapat dipakai.

`origin/main` masih di `c7c2ffc` dan **belum memuat Phase 0.1**:

- `src/testing/db-test-guard.ts`, `setup-integration.ts`, dan `migrasi-uji.ts` tidak ada di `main`;
- `package.json` di `main` belum memiliki script `test:integration`;
- `vitest.integration.config.mts` belum ada.

Karena itu job integration tidak dapat berjalan pada branch yang hanya berisi `main`. Sesuai instruksi untuk tidak mengubah/menggabungkan branch Phase 0.1, branch CI dibuat dari ujung branch hardening yang sudah approved (`4946fd0`), yang sudah memuat `main` terbaru. Branch lama tidak diubah dan tidak di-merge.

**Deviasi yang disengaja:** parent branch adalah `4946fd0`, bukan langsung `c7c2ffc`. Setelah Phase 0.1 masuk `main`, branch ini dapat di-rebase/merge tanpa membawa perubahan guard baru. Tanpa langkah tersebut, job integration akan gagal karena script/guard belum ada.

## 3. File yang diperiksa

- `AGENTS.md` dan `docs/MASTER_ROADMAP.md` (Fase 0 / B-01).
- `.github/` — tidak ada workflow sebelumnya.
- `package.json` dan `package-lock.json`.
- `vitest.config.mts`, `vitest.integration.config.mts`.
- `src/testing/db-test-guard.ts`, `src/testing/setup-integration.ts`, `src/testing/migrasi-uji.ts`.
- `.env.example` (kontrak environment integration test).
- Sembilan suite integration test yang dijalankan oleh `test:integration`.

## 4. File yang dibuat/diubah

| File | Perubahan |
|---|---|
| `.github/workflows/ci.yml` | **Baru.** Tiga job: quality, integration, summary. |
| `docs/reports/00-baseline/github-actions-ci-report.md` | **Baru.** Laporan ini. |

Tidak ada source code aplikasi, schema, migration, dependency, atau guard yang diubah.

## 5. Desain CI

### 5.1 Trigger dan pengamanan workflow

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches-ignore: [main]
```

- PR menuju `main` selalu menjalankan CI.
- Push ke branch selain `main` juga menjalankan CI.
- Push ke `main` tidak memicu workflow; `main` tidak diubah oleh task ini.
- `permissions: contents: read` membatasi token workflow.
- `concurrency` membatalkan run lama pada ref yang sama agar tidak menumpuk.

### 5.2 Job A — Unit test dan quality check

`ubuntu-latest`, Node.js **22**, cache npm, timeout 20 menit.

Urutan: `actions/checkout@v4` → `actions/setup-node@v4` (`node-version: "22"`, `cache: npm`) → `npm ci` → `npm run typecheck` → `npm run lint` → `npm run format:check` → `npm test`.

Tidak ada dependency atau versi framework yang diubah. `npm test` pada branch ini hanya menjalankan unit test sesuai `vitest.config.mts`.

### 5.3 Job B — Integration test

`ubuntu-latest`, Node.js 22, cache npm, timeout 20 menit, dengan service container MySQL 8.

| Konfigurasi | Nilai |
|---|---|
| Image | `mysql:8.0` |
| Port host → container | `3306:3306` |
| Database | `desa_test_ci` |
| Host koneksi | `127.0.0.1` |
| User | `root` (ephemeral, hanya untuk job ini) |
| `MYSQL_ROOT_HOST` | `%` agar koneksi dari runner diterima |
| Health check | `mysqladmin ping` setiap 5 detik, 30 retry, start period 15 detik |
| Database lifecycle | Ephemeral; dihapus bersama runner |

GitHub Actions menunggu service berstatus healthy sebelum step pertama dijalankan. Tidak ada database eksternal, `.env` lokal, atau credential production yang dipakai.

Environment job:

```yaml
NODE_ENV: test
TEST_DATABASE_ACK: "1"
TEST_DATABASE_URL: mysql://root:uji_ci_root@127.0.0.1:3306/desa_test_ci
```

`DATABASE_URL` sengaja tidak disetel di workflow. `src/testing/setup-integration.ts` memvalidasi environment lalu menyalin `TEST_DATABASE_URL` ke `DATABASE_URL` sebelum pool Drizzle dibuat. Ini memenuhi syarat `jalankanMigrasiUji()` bahwa `DATABASE_URL` identik dengan DSN tervalidasi.

### 5.4 Job C — Ringkasan CI

Berjalan dengan `if: always()` setelah kedua job, menulis tabel status ke `$GITHUB_STEP_SUMMARY`, lalu **gagal** bila salah satu job tidak `success`. Ringkasan tidak menggantikan status job individual.

## 6. Bukti integration test memakai guard Phase 0.1

Workflow tidak memanggil Vitest integration secara langsung; ia memanggil script proyek:

```yaml
- name: Integration test
  run: npm run test:integration
```

Script tersebut (`package.json`) menjalankan `vitest run --config vitest.integration.config.mts`. Konfigurasi itu memuat:

```ts
setupFiles: ["./src/testing/setup-integration.ts"]
```

Alur yang dijalankan:

1. `setup-integration.ts` memanggil `validasiDatabaseUji(process.env)`.
2. Guard mewajibkan `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, `TEST_DATABASE_URL` valid, host loopback, dan nama `desa_test`/`desa_test_<suffix>`.
3. Nilai CI: `desa_test_ci` di `127.0.0.1:3306` — memenuhi allowlist dan tidak memuat query string/fragment.
4. Setelah lolos, setup menetapkan `DATABASE_URL` dari DSN tervalidasi.
5. Setiap suite memanggil `siapkanDatabaseUji()`; `jalankanMigrasiUji()` memvalidasi ulang environment dan DSN sebelum koneksi.
6. Bila guard gagal, suite gagal (bukan skip).

Tidak ada perubahan pada `db-test-guard.ts`, `setup-integration.ts`, atau `migrasi-uji.ts` pada branch ini (diff hanya workflow dan laporan).

## 7. Validasi lokal

Semua perintah dijalankan dari root proyek. Integration test lokal memakai `desa_test_phase01` di `127.0.0.1` dengan `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, dan tanpa `DATABASE_URL` — sama seperti environment job CI. Database tidak di-drop.

| Pemeriksaan | Perintah | Status |
|---|---|---|
| Install bersih | `npm ci` | **PASS** — 708 paket, exit 0 (13 moderate vulnerability bawaan dependency; tidak diperbaiki karena di luar scope) |
| Typecheck | `npm run typecheck` | **PASS** (exit 0) |
| Lint | `npm run lint` | **PASS** (tanpa error/warning) |
| Format | `npm run format:check` | **PASS** (`All matched files use Prettier code style!`) |
| Unit test | `npm test` | **PASS** — 184 berkas, 1537 tes |
| Validasi YAML | parsing `yaml` pada `.github/workflows/ci.yml` | **PASS** — job `quality`, `integration`, `summary`; trigger `pull_request`, `push` |
| Integration test | Vitest dengan environment CI pada `desa_test_phase01` | **PASS** — 9 berkas, 34 tes, 0 skip |
| GitHub Actions — quality | run `43135752190`, job `Unit test dan quality check` | **PASS** — seluruh step success |
| GitHub Actions — integration | run `43135752190`, job `Integration test (MySQL 8)` | **PASS** — step `Integration test` success, bukan skipped |
| GitHub Actions — summary | run `43135752190`, job `Ringkasan CI` | **PASS** — status keseluruhan LULUS |

Catatan: runtime lokal adalah Node `v26.2.0`, sedangkan CI memakai Node 22 LTS. Perbedaan versi runtime CI sudah diverifikasi oleh run GitHub Actions di bawah.

## 8. Status GitHub Actions

**URL workflow run:** https://github.com/fahmiorim/appdes/actions/runs/43135752190

**Run ID:** `43135752190` · **Event:** `push` · **Head SHA:** `db0d709` · **Status:** `completed` · **Conclusion:** `success`

| Job | Status | Bukti step |
|---|---|---|
| Unit test dan quality check | **success** | Install, typecheck, lint, format, unit test semuanya success |
| Integration test (MySQL 8) | **success** | `Initialize containers` dan `Integration test` success; tidak ada step yang di-skip |
| Ringkasan CI | **success** | Ringkasan ditulis; step penegakan status di-skip karena kedua job lulus |

Job integration berjalan pada service container MySQL 8 ephemeral dengan `TEST_DATABASE_URL=mysql://root:***@127.0.0.1:3306/desa_test_ci` dan `TEST_DATABASE_ACK=1`. Log mentah job tidak dapat diunduh tanpa hak admin repository, sehingga bukti yang tersedia adalah status step dari API GitHub Actions; output lokal menunjukkan target `desa_test_phase01 @ 127.0.0.1` dengan guard yang sama.

## 9. Risiko dan keterbatasan

| Risiko | Catatan |
|---|---|
| Base branch bukan langsung `main` | Diperlukan karena `main` belum memuat Phase 0.1. Branch harus di-rebase setelah Phase 0.1 masuk `main`; integration job akan gagal pada base `main` murni. |
| Kredensial MySQL CI terlihat di workflow | Hanya password ephemeral untuk service container runner; bukan secret production dan tidak dapat menghubungi database eksternal. |
| MySQL 8.0 vs lingkungan lokal | Lokal memakai MySQL yang tersedia di mesin developer; CI memakai `mysql:8.0`. Perbedaan minor versi dapat muncul. |
| npm audit 13 moderate | Berasal dari dependency yang sudah ada; task B-01 tidak mengubah dependency dan tidak menambal vulnerability. |
| Branch protection belum diatur | Workflow tersedia, tetapi kewajiban status check di GitHub harus diaktifkan maintainer di pengaturan repository. |
| Run ganda PR + push | Push ke branch yang memiliki PR dapat memicu dua run (push dan pull_request); `concurrency` membatalkan run lama pada ref yang sama, tetapi ref PR dan branch berbeda. |
| Tidak ada build job | Sesuai scope B-01; `next build` belum dijalankan di CI. |

## 10. Kesimpulan

- Workflow CI untuk quality gate dan integration test MySQL 8 telah dibuat.
- Integration job memakai guard Phase 0.1 tanpa melemahkan atau mengubahnya.
- Seluruh pemeriksaan lokal yang diminta lulus; integration lokal 9 berkas/34 tes lulus pada database disposable.
- GitHub Actions run `43135752190` selesai dengan conclusion `success`; job integration benar-benar menjalankan `npm run test:integration` pada MySQL 8 ephemeral.
- **Belum ada merge atau deployment.** Status: siap review.
