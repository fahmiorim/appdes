# Harness visual QA lokal (database disposable + fixture sintetis, 1440/390)

- **Task:** menyiapkan basis data uji disposable dan fixture sintetis agar visual QA halaman publik pada viewport 1440 dan 390 dapat dijalankan lokal, tanpa menyentuh database pengembangan/produksi.
- **Tanggal:** 2026-11-15
- **Branch:** `task/visual-qa-local-harness`
- **Base commit:** `7b09691` (`origin/main`)
- **Commit pekerjaan:** `7cb035d` (kode harness + dokumentasi + laporan). Perbaikan isi laporan setelah push dicatat pada commit berikutnya di branch yang sama.

## 1. Kondisi awal

- Visual QA selama audit PR #50–#56 hanya tersedia di CI (job `visual-login`), yang membuat MySQL lewat GitHub Actions service container dan menanam fixture dengan heredoc Node ±120 baris di dalam `.github/workflows/ci.yml`.
- Tidak ada cara menjalankan pemeriksaan visual yang sama di mesin lokal: tidak ada compose database, tidak ada skrip seed, dan tidak ada skrip capture.
- Akibatnya temuan visual (mis. peta `/wilayah` dan arsip `/agenda`) hanya bisa dinilai dari kode dan gambar referensi, bukan dari hasil render.

## 2. Analisis dan pendekatan

1. **Database disposable** harus punya identitas yang tidak mungkin tertukar dengan database pengembangan. Pendekatan: nama database dibatasi `desa_visual_qa` atau `desa_visual_qa_<suffix>`, host wajib loopback, DSN tanpa query string/fragment, dan `VISUAL_QA_DATABASE_ACK=1` sebagai pernyataan operator. Aturan ini mengikuti pola guard integration test yang sudah ada (`src/testing/db-test-guard.ts`) tetapi memakai namespace sendiri agar tidak bertabrakan dengan `desa_test*`.
2. **Compose** memakai MySQL 8 dengan data di tmpfs, port host 3307 (tidak menabrak MySQL lokal 3306), dan bind `127.0.0.1` saja sehingga data hilang saat container berhenti.
3. **Fixture sintetis** dipindahkan dari heredoc CI ke skrip yang dapat dibaca dan dijalankan ulang, lalu dilengkapi data yang relevan untuk pemeriksaan visual saat ini: layer GIS (Polygon, Feature, MultiPolygon, garis, titik) dan agenda arsip dua bulan lalu + satu draf yang tidak boleh tampil.
4. **Capture** memakai Playwright CLI lewat `npx --yes` (tanpa menambah dependency ke `package.json`), dengan pemeriksaan HTTP 200 lebih dulu agar screenshot halaman error tidak dianggap bukti lulus.

## 3. File yang diperiksa

- `.github/workflows/ci.yml` (job `visual-login`: service MySQL, seed, capture, referensi desain)
- `src/testing/db-test-guard.ts`, `src/testing/migrasi-uji.ts`, `src/testing/setup-integration.ts` (pola guard dan migrasi disposable)
- `src/lib/env.ts`, `drizzle.config.ts` (sumber `DATABASE_URL` dan validasi environment)
- `src/db/schema/gis.ts`, `src/db/schema/agenda-kegiatan.ts`, `src/features/gis/application/use-cases.ts` (kolom dan filter data publik)
- `src/app/wilayah/page.tsx`, `src/app/agenda/page.tsx` (halaman yang akan dinilai)
- `src/db/migrations/*` (8 migration, memakai `--> statement-breakpoint`)

## 4. File yang ditambahkan/diubah

