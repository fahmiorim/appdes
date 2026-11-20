# Rebuild Website Publik dari Mockup — 20 November 2026

## Tujuan

Mencatat pekerjaan rangkaian halaman website publik yang dibangun dari 21 mockup, sekaligus perbaikan kualitas yang diperlukan agar setiap PR dapat melewati CI.

## Kondisi awal

- Layout publik bersama sudah tersedia melalui PR #171.
- Halaman lanjutan dikembangkan sebagai rantai PR bertumpuk.
- CI hanya berjalan otomatis untuk PR yang menargetkan `main`, sehingga PR dengan base branch induk tidak memperoleh check sampai di-retarget.
- Beberapa branch mengandung escape regex berlipat, JSX tidak lengkap, import/variabel tidak terpakai, dan file yang belum diformat.

## Cakupan halaman

1. Beranda
2. Profil Desa
3. Sejarah Desa
4. Visi & Misi
5. Pemerintahan Desa
6. Detail Perangkat Desa
7. Wilayah Desa
8. Daftar Berita
9. Detail Berita
10. Pengumuman
11. Agenda Kegiatan
12. Galeri
13. Detail Galeri
14. Potensi Desa
15. Statistik Desa
16. APBDes & Transparansi Anggaran
17. Informasi Keuangan Desa
18. Katalog Layanan
19. Layanan Surat
20. Kontak & Pengaduan
21. Informasi Desa

## Perbaikan yang dilakukan

- Menormalkan tipe item navigasi layout publik agar `href` tidak terbaca `string | undefined`.
- Memformat seluruh file halaman dan stylesheet yang dilaporkan Prettier.
- Memperbaiki JSX yang tidak tertutup pada halaman Profil.
- Memulihkan pengambilan statistik desa yang hilang saat update branch.
- Menghapus import, fetch, dan parameter yang tidak dipakai agar lint bersih.
- Menormalkan escape regex ganda pada halaman Sejarah, Visi & Misi, dan Beranda.
- Melengkapi ternary yang tidak selesai pada halaman Pemerintahan.
- Melebarkan tipe class CSS opsional pada helper foto perangkat.
- Renumber migration komentar dari `0018_komentar_email` menjadi `0019_komentar_email` karena `0018` sudah dipakai `0018_survey_indicator_tenant_fk` di `main`; journal dan snapshot `0019` ditambahkan tanpa mengubah migration yang sudah diterapkan.
- Merapikan format halaman dan stylesheet Statistik, termasuk operator, JSX, dan tata letak CSS.
- Menambahkan fallback `rings[index] ?? []` pada proyeksi area GIS agar area tanpa geometry tidak membuat halaman Statistik gagal.

## Tindak lanjut setelah laporan awal

- Statistik PR #187 di-retarget ke `main` dan dilengkapi perbaikan format serta fallback area GIS di atas.
- Error Galeri dilacak ke urutan timestamp journal yang membuat `0020`/`0021` dilewati. Perbaikan aditif `0022` dan bukti validasinya dicatat di [MIGRASI-GALERI-POTENSI-2026-11-20.md](./MIGRASI-GALERI-POTENSI-2026-11-20.md).
- `src/app/page.tsx` sudah memakai regex pembersih HTML dengan escape yang valid setelah sinkronisasi `main`; tidak ada perubahan tambahan pada file tersebut untuk Statistik.

## Dampak migration

- Migration `0019_komentar_email.sql` hanya menambahkan kolom `email` nullable pada tabel `komentar`.
- Tidak ada backfill dan tidak ada kolom wajib baru.
- Deployment harus menjalankan migration setelah `0018_survey_indicator_tenant_fk`.
- Rollback dapat dilakukan dengan menghapus kolom tersebut, tetapi hanya setelah memastikan tidak ada data yang bergantung padanya.

## Validasi

Pada branch yang diperbaiki dijalankan:

- `npm run format:check` — PASS.
- `npm run lint` — PASS dengan 2 warning lama pada `scripts/wilayah/generate-wilayah.mjs`.
- `npm run typecheck` — PASS.
- Build, unit test, integration test, dan Visual QA — dijalankan oleh CI GitHub untuk setiap PR yang sudah menargetkan `main`.

Pemeriksaan terakhir pada perubahan Statistik yang belum di-commit:

- `npx prettier --check` pada tiga file Statistik — PASS.
- `npx eslint` pada file TypeScript Statistik — PASS; stylesheet CSS diabaikan karena tidak ada konfigurasi ESLint untuk CSS.
- `npm run typecheck` — PASS.
- `npx vitest run src/db/migrasi-paritas.test.ts` pada branch perbaikan migration — PASS, 9 test.

## Risiko tersisa

- PR bertumpuk tetap perlu di-retarget dan di-update setelah branch induknya merge.
- Integration test MySQL dan Visual QA bergantung pada runner CI, bukan verifikasi lokal.
- Perubahan desain halaman publik belum menggantikan audit visual per halaman.
- Status hijau per PR harus dibaca dari check GitHub pada commit terakhir, bukan dari laporan ini.

## Rekomendasi

- Merge PR dalam urutan stack dan hindari merge PR anak sebelum branch induknya.
- Setelah seluruh stack masuk, jalankan audit visual gabungan dan perbarui peta fitur bila status halaman publik berubah.
