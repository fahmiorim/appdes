# Laporan: Deduplikasi Pipeline CI dan Penyatuan Seed Visual

- **Task:** hentikan pipeline ganda per commit, pakai seed visual resmi, dan hilangkan masking kegagalan screenshot.
- **Tanggal:** 16 November 2026
- **Branch:** `task/ci-pipeline-dedup`
- **Base commit:** `6c662de` (`main`)
- **Commit pekerjaan:** `948b439`

## Kondisi awal

1. Pemicu `push` memakai `branches-ignore: [main]` dan `pull_request` ke `main`. Commit pada branch kerja memicu `push` (ref `refs/heads/...`), lalu PR-nya memicu `pull_request` (ref `refs/pull/N/merge`) dengan `concurrency.group` berbeda, sehingga pipeline yang sama berjalan dua kali untuk satu perubahan.
2. Job visual menanam data lewat heredoc Node ±110 baris di dalam YAML. Fixture itu berbeda dari `scripts/visual-qa/seed.mjs` yang dipakai saat QA lokal, sehingga tampilan yang dinilai di CI tidak sama dengan yang dinilai manual.
3. Tiga perintah `playwright screenshot` diakhiri `|| test -s "<file>"`. Bila screenshot gagal tetapi file lama/terpotong masih ada, langkah tetap dianggap sukses.
4. `upload-artifact` memakai `if-no-files-found: warn`, sehingga job visual bisa hijau tanpa satu pun bukti gambar.

## File yang diperiksa

- `.github/workflows/ci.yml` — seluruh job (`quality`, integration, `visual-login`, `summary`).
- `scripts/visual-qa/seed.mjs` dan `scripts/visual-qa/guard.mjs` — fixture resmi dan guard target database.
- `package.json` — skrip `visual:qa:seed`.
- Perubahan migration 0006–0009 di branch AUD-034 (tidak diikutkan ke branch ini).

## File yang diubah

| File | Alasan |
| --- | --- |
| `.github/workflows/ci.yml` | Pemicu, concurrency, nama database visual, seed, penghapusan masking, dan pengetatan artefak. |

Statistik: `24` baris ditambah, `108` baris dihapus (workflow turun menjadi 270 baris).

## Perubahan

- **Pemicu.** `pull_request` ke `main` dan `push` hanya ke `main`, keduanya dengan `paths-ignore: docs/**` dan `**/*.md`. Push ke branch kerja tidak lagi membangun aplikasi; PR yang memicunya.
- **Concurrency.** `group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` dengan `cancel-in-progress: true`, sehingga push dan PR untuk perubahan yang sama berbagi satu grup.
- **Database visual.** `MYSQL_DATABASE` dan `DATABASE_URL` menjadi `desa_visual_qa`, ditambah `VISUAL_QA_DATABASE_URL` dan `VISUAL_QA_DATABASE_ACK=1` agar lolos `validasiEnvVisual` (loopback, nama `desa_visual_qa*`, ack eksplisit).
- **Seed.** Heredoc dihapus; langkah `Seed synthetic public tenant` sekarang `npm run visual:qa:seed`, yaitu skrip yang sama dengan QA lokal (profil, perangkat, wilayah, keluarga, warga, agenda, galeri, dokumen, potensi, pengaduan, keuangan, surat, layer GIS).
- **Masking dihapus.** Ketiga perintah screenshot berjalan tanpa `|| test -s`, sehingga kegagalan Playwright menggagalkan langkah. Pemeriksaan status HTTP per rute (harus `200`) tetap ada dan sudah gagal keras sebelumnya.
- **Artefak.** `if-no-files-found: error` agar job visual tidak bisa hijau tanpa bukti gambar.

## Security dan tenant

- Guard seed menolak host non-loopback dan database di luar pola `desa_visual_qa*`, sehingga CI tidak mungkin menanam data ke database bersama/produksi meski konfigurasi salah.
- Kredensial yang dipakai tetap kredensial service container sementara (`visual_qa_root`) dan tidak berasal dari secret repositori.
- `permissions: contents: read` tidak diubah.
- Tidak ada data pribadi asli pada fixture; nama, NIK, dan telepon sintetis.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npx prettier --check .github/workflows/ci.yml` | **PASS** — YAML terparse dan sesuai gaya |
| `grep -c "\|\| test -s" .github/workflows/ci.yml` | **PASS** — hasil `0` |
| `git ls-tree -r main --name-only scripts/visual-qa` | **PASS** — `seed.mjs` dan `guard.mjs` ada di base |
| `grep "visual:qa:seed" package.json` | **PASS** — skrip menunjuk `node scripts/visual-qa/seed.mjs` |
| `npm run format:check` (repo penuh) | **PASS** pada branch ini |
| `npm run test:integration` | **PASS** — 34 file, 206 test, terhadap MySQL 8.0.30 disposable `desa_test` @ `127.0.0.1:3307` |
| `npm run build` | **PASS** — `next build` selesai |
| Menjalankan workflow di GitHub Actions | **SKIPPED** — hanya bisa diverifikasi setelah push/PR |
| Job visual lokal (Playwright) | **SKIPPED** — memerlukan Chromium dan seed visual |

Integration test dan build dijalankan pada MySQL 8.0.30 lokal dengan data directory sementara di direktori temp (port 3307, database `desa_test`), bukan pada Docker: daemon Docker Desktop tidak aktif di mesin ini dan WSL belum diaktifkan. Database pengembangan tidak dipakai.

## Risiko dan keterbatasan

1. **PR dokumentasi melewati CI.** Jika branch protection mewajibkan check ini, PR yang hanya mengubah `docs/**` atau `*.md` tidak akan pernah mendapat status check. Sudah dicatat sebagai komentar di workflow; keputusan melonggarkan aturan ada pada maintainer.
2. **Tidak ada CI pada push branch kerja.** Regresi baru terlihat saat PR dibuka. Ini konsekuensi langsung dari deduplikasi.
3. **Fixture visual berubah** (data lebih lengkap, termasuk layer GIS). Run pertama bisa memunculkan perbedaan gambar yang sebelumnya tidak terlihat; itu bukan regresi tampilan.
4. **Seed menolak jalan bila tenant `sukamaju` sudah ada.** Di CI database selalu baru, tetapi bila job dijalankan ulang pada container yang sama, langkah seed akan gagal dengan pesan reset — perilaku ini disengaja.
5. Workflow belum pernah dieksekusi; kesalahan semantik YAML (mis. nama context) hanya akan terlihat saat run pertama.
6. Integration test membuktikan aplikasi berjalan pada database bersih, tetapi belum membuktikan langkah seed maupun tangkapan layar di dalam workflow.

## Kesimpulan

Satu commit kini hanya menjalankan satu pipeline, data visual memakai fixture yang sama dengan QA lokal, dan kegagalan screenshot/artefak tidak lagi bisa lolos diam-diam. Perubahan siap direview; verifikasi akhir memerlukan satu run GitHub Actions setelah PR dibuka.