| File | Alasan |
| --- | --- |
| `compose.visual-qa.yml` | MySQL 8 disposable (tmpfs, port 3307, bind loopback). |
| `scripts/visual-qa/guard.mjs` | Validasi DSN/environment sebelum operasi tulis apa pun. |
| `scripts/visual-qa/guard.d.mts` | Deklarasi tipe guard agar dapat diuji dari TypeScript. |
| `scripts/visual-qa/migrate.mjs` | Membuat database (hanya nama yang diizinkan) dan menjalankan migration Drizzle. |
| `scripts/visual-qa/seed.mjs` | Fixture sintetis satu tenant: profil, perangkat, wilayah/warga, agenda (termasuk arsip + draf), galeri, dokumen, potensi, pengaduan, keuangan, surat, dan layer GIS. |
| `scripts/visual-qa/capture.mjs` | Cek HTTP 200 per route lalu screenshot 1440×1000 dan 390×844; menyalin gambar referensi ke samping hasil. |
| `src/testing/visual-qa-guard.test.ts` | 10 unit test untuk jalur terima/tolak guard. |
| `docs/testing/VISUAL-QA-LOCAL.md` | Prosedur lengkap, termasuk alternatif tanpa Docker dan troubleshooting. |
| `package.json` | Script `visual:qa:db:up`, `visual:qa:db:down`, `visual:qa:migrate`, `visual:qa:seed`, `visual:qa:capture`. |
| `.gitignore` | `/artifacts` (hasil capture) tidak masuk repository. |

Tidak ada perubahan schema, migration, kode aplikasi, atau konfigurasi deploy. Dependency tidak bertambah.

## 5. Security / tenant

- Skrip tidak pernah membaca `DATABASE_URL` pengembangan sebagai fallback; hanya `VISUAL_QA_DATABASE_URL` (default DSN compose) yang divalidasi.
- Uji negatif guard mencakup: host non-loopback (termasuk IP jaringan dan domain), nama database `desa`/`desa_test`/`desa_visual_qa_prod`/`desa_visual_qa_development`/huruf besar, query string (`socketPath`), fragment, port tidak valid, `NODE_ENV=production`, dan ack yang tidak bernilai `1`.
- Koneksi MySQL selalu dibuat dari field eksplisit hasil parsing guard, bukan string URL, sehingga query param tidak dapat menyelundupkan opsi koneksi.
- Log hanya mencetak nama database dan host:port (`ringkasTarget`); DSN/kredensial tidak pernah dicetak. Fixture memakai nama, nomor keluarga, dan kontak fiktif.
- Fixture ditulis hanya ke database ber-nama `desa_visual_qa*`; tidak ada query lintas tenant karena seed membuat tenant sendiri dari nol.

## 6. Hasil pemeriksaan (faktual)

Dijalankan pada mesin lokal (Windows, Node 26.2.0, MySQL 8.0.30 lokal, Chrome terpasang, Docker Desktop tidak aktif).

