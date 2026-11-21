# Merge Rangkaian Website Publik dan Verifikasi Galeri — 20 November 2026

## Task

Menuntaskan rangkaian PR website publik: menyelesaikan konflik branch Informasi Desa, memvalidasi, dan merge PR yang seluruh check-nya hijau; menutup PR duplikat; serta memastikan error query Galeri hilang di database lokal.

## Branch dan commit

| Item | Nilai |
|---|---|
| Base saat laporan dibuat | `main` @ `668357c` |
| Branch laporan | `task/public-mockup-merge-report` |
| Commit pekerjaan | lihat commit pada branch laporan ini |

## Kondisi awal

- PR #189, #192, #193 sudah menargetkan `main` tetapi belum punya check sama sekali.
- PR #194 masih menargetkan #193 dengan konflik merge yang sudah diselesaikan tetapi belum di-commit.
- PR #190, #191, dan #195 masih draft; #195 memakai branch head yang sama dengan #194.
- Terdapat error runtime query Galeri pada `src/features/publik/infrastructure/content-repository.ts`: kolom `kategori`/`published_at` tidak ada pada database lokal karena migration `0020`/`0021` dilewati akibat urutan timestamp journal.

## Analisis

1. **Check tidak muncul.** `.github/workflows/ci.yml` hanya memicu `pull_request` untuk base `main`. Retarget PR dari base branch induk ke `main` tidak memicu workflow, sehingga PR yang di-retarget tidak pernah memperoleh check. Solusinya adalah memicu event PR kembali (close lalu reopen) pada commit terakhir.
2. **#194 konflik.** Branch Informasi Desa dibuat dari `main` lama; menggabungkan branch induk Pengumuman & Agenda membawa perubahan `main` yang lebih baru. Konflik add/add pada halaman detail Perangkat diselesaikan dengan versi induk yang memuat biodata lebih lengkap (tempat/tanggal lahir). Format Prettier pada halaman Informasi Desa belum tersimpan di commit, sehingga disimpan bersama merge.
3. **#190/#191/#195 duplikat.** Commit head #190 (`d7623c3`) dan #191 (`fbfa303`) sudah menjadi ancestor `main` lewat merge #189, sehingga tidak ada sisa diff. #195 memakai head branch yang sama dengan #194 dan hanya menyisakan halaman Informasi Desa, sehingga digantikan #194.
4. **Galeri.** Migration aditif idempotent `0022` sudah menambahkan kolom, index, dan tabel yang terlewat; error yang dilaporkan berasal dari database yang belum menjalankan migration tersebut.

## File yang diperiksa

- `.github/workflows/ci.yml`, `.github/workflows/visual-qa.yml`
- `src/app/informasi/page.tsx`, `src/app/informasi/informasi.module.css`
- `src/app/perangkat/[id]/page.tsx`, `src/app/perangkat/[id]/detail-perangkat.module.css`
- `src/app/public-site-layout.tsx`
- `src/db/migrations/meta/_journal.json`, `src/db/migrations/0022_perbaikan_migrasi_galeri_potensi.sql`
- `src/features/publik/infrastructure/content-repository.ts` (jalur query Galeri)

## File yang diubah pada laporan ini

- `docs/reports/02-public-website/PUBLIC-MOCKUP-MERGE-2026-11-20.md` — laporan ini.
- `docs/reports/README.md` — menambahkan tautan laporan ini pada indeks.

Tidak ada perubahan source code pada commit laporan ini. Perubahan kode yang di-merge berasal dari PR #189–#194.

## Hasil pelaksanaan

| PR | Tindakan | Hasil |
|---|---|---|
| #189 | retarget ke `main`, trigger check ulang, merge | merged `2026-11-20T01:23:29Z` |
| #192 | trigger check ulang, merge | merged `2026-11-20T01:23:34Z` |
| #193 | trigger check ulang, merge | merged `2026-11-20T01:23:38Z` |
| #194 | selesaikan merge induk, simpan format Informasi Desa, retarget ke `main`, merge | merged `668357c`, `2026-11-20T01:26:06Z` |
| #190 | tutup karena isi sudah masuk `main` via #189 | closed |
| #191 | tutup karena isi sudah masuk `main` via #189 | closed |
| #195 | tutup karena duplikat #194 (head branch sama) | closed |

