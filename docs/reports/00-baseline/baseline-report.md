# Laporan Baseline — Phase 0

> **Proyek:** Appdes SID (`fahmiorim/appdes`)
> **Tanggal pemeriksaan:** 12 November 2026
> **Jenis task:** pemeriksaan read-only (baseline & quality check)
> **Commit yang diperiksa:** `c17fc05` — `docs: add coding agent working rules`
> **Lingkungan:** Windows, Git Bash, Node `v26.2.0`, npm `11.13.0`

## Ringkasan status

| Pemeriksaan | Perintah | Status |
|---|---|---|
| Repository bersih & sinkron | `git status --short --branch` | **PASS** |
| TypeScript typecheck | `npm run typecheck` | **PASS** (exit 0) |
| ESLint | `npm run lint` | **PASS** (exit 0) |
| Format check | `npm run format:check` | **PASS** (exit 0) |
| Unit test | `npx vitest run --exclude '**/*integration.test.ts' --exclude '**/*integrasi*.test.ts'` | **PASS** (182 berkas, 1484 tes) |
| Integration test | `npm run test` (tidak dijalankan) | **SKIPPED** — keamanan DB belum dipastikan |
| Build produksi | `npm run build` | **TIDAK DIJALANKAN** (di luar scope pemeriksaan C) |
| CI/CD | inspeksi `.github/`, dll. | **FAIL** — tidak ada pipeline |
| Dokumentasi deployment | inspeksi repo | **FAIL** — tidak ada README/runbook deploy |

**Kesimpulan singkat:** kualitas kode lokal hijau (typecheck, lint, format, unit test). Fase 0 **belum memenuhi kriteria selesai** karena belum ada CI, dokumentasi deployment, dan mekanisme yang memaksa integration test berjalan hanya pada database disposable.

---

## 1. Repository Status

**Perintah:** `git status --short --branch`, `git branch --show-current`, `git log -1`, `git remote -v`, `git diff --stat`

| Item | Hasil |
|---|---|
| Branch aktif | `main`, tracking `origin/main`, tanpa ahead/behind |
| Working tree | Bersih (tidak ada perubahan staged/unstaged/untracked) |
| Commit terakhir | `c17fc05adcbcc178f8c7046f0c8979c4f0dfebb2` — `docs: add coding agent working rules` (2026-11-12) |
| Remote | `origin` → `https://github.com/fahmiorim/appdes.git` |
| Risiko tertimpa | Tidak ada; tidak ada perubahan lokal yang belum tersimpan |

**Status: PASS**

Struktur repository (root): `src/`, `docs/`, `storage/`, konfigurasi (`next.config.ts`, `drizzle.config.ts`, `vitest.config.mts`, `eslint.config.mjs`, `commitlint.config.mjs`), `AGENTS.md`, `package.json`, `package-lock.json`. Tidak ada `README.md` dan tidak ada `.github/`.

Inventaris statis (dari `git ls-files`):

| Metrik | Jumlah |
|---|---|
| Berkas terlacak | 721 |
| Berkas test (`*.test.ts`/`*.spec.ts`) | 191 |
| Berkas test yang menyentuh DB (`jalankanMigrasiUji`) | 9 |
| Berkas schema Drizzle | 79 |
| Migration SQL | 1 (`0000_baseline.sql`) |

**Package manager:** npm (`package-lock.json` ada, `npm` script standar). Tidak ada `pnpm-lock.yaml`, `yarn.lock`, atau `bun.lockb`.

---

## 2. Environment & Dependencies

### Runtime

**Perintah:** `node --version`, `npm --version`

| Item | Nilai |
|---|---|
| Node.js aktual | `v26.2.0` |
| npm aktual | `11.13.0` |
| `engines.node` di `package.json` | `>=20.9.0` |
| File pin versi (`.nvmrc`/`.node-version`/`volta`) | Tidak ada |

### Dependency utama (versi terpasang, `npm ls --depth=0`)

