# Perbaikan migration Galeri dan Potensi yang terlewat

## Identitas task

- **Task:** Memperbaiki error `listAlbumGaleri` akibat migration `0020` dan `0021` tidak dijalankan.
- **Tanggal:** 20 November 2026.
- **Branch:** `fix/migrasi-journal-galeri-potensi`.
- **Base commit:** `fa8a95d` (`origin/main`, merge PR #186).
- **Commit kode dan test:** `752e22a`.

## Kondisi awal

Halaman Galeri gagal dengan query:

```text
select `id`, `nama`, `slug`, `keterangan`, `kategori`, `published_at`, `sampul`, `urut`
from `galeri_album`
where (`galeri_album`.`village_id` = ? and `galeri_album`.`aktif` = ?)
order by `galeri_album`.`urut` asc, `galeri_album`.`id` desc
```

Query memilih `kategori` dan `published_at`, dua kolom yang ditambahkan oleh migration `0020_gallery_categories_videos`. Migration `0021_potensi_desa` juga belum tentu diterapkan pada database yang sama.

## Analisis

Migrator MySQL Drizzle hanya menjalankan migration yang `folderMillis` (`when` pada journal) lebih besar daripada migration terakhir yang tercatat di `__drizzle_migrations`.

Journal pada `origin/main` memiliki nilai:

| Entri | `when` |
|---|---:|
| `0018_survey_indicator_tenant_fk` | `1795451763264` |
| `0019_komentar_email` | `1795452000000` |
| `0020_gallery_categories_videos` | `1795210000000` |
| `0021_potensi_desa` | `1795250000000` |

Karena `0020` dan `0021` lebih kecil dari `0019`, database yang sudah menerapkan `0019` akan melewati keduanya. `db:migrate` tetap melaporkan sukses. Urutan yang salah muncul dari merge `bdc4e33` yang menimpa nilai journal branch Potensi. Repo sudah pernah mengalami masalah serupa dan memperbaikinya lewat commit `85de3da`.

## Pendekatan

Membuat migration baru `0022_perbaikan_migrasi_galeri_potensi.sql` yang idempotent, bukan mengedit migration `0020`/`0021` yang sudah ada. Migration ini:

1. Menambahkan kolom `galeri_album.kategori` dan `galeri_album.published_at` hanya jika belum ada.
2. Membuat indeks `galeri_album_village_category_published_idx` jika belum ada.
3. Membuat tabel `galeri_video` dan indeksnya jika belum ada.
4. Membuat tabel `potensi_desa`, `potensi_indikator`, unique key, dan indeksnya jika belum ada.

Dengan demikian:

- Database yang melewatkan `0020`/`0021` akan dilengkapi.
- Database yang sudah menerapkan `0020`/`0021` tidak berubah karena semua DDL dijaga pengecekan `information_schema`.
- Instalasi bersih tetap menjalankan `0020`/`0021`, lalu `0022` menjadi no-op.

Snapshot `0022_snapshot.json` menyalin snapshot `0021` karena migration ini tidak mengubah bentuk skema. Journal mendapat entri `0022` dengan `when` terbesar agar dijalankan.

## File yang diperiksa

- `src/features/publik/infrastructure/content-repository.ts`
- `src/db/schema/content.ts`
- `src/db/schema/potensi.ts`
- `src/db/migrations/0020_gallery_categories_videos.sql`
- `src/db/migrations/0021_potensi_desa.sql`
- `src/db/migrations/meta/_journal.json`
- `node_modules/drizzle-orm/mysql2/migrator.cjs` dan `dialect.cjs` (perilaku pemilihan migration)
- Commit `85de3da`, `bdc4e33`, `5ac1b5c`, dan `b702301`

## File yang diubah

| File | Alasan |
|---|---|
| `src/db/migrations/0022_perbaikan_migrasi_galeri_potensi.sql` | DDL idempotent untuk melengkapi objek yang terlewat. |
| `src/db/migrations/meta/0022_snapshot.json` | Snapshot untuk entri journal baru; bentuk skema sama dengan `0021`. |
| `src/db/migrations/meta/_journal.json` | Mendaftarkan migration `0022` dengan `when` terbesar. |
| `src/db/migrasi-paritas.test.ts` | Regression test: entri journal terakhir wajib memakai timestamp terbesar. |

Tidak ada perubahan pada schema Drizzle, kode aplikasi, migration lama, atau konfigurasi deployment.

## Validasi

Perintah yang dijalankan dari root repository:

```bash
npx prettier --write src/db/migrasi-paritas.test.ts src/db/migrations/meta/_journal.json src/db/migrations/meta/0022_snapshot.json
npx prettier --check src/db/migrasi-paritas.test.ts src/db/migrations/meta/_journal.json src/db/migrations/meta/0022_snapshot.json
npx eslint src/db/migrasi-paritas.test.ts
npx vitest run src/db/migrasi-paritas.test.ts
```

| Pemeriksaan | Status | Hasil |
|---|---|---|
| Prettier | **PASS** | Semua file memakai format Prettier. |
| ESLint | **PASS** | Tidak ada error atau warning pada file test. |
| Vitest paritas migrasi | **PASS** | 9 test lulus, termasuk regression test urutan journal. |
| `db:migrate` pada database disposable | **SKIPPED** | Docker daemon tidak tersedia dan tidak ada database test disposable yang terverifikasi pada sesi ini. Database pengembangan/production tidak disentuh. |

## Risiko dan keterbatasan

- Migration `0022` belum dijalankan pada database nyata dalam sesi ini. Jalankan `npm run db:migrate` pada database target setelah perubahan masuk ke branch yang dipakai, lalu buka ulang halaman Galeri dan Potensi.
- Database yang sudah menerapkan `0020`/`0021` aman karena seluruh DDL `0022` dijaga pengecekan. Database yang melewatkan keduanya akan dibuatkan objek yang hilang.
- Nilai `when` `0020`/`0021` sengaja tidak diubah agar migration yang sudah tercatat tidak dijalankan ulang. `0022` menjadi jalur penyembuh untuk semua kondisi saat ini.
- Migration baru berikutnya wajib memakai `when` lebih besar dari `0022`. Regression test akan gagal jika entri journal terakhir bukan timestamp terbesar.
- `0022` memakai `PREPARE`/`EXECUTE` untuk DDL kondisional MySQL 8. Sintaks belum diuji terhadap server MySQL nyata pada sesi ini.

## Rekomendasi berikutnya

1. Merge PR perbaikan setelah seluruh check CI hijau.
2. Tarik `main` pada environment yang mengalami error, jalankan `npm run db:migrate`, lalu verifikasi halaman Galeri dan Potensi.
3. Jika ada database yang sudah menerapkan `0020`/`0021`, jalankan migration yang sama; seharusnya hanya no-op.
