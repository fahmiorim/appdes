# Regenerasi Inventaris Modul — 18 November 2026

- **Task:** meregenerasi `docs/architecture/MODULE-INVENTORY.md` dari kode `main`.
- **Tanggal:** 18 November 2026.
- **Branch:** `task/design-mockup-assets`.
- **Base commit:** `f5a6f42`; sumber data `origin/main` = `f5a6f42`.
- **Jenis perubahan:** dokumentasi saja. Tidak ada perubahan source, schema, migration, konfigurasi, atau data.
- **Commit hasil:** `c2fd248` (`docs(audit): koreksi klaim usang dan berlebih pada dokumen status`) setelah rebase; commit generator menyusul di branch yang sama.
- **Status:** selesai — siap review.

## 1. Kondisi awal

Inventaris sebelumnya adalah snapshot `main` `f19267d` (17 November 2026) dan mencatat 29 halaman, 80 route handler, 2 Server Action, serta hanya satu entri `/super-admin`. Audit klaim `DOKUMEN-KLAIM-AUDIT-2026-11-18.md` menandainya sebagai dokumen usang yang masih dirujuk `SID_FEATURE_MAP.md` dan `MASTER_ROADMAP.md`.

## 2. Metode

Dokumen digenerate ulang dari tree `origin/main` (`f5a6f42`), bukan dari isi dokumen lama:

- `git ls-tree -r --name-only origin/main` untuk daftar berkas.
- `page.tsx`, `route.ts`, dan `layout.tsx` di `src/app` untuk halaman, route handler, dan layout.
- Route group Next.js (`(admin)`, `(auth)`, `(public)`, `(warga)`) dihapus dari path; dynamic segment ditulis apa adanya.
- `git grep -l "use server" origin/main -- src` untuk Server Action.
- `src/features/*/application/*.ts` non-test dan `src/features/*/infrastructure/**/*-repository.ts` non-test untuk tabel modul dan daftar file.

Sejak task ini generator tersedia permanen sebagai `npm run docs:inventory` (`scripts/generate-module-inventory.mjs`). Perintah itu default membaca `origin/main` dan menerima ref lain sebagai argumen, misalnya `npm run docs:inventory -- HEAD`.

## 3. Hasil

| Ukuran | Snapshot lama (`f19267d`) | Regenerasi (`f5a6f42`) |
|---|---:|---:|
| Halaman `page.tsx` | 29 | **36** |
| Route handler | 80 | **81** |
| Layout | 2 | **2** |
| Server Action (`"use server"`) | 2 | **4** |
| Direktori fitur | 52 | **52** |
| Berkas `*-repository.ts` non-test | 68 | **71** |
| Berkas application non-test | 83 | **89** |

Rincian yang berubah:

- Sepuluh halaman baru tercatat, termasuk landing page platform `/`, `/masuk`, `/super-admin-login`, dan tujuh halaman `/super-admin/*`.
- Route handler `/super-admin/audit/ekspor` kini ada di tabel.
- Server Action bertambah menjadi empat: tiga `actions.ts` di `src/app` dan `src/features/keuangan/application/apbdes-import-use-cases.ts`.
- Tabel route memuat 117 baris (36 halaman + 81 route handler), 22 di antaranya route API.
- Halaman admin tetap 8 (`/beranda` + 7 konsol), dan dokumen menyatakan route handler admin umumnya bukan UI.

## 4. File yang diperiksa

- `docs/architecture/MODULE-INVENTORY.md` (isi lama sebagai pembanding).
- Tree `origin/main`: `src/app/**`, `src/features/**`, khususnya `src/app/(admin)/super-admin/**`, `src/app/(auth)/**`, `src/app/platform-landing.tsx`, dan `src/features/keuangan/application/apbdes-import-use-cases.ts`.

## 5. File yang diubah

| File | Alasan |
|---|---|
| `docs/architecture/MODULE-INVENTORY.md` | Diganti total dengan hasil generate dari `f5a6f42`; §1–§5 diperbarui, termasuk blok metode dan batasan |
| `scripts/generate-module-inventory.mjs` | Dibuat permanen: ref/commit dinamis, format tabel area, empat Server Action, dan header sumber |
| `package.json` | Menambah `docs:inventory` agar regenerasi menjadi perintah repository |
| `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md` | Menyesuaikan risiko/keterbatasan agar tidak lagi menyatakan regenerasi belum dilakukan |
| `docs/reports/00-baseline/MODULE-INVENTORY-REGENERASI-2026-11-18.md` | Laporan ini |

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `npm run docs:inventory` | **PASS** — `ref=origin/main commit=f5a6f42 pages=36 routes=81 layouts=2 features=52 app=89 repo=71 actions=4` |
| `md5sum` dokumen sebelum/sesudah dua kali `npm run docs:inventory` | **Sama** — generator idempoten |
| `grep -c '^| \`/' docs/architecture/MODULE-INVENTORY.md` | **117** — sama dengan 36 halaman + 81 route handler |
| `grep -c '| Halaman |'` dan `grep -c '| Route handler |'` | **36** dan **81** |
| `sort \| uniq -d` pada baris route | Kosong — tidak ada path duplikat |
| `npx prettier --check docs/architecture/MODULE-INVENTORY.md` | **PASS** |
| `git diff --check` | **PASS** — tidak ada trailing whitespace |
| `git push origin task/design-mockup-assets` | **PASS** — `0e01ad1..eea0fd8` |
| `git ls-tree -r --name-only HEAD -- src/app \| grep -cE '/(page\.tsx|route\.ts)$'` | **117** — himpunan route `HEAD` dan `origin/main` identik, tidak ada berkas main yang hilang dari branch |
| Build/typecheck/unit/integration test | **SKIPPED** — hanya dokumentasi |

## 7. Risiko dan batasan

- Inventaris diambil dari `origin/main` (`f5a6f42`) sementara branch ini berada di `0e01ad1`. Himpunan halaman dan route handler identik pada kedua commit (117 berkas), jadi isi tabel valid untuk keduanya; perbedaan lain hanya di isi komponen, bukan daftar route.
- Angka "berkas application" dan "repository" mengikuti definisi di dokumen (nama berkas), bukan jumlah use case fungsional. Beberapa berkas application adalah helper atau notifikasi.
- Dokumen hanya mendaftar keberadaan; ia tidak menilai kualitas, izin, atau cakupan test.
- `npm run docs:inventory` membaca `origin/main` lokal. Jalankan `git fetch` lebih dulu bila `main` di remote sudah bergerak, atau lewatkan ref eksplisit seperti `npm run docs:inventory -- <ref>`.

## 8. Kesimpulan

`MODULE-INVENTORY.md` kini mencerminkan kode `main` per `f5a6f42`: 36 halaman, 81 route handler, 4 Server Action, 52 direktori fitur, dan daftar file per modul yang diregenerasi. Klaim lama "29 halaman/80 route handler/2 Server Action" dan ketiadaan halaman Super Admin sudah tidak ada.

Branch `task/design-mockup-assets` juga membawa commit aset `public/images/logo.png` dan `public/images/logo-fd.png` atas permintaan pengguna. Berkas itu tidak diperiksa dalam audit dokumentasi ini. Regenerasi berikutnya cukup `npm run docs:inventory`. Perubahan menunggu review; belum ada merge atau deploy.