| Paket | Versi |
|---|---|
| Next.js | 16.4.2 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Drizzle ORM | 0.45.4 |
| drizzle-kit | 0.31.11 |
| mysql2 | 3.24.6 |
| Better Auth | 1.7.10 |
| Zod | 4.6.7 |
| Vitest | 5.0.5 |
| ESLint | 9 (rentang `^9`) |
| Prettier | 3.9.10 |
| Baileys | 6.7.24 |

`npm install`/`npm ci` **tidak dijalankan** pada pemeriksaan ini; `node_modules` sudah ada dan `npm ls` membaca instalasi saat ini.

### Environment

Nilai secret **tidak ditampilkan**. Nama variabel di `.env` lokal:

`APP_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `NODE_ENV`

Nama variabel yang tersedia di `.env.example` tetapi tidak ada di `.env` lokal (semuanya opsional menurut skema Zod):

`RESEND_API_KEY`, `RESEND_FROM`, `EMAIL_WEBHOOK_TOKEN`, `WHATSAPP_AUTH_DIR`, `TTE_MODE`, `TTE_API`, `TTE_USERNAME`, `TTE_NIK`, `TTE_PASSWORD`, `TTE_SSL`, `DESA_BASE_DOMAIN`, `NEXT_PUBLIC_APP_NAME`

Validasi environment terpusat di `src/lib/env.ts` (Zod, fail-fast saat modul diimpor). `NEXT_PUBLIC_APP_NAME` tidak termasuk skema tersebut.

**Target database pada `.env` (kredensial disamarkan):**

| Item | Nilai |
|---|---|
| Protokol | `mysql:` |
| Host / port | `127.0.0.1` / `3306` |
| Nama database | `desa_dev` (database development lokal) |

**Status: PASS** untuk ketersediaan konfigurasi wajib; lihat temuan soal reproduktibilitas versi Node dan baris `[TEMPLATE]` pada `.env.example`.

---

## 3. TypeScript Check

**Perintah:** `npm run typecheck` → `next typegen && tsc --noEmit`

| Item | Hasil |
|---|---|
| Exit code | 0 |
| Keluaran | `Generating route types... ✓ Types generated successfully`, tanpa error `tsc` |
| Berkas yang diubah | Tidak ada perubahan terlacak (`git status` tetap bersih) |

**Status: PASS**

---

## 4. ESLint Check

**Perintah:** `npm run lint` → `eslint .`

| Item | Hasil |
|---|---|
| Exit code | 0 |
| Error / warning | Tidak ada keluaran error maupun warning |
| Konfigurasi | `eslint.config.mjs`, `eslint-config-next`, `eslint-config-prettier` |

**Status: PASS**

---

## 5. Format Check

**Perintah:** `npm run format:check` → `prettier --check .`

| Item | Hasil |
|---|---|
| Exit code | 0 |
| Keluaran | `All matched files use Prettier code style!` |
| Pengecualian | Mengikuti `.prettierignore` |

**Status: PASS**

---

## 6. Unit Test Results

**Perintah:**

```bash
npx vitest run --exclude '**/*integration.test.ts' --exclude '**/*integrasi*.test.ts'
```

Sembilan berkas integrasi dikecualikan secara eksplisit (lihat bagian 7). Konfigurasi `vitest.config.mts` tetap memuat `test.env` dengan `DATABASE_URL=mysql://root:@127.0.0.1:3306/desa_test`, tetapi unit test yang dijalankan tidak membuka koneksi database.

| Item | Hasil |
|---|---|
| Exit code | 0 |
| Berkas test dijalankan | 182 |
| Tes lulus | 1484 |
| Tes gagal | 0 |
| Tes di-skip | 0 |
| Durasi | ±10,6 detik |

Catatan: `src/db/migrasi-paritas.test.ts` (7 tes paritas skema vs migrasi) termasuk dalam 182 berkas dan lulus.

**Status: PASS**

Penanda `test.skip`/`test.todo`/`test.only`: tidak ditemukan. Yang ada hanya `ctx.skip()` dinamis di dalam berkas integrasi, dipakai saat database uji tidak tersedia.

---

## 7. Integration Test Status

**Status: SKIPPED** — tidak dijalankan.

### Mekanisme yang diperiksa

