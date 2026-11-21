# Perbaikan CI PR #213 — Absensi & Kepegawaian

- **Task:** PR #213 — perbaikan kegagalan CI pada modul Absensi & Kepegawaian.
- **Tanggal pengerjaan:** 2026-11-21.
- **Branch:** `feature/absensi-kepegawaian`.
- **Base commit:** `235ddeff` (main setelah merge PR #211).
- **Merge commit `main`:** `5fef5efb` (sinkronisasi `main` ke branch absensi).
- **Status:** siap review.

## 1. Kondisi awal

CI untuk PR #213 gagal di hampir semua job. Penyebab yang ditemukan:

1. **Typecheck gagal**: `src/features/kepegawaian/application/use-cases.ts:717`
   memanggil `findAbsensiHarianByPerangkat` yang tidak diimpor, dan blok sisa
   percobaan kunci absensi tidak terpakai.
2. **Pelanggaran batas lapisan** (`src/features/publik/application/lapisan-publik.test.ts`):
   - `src/app/(admin)/absensi-kepegawaian/actions.ts` mengimpor `hapusMedia`
     langsung dari `@/features/publik/infrastructure/media-storage`.
   - Tiga route API (`api/kehadiran/foto/[id]`, `api/kepegawaian/dokumen/[id]`,
     `api/kepegawaian/cuti/[id]/lampiran`) masih mengimpor `@/db` dan
     `bacaMedia` dari infrastruktur.
   - `use-cases.ts` mengimpor `@/db/kunci-mysql`, padahal lapisan application
     dilarang menyentuh `@/db`.
3. **Nomor migrasi bentrok**: migrasi absensi memakai `0028`/`0029`, sedangkan
   `0028`–`0031` sudah dipakai PR #209 dan `0032` dipakai PR #211. Snapshot dan
   journal juga belum konsisten (`prevId` menunjuk snapshot lama).
4. **Churn generator**: `drizzle-kit generate` menghasilkan `DROP/ADD CONSTRAINT`
   untuk FK `galeri_video`, `potensi_desa`, dan `potensi_indikator`, karena
   schema di repo memakai `.references()` tanpa nama eksplisit sementara database
   dan snapshot memakai nama eksplisit.

## 2. Analisis dan pendekatan

- Memperbaiki akar masalah, bukan melonggarkan guard: route hanya boleh
  memanggil use case, application hanya boleh memanggil repository.
- Kunci MySQL untuk absensi mandiri dipindahkan ke repository (pola yang sama
  dengan `pengaduan` dan `keuangan`), sehingga application tetap bersih.
- Penghapusan media yatim (foto absensi/lampiran cuti) dijadikan use case
  `hapusBerkasKepegawaian` agar `actions.ts` tidak mengimpor infrastruktur.
- Migrasi absensi digabung menjadi satu file `0033_absensi_kepegawaian.sql`
  (snapshot tunggal) yang dirantai setelah `0032_pemerintahan_desa`. Penggabungan
  dilakukan karena schema hanya menyimpan state akhir; memecahnya menjadi dua
  migrasi tidak dapat menghasilkan snapshot yang konsisten.
- Nama FK eksplisit ditambahkan pada `galeri_video`, `potensi_desa`, dan
  `potensi_indikator` agar generator tidak lagi menghasilkan `DROP/ADD` yang
  tidak perlu. Tidak ada perubahan perilaku database: nama constraint tetap
  sama dengan yang sudah terpasang.

## 3. File yang diperiksa

- `.github/workflows/*` (definisi job CI).
- `src/db/schema/kehadiran.ts`, `kehadiran-izin.ts`, `kepegawaian.ts`,
  `potensi.ts`, `gallery-video.ts`, `index.ts`.
- `src/db/migrations/meta/_journal.json` dan snapshot `0027`–`0033`.
- `src/features/kepegawaian/application/use-cases.ts`,
  `src/features/kehadiran/application/kehadiran-use-cases.ts`.
- `src/app/(admin)/absensi-kepegawaian/actions.ts` dan 3 route API terkait.
- `src/features/publik/application/lapisan-publik.test.ts`,
  `src/db/migrasi-paritas.test.ts`,
  `src/db/tenant-composite-fk.integration.test.ts`.

## 4. File yang diubah

| File | Alasan |
| --- | --- |
| `src/db/migrations/0033_absensi_kepegawaian.sql` | Migrasi tunggal absensi+kepegawaian yang dirantai setelah `0032`. |
| `src/db/migrations/meta/0033_snapshot.json` | Snapshot baru, `id`/`prevId` sesuai urutan journal. |
| `src/db/migrations/meta/_journal.json` | Entri `0033_absensi_kepegawaian`, konflik dengan main diselesaikan. |
| `src/db/schema/kehadiran.ts`, `kehadiran-izin.ts`, `kepegawaian.ts` | Kolom `date`/`time` konsisten mode string; tabel kepegawaian baru. |
| `src/db/schema/potensi.ts`, `gallery-video.ts` | Nama FK eksplisit agar generator tidak membuat churn. |
| `src/db/tenant-composite-fk.integration.test.ts` | Mengharapkan 5 FK composite baru (cuti, kepegawaian, kehadiran). |
| `src/features/kepegawaian/infrastructure/kepegawaian-repository.ts` | Repository baru + `denganKunciAbsensiHarian`. |
| `src/features/kepegawaian/application/use-cases.ts` | Use case memakai repository; helper baca media dan `hapusBerkasKepegawaian`. |
| `src/features/kehadiran/{application,infrastructure}` | Menyesuaikan tipe tanggal string. |
| `src/app/(admin)/absensi-kepegawaian/**` | Halaman/form/ekspor modul absensi dan kepegawaian. |
| `src/app/api/kehadiran/foto/[id]/route.ts`, `src/app/api/kepegawaian/dokumen/[id]/route.ts`, `src/app/api/kepegawaian/cuti/[id]/lampiran/route.ts` | Memakai use case, bukan `@/db`. |
| `src/app/(admin)/absensi-kepegawaian/actions.ts` | Memakai `hapusBerkasKepegawaian`. |
| `src/features/navigation/domain/menu-tampil.ts`, `src/features/rbac/domain/resources.ts`, `src/features/publik/infrastructure/media-storage.ts` | Menu, resource permission, dan kategori media modul baru. |
| `next.config.ts` | Resolusi konflik komentar `bodySizeLimit`; tidak ada perubahan nilai. |
| `src/features/isolasi-village.integration.test.ts` | Daftar tabel tenant bertambah. |

Tidak ada perubahan pada `main`, tidak ada migration yang diedit setelah
diterapkan, dan tidak ada penonaktifan test atau pelonggaran aturan lint.

## 5. Security dan multi-tenant

- Semua query repository dibatasi `village_id` tenant terverifikasi.
- Route unduhan memakai use case yang memeriksa permission
  (`kepegawaian:read`, `cuti-izin:read`) dan untuk foto absensi juga
  kepemilikan email pegawai.
- FK composite (`village_id`, `pegawai_id`) ditambahkan dan diharapkan oleh
  integration test `tenant-composite-fk`.
- Tidak ada `villageId` dari body/query yang dipakai sebagai bukti otorisasi.
- Absensi mandiri diserialisasi dengan `GET_LOCK` per tenant+pegawai+tanggal
  untuk mencegah check-in/check-out ganda.

## 6. Validasi yang dijalankan

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint .` | **PASS** (0 error, 2 warning lama pada `scripts/wilayah/generate-wilayah.mjs`) |
| `npm run format:check` | **PASS** |
| `npm run test:unit` | **PASS** — 245 file, 2078 test |
| `npx vitest run src/db/migrasi-paritas.test.ts` | **PASS** — 9 test |
| `npx vitest run src/features/publik/application/lapisan-publik.test.ts` | **PASS** — 4 test |
| `npm run build` | **PASS** |
| Integration test MySQL | **SKIPPED** di lokal (tidak ada Docker/MySQL) |
| CI run `44922472736` (head `f89ac496`) | **PASS** — Deteksi perubahan, Unit test dan quality check, Build produksi, Integration test (MySQL 8), Ringkasan CI |
| Visual QA run `44922472631` (head `f89ac496`) | **PASS** — Visual QA login (desktop/mobile) |

## 7. Risiko dan keterbatasan

- Integration test (termasuk paritas constraint di database nyata) belum
  dijalankan lokal; hasilnya bergantung pada CI.
- Migrasi `0033` wajib dijalankan sebelum modul absensi/kepegawaian dipakai
  (`npm run db:migrate`); halaman akan gagal jika kolom baru belum ada.
- Penggabungan dua migrasi menjadi satu berarti rollback parsial per fitur tidak
  tersedia; rollback tetap dilakukan per migrasi `0033`.
- Perubahan nama FK eksplisit tidak mengubah constraint yang sudah ada di
  database, tetapi schema kini menjadi sumber kebenaran untuk generate
  berikutnya.

## 8. Kesimpulan

Seluruh pemeriksaan lokal yang relevan PASS. Branch siap direview; merge dan
deploy menunggu keputusan maintainer serta hasil CI.
