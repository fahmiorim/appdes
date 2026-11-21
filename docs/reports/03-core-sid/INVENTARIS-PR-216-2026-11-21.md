# Perbaikan CI PR #216 — Inventaris & Aset

- **Task:** PR #216 — memperbaiki kegagalan quality, build, dan integration check pada modul Inventaris & Aset.
- **Tanggal pengerjaan:** 2026-11-21.
- **Branch:** `task/PR-216-inventaris-ci`.
- **Base commit:** `33eeda34e6cd42461d972861117ea50c4b7b0f33`.
- **Commit perbaikan:** `e65d8c3867dcf90e69f07dc269d091bca6ed6600` (`fix(inventaris): address PR #216 CI failures`).
- **PR:** [#216](https://github.com/fahmiorim/appdes/pull/216).
- **Status:** perbaikan lokal selesai pada branch task terpisah. Head branch PR #216 belum berubah; PR tetap draft dan tidak boleh di-merge sebelum seluruh required checks pada head perbaikan PASS.

## 1. Kondisi awal

Head PR yang terakhir diperiksa adalah `33eeda34`. CI run `44926978457` gagal pada pemeriksaan quality, build, dan integration; Visual QA `44926978316` juga gagal saat build. Kegagalan yang teridentifikasi:

1. Format Prettier tidak konsisten pada 16 file.
2. Build/typecheck menemukan tipe `Buffer<ArrayBufferLike>` yang tidak cocok dengan `BodyInit` pada route unduh dokumen dan referensi `hapusKategoriInventarisAction` yang tidak tersedia.
3. Assertion integration test tenant-composite-FK mengharapkan 88 foreign key, sedangkan database test menemukan 93; lima FK modul Inventaris belum dicantumkan pada assertion.

Visual QA gagal di tahap build yang sama, sehingga run tersebut bukan bukti adanya defect visual.

## 2. Perubahan

- Memperluas parser dan pemeriksaan paritas migrasi agar mendukung variasi SQL yang digunakan migrasi, termasuk indentasi, beberapa kolom dalam satu `ALTER`, suffix engine, dan indeks.
- Menambahkan lima foreign key Inventaris ke ekspektasi integration test composite FK; assertion tetap memeriksa daftar constraint dan tidak dilonggarkan.
- Mengarahkan unduhan dokumen Inventaris melalui use case yang membaca media dan mengembalikan bytes, lalu mengonversi bytes menjadi `Buffer` pada route untuk respons HTTP.
- Menghapus referensi action yang tidak tersedia dan merapikan format file yang ditolak CI.
- Tidak mengubah konfigurasi deployment dan tidak menjalankan migrasi database.

## 3. File yang diperiksa

- Workflow CI dan konfigurasi package scripts yang terkait pemeriksaan format, build, unit, serta integration.
- Route Inventaris, actions, use case aplikasi, domain, repository, dan schema Inventaris.
- `src/db/migrasi-paritas.test.ts` dan `src/db/tenant-composite-fk.integration.test.ts`.
- Laporan CI sebelumnya untuk PR #216 serta laporan indeks di `docs/reports/README.md`.

## 4. File yang diubah

Commit perbaikan mengubah 18 file (3.445 insertions, 725 deletions):

- `src/app/(admin)/inventaris/[id]/page.tsx`
- `src/app/(admin)/inventaris/actions.ts`
- `src/app/(admin)/inventaris/dashboard/page.tsx`
- `src/app/(admin)/inventaris/dokumen/[id]/route.ts`
- `src/app/(admin)/inventaris/inventaris.module.css`
- `src/app/(admin)/inventaris/laporan/page.tsx`
- `src/app/(admin)/inventaris/mutasi/page.tsx`
- `src/app/(admin)/inventaris/page.tsx`
- `src/app/(admin)/inventaris/pengelolaan/page.tsx`
- `src/db/migrasi-paritas.test.ts`
- `src/db/schema/inventaris.ts`
- `src/db/tenant-composite-fk.integration.test.ts`
- `src/features/inventaris/application/inventaris-publik-use-cases.ts`
- `src/features/inventaris/application/inventaris-use-cases.ts`
- `src/features/inventaris/domain/inventaris-domain.test.ts`
- `src/features/inventaris/domain/inventaris.test.ts`
- `src/features/inventaris/domain/inventaris.ts`
- `src/features/inventaris/infrastructure/inventaris-repository.ts`

Laporan ini dan tautannya pada indeks laporan dicatat sebagai perubahan dokumentasi terpisah dari commit perbaikan kode.

## 5. Security dan tenant

- Assertion FK tenant-composite tetap ketat dan kini mencakup lima relasi Inventaris yang sebelumnya terlewat.
- Route unduhan menggunakan use case aplikasi, bukan membaca media secara langsung pada route; perilaku otorisasi dan ownership mengikuti use case Inventaris yang ada.
- Tidak ada migrasi yang dijalankan, perubahan identitas tenant, atau akses ke database production.
- Integration test MySQL lokal tidak dapat diverifikasi karena database test disposable tidak tersedia.

## 6. Validasi lokal

Perintah berikut dijalankan sebelum commit perbaikan `e65d8c38`:

| Perintah | Hasil |
|---|---|
| `npm run test:unit` | **PASS** — 245 file, 2.086 test. |
| `npm run typecheck` | **PASS**. |
| `npm run format:check` | **PASS**. |
| `npm run build` | **PASS**. |
| `npm run lint` | **PASS** — 0 error, 3 warning. |
| `npm run test:integration` | **SKIPPED** — `TEST_DATABASE_URL` tidak disetel, `TEST_DATABASE_ACK` bukan `1`; Docker daemon tidak tersedia (`dockerDesktopLinuxEngine`). Tidak ada integration test terhadap database yang tidak terverifikasi. |
| `git diff --cached --check` | **PASS** sebelum commit. |

## 7. Status GitHub dan risiko tersisa

- CI run yang gagal (`44926978457`) dan Visual QA yang gagal (`44926978316`) berjalan pada head lama `33eeda34`, bukan pada commit perbaikan `e65d8c38`.
- Commit `e65d8c38` dibuat pada branch task yang terpisah dari branch sumber PR. Push branch task, bila dilakukan, tidak dengan sendirinya mengubah head PR #216.
- Belum ada hasil CI baru pada commit perbaikan. Tidak ada push ke branch sumber PR atau merge yang dilakukan dalam perubahan ini.
- Integration test MySQL dan Visual QA pada commit baru belum diverifikasi.
- PR #216 masih draft; jangan merge sampai push dilakukan dan semua checks wajib pada head baru berstatus PASS.
- PR #215 tidak diubah: pemeriksaan sebelumnya mendapati PR tersebut masih draft, checks gagal, dan `mergeable: CONFLICTING`.

## 8. Kesimpulan

Akar masalah yang diketahui pada format, build, dan ekspektasi FK integration test telah diperbaiki tanpa melemahkan assertion. Pemeriksaan lokal yang tersedia lulus; integration test dilewati dengan alasan lingkungan yang dicatat di atas. Status pekerjaan belum siap merge. Laporan ini mencatat perubahan pada branch task; head PR #216 masih `33eeda34`, sehingga checks gagal yang terlihat tetap merujuk pada kode lama. Untuk memicu checks PR atas perbaikan, commit perlu diterapkan ke branch sumber PR melalui alur yang disetujui maintainer.
