# AUD-021-01 — Hardening CSV Export Bantuan

- **Tanggal:** 13 November 2026
- **Task:** Menutup CSV formula injection dan CSV escaping yang tidak lengkap pada ekspor Bantuan.
- **Branch:** `task/AUD-021-01-bantuan-csv-injection`
- **Base:** `main` — `e565f18baf78291724fed79fb8e8f19b90cf1de4`
- **Commit terakhir saat laporan dibuat:** `91a4b24e80bc4b8854018eb28acc49d2ab5d30f5`

## Kondisi awal

Route `src/app/(admin)/bantuan/ekspor/route.ts` membangun CSV secara manual dengan membungkus nilai memakai tanda kutip. Tanda kutip di dalam nilai tidak di-escape dan nilai yang diawali karakter formula spreadsheet (`=`, `+`, `-`, `@`) tidak dinetralkan. Data peserta mencakup nama, identitas, dan nomor kartu.

Repository sudah memiliki helper bersama `src/lib/csv.ts`:
- `csvCell` melakukan escaping separator, tanda kutip, dan newline.
- `amanFormula` menetralkan nilai formula dan mempertahankan angka negatif yang valid.
- `toCsv` menyusun baris CSV.

## Perubahan

1. Menghapus builder CSV lokal pada route Bantuan.
2. Menggunakan `toCsv(rows, ",")` untuk header dan seluruh data peserta.
3. Mempertahankan urutan/label kolom, nama file, MIME type, dan mekanisme autentikasi serta permission yang ada.
4. Menambahkan regression test pada `src/lib/csv.test.ts` yang menguji serialisasi CSV delimiter koma dengan formula `HYPERLINK`, tanda kutip, koma, dan newline.

## File berubah

- `src/app/(admin)/bantuan/ekspor/route.ts` — memakai serializer aman bersama.
- `src/lib/csv.test.ts` — menambah coverage serialisasi end-to-end untuk payload formula dan karakter khusus.
- `docs/reports/01-security/AUD-021-01-bantuan-csv-injection.md` — laporan ini.

Tidak ada perubahan schema, migration, database, konfigurasi deployment, dependency, atau perilaku tenant/permission.

## Security dan tenant

- Route tetap menjalankan `penggunaRoute()`.
- Route tetap memeriksa permission `bantuan:read`.
- `getBantuanDetail(programId)` tetap menjadi sumber data dan memeriksa permission serta tenant dari sesi melalui application use case.
- Tidak ada tenant ID baru yang diterima dari input klien.
- Semua nilai sel CSV melewati `toCsv` dan `csvCell`, termasuk nama sasaran, identitas, nomor kartu, dan nama program.

## Validasi

| Pemeriksaan | Status | Bukti |
|---|---|---|
| Pemeriksaan source dan helper CSV | **PASS** | Helper `csvCell` / `toCsv` telah dibaca dan dipakai. |
| Regression test ditambahkan | **PASS** | Test menguji formula HYPERLINK, kutip, koma, newline dan delimiter koma. |
| Unit test dijalankan lokal | **SKIPPED** | Lingkungan kerja ini tidak memiliki checkout lokal repository untuk menjalankan npm. |
| Typecheck/lint/format lokal | **SKIPPED** | Tidak dijalankan; menunggu CI branch. |
| Integration test | **SKIPPED** | Tidak ada database test yang dijalankan. |
| Merge/deploy | **NOT DONE** | Menunggu review maintainer. |

## Risiko dan batasan

- Keberhasilan test otomatis harus dikonfirmasi melalui GitHub Actions setelah commit branch.
- Test menguji shared serializer, bukan menjalankan Next.js Route Handler end-to-end.
- Perubahan ini hanya menutup AUD-021-01. Temuan cache header dan rate limit tetap terbuka dan dikerjakan sebagai task terpisah.

## Kesimpulan

Implementasi AUD-021-01 sudah diterapkan pada branch khusus. Status siap untuk review setelah hasil CI diperiksa. Tidak ada merge ke `main` dan tidak ada deployment.