- `vitest.config.mts` menetapkan `DATABASE_URL` uji ke `mysql://root:@127.0.0.1:3306/desa_test` dan `NODE_ENV=test`.
- Sembilan berkas test memakai `jalankanMigrasiUji()` dari `src/testing/migrasi-uji.ts`:
  1. `src/features/bantuan/integrasi-warga.test.ts`
  2. `src/features/database/infrastructure/verifikasi-restore.integration.test.ts`
  3. `src/features/gis/infrastructure/gis-repository.integration.test.ts`
  4. `src/features/isolasi-village.integration.test.ts`
  5. `src/features/konten/dokumen-publik.integration.test.ts`
  6. `src/features/layanan-mandiri/integrasi-warga.test.ts`
  7. `src/features/multi-desa/isolasi-host.integration.test.ts`
  8. `src/features/pesan-warga/integrasi-pesan-warga.test.ts`
  9. `src/features/surat/infrastructure/penomoran-archive.integration.test.ts`
- Beberapa suite memanggil `CREATE DATABASE IF NOT EXISTS` untuk nama database dari DSN, lalu menjalankan migrasi Drizzle dengan `GET_LOCK` (kunci `sid_desa_migrasi_uji`), menyisipkan fixture dua desa, dan menghapus fixture di `afterAll`.
- `verifikasi-restore.integration.test.ts` menyentuh mekanisme verifikasi restore database.

### Alasan tidak dijalankan

Task melarang menjalankan integration test bila keamanan database belum dapat dipastikan. Pada pemeriksaan ini tidak tersedia bukti bahwa `desa_test` saat ini disposable dan terpisah dari data yang bernilai. Perilaku test juga membuat/memigrasi database secara otomatis, sehingga menjalankannya tanpa persetujuan berisiko menulis ke database yang salah bila `DATABASE_URL` diubah.

### Risiko yang tercatat

| Risiko | Dampak |
|---|---|
| Nama database tidak divalidasi harus berakhiran `_test` sebelum `CREATE DATABASE`/migrasi | Konfigurasi yang salah dapat memigrasi database non-test |
| `DATABASE_URL` uji di-hardcode dengan user `root` tanpa password di `vitest.config.mts` | Hanya cocok untuk MySQL lokal; CI/deployment perlu konfigurasi berbeda |
| `db:push` tersedia di `package.json` tanpa guard lingkungan | Risiko diterapkan ke database yang salah bila dipakai sembarangan |
| Test restore ikut dalam suite integrasi | Membutuhkan database benar-benar terisolasi |

**Status: SKIPPED (sesuai batasan task).** Perintah yang disarankan setelah keamanan DB disetujui:

```bash
npm run test
```

---

## 8. Database & Migration Readiness

**Perintah inspeksi:** `ls src/db/migrations`, `cat src/db/migrations/meta/_journal.json`, `wc -l`, `grep -c 'CREATE TABLE'`, pembacaan `drizzle.config.ts`.

| Item | Hasil | Status |
|---|---|---|
| Dialect Drizzle | `mysql` | PASS |
| Lokasi schema | `./src/db/schema` (79 berkas) | PASS |
| Lokasi output migration | `./src/db/migrations` | PASS |
| Migration tersedia | `0000_baseline.sql` (2462 baris, 147 tabel) | PASS |
| Journal Drizzle | 1 entri (`0000_baseline`), konsisten dengan berkas | PASS |
| Paritas schema vs migration | `src/db/migrasi-paritas.test.ts` (7 tes) lulus | PASS |
| `strict: true` pada drizzle-kit | Ya | PASS |
| Migration dijalankan saat pemeriksaan | Tidak | — |

`drizzle.config.ts` membaca `DATABASE_URL` dari `src/lib/env.ts`, sehingga perintah Drizzle mewarisi target `.env` (`desa_dev`). Tidak ada migration baru yang dibuat atau dijalankan.

**Status: PASS** untuk kesiapan struktur migration. Catatan risiko:

