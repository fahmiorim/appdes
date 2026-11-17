# Laporan — CI Path-Aware

- **Task:** Menghentikan pemborosan CI dengan menjalankan test sesuai file yang berubah
- **Tanggal:** 17 November 2026
- **Branch:** `task/ci-path-aware-2026-11-17`
- **Base commit:** `d1b31f336a27632fe44e868849393123ce754f50` (`main`)
- **Commit perubahan:** `bd0856320fcd42590dbbf466be199801d22425d5`
- **Status:** siap review; hasil CI PR diverifikasi setelah PR dibuat

## 1. Kondisi awal

Workflow CI menjalankan quality check, integration MySQL 8, dan build produksi
untuk **semua** PR, termasuk PR yang hanya mengubah dokumentasi. Integration
MySQL adalah required check, sehingga job tidak boleh dihilangkan begitu saja:
 jika workflow tidak menghasilkan check tersebut, branch protection akan
menahan merge.

Akibatnya PR dokumentasi menghabiskan waktu untuk install dependency, menyalakan
MySQL, menjalankan seluruh integration test, dan build produksi tanpa ada
perubahan runtime yang diuji.

## 2. Perubahan

### Job `changes`

Job baru menghitung diff `base...head` dan menghasilkan tiga output:

- `code` — typecheck, lint, dan unit test relevan;
- `integration` — integration MySQL relevan;
- `build` — build produksi relevan.

Klasifikasi dilakukan oleh `scripts/ci-changes.mjs` tanpa dependency baru.
Script juga mendukung mode `--files` untuk memeriksa klasifikasi secara lokal.

### Job tetap ada, step berat yang dilewati

`quality`, `integration`, dan `build` tetap selalu dibuat agar keempat required
check branch protection selalu memiliki status. Yang dibuat kondisional adalah
step beratnya:

- PR dokumentasi: hanya `format:check`; typecheck, lint, unit, integration, dan
  build dilewati.
- PR UI murni: format, typecheck, lint, unit, dan build; integration MySQL
  dilewati.
- PR repository/application/API/migration: integration MySQL dijalankan.
- PR dependency atau konfigurasi database: integration dan build dijalankan.

Dengan pendekatan ini, job tetap berkesudahan `success` dan required check tidak
menggantung, tetapi pekerjaan yang tidak relevan tidak dijalankan.

## 3. Matriks klasifikasi

| Perubahan | code | integration | build |
|---|---:|---:|---:|
| `docs/**`, `*.md` | tidak | tidak | tidak |
| `.github/**`, `scripts/**` | ya | tidak | tidak |
| UI: `src/components/**`, `src/app/**/*.tsx` | ya | tidak | ya |
| Domain murni: `src/features/**/domain/**` | ya | tidak | ya |
| Repository/application: `src/features/**/infrastructure/**`, `application/**` | ya | ya | ya |
| Schema/migration: `src/db/**` | ya | ya | ya |
| API/action: `src/app/api/**`, `actions.ts` | ya | ya | ya |
| Unit test saja | ya | tidak | tidak |
| Integration test saja | ya | ya | tidak |
| `package.json` / `package-lock.json` | ya | ya | ya |

## 4. File berubah

| File | Alasan |
|---|---|
| `.github/workflows/ci.yml` | Tambah job changes dan step kondisional |
| `scripts/ci-changes.mjs` | Klasifikasi file tanpa dependency baru |
| `docs/reports/00-baseline/ci-path-aware-2026-11-17.md` | Laporan ini |

Tidak ada source aplikasi, schema, migration, dependency, atau konfigurasi
branch protection yang diubah. Tidak ada test yang dihapus atau dilemahkan.

## 5. Security dan tenant

Perubahan hanya pada pemilihan job CI. Integration test untuk perubahan
repository, application, API, action, schema, migration, dan integration test
tetap diwajibkan. Branch protection tetap memakai empat check yang sama dan
`enforce_admins=true`.

Risiko yang tersisa: klasifikasi berbasis path tidak memahami isi kode. Perubahan
`page.tsx` yang menambah query langsung dapat melewati integration. Karena itu
semua perubahan di `src/app/api/**`, `actions.ts`, `infrastructure/**`, dan
`application/**` tetap memicu integration.

## 6. Validasi lokal

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format | `npm run format:check` | **PASS** |
| Lint | `npm run lint` | **PASS**, 0 error, 7 warning `<img>` lama |
| Typecheck | `npm run typecheck` | **PASS** |
| Unit test | `npm test` | **PASS**, 203 file / 1.789 test |
| Klasifikasi docs-only | `node scripts/ci-changes.mjs --files docs/x.md README.md` | **PASS**: semua `false` |
| Klasifikasi UI-only | `node scripts/ci-changes.mjs --files src/components/... src/app/...` | **PASS**: `code=true`, `integration=false`, `build=true` |
| Klasifikasi repository | file `infrastructure` | **PASS**: `integration=true` |
| Klasifikasi migration | file `src/db/migrations` | **PASS**: `integration=true` |
| Klasifikasi dependency | `package.json`, `package-lock.json` | **PASS**: ketiganya `true` |
| Integration lokal | tidak dijalankan | **SKIPPED**: tidak ada perubahan DB; butuh MySQL disposable |
| Build lokal | tidak dijalankan | **SKIPPED**: perubahan hanya workflow/script; CI PR juga melewati build |
| CI PR | GitHub Actions | **PENDING** — diverifikasi setelah PR |

## 7. Catatan tentang “test tidak berkaitan”

Tidak ada test yang dihapus. Untuk perubahan kode, seluruh unit dan integration
suite tetap dijalankan sebagai regression gate, karena satu perubahan repository
dapat memengaruhi isolasi tenant di modul lain. Yang dihilangkan adalah job
yang secara jelas tidak relevan: integration MySQL dan build pada PR
dokumentasi, serta integration MySQL pada perubahan UI murni.

Pemilihan test per-file di dalam satu suite tidak dilakukan karena belum ada
pemetaan dependensi yang dapat dibuktikan aman; memilih test secara sembarang
berisiko melewatkan regresi lintas tenant. Jika diperlukan, langkah berikutnya
adalah sharding atau pemetaan test per modul dengan bukti cakupan.

## 8. Kesimpulan

PR dokumentasi tidak lagi menjalankan integration MySQL dan build, sementara
required check tetap tersedia dan perubahan kode/DB tetap menjalankan gate yang
relevan. Hasil CI PR dicatat setelah PR dijalankan.
