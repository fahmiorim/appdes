# PR #51 — Perbaikan F-04 dan F-05 (arsip agenda per bulan & navigasi bulan)

- **Task:** F-04 (kalender agenda tidak dapat menampilkan bulan lampau) dan F-05 (navigasi bulan melewati batas rentang data) pada PR #51 halaman publik `/agenda`.
- **Tanggal:** 2026-11-15
- **Branch:** `task/pr51-agenda-archive`
- **Base commit:** `d773154` (head PR #51)
- **Commit pekerjaan:** `f8c1d9e`; laporan ini ditambahkan pada commit berikutnya di branch yang sama.

## 1. Kondisi awal dan analisis

Halaman `/agenda` memanggil `agendaMendatang(desa.id, 100)` — query yang hanya mengambil kegiatan **mendatang** — lalu menyaring bulan di sisi halaman (`item.mulai.startsWith(monthKey)`). Akibatnya:

- **F-04:** kalender menampilkan bulan sebelumnya/berikutnya yang selalu kosong walau datanya ada di database, karena data bulan lampau tidak pernah diambil. Pengguna juga tidak punya cara membuka arsip agenda.
- **F-05:** tombol bulan sebelumnya/berikutnya selalu aktif. Di batas rentang yang dilayani (`tahun ini − 1` sampai `tahun ini + 2`) tombol tetap dirender dan `year` di-*clamp* ke tahun berjalan, sehingga pengguna bisa "berpindah" ke bulan yang tahunnya salah.

Selain itu, label statistik ("Total agenda mendatang") tidak menggambarkan isi kalender yang sudah difilter per bulan.

## 2. File yang diperiksa

- `src/app/agenda/page.tsx`, `src/app/agenda/agenda.module.css`
- `src/features/agenda/application/agenda-use-cases.ts`
- `src/features/agenda/infrastructure/agenda-repository.ts`
- `src/features/agenda/domain/agenda.ts`, `src/features/agenda/domain/agenda.test.ts`
- `src/db/schema/agenda-kegiatan.ts` (kolom `village_id`, `mulai`, `tayang`, index `(village_id, mulai)`)
- `vitest.integration.config.mts`

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/agenda/domain/agenda.ts` | Menambah `BulanAgenda`, `geserBulanAgenda`, `rentangBulanAgenda`, `bulanAgendaDalamRentang` sebagai logika kalender murni yang dapat diuji. |
| `src/features/agenda/infrastructure/agenda-repository.ts` | Menambah `listAgendaPublikRentang(villageId, mulai, selesai)` dengan filter tenant + `tayang = true` + `gte/lt` pada `mulai`. |
| `src/features/agenda/application/agenda-use-cases.ts` | Menambah `agendaBulan(villageId, tahun, bulan)` dan memusatkan mapper `keAgendaPublik`. |
| `src/app/agenda/page.tsx` | Query per bulan yang dibuka, tombol panah menjadi nonaktif di batas rentang, label statistik menyesuaikan filter, sidebar memakai 3 agenda mendatang. |
| `src/app/agenda/agenda.module.css` | Gaya `.monthDisabled` untuk tombol nonaktif. |
| `src/features/agenda/domain/agenda.test.ts` | 10 test untuk geser bulan, rentang setengah-terbuka, dan validasi batas. |
| `src/features/agenda/infrastructure/agenda-repository.integration.test.ts` | Test integrasi arsip bulan lampau, filter draf, dan isolasi tenant. |
| `vitest.integration.config.mts` | Mendaftarkan berkas integration test baru. |
| `docs/reports/02-public-website/pr51-agenda-archive-f04-f05-2026-11-15.md` | Laporan task ini. |

Tidak ada perubahan schema, migration, dependency, atau konfigurasi deploy.

## 4. Perubahan

- **Query per bulan (F-04).** `agendaBulan(desa.id, year, month)` menghitung rentang `[YYYY-MM-01, bulan berikutnya-01)` lewat `rentangBulanAgenda` lalu memanggil `listAgendaPublikRentang`. Semua kegiatan pada bulan yang dibuka (termasuk bulan lampau) sekarang benar-benar diambil dari database, tetap dibatasi `village_id` dari sesi/host dan hanya `tayang = true`.
- **Rentang setengah-terbuka.** `selesai` adalah tanggal 1 bulan berikutnya dengan operator `lt`, sehingga kegiatan di hari terakhir bulan tidak terlewat dan tidak perlu menghitung jumlah hari per bulan.
- **Navigasi batas (F-05).** `bulanAgendaDalamRentang(previousMonth|nextMonth, tahunMin, tahunMaks)` menentukan apakah panah dirender sebagai tautan. Di batas rentang, panah menjadi `<button disabled>` dengan `aria-label` yang menjelaskan bahwa bulan tersebut tidak tersedia — bukan *clamp* yang diam-diam membuka tahun lain.
- **Label statistik.** "Total agenda bulan" dan "Sesuai filter" menggantikan label "mendatang" yang tidak lagi sesuai untuk kalender per bulan. Panel "Kegiatan mendatang" di sidebar tetap memakai `agendaMendatang(desa.id, 3)` agar tidak bergantung pada bulan yang dibuka.

## 5. Security / tenant

- `villageId` berasal dari `getIdentitasFromRequest()` (resolusi tenant server-side dari host/sesi), bukan dari query string. Parameter `bulan`/`tahun` hanya memengaruhi rentang tanggal.
- `listAgendaPublikRentang` memfilter `village_id`, `tayang = true`, dan rentang `mulai`; tidak ada jalur yang mengembalikan agenda draf atau agenda desa lain.
- Integration test menambahkan kasus negatif: agenda desa lain pada bulan yang sama tidak ikut, agenda `tayang = false` tidak tampil, dan agenda bulan lampau tetap muncul pada rentang yang diminta.
- Tidak ada data pribadi pada fixture test (judul agenda sintetis).

## 6. Test

| Perintah | Hasil |
| --- | --- |
| `npx vitest run src/features/agenda` | PASS — 1 file, 10 test |
| `npx tsc --noEmit` | PASS |
| `npx eslint src/app/agenda src/features/agenda` | PASS |
| `npx vitest run --config vitest.integration.config.mts src/features/agenda/infrastructure/agenda-repository.integration.test.ts` (database `desa_test_visual`, MySQL 8.0.30 lokal) | PASS — 1 file, 4 test |
| `npm run format:check` | PASS (dijalankan saat pekerjaan awal) |
| Verifikasi visual `/agenda` pada 1440/390 dengan data arsip | **SKIPPED** — build yang tersedia saat capture memakai kode PR #51 sebelum commit ini; lihat bagian 7 |

Perintah integration test dijalankan dengan `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, dan `TEST_DATABASE_URL` yang divalidasi `src/testing/db-test-guard.ts` (host loopback, nama `desa_test_visual`). Database dibuat dan dimigrasi oleh `siapkanDatabaseUji`; tidak ada koneksi ke database pengembangan.

## 7. Risiko dan keterbatasan

- Verifikasi visual kalender arsip belum dilakukan pada kode commit ini. Harness visual lokal tersedia di branch `task/visual-qa-local-harness`; langkah berikutnya adalah membangun aplikasi dari branch ini, menjalankan capture, lalu membuka bulan lampau untuk memastikan kegiatan arsip muncul dan panah nonaktif di batas.
- Rentang tahun yang dilayani masih `tahun ini − 1` sampai `tahun ini + 2`; agenda yang lebih lama dari itu tidak dapat dibuka lewat kalender (perilaku ini dipertahankan dari desain sebelumnya). Bila arsip lebih panjang dibutuhkan, rentang perlu dibuat konfigurasi.
- `listAgendaPublikRentang` memakai `lt` pada `mulai`, sehingga kegiatan yang dimulai bulan lalu dan berlangsung sampai bulan ini hanya muncul pada bulan mulai (sesuai definisi `selesai` di form agenda).
- Test integrasi hanya menguji repository dan use case, bukan render halaman.

## 8. Kesimpulan dan rekomendasi

F-04 dan F-05 selesai: kalender kini mengambil data per bulan (termasuk arsip) dari database dengan filter tenant dan status tayang, dan navigasi bulan tidak lagi melewati batas rentang. Domain helper diuji 10 kasus, integration test 4 kasus lulus pada database disposable, dan typecheck/ESLint lulus.

Rekomendasi berikutnya:

1. Jalankan capture visual 1440/390 untuk `/agenda` pada branch ini (termasuk membuka bulan lampau dan memeriksa tombol panah di batas), lalu catat hasilnya pada laporan ini.
2. Bila arsip perlu lebih dari dua tahun ke belakang, jadikan rentang tahun sebagai parameter konfigurasi dan tambahkan test batasnya.