- Hanya ada satu baseline, sehingga belum ada bukti jalur **upgrade** dari snapshot produksi; yang terbukti baru pembuatan database dari nol.
- Belum ada dokumentasi urutan deploy migration, backup sebelum migrasi, dan rollback.
- Database `desa_dev` dan `desa_test` berada di server MySQL lokal yang sama (port 3306); pemisahan hanya berdasarkan nama database.

---

## 9. CI/CD & Deployment Readiness

**Perintah inspeksi:** pencarian `.github/`, `.gitlab-ci.yml`, `.circleci`, `Jenkinsfile`, `azure-pipelines.yml`, `Dockerfile`/`compose`/`vercel`/`pm2`, `README*`, isi `docs/`.

| Item | Hasil | Status |
|---|---|---|
| CI workflow | Tidak ada `.github/` maupun konfigurasi CI lain | **FAIL** |
| Dokumentasi deployment | Tidak ada README, Dockerfile, compose, atau runbook deploy | **FAIL** |
| Dokumentasi environment | `.env.example` lengkap dengan komentar; tidak ada tabel env terpisah | PASS (sebagian) |
| Script kualitas terpadu | `npm run check` (typecheck, lint, format, test) | PASS |
| Git hooks | `prepare: husky` ada, tetapi direktori `.husky/` tidak ada dan tidak ada hook terpasang | **FAIL** |
| Commit convention | `commitlint.config.mjs` dan `lint-staged` dikonfigurasi, tetapi tidak dijalankan oleh hook | PASS (konfigurasi) / FAIL (penegakan) |
| Kesiapan build/deploy | `next.config.ts` tanpa `output: "standalone"`; build tidak dijalankan pada baseline ini | Belum diverifikasi |
| Dokumentasi arsitektur/audit | `AGENTS.md`, `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md` tersedia | PASS |
| Dokumentasi lain | `docs/` hanya berisi 3 dokumen dan 39 tangkapan layar UI (tanpa indeks) | Informasi |

Kriteria selesai Fase 0 pada `docs/MASTER_ROADMAP.md` mensyaratkan pipeline CI berjalan pada setiap pull request dan staging dapat dibangun dari dokumentasi. Keduanya belum terpenuhi.

**Status: FAIL**

---

## 10. Findings & Blockers

### Blocker Fase 0

| ID | Temuan | Bukti | Dampak |
|---|---|---|---|
| B-01 | Tidak ada pipeline CI | Tidak ada `.github/workflows` atau konfigurasi CI lain | Kriteria selesai Fase 0 tidak terpenuhi; regresi hanya terdeteksi lokal |
| B-02 | Tidak ada dokumentasi deployment/operasi | Tidak ada README/Dockerfile/runbook; hanya `.env.example` | Staging tidak dapat dibangun dari dokumentasi |
| B-03 | Integration test belum aman dijalankan otomatis | `CREATE DATABASE IF NOT EXISTS` + migrasi otomatis, tanpa guard nama DB `_test`; test restore ikut | Risiko menulis ke database salah; bukti isolasi tenant belum bisa dipakai di CI |

### Temuan penting (non-blocker)

| ID | Temuan | Bukti | Dampak |
|---|---|---|---|
| F-01 | Git hooks tidak aktif | `prepare: husky`, tanpa `.husky/`; `ls .git/hooks` kosong | Lint/format/commitlint tidak menegakkan apa pun |
| F-02 | Versi Node tidak dipin | `engines >=20.9.0`, aktual `v26.2.0`, tanpa `.nvmrc` | Perbedaan versi antar mesin/CI |
| F-03 | Baris `[TEMPLATE]` pada `.env.example` bukan komentar | Baris pertama berkas | Menyesatkan saat disalin menjadi `.env`; diabaikan dotenv |
| F-04 | Kredensial DB uji hardcode `root` tanpa password | `vitest.config.mts`, `test.env.DATABASE_URL` | Tidak portabel ke CI; mendorong kebiasaan kredensial longgar |
| F-05 | `db:push` tersedia berdampingan dengan `db:migrate` | `package.json` | Risiko perubahan schema tanpa migration |
| F-06 | Belum ada bukti jalur upgrade migration dari snapshot | Hanya 1 baseline + parity test statis | Belum terbukti aman untuk upgrade instalasi yang sudah berjalan |
| F-07 | Temuan P1 audit belum ditangani | `docs/TECHNICAL_AUDIT.md` (AUD-001…AUD-031) | Bukan blocker baseline, tetapi menjadi isi Fase 1 |