Merge #194 membawa halaman Informasi Desa beserta entri navigasi pada layout publik. Setelah seluruh merge, diff `main` terhadap branch Informasi Desa hanya menyisakan tiga file: `src/app/informasi/page.tsx`, `src/app/informasi/informasi.module.css`, dan `src/app/public-site-layout.tsx`.

## Validasi

### Lokal (sebelum merge #194)

| Perintah | Hasil |
|---|---|
| `npx prettier --check` pada 5 file #194 | PASS — "All matched files use Prettier code style!" |
| `npx eslint` pada `src/app/informasi/page.tsx`, `src/app/perangkat/[id]/page.tsx`, `src/app/public-site-layout.tsx` | PASS — tanpa output |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | PASS — types generated, tidak ada error |
| Pemeriksaan conflict marker pada `src/app/informasi` dan `src/app/perangkat` | PASS — tidak ditemukan |

### CI GitHub pada commit terakhir tiap PR

| PR | Run | Hasil |
|---|---|---|
| #189 | CI `44652515999`, Visual QA `44652515940` | PASS — Deteksi perubahan, Unit/quality, Integration MySQL, Build, Ringkasan, Visual QA login |
| #192 | CI `44652508657`, Visual QA `44652508716` | PASS — seluruh job, termasuk integration MySQL |
| #193 | CI `44652500549`, Visual QA `44652500440` | PASS — seluruh job; integration MySQL dilewati karena tidak relevan |
| #194 (`7d465b2`) | CI `44652492789`, Visual QA `44652492695` | PASS |

### Database lokal Galeri

Target diverifikasi sebagai `127.0.0.1:3306/desa_dev` (bukan production).

| Perintah | Hasil |
|---|---|
| `npm run db:migrate` | PASS — "migrations applied successfully!" |
| Hitung migrasi `__drizzle_migrations` | 23 migrasi, `created_at` terakhir `1795452000001` |
| Kolom `galeri_album.kategori`, `galeri_album.published_at` | tersedia |
| Tabel `galeri_video`, `potensi_desa`, `potensi_indikator` | tersedia |
| Index `galeri_album_village_category_published_idx` | tersedia |
| Query gagal sebelumnya (`select ... galeri_album where village_id = 1 and aktif = true order by urut, id`) | PASS — 0 baris tanpa error SQL |

## Error dan catatan operasional

- `gh pr checks` semula mengembalikan "no checks reported" untuk #189/#192/#193 karena workflow tidak berjalan pada event retarget. Setelah PR di-close dan di-reopen pada commit terakhir, workflow berjalan normal.
- `gh pr edit 194 --base main` semula gagal dengan pesan "A pull request already exists for base branch 'main' and head branch ..." karena #195 memakai head branch yang sama. Berhasil setelah #195 ditutup.
- Integration MySQL pada #193 dilewati oleh klasifikasi perubahan; integration tetap dijalankan dan lulus pada #189, #192, dan #194.

## Risiko tersisa

- Visual QA yang berjalan hanya mencakup halaman login (desktop/mobile), bukan seluruh 21 route publik, sehingga pemeriksaan visual per halaman tetap terbatas.
- Database lokal `desa_dev` belum memiliki data album Galeri, sehingga query hanya diverifikasi bebas error, bukan hasil tampilannya.
- Branch #189–#195 masih ada di remote; pembersihan branch diserahkan ke maintainer.
- Laporan ini tidak mengubah source code; perubahan kode telah melalui CI pada PR masing-masing.

## Kesimpulan

Seluruh PR website publik yang memiliki sisa perubahan sudah masuk `main`, dan tiga PR tanpa sisa diff ditutup dengan alasan yang tercatat. Error query Galeri tidak lagi muncul pada database lokal setelah migration `0022` dijalankan dan diverifikasi.

## Rekomendasi

1. Muat ulang halaman Galeri/Potensi di aplikasi lokal untuk memastikan tampilan memakai schema terbaru.
2. Tambahkan data contoh album di database lokal bila ingin memverifikasi tampilan daftar Galeri.
3. Hapus branch PR yang sudah merged setelah review maintainer.
4. Jalankan Visual QA untuk seluruh route publik bila ingin bukti visual gabungan.
