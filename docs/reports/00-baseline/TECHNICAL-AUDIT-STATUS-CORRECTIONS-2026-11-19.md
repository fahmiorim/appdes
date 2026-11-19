# Penerapan koreksi status `docs/TECHNICAL_AUDIT.md`

- **Tanggal:** 2026-11-19
- **Branch:** `task/technical-audit-status-corrections-2026-11-19`
- **Base commit:** `dae3130` (`task/technical-audit-status-check-2026-11-19`, laporan pemeriksaan status)
- **Task:** menerapkan koreksi yang diusulkan pada laporan pemeriksaan status ke `docs/TECHNICAL_AUDIT.md`.

## 1. Analisis

Laporan pemeriksaan menemukan empat klaim yang bertentangan dengan kode, satu status yang hanya sebagian kedaluwarsa, dan beberapa angka inventaris yang tidak konsisten di dalam dokumen. `TECHNICAL_AUDIT.md` adalah baseline audit, sehingga yang diubah hanya **status dan angka**, bukan temuan atau rekomendasi aslinya. Setiap temuan yang dikoreksi tetap menyimpan status snapshot lamanya agar jejak audit tidak hilang.

## 2. File yang diubah

| File | Alasan |
| --- | --- |
| `docs/TECHNICAL_AUDIT.md` | koreksi status dan angka yang bertentangan/tidak konsisten |
| `docs/reports/00-baseline/TECHNICAL-AUDIT-STATUS-CORRECTIONS-2026-11-19.md` | laporan task ini |

Tidak ada source code, schema, migration, atau test yang diubah.

## 3. Koreksi yang diterapkan

| Lokasi | Sebelum | Sesudah | Dasar |
| --- | --- | --- | --- |
| Header | — | Catatan koreksi status 19 November 2026 + tautan laporan pemeriksaan | jejak perubahan |
| §2 inventaris | "Sekitar 717 file repository" | "1.307 file ter-track di Git" | `git ls-files \| wc -l` |
| §2 inventaris | "sekitar 51 direktori fitur aktual" | "52 direktori fitur aktual" | `ls -d src/features/*/` |
| §2 inventaris | "Sekitar 191 file test" | "284 file test, termasuk 50 integration test" | `find` |
| §2 inventaris | "78 file schema" | "79 file schema" | `ls src/db/schema/*.ts` |
| §3 autentikasi | "cookie cache 5 menit" | "cookie cache dimatikan sehingga sesi diverifikasi ke database setiap permintaan" | `src/lib/auth.ts:119-128` |
| §4 #7 | upsert batch transaksional | ditambah kunci `(desa, tahun)` + agregasi ulang induk | `keuangan-repository.ts` |
| Tabel AUD-013 | hanya `db.transaction`, rujukan `:119` | kunci + transaksi, rujukan `:109`, impor memakai jalur sama | `keuangan-repository.ts:109-201` |
| §AUD-013 | "Status: risiko race condition" tanpa catatan | status snapshot dipertahankan + "Status kode: tertutup" dengan bukti | AUD-034 + branch impor APBDes |
| Tabel AUD-014 | rujukan `media-storage.ts:187` | `:189` | kode saat ini |
| §AUD-015 | hanya "belum terbukti" | status snapshot + "Status kode: sebagian", prosedur terdokumentasi, drill belum | `docs/deployment/BACKUP-RESTORE.md` §5, §6.3 |
| §AUD-028 | "Rekomendasi: tambahkan regression test XSS" | regression test tercatat ada (9 test) dan rekomendasi diperbarui | `src/lib/sanitize.test.ts` |
| Tabel AUD-030 | "Sebagian — test kini mengassert filter `villageId`" | "Terbuka — test hanya memeriksa `where` dipanggil; predikat belum diassert" | `kesehatan-repository.test.ts:66-71` |
| Tabel + §AUD-031 | 11 berkas isolasi | 12 berkas (11 per modul + `isolasi-village`) dan modul yang belum tercakup | `find src -name '*isolation*.integration.test.ts'` |
| Daftar setelah tabel | AUD-015, AUD-022, AUD-028 "tetap terbuka" | AUD-022 terbuka; AUD-015 prosedur tanpa drill; AUD-028 tertutup | hasil pemeriksaan |
| §6 #6 | "P2: perbaiki race condition …" | "P2 (selesai di kode) … sisa validasi runtime" | AUD-013/014/016 |

Status temuan lain (AUD-001, 002, 003–008, 011, 012, 016, 017, 019–021, 025, 029) tidak diubah karena masih sesuai kode.

Catatan tentang AUD-013: status "tertutup" mencakup jalur impor APBDes yang perbaikannya ada di branch `task/AUD-013-apbdes-import-lock` (`86be91f`), belum di `main`. Bila branch itu tidak di-merge, klaim pada tabel perlu disesuaikan lagi.

## 4. Validasi yang dijalankan

| Perintah | Hasil |
| --- | --- |
| `npx prettier --check docs/TECHNICAL_AUDIT.md` | **PASS** |
| `TEST_DATABASE_URL=mysql://root@127.0.0.1:3306/desa_test_suite_20261119 TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration:ci` | **PASS** — 53 file, 291 test, 0 gagal, 0 skip, 148,59 detik, exit 0 |
| `git diff --check` | **PASS** |

Database uji `desa_test_suite_20261119` dibuat khusus untuk run ini oleh `siapkanDatabaseUji` (nama diawali `desa_test_`, guard menolak nama lain). Bukan database pengembangan atau produksi. Log lengkap: `Tests 291 passed (291)`, `Test Files 53 passed (53)`, `exit=0`.

Suite ini dijalankan atas permintaan terpisah saat koreksi dokumen berlangsung; hasilnya sekaligus menjadi bukti bahwa perubahan dokumen tidak menyentuh kode dan seluruh integration test tetap hijau di branch ini (yang juga memuat laporan pemeriksaan status).

## 5. Risiko dan keterbatasan

- Koreksi bersifat dokumentasi; tidak ada perilaku aplikasi yang berubah, sehingga tidak ada risiko runtime baru.
- Klaim AUD-013 tentang impor bergantung pada branch `task/AUD-013-apbdes-import-lock` yang belum di-merge. Bila ditolak, baris tabel AUD-013 dan §AUD-013 harus dikembalikan sebagian.
- Angka inventaris akan berubah lagi saat ada PR baru; angka di dokumen diberi tanggal agar jelas snapshot-nya.
- Audit tetap statis: klaim runtime (mis. sanitasi di semua jalur render, drill backup media) belum diverifikasi.

## 6. Status

Siap review. Belum di-merge, belum di-deploy. Branch ini dibangun di atas `dae3130`; urutan merge yang disarankan: laporan pemeriksaan (`task/technical-audit-status-check-2026-11-19`) lalu koreksi ini, atau koreksi ini setelah branch dasarnya masuk `main`.
