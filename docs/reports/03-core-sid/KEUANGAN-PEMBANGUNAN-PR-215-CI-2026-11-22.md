# Perbaikan CI PR #215 — Keuangan & Pembangunan

- **Task:** PR #215 — memperbaiki CI/Visual QA yang gagal pada modul Keuangan & Pembangunan.
- **Tujuan:** memastikan format, typecheck, migration MySQL, unit/integration test, dan build produksi dapat dijalankan pada branch yang tersinkron dengan `main`.
- **Tanggal:** 2026-11-22.
- **Branch kerja:** `task/PR-215-keuangan-pembangunan-ci`.
- **Branch PR:** `feature/keuangan-pembangunan-v2` (head PR sebelum perubahan `ec317e6dd87996a6d810fe17ca15ca74554a9f0b`).
- **Base PR:** `main`; base commit yang disinkronkan `a70254baaf38547f5b71282c8e1a836538ead963`.
- **Commit sinkronisasi:** `33b458112c682a0a0704193ae2f15ff2056c8cf1`.
- **Commit implementasi:** `8daafef6d1494c06f2420a4aadf336486c9dc96c` — `fix(keuangan): unblock PR #215 migration and quality checks`.
- **Status PR:** draft; setelah sinkronisasi base ke `a70254ba`, head `7cfd2fb9` berstatus `BLOCKED` sampai checks mulai, kemudian semua checks lulus; tidak di-merge.

## Kondisi awal dan analisis

CI run `44920468777` dan Visual QA run `44920468770` mengidentifikasi kegagalan berikut:

1. Prettier menolak 18 file Keuangan/Pembangunan.
2. TypeScript menolak fixture `proyek()` di `buku-pembangunan.test.ts` karena DTO kini mewajibkan `latitude` dan `longitude`.
3. `db:migrate` gagal dengan MySQL `ER_PARSE_ERROR 1064`: satu chunk migration berisi dua statement `ALTER TABLE` tanpa `--> statement-breakpoint`.
4. Tes paritas schema-migration gagal karena journal dan snapshot untuk tabel/kolom baru belum tersedia setelah nomor migrasi disesuaikan dengan migration di `main`.
5. Full unit suite juga menemukan ekspektasi navigasi lama yang menyatakan `/keuangan/laporan` tidak tersedia, padahal route laporan ditambahkan oleh PR ini.
6. Lint menemukan satu anchor internal langsung ke `/pembangunan/buku/ekspor` alih-alih `Link` Next.js.

Migration PR dinomori ulang ke `0043_pembangunan_gis_coordinates` dan `0044_keuangan_bulanan`, setelah migration `0033_absensi_kepegawaian` yang sudah ada pada `main`. Snapshot Drizzle dibuat oleh `drizzle-kit generate`; CHECK constraints yang tidak direpresentasikan generator dipertahankan. SQL statement dipisah sesuai cara migrator Drizzle mengeksekusi chunk. Semantik `AFTER lokasi`, `AFTER latitude`, dan `updated_at ... ON UPDATE CURRENT_TIMESTAMP` dipertahankan dari SQL branch asal.

## File yang diperiksa

- CI/Visual QA workflows, `package.json`, `src/db/migrasi-paritas.test.ts`.
- Schema dan migration Drizzle, snapshot, journal.
- Domain pembangunan, fixture buku pembangunan, use case dan repository keuangan bulanan.
- Halaman Keuangan/Pembangunan yang dilaporkan format/lint/type errors.
- Tes navigasi route dan route ekspor buku pembangunan.
- Konfigurasi/guard integration test dan MySQL disposable lokal.

## File berubah dan alasan

- 18 file sumber/UI/CSS di `src/app/(admin)/keuangan/**`, `src/app/pembangunan/**`, `src/app/public-site-layout.tsx`, `src/db/schema/keuangan-bulanan.ts`, `src/features/keuangan/**`, `src/features/pembangunan/domain/pembangunan.ts`: format ulang dari file yang ditolak Prettier CI.
- `src/db/migrations/0043_pembangunan_gis_coordinates.sql`, `0044_keuangan_bulanan.sql`: nomor sinkron, SQL multi-statement dipisah; CHECK range, posisi kolom, foreign keys, index, dan update timestamp dipertahankan.
- `src/db/migrations/meta/0034_snapshot.json`, `0035_snapshot.json`, `src/db/migrations/meta/_journal.json`: snapshot dan entri journal berantai setelah idx 33.
- `src/db/migrasi-paritas.test.ts`: regression guard memastikan potongan migration tidak menggabungkan beberapa statement DDL/DML yang didukung.
- `src/features/pembangunan/domain/buku-pembangunan.test.ts`: fixture menambahkan koordinat null.
- `src/features/navigation/domain/menu-tampil.test.ts`: mengharapkan `/keuangan/laporan` tersedia sesuai route yang ditambahkan PR.
- `src/app/(admin)/keuangan/kegiatan/page.tsx`: anchor ekspor internal diganti `Link`.

