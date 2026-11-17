# Pemisahan pemicu Visual QA dari CI umum

- **Task:** Mengurangi jalannya Visual QA browser untuk perubahan non-UI tanpa menghilangkan coverage visual pada perubahan terkait.
- **Tanggal:** 16 November 2026
- **Branch:** `task/ci-visual-qa-path-filter`
- **Base commit:** `30b81de4be06a39298ec23d2b319cb14740840a8` (`main` setelah PR #80)
- **Commit perubahan workflow:** `001e248799933c6246d63b5da1829b908ee3a39c`
- **Commit laporan:** `f0fc34d78b20fdef32d7fb1a655ea13f20d57ed2`
- **PR:** [#83](https://github.com/fahmiorim/appdes/pull/83) — belum di-merge per 16 November 2026.

## Kondisi awal dan analisis

Workflow `.github/workflows/ci.yml` menjalankan Visual QA setiap kali workflow CI berjalan. Job itu menyiapkan MySQL, memasang Chromium, membangun aplikasi, lalu mengambil screenshot login desktop/mobile dan banyak route publik. Job `summary` juga bergantung pada `visual-login`, sehingga Visual QA menjadi bagian wajib dari status keseluruhan meski perubahan hanya backend.

CI workflow hanya mengecualikan perubahan docs/Markdown di tingkat trigger. Pemeriksaan branch protection melalui GitHub API mengembalikan `Branch not protected`; karena itu tidak ditemukan required check yang terkonfigurasi lewat proteksi branch pada saat task dikerjakan.

## Perubahan

- `.github/workflows/ci.yml`
  - Menghapus job `visual-login` yang memakan waktu dari pipeline umum.
  - Ringkasan CI kini bergantung hanya pada `quality` dan `integration`; kedua gate tersebut tetap berjalan untuk PR non-docs seperti sebelumnya.
- `.github/workflows/visual-qa.yml` (baru)
  - Memindahkan setup dan capture Visual QA yang sudah ada ke workflow tersendiri.
  - PR otomatis memicu Visual QA saat mengubah route/style dalam `src/app`, komponen bersama, presentation UI fitur, stylesheet, aset publik/referensi, dependency manifest, atau konfigurasi Next.js.
  - Menambahkan `workflow_dispatch` untuk menjalankan Visual QA manual dari tab Actions pada branch yang dipilih.
  - Job tetap membangun aplikasi, memakai DB MySQL disposable `desa_visual_qa`, seed data sintetis, dan mengunggah screenshot sebagai artifact 7 hari.

Perubahan tidak mengubah skrip Visual QA, isi screenshot, quality check, integration test, aplikasi, maupun konfigurasi branch protection.

## File diperiksa

- `AGENTS.md`
- `.github/workflows/ci.yml`
- `package.json`
- `.gitignore`
- `src/app/(auth)/masuk/page.tsx` dan `login-form.tsx`
- struktur `src/app`, `src/components`, dan `src/features/**/presentation`
- status proteksi branch `main` melalui GitHub API

## File berubah

- `.github/workflows/ci.yml` — menghapus Visual QA dari gate CI umum.
- `.github/workflows/visual-qa.yml` — workflow Visual QA otomatis berbasis path dan manual.
- `docs/reports/04-tooling/visual-qa-trigger-policy-2026-11-16.md` — laporan task ini.

## Validasi

| Pemeriksaan | Status | Catatan |
| --- | --- | --- |
| `npx prettier --check .github/workflows/ci.yml .github/workflows/visual-qa.yml` | PASS | Kedua workflow sesuai format. |
| Parse YAML melalui package `yaml` yang sudah terpasang; periksa nama job dan dependency ringkasan CI | PASS | Parser berhasil membaca kedua file; `summary` hanya memerlukan `quality,integration`. |
| Pemeriksaan trigger melalui parser | PASS | `visual-qa.yml` memiliki `pull_request.paths` dan `workflow_dispatch`. |
| `git diff --check` | PASS | Tidak ada whitespace error pada diff. |
| `actionlint` | SKIPPED | Binary `actionlint` tidak tersedia di lingkungan ini. |
| Menjalankan Visual QA penuh | SKIPPED | Job berat berbasis MySQL/Chromium, diverifikasi melalui konfigurasi; dijalankan oleh CI setelah PR atau manual setelah merge. |
| Quality/unit/integration | SKIPPED | Task hanya mengubah workflow; tidak menjalankan ulang suite aplikasi. |

## Risiko dan batasan

- Path filter adalah daftar eksplisit. Perubahan UI baru di luar `src/app`, `src/components`, `src/features/**/presentation`, `src/styles`, dan path aset/dependency yang terdaftar tidak otomatis memicu Visual QA; workflow tetap dapat dijalankan manual.
- `workflow_dispatch` tersedia pada default branch dan dapat dijalankan pada branch yang dipilih melalui GitHub Actions.
- GitHub Actions menggabungkan status job CI dan Visual QA sebagai workflow berbeda; branch protection (saat ini tidak terdeteksi aktif) perlu disetel maintainer jika Visual QA harus menjadi required gate untuk subset PR.
- Visual QA tidak dijalankan lokal; hasil sebenarnya pada branch ini baru tersedia setelah pipeline PR berjalan.

## Kesimpulan

Visual QA tidak lagi membebani setiap perubahan kode non-UI. Ia tetap otomatis untuk perubahan UI/aset yang tercakup dan dapat dijalankan manual. Quality dan integration CI tetap menjadi gate umum. Perubahan diserahkan sebagai branch/PR untuk review, tanpa merge atau deploy.