### Yang sudah baik

- Working tree bersih dan sinkron dengan `origin/main`.
- Typecheck, lint, format, dan 1484 unit test lulus tanpa skip.
- Paritas schema–migration dijaga test statis (7 tes).
- Validasi environment terpusat dan fail-fast (`src/lib/env.ts`).
- Integration test memakai kunci MySQL untuk mencegah migrasi paralel bertabrakan.
- Dokumen audit, feature map, roadmap, dan aturan agent tersedia serta konsisten dengan stack.

### Tidak diverifikasi pada baseline ini

- `npm run build` / build produksi (di luar scope pemeriksaan C).
- Integration test dan test isolasi dua tenant (lihat bagian 7).
- Perilaku runtime: login, resolusi tenant, TTE, WhatsApp, backup/restore, reverse proxy.
- Ketersediaan `desa_test` dan status disposable-nya.

---

## 11. Rekomendasi Langkah Berikutnya

1. **Buat CI dasar (P0).** Workflow untuk `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, dan unit test pada setiap PR. Tambahkan job terpisah untuk build.
2. **Amankan integration test (P0).** Tambahkan guard yang menolak eksekusi bila nama database tidak berakhiran `_test`, sediakan layanan MySQL disposable di CI, dan pisahkan script `test:integration` dari `test`.
3. **Dokumentasikan deployment (P0).** README + runbook: versi Node, matriks environment, urutan migrasi, reverse proxy/forwarded host, backup DB dan media, serta prosedur restore.
4. **Aktifkan Git hooks (P1).** Buat `.husky/` yang menjalankan lint-staged dan commitlint, atau hapus `prepare` bila memang tidak dipakai, agar konfigurasi tidak menyesatkan.
5. **Pin versi runtime (P1).** Tambahkan `.nvmrc`/`engines` yang selaras dan gunakan versi Node yang sama di CI.
6. **Rapikan template environment (P2).** Hapus baris `[TEMPLATE]`, dan beri contoh DSN uji yang eksplisit (bukan kredensial root kosong).
7. **Batasi `db:push` (P2).** Dokumentasikan larangan pemakaian di luar lokal, atau hapus dari script bila migration adalah satu-satunya jalur resmi.
8. **Siapkan bukti upgrade migration (P2).** Uji migrasi dari snapshot database staging sebelum menyentuh Fase 1.
9. **Masuk Fase 1 setelah P0 selesai.** Prioritaskan AUD-001, AUD-002/003/004/005/011/012, AUD-019/020, AUD-021/029, dan AUD-007 sesuai roadmap.

---

## 12. Kesimpulan Kesiapan Masuk Fase 1

- **Kualitas kode lokal: SIAP.** Typecheck, ESLint, format, dan 1484 unit test lulus; paritas schema–migration terjaga.
- **Kriteria selesai Fase 0: BELUM TERPENUHI.** CI, dokumentasi deployment, dan integration test yang aman serta otomatis belum ada.
- **Rekomendasi:** selesaikan B-01 sampai B-03 terlebih dahulu. Pekerjaan hardening Fase 1 secara teknis dapat dimulai paralel, tetapi hasilnya belum dapat disebut tervalidasi sampai CI dan integration test yang terisolasi tersedia.
- **Integration test:** statusnya **SKIPPED**, bukan lulus. Jangan jadikan dasar klaim isolasi tenant sampai dijalankan pada database disposable yang disetujui.

---

## Batasan yang dipatuhi

- Tidak ada perubahan source code, schema, migration, atau konfigurasi.
- Tidak ada migration yang dibuat atau dijalankan.
- Tidak ada perintah destruktif (drop/truncate/reset/force push).
- Tidak ada commit ke `main`.
- Nilai secret tidak dibaca ke laporan; hanya nama variabel dan target database yang dilaporkan.
- Satu-satunya berkas yang dibuat: laporan ini.