## Security dan tenant

Perubahan ini tidak mengubah mekanisme otorisasi atau resolusi tenant. Repository keuangan tetap menggunakan `villageId` yang diselesaikan dari pengguna terautentikasi dan semua query keuangan bulanan memfilter `village_id`; migration tetap membatasi foreign keys ke parent yang sudah ada. Tidak ada database production yang dipakai.

## Validasi

| Perintah | Hasil |
|---|---|
| `npm run format:check` | **PASS** — semua file sesuai Prettier. |
| `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit`. |
| `npm run lint` | **PASS** — 0 error; 5 warning: 2 console warning di `scripts/wilayah/generate-wilayah.mjs`, dan 3 warning `<img>` di halaman pembangunan/keuangan. |
| `npm test` | **PASS** — 245 file, 2.079 test. |
| `TEST_DATABASE_URL=mysql://root:@127.0.0.1:3306/desa_test_pr215_final_20261122 TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration:ci` | **PASS** — MySQL 8.0.30 disposable di loopback, 59 file, 322 test; exit 0. Database dibuat dengan nama baru khusus task. |
| `NODE_ENV=test DATABASE_URL=mysql://root:@127.0.0.1:3306/desa_test_pr215_20261122 npm run db:migrate` | **PASS** — migrasi diterapkan. |
| `npm run build` dengan env build-only CI | **PASS** — build produksi selesai; 2 warning tracing filesystem pada `ekspor-kedaluwarsa.mjs` dan `whatsapp-baileys.ts`. |
| `git diff --check` | **PASS** — tidak ada whitespace error sebelum commit. |
| [CI run `44976558844`](https://github.com/fahmiorim/appdes/actions/runs/44976558844) pada head `7cfd2fb994a9f970ce272f2e2333cc2e577a0257` | **PASS** — Deteksi perubahan, Unit test dan quality check, Integration test MySQL 8, Build produksi, Ringkasan CI. |
| [Visual QA run `44976558843`](https://github.com/fahmiorim/appdes/actions/runs/44976558843) pada head `7cfd2fb994a9f970ce272f2e2333cc2e577a0257` | **PASS** — migrasi visual, capture desktop/mobile dan halaman publik, upload evidence. |
| [CI run `44977391843`](https://github.com/fahmiorim/appdes/actions/runs/44977391843) pada head final `eb0bbe71fad2e19c9dd9a4a2264504ebc7892e66` | **PASS** — seluruh job sukses setelah commit dokumentasi. |
| [Visual QA run `44977391879`](https://github.com/fahmiorim/appdes/actions/runs/44977391879) pada head final `eb0bbe71fad2e19c9dd9a4a2264504ebc7892e66` | **PASS** — sukses. |

## Risiko dan keterbatasan

- Lint/build warning yang disebut di atas masih ada dan tidak diubah karena di luar scope.
- GitHub Actions melaporkan deprecation warning Node 20 untuk beberapa action; workflow tetap lulus.
- PR tetap draft dan tidak di-merge; keputusan review/merge milik maintainer.
- Penomoran migration #215 perlu diperhitungkan saat mengintegrasikan PR stack lain yang juga memakai nomor `0043`; rinciannya ada di [triase PR 22 November 2026](../00-baseline/PR-TRIAGE-2026-11-22.md).

## Kesimpulan

Kegagalan format, typecheck, journal/snapshot paritas, SQL parser, ekspektasi route, dan lint yang terkonfirmasi telah diperbaiki. Validasi lokal lulus, termasuk migration serta seluruh integration test pada MySQL disposable; CI dan Visual QA pada head PR juga PASS. Status: siap direview, tetap draft dan belum di-merge.
