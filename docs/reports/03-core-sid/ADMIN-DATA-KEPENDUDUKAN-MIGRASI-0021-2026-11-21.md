# Perbaikan migrasi 0021 — CI PR #206

- **Task:** memperbaiki kegagalan migrasi database pada CI PR #206 (`integration` dan `Visual QA`).
- **Tanggal:** 2026-11-21.
- **Branch:** `feat/admin-data-kependudukan`.
- **Base commit:** `992e882` (head PR #206 saat CI merah).
- **PR:** https://github.com/fahmiorim/appdes/pull/206

## Kondisi awal

Dua check PR #206 gagal pada langkah migrasi, bukan pada kode aplikasi:

| Check | Bukti |
|---|---|
| `integration` (run 44901955925) | Log memuat `ER_EMPTY_QUERY` — "Query was empty" — saat `migrate()` di `src/testing/migrasi-uji.ts` memproses migrasi. |
| `Visual QA` (run 44901955924) | Step **Migrate visual database** (`npm run db:migrate`) berhenti setelah `drizzle-kit` menampilkan spinner `applying migrations...` dan keluar dengan exit code 1. Driver tidak mencetak pesan error ke log. |

## Analisis

`src/db/migrations/0021_data_kependudukan_menu.sql` memuat dua penanda
`--> statement-breakpoint` berurutan tanpa statement di antaranya:

```sql
--> statement-breakpoint

--> statement-breakpoint

INSERT INTO `role_permissions` ...
```

Splitter `readMigrationFiles` milik Drizzle memecah berkas pada penanda tersebut
sehingga potongan di antara keduanya menjadi string kosong. Saat migrasi
dijalankan, potongan kosong itu dieksekusi sebagai query sehingga MySQL
mengembalikan `ER_EMPTY_QUERY` dan seluruh proses migrasi berhenti. Karena
langkah migrasi adalah prasyarat pada kedua job, kegagalan ini menjelaskan
sekaligus hasil merah `integration` dan `Visual QA`.

Perbaikan: penanda ganda dihapus sehingga setiap penanda diikuti tepat satu
statement.

## File diperiksa

- `src/db/migrations/0021_data_kependudukan_menu.sql`
- `src/db/migrations/meta/_journal.json`
- `src/testing/migrasi-uji.ts`, `drizzle.config.ts`, `.github/workflows/visual-qa.yml`

## File diubah

| File | Alasan |
|---|---|
| `src/db/migrations/0021_data_kependudukan_menu.sql` | Menghapus satu penanda `statement-breakpoint` yang tidak diikuti statement |

Tidak ada perubahan kode aplikasi, schema, atau konfigurasi deployment.

## Bukti root cause

Diuji dengan splitter yang sama yang dipakai Drizzle saat migrasi
(`readMigrationFiles` dari `drizzle-orm/migrator`), tanpa menyentuh database:

| Versi berkas | Hasil |
|---|---|
| `992e882` (sebelum fix) | 28 migrasi, **1 statement kosong** pada migrasi `0021_data_kependudukan_menu` (index 4) |
| Working tree (sesudah fix) | 28 migrasi, **0 statement kosong** |

## Validasi

| Perintah | Hasil |
|---|---|
| `node -e "readMigrationFiles(...)"` atas isi `992e882` | **FAIL (diharapkan)** — 1 statement kosong, sesuai `ER_EMPTY_QUERY` di CI |
| `node -e "readMigrationFiles(...)"` atas working tree | **PASS** — 0 statement kosong |
| `npx prettier --check src/db/migrations/0021_data_kependudukan_menu.sql` | **PASS** |
| `npm run typecheck` / `npm run test:unit` / `npm run build` | **SKIPPED** — perubahan hanya berkas SQL, tidak menyentuh TypeScript |
| `drizzle-kit migrate` lokal | **SKIPPED** — Docker daemon tidak berjalan dan database uji disposable belum diverifikasi; bukti eksekusi diambil dari CI |

## Risiko tersisa

- Penyebab kegagalan `Visual QA` tidak tercetak di log CI; kesimpulannya
  didasarkan pada langkah yang gagal (migrasi) dan bukti statement kosong di
  jalur kode yang sama. Hasil CI berikutnya yang menentukan.
- `meta/_journal.json` masih memiliki `idx` ganda `21` (`0021_potensi_desa` dan
  `0021_data_kependudukan_menu`). Urutan migrasi mengikuti `when` sehingga tidak
  menghalangi migrasi, tetapi perlu diperhatikan saat menambah migrasi baru.
- Perbaikan yang sama juga diperlukan di branch #207; sudah diterapkan di sana
  melalui merge parent dan commit `feat/admin-crud-completion`.

## Kesimpulan

Akar kegagalan migrasi sudah diidentifikasi dan diperbaiki dengan satu perubahan
satu baris. Branch siap menjalankan ulang CI; merge menunggu seluruh check PASS.
