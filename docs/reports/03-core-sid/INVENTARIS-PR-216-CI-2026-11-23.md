# Perbaikan CI PR #216 dan Pemeriksaan CI PR #219 — 23 November 2026

- **Task:** memperbaiki kegagalan CI PR #216 (Inventaris & Aset Desa) dan menjalankan CI untuk PR #219 (Pengaturan Desa & Manajemen Pengguna).
- **Tanggal:** 2026-11-23.
- **Branch kerja:** `task/PR-216-format-fix`, didorong ke branch PR `feature/inventaris-aset-mockup-v2`.
- **Base commit:** `ffb8e9782d0e255063f0d0254e847a558b39efd8` (head PR #216 sebelum perbaikan).
- **Commit hasil:** `5620f01dd5563e777d4f3da60987a0b22e1a8178`.
- **Jenis task:** perbaikan kualitas kode (format, lint, test helper) pada modul inventaris; pemeriksaan CI PR lain.

## Kondisi awal

Run CI `45025961251` pada PR #216 gagal dan PR berstatus `BLOCKED`:

| Job | Hasil | Langkah gagal |
|---|---|---|
| Deteksi perubahan | PASS | - |
| Build produksi | PASS | - |
| Jalankan integration test (MySQL 8) | PASS | - |
| Visual QA login | PASS | - |
| Unit test dan quality check | **FAIL** | Format check |
| Ringkasan CI | **FAIL** | Tegakkan status keseluruhan |

Empat file dilaporkan tidak sesuai Prettier:

- `src/app/(admin)/inventaris/[id]/page.tsx`
- `src/db/migrasi-paritas.test.ts`
- `src/features/inventaris/application/inventaris-use-cases.ts`
- `src/features/inventaris/domain/laporan-inventaris.test.ts`

## Analisis

1. **Format check.** Kegagalan tereproduksi lokal dengan `npm run format:check`, daftar file identik dengan log CI. Penyebabnya hanya pembungkusan baris (print width), bukan perubahan logika.
2. **Lint belum pernah tercapai.** Karena job berhenti di langkah Format check, langkah Lint dan Unit test tidak pernah berjalan. Setelah diformat, `npm run lint` mengungkap dua error di `src/db/migrasi-paritas.test.ts`: `POLA_ALTER_TABLE` dan `POLA_ADD_COLUMN` dideklarasikan tetapi tidak dipakai (logika `ALTER TABLE ... ADD` memakai regex inline).
3. **Unit test rusak.** `npx vitest run src/db/migrasi-paritas.test.ts` gagal pada 1 dari 11 test (`setiap kolom pada snapshot dibuat oleh SQL migrasi`) dengan 347 entri hilang. Kegagalan ini sudah ada pada head `ffb8e978` dan tidak disebabkan oleh pemformatan.
   - Akar masalah: `POLA_CREATE_TABLE` diubah dari regex literal menjadi `new RegExp` dengan escape berlebih, sehingga pola aktual menuntut backslash literal sebelum `(` dan tidak pernah cocok dengan DDL mana pun.
   - Pola juga perlu menerima `CREATE TABLE ... ) ENGINE=InnoDB;` yang dipakai tabel baru seperti `inventaris_pemeliharaan`.

## File yang diubah

| File | Alasan |
|---|---|
| `src/app/(admin)/inventaris/[id]/page.tsx` | Pembungkusan baris sesuai Prettier. |
| `src/features/inventaris/application/inventaris-use-cases.ts` | Pembungkusan baris sesuai Prettier. |
| `src/features/inventaris/domain/laporan-inventaris.test.ts` | Pembungkusan baris sesuai Prettier. |
| `src/db/migrasi-paritas.test.ts` | Pemformatan, penghapusan dua konstanta tak terpakai, dan perbaikan `POLA_CREATE_TABLE` menjadi regex literal yang menerima akhiran `ENGINE`/`CHARSET`. |

Tidak ada perubahan logika aplikasi, schema, migration, otorisasi, atau query tenant pada commit ini.

## Security dan tenant

- Commit hanya menyentuh komponen presentasi, use case yang sudah ada (tanpa perubahan pernyataan), dan test helper paritas migrasi.
- Tidak ada perubahan pada pemeriksaan `requirePermission`, `resolveVillageId`, filter `villageId`, maupun foreign key tenant.
- Migration pada branch tidak diubah; perbaikan hanya pada pembaca DDL di test paritas.

## Validasi lokal

| Perintah | Hasil |
|---|---|
| `npm run format:check` | **PASS** — seluruh file sesuai Prettier. |
| `npm run lint` | **PASS** — 0 error, 6 warning lama (`@next/next/no-img-element`). |
| `npm run typecheck` | **PASS** — `next typegen && tsc --noEmit` tanpa error. |
| `npx vitest run src/db/migrasi-paritas.test.ts` | **PASS** — 11/11 test. |
| `npm test` | **PASS** — 247 file, 2.095 test. |
| Integration test MySQL lokal | **SKIPPED** — tidak dijalankan di workstation; diverifikasi oleh job CI pada database disposable. |

## Validasi CI remote

| Run | Head | Hasil |
|---|---|---|
| [CI `45105620030`](https://github.com/fahmiorim/appdes/actions/runs/45105620030) | `5620f01d` | **PASS** — Deteksi perubahan, Unit/quality, Integration MySQL, Build, Ringkasan CI. |
| [Visual QA `45105620032`](https://github.com/fahmiorim/appdes/actions/runs/45105620032) | `5620f01d` | **PASS**. |

Dengan demikian seluruh required check PR #216 hijau pada head `5620f01d`.

## CI PR #219

`ci.yml` dan `visual-qa.yml` hanya terpicu untuk `pull_request` dengan base `main`, sedangkan base PR #219 adalah `feature/inventaris-aset-mockup-v2`. Karena itu PR #219 tidak pernah memiliki check.

Agar checks benar-benar berjalan pada commit head-nya, dibuat PR draft sementara [#221](https://github.com/fahmiorim/appdes/pull/221) dari branch head yang sama (`work/pengaturan-desa`, head `f0861d282ee9da83ea6a352b66c4fadaf2162d92`) ke `main`. PR tersebut **sudah ditutup** tanpa merge; PR #219 sendiri tidak diubah (base, head, dan statusnya tetap). Commit yang diuji identik dengan head #219.

Hasil pada run CI `45105690925` dan Visual QA `45105691007`: **FAIL** di seluruh job kecuali Deteksi perubahan, dengan penyebab yang dapat ditindaklanjuti:

| Temuan | Bukti |
|---|---|
| Template literal tidak ditutup di `src/app/public-site-layout.tsx` baris 100 (hanya satu backtick, penutup hilang sebelum `}</style>`). | Prettier: `SyntaxError: '}' expected. (104:64)`; Turbopack: `Parsing ecmascript source code failed`. |
| `src/app/(admin)/pengaturan/pengguna/aktivitas/aktivitas.module.css` memakai selector global di dalam CSS Module: `table`, `th`, `td`, `footer`, `footer div`, `footer a`. | Build: 7 error `Selector "..." is not pure. Pure selectors must contain at least one local class or id.` |
| `src/db/migrations/0056_pendaftaran_warga.sql` berakhir dengan `--> statement-breakpoint` tanpa pernyataan setelahnya. | Integration test: `ER_EMPTY_QUERY` / `Query was empty` pada `SELECT GET_LOCK(...)` saat migrasi, menggagalkan banyak suite. |
| Puluhan file belum sesuai Prettier di area `pengaturan-desa`, `pengaturan/pengguna`, `(auth)`, dan `api/pengaturan-desa`. | Langkah Format check berhenti dengan daftar `[warn]` panjang. |

Perbaikan #219 belum dilakukan dan berada di luar scope permintaan ini (hanya meminta CI dijalankan).

## Risiko dan keterbatasan

- Integration test MySQL tidak dijalankan lokal; bukti kelulusan berasal dari job CI pada database disposable.
- Branch `feature/inventaris-aset-mockup-v2` berisi migration `0043`–`0050`. Migration `0043`/`0044` sudah masuk `main` melalui PR #215; urutan merge tetap perlu diperhatikan agar tidak menabrak nomor.
- PR #216 masih memerlukan review maintainer sebelum merge; laporan ini tidak menyatakan PR siap merge.
- PR #219 memiliki setidaknya empat blocker berbeda; memperbaikinya memerlukan perubahan kode dan pemformatan menyeluruh pada branch tersebut.
- PR sementara #221 tetap tercatat sebagai PR tertutup di riwayat repository.

## Rekomendasi

1. Review dan merge PR #216 pada head `5620f01d` bila setuju.
2. Tangani #219 sebagai task terpisah: tutup template literal di `public-site-layout.tsx`, lingkupkan selector global di `aktivitas.module.css` ke kelas lokal, hapus `statement-breakpoint` di akhir migration `0056`, lalu jalankan Prettier pada seluruh branch.
3. Setelah #216 merge, pertimbangkan mengubah base #219 ke `main` agar checks berjalan otomatis tanpa PR sementara.
