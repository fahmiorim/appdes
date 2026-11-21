# Penyelesaian CRUD Admin Desa — PR #207

- **Tanggal:** 21 November 2026
- **Branch:** `feat/admin-crud-completion`
- **Base:** `04fc243` (head PR #207 sebelum sinkronisasi) + merge `992e882` (head PR #206)
- **Commit hasil:** lihat `git log --oneline -1` pada branch ini

## Tujuan

Menyelesaikan rangkaian CRUD Admin Desa (#207) di atas perubahan lapisan website
dari PR #206, tanpa menurunkan validasi, tenant isolation, atau cakupan test.

## Kondisi awal

- PR #207 tertinggal dari parent `feat/admin-data-kependudukan`; merge parent
  menghasilkan lima konflik.
- Pemeriksaan lokal #207 gagal: typecheck error (tipe parent basi, CRUD website,
  keluarga), format check gagal pada 36 file, dan unit suite gagal pada 3 file.
- PR #206 merah pada integration test karena migrasi database uji gagal.

## Analisis

1. **Konflik lapisan website.** #206 memindahkan query ke
   `src/features/publik/infrastructure/website-admin-repository.ts` dan server
   action ke `src/features/publik/application/website-admin-actions.ts`. #207
   menambahkan form edit dan aksi ubah/hapus. Penyelesaian: UI dan fitur CRUD
   #207 dipertahankan, tetapi seluruh akses data dipindahkan ke repository
   #206 sehingga tidak ada route/action yang menyentuh `db` langsung.
2. **Konflik keluarga.** Versi #207 memuat aksi hapus KK dan lepas anggota;
   versi #206 hanya memuat tambah/ubah. Diambil versi #207 sebagai superset.
3. **Bug urutan deklarasi.** Setelah merge, `deleteKeluarga` memakai `villageId`
   sebelum dideklarasikan. Diperbaiki dengan mengambil sesi/izin dan `villageId`
   lebih dulu, lalu memeriksa keberadaan KK dan jumlah anggota.
4. **Aksi edit tanpa izin lapisan.** Delapan aksi (`ubahBerita`, `ubahAgenda`,
   `ubahAlbum`, `ubahFoto`, `ubahSlider`, `ubahKategori`, `hapusKategori`,
   `ubahWidget`) masih memakai `db` langsung tanpa import. Semua diganti dengan
   fungsi repository baru yang menyertakan `village_id` pada setiap filter.
5. **Migrasi `0021`.** Berkas berisi `--> statement-breakpoint` berurutan tanpa
   statement di antaranya, sehingga migrator menjalankan query kosong
   (`ER_EMPTY_QUERY`) dan integration test gagal. Pemisah ganda dihapus.

## File diperiksa

- `src/features/publik/infrastructure/website-admin-repository.ts`
- `src/features/publik/application/website-admin.ts`
- `src/features/publik/application/website-admin-actions.ts`
- `src/app/(admin)/website/{halaman,konten}/page.tsx`
- `src/app/(admin)/keluarga/{actions.ts,[id]/page.tsx}`
- `src/features/keluarga/application/use-cases.ts`
- `src/features/penduduk/application/use-cases.ts`
- `src/db/migrations/0021_data_kependudukan_menu.sql`

## File diubah

| File | Alasan |
|---|---|
| `src/features/publik/infrastructure/website-admin-repository.ts` | Menambah kolom baca yang dibutuhkan form edit (`isi`, `headline`, `slider`, `aktif`, `urut`, `keterangan`, `tautan`, `slug`) dan fungsi tulis `cariBeritaById`, `ubahBerita`, `cariAgendaById`, `ubahAgenda`, `ubahAlbum`, `ubahFoto`, `ubahSlider`, `cariWidgetById`, `ubahKategoriBerita`, `cariBeritaDenganKategori`, `hapusKategoriBerita` — semuanya tenant-scoped |
| `src/features/publik/application/website-admin-actions.ts` | Delapan aksi edit memakai repository, bukan `db` langsung |
| `src/app/(admin)/website/halaman/page.tsx` | Impor action dari lapisan application; membuang impor tak terpakai |
| `src/app/(admin)/website/konten/page.tsx` | Impor action dari lapisan application; `defaultValue` album nullable |
| `src/features/keluarga/application/use-cases.ts` | Urutan `requirePermission`/`villageId` pada `deleteKeluarga` |
| `src/app/(admin)/keluarga/actions.ts` | Normalisasi field teks nullable saat melepas anggota KK |
| `src/db/migrations/0021_data_kependudukan_menu.sql` | Menghapus pemisah statement kosong |

## Security / tenant

- Setiap fungsi repository baru memfilter `village_id` pada `WHERE`, termasuk
  pencarian ID dan pemeriksaan duplikasi slug.
- `ubahFotoGaleriWebsiteAction` memverifikasi foto **dan** album berada pada desa
  yang sama sebelum update; `ubahBerita`/`ubahAlbum`/`ubahKategori` menolak slug
  duplikat milik baris lain.
- `hapusKategoriBerita` menolak penghapusan bila masih dipakai berita desa itu.
- `deleteKeluarga` memeriksa izin dan keberadaan KK dalam tenant sebelum
  menghitung anggota.
- Tidak ada `villageId` dari input klien; semua berasal dari `resolveVillageId`.

## Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run format` lalu `npm run format:check` | **PASS** — "All matched files use Prettier code style!" |
| `npx eslint .` | **PASS** — 0 error, 2 warning lama (`scripts/wilayah/generate-wilayah.mjs`) |
| `npm run test:unit` | **PASS** — 245 file, 2.076 test |
| `npm run build` | **PASS** |
| Integration test | **SKIPPED** — tidak dijalankan lokal karena database uji disposable belum diverifikasi; dijalankan di CI |

## Risiko tersisa

- Integration dan Visual QA CI belum dijalankan pada commit ini.
- Merge #206 → #207 belum dapat di-merge ke `main` sebelum PR #206 hijau.
- Perbaikan migrasi `0021` juga harus masuk ke branch #206 agar CI parent hijau.

## Kesimpulan

Branch #207 sudah sinkron dengan parent dan seluruh pemeriksaan lokal lulus.
Langkah berikutnya: push branch, perbaiki migrasi di branch #206, lalu jalankan
CI kedua PR berurutan.
