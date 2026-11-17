# Laporan — Quality PR Dokumentasi dan Cache Dependency

- **Task:** Mempercepat job quality untuk PR dokumentasi dengan cache dependency
- **Tanggal:** 17 November 2026
- **Branch:** `task/quality-docs-cache-2026-11-17`
- **Base commit:** `e65485e3dad391046c976aa668fba15ce9891e3c` (`main`)
- **Status:** siap review; PR #99 dan verifikasi dokumentasi PR #100 sudah merged

## 1. Kondisi awal

Job quality selalu menjalankan `npm ci` lalu `format:check` untuk semua PR.
Untuk PR dokumentasi, langkah itu tidak memberi nilai:

- `docs/**` dan `*.md` sudah diabaikan oleh `.prettierignore`;
- typecheck, lint, dan unit test memang sudah dilewati bila tidak ada perubahan
  kode;
- dependency lengkap tetap dipasang hanya untuk menjalankan pemeriksaan yang
  tidak menyentuh file dokumentasi.

## 2. Perubahan

### PR dokumentasi tidak memasang dependency

Bila `code=false`:

- cache/restore `node_modules` dilewati;
- `npm ci` dilewati;
- `format:check`, typecheck, lint, dan unit test dilewati;
- validator peta integration tetap dijalankan karena hanya memakai Node
  built-in.

Job tetap ada dan sukses, sehingga required check branch protection tidak
menggantung.

### Cache dependency untuk PR kode

Bila `code=true`:

- `actions/cache/restore@v4` me-restore `node_modules` dengan key yang memuat
  `package.json`, `package-lock.json`, OS, dan versi Node;
- `npm ci` hanya dijalankan bila cache exact tidak tersedia;
- PR tidak menyimpan cache baru; hanya workflow warm di `main` yang menyimpan.

### Workflow warm cache

`.github/workflows/warm-cache.yml` mengisi cache `node_modules` di `main` saat
`package.json`/`package-lock.json` berubah atau dijalankan manual. Workflow ini
tidak menjalankan test, sehingga tidak mengulang quality gate setelah merge.

## 3. File berubah

| File | Alasan |
|---|---|
| `.github/workflows/ci.yml` | Skip dependency untuk docs; restore cache untuk kode |
| `.github/workflows/warm-cache.yml` | Mengisi cache dependency di `main` |
| `docs/reports/00-baseline/quality-docs-cache-2026-11-17.md` | Laporan ini |

Tidak ada source aplikasi, schema, dependency package, atau branch protection
yang diubah. Tidak ada test yang dihapus atau dilemahkan.

## 4. Security dan tenant

- Tidak ada perubahan pada autentikasi, otorisasi, query, atau data tenant.
- Cache memakai action resmi `actions/cache/restore` dan `actions/cache`.
- PR hanya me-restore cache; PR tidak menulis cache ke `main`. Warm cache hanya
  berjalan di `main` atau manual.
- Key cache memuat hash `package.json` dan `package-lock.json`, sehingga
  perubahan dependency tidak memakai cache lama sebagai exact hit.
- `cache-hit` hanya `true` untuk exact key. Restore dari `restore-keys` tetap
  menjalankan `npm ci`.
- Required check tetap empat context dan `enforce_admins=true`.

## 5. Validasi lokal

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format workflow | `npx prettier --check .github/workflows/ci.yml .github/workflows/warm-cache.yml` | **PASS** |
| Validasi peta | `node scripts/integration-test-map.mjs --check` | **PASS**: 47 test |
| Klasifikasi docs | `--files docs/... README.md` | **PASS**: `code=false`, integration/build `false` |
| Klasifikasi kode | file `infrastructure` | **PASS**: `code=true`, integration/build `true` |
| Integration lokal | tidak dijalankan | **SKIPPED**: hanya workflow; butuh MySQL disposable |
| Build lokal | tidak dijalankan | **SKIPPED**: tidak ada perubahan source |
| CI PR #99 | GitHub Actions | **PASS**: quality, integration (skip), build (skip), ringkasan sukses |
| Warm cache | workflow_dispatch `44108993475` | **PASS**: job 62 detik, cache `main` 153 MB |
| Quality PR dokumentasi murni #100 | GitHub Actions run `44109432065` | **PASS**: job quality 16 detik; restore, install, format, typecheck, lint, unit semuanya `skipped`; validator peta lulus |
| Integration/build pada PR dokumentasi #100 | job detail run yang sama | **PASS**: test/build dilewati, tetapi job integration masih memulai service MySQL; total job 42 detik. Perbaikan startup service dilacak terpisah |

## 6. Risiko dan batasan

- Cache `node_modules` berukuran besar. Jika upload/restore lebih lambat dari
  `npm ci`, cache bisa dihapus tanpa mengubah correctness.
- Warm cache pertama harus dijalankan manual setelah merge karena trigger
  `push` hanya aktif saat file dependency berubah.
- PR dokumentasi tidak lagi memeriksa format Markdown karena Prettier memang
  mengabaikan `docs/**` dan `*.md`. Validator peta tetap berjalan.
- Cache PR tidak dibagikan ke PR lain; karena itu PR tidak menyimpan cache dan
  sumber cache adalah `main`.

## 7. Kesimpulan

PR dokumentasi tidak lagi memasang dependency atau menjalankan test yang tidak
relevan. PR kode dapat memakai cache `node_modules` dari `main`, dengan fallback
`npm ci` bila cache tidak exact. Hasil CI dan warm cache dicatat setelah
dijalankan.