| Perintah | Hasil |
| --- | --- |
| `npx vitest run src/testing/visual-qa-guard.test.ts` | PASS — 10 test |
| `npx tsc --noEmit` | PASS |
| `npx eslint scripts/visual-qa src/testing/visual-qa-guard.test.ts` | PASS |
| `npm run format:check` | PASS |
| `node --check scripts/visual-qa/*.mjs` | PASS (semua skrip) |
| `npm run visual:qa:migrate` tanpa `VISUAL_QA_DATABASE_ACK` | PASS (guard menolak, sesuai harapan) |
| `npm run visual:qa:db:up` | **SKIPPED** — daemon Docker tidak aktif (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`) |
| `visual:qa:migrate` (MySQL lokal 8.0.30, database `desa_visual_qa`) | PASS — 8 migration diterapkan |
| `visual:qa:seed` | PASS — tenant `sukamaju` (id=1): 4 area, 6 agenda, 3 foto, 3 warga |
| `npm run build` + `npm run start` dengan `DATABASE_URL` database visual | PASS — `/masuk` HTTP 200 untuk Host `sukamaju.localhost` |
| `VISUAL_QA_CHANNEL=chrome npm run visual:qa:capture` | PASS — 16 route × 2 viewport, semua HTTP 200, 32 berkas PNG (108–566 KB) |
| `npx playwright install chromium` | **SKIPPED** — memakai Chrome terpasang via `VISUAL_QA_CHANNEL=chrome` |

Bukti capture: `artifacts/visual-qa/2026-11-15T16-11-00/` (gitignored). Isinya antara lain `wilayah-desktop.png`, `wilayah-mobile.png`, `agenda-desktop.png`, `agenda-mobile.png`, dan folder `reference/` berisi gambar desain untuk pembanding.

Pengamatan atas hasil capture:

- `/wilayah` (kode PR #53 di branch `task/pr53-wilayah-gis`): keempat area tampil dengan skala bersama, `MultiPolygon` tampil sebagai dua bidang, `Feature` tampil sebagai polygon, legenda sesuai layer; desktop tanpa ruang kosong berlebih dan mobile tanpa horizontal scroll. Detailnya dicatat di laporan PR #53 (`docs/reports/02-public-website/pr53-wilayah-gis-f06-f07-2026-11-15.md`, bagian 6a).
- `/agenda` pada build ini masih memakai kode PR #51 sebelum perbaikan F-04/F-05 (perbaikan itu berada di branch `task/pr51-agenda-archive`), sehingga arsip bulan lampau belum diverifikasi visual di sesi ini.

## 7. Risiko dan keterbatasan

- Jalur Docker (`compose.visual-qa.yml`) belum dijalankan karena daemon mati; validasi yang terbukti adalah jalur MySQL lokal. Konfigurasi compose mengikuti pola service MySQL CI dan hanya berbeda pada tmpfs/port.
- Untuk verifikasi kali ini, database `desa_visual_qa` dibuat di **server MySQL lokal pengembangan** (bukan di container). Database itu terpisah dari `desa_dev` dan dapat dihapus dengan `DROP DATABASE desa_visual_qa;` setelah selesai.
- Capture memakai `npx --yes playwright`, sehingga pemakaian pertama membutuhkan jaringan. Chromium milik Playwright tidak diunduh pada sesi ini.
- Screenshot tidak disimpan di repository (gitignored). Reviewer harus menjalankan ulang perintah di `docs/testing/VISUAL-QA-LOCAL.md` untuk melihat hasilnya.
- Tidak ada pembanding otomatis (ambang diff visual); penilaian tetap manual terhadap folder `reference/`.
- `scripts/visual-qa/*.mjs` tidak melalui typecheck TypeScript (hanya `node --check` + ESLint + unit test guard). Guard diberi deklarasi `.d.mts` agar kontraknya tetap terkunci oleh test.
- Seed berhenti bila tenant contoh sudah ada; belum ada mode `--force` yang menghapus data, supaya data hasil QA manual tidak hilang tanpa persetujuan.

## 8. Kesimpulan dan rekomendasi

Harness berjalan end-to-end di mesin lokal: database disposable terbentuk, 8 migration diterapkan, fixture sintetis masuk, aplikasi berjalan terhadap database tersebut, dan 32 screenshot (1440/390) dihasilkan dengan semua route HTTP 200. Guard database diuji 10 kasus termasuk seluruh jalur penolakan.

Rekomendasi berikutnya:

1. Jalankan `npm run visual:qa:db:up` pada mesin dengan Docker aktif untuk memvalidasi jalur compose sebelum dipakai tim lain.
2. Pakai harness ini untuk verifikasi visual branch `task/pr51-agenda-archive` (F-04/F-05: navigasi bulan dan arsip agenda) dan branch perbaikan PR #56.
3. Bila CI ingin memakai seed yang sama, ganti heredoc di `.github/workflows/ci.yml` dengan `scripts/visual-qa/seed.mjs` agar fixture lokal dan CI tidak menyimpang (perubahan CI terpisah, di luar scope task ini).
