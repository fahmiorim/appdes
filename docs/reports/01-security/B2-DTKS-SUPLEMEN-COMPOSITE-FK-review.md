# B2 — Review Perubahan Composite Tenant FK DTKS & Suplemen

- **Task:** review branch `task/B2-DTKS-SUPLEMEN-COMPOSITE-FK` sebelum review
  maintainer; mencari risiko yang masih tersisa.
- **Tanggal:** 13 November 2026
- **Branch diperiksa:** `task/B2-DTKS-SUPLEMEN-COMPOSITE-FK` @ `cf3fc14`
- **Base:** `main` @ `615712b87a76798cb85a9f5cc26b7b03483cecf1`
- **Commit fitur:** `ed63681`; commit dokumen: `cf3fc14`
- **Catatan lineage:** saat push, branch ini ternyata sudah di-force-push
  maintainer ke `947d5f5` (lineage `main` terbaru, sudah memuat merge PR #11 dan
  sinkronisasi B2). Perubahan pada §8 di-port ke atas lineage tersebut dan
  diverifikasi ulang; `ed63681`/`cf3fc14` hanya tersimpan di lokal.
- **Mode review:** read-only. Tidak ada perubahan source, schema, migration, atau
  database. Satu-satunya berkas baru adalah laporan ini (belum di-commit).
- **Status:** perubahan layak dilanjutkan. Tidak ada blocker keamanan/tenant.
  Dua temuan dokumentasi, dua celah test, dan ketergantungan urutan fixture
  sudah diperbaiki pada 13 November 2026; seluruh test B2 lulus di MySQL
  disposable (18 test, lihat §8).

## 1. Ruang lingkup review

Rentang: `git diff 615712b...HEAD` — 18 berkas, 20.439 baris (mayoritas
`meta/0002_snapshot.json` hasil generate Drizzle).

Metode: membaca seluruh berkas non-generated pada diff, lalu mencocokkan
klaim laporan dengan kode, menelusuri pemanggil repository yang berubah, dan
memeriksa cakupan guard migration terhadap constraint yang dipasang.

## 2. Kondisi awal yang diverifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Working tree | bersih; branch sinkron dengan `origin` |
| Base commit | `615712b` = `origin/main` |
| Scope diff | sesuai laporan: schema, migration 0002, 3 repository, 2 test integrasi baru, preflight/rollback/runbook |
| Berkas di luar scope | tidak ada (tidak ada perubahan route, UI, atau modul lain) |

## 3. Temuan

### 3.1 Temuan (sudah diperbaiki pada revisi 13 November 2026)

**T-1 — [Dokumen] Runbook menunjuk berkas test yang tidak ada**

- Bukti: `docs/reports/01-security/B2-rollback-runbook.md:4` dan `:92`
  menyebut `src/db/migration-guard-rollback.integration.test.ts`. Berkas
  sebenarnya `src/db/b2-migration-guard-rollback.integration.test.ts`
  (`vitest.integration.config.mts:26`).
- Dampak: operator/reviewer yang mengikuti runbook tidak menemukan skrip
  rehearsal yang dimaksud, sehingga bukti rollback sulit diverifikasi.
- Perbaikan: ganti kedua referensi menjadi nama berkas yang benar.

**T-2 — [Dokumen] Perintah preflight tidak bisa dijalankan apa adanya**

- Bukti: `docs/reports/01-security/B2-preflight.sql:5` menulis
  `mysql --default-character-set=utf8mb4 < B2-preflight.sql`, sedangkan seluruh
  tabel di query tidak memakai kualifikasi database (`FROM dtks`, `JOIN rtm`,
  dst.).
- Dampak: perintah gagal dengan `ERROR 1046 (3D000): No database selected`.
  Artefak yang justru dipakai operator sebelum migration tidak berjalan sesuai
  dokumentasi.
- Perbaikan: tambahkan nama database, mis.
  `mysql --default-character-set=utf8mb4 <database> < B2-preflight.sql`.

**T-3 — [Test] Jalur migration yang berhasil di atas data lama belum diuji**

- Bukti: satu-satunya database yang menjalankan 0002 **dengan isi data** adalah
  database guard, dan di sana migration sengaja digagalkan
  (`src/db/b2-migration-guard-rollback.integration.test.ts:369-373`). Database
  rollback dan baseline dimigrasi dari keadaan kosong
  (`:411-414`), sehingga `UPDATE dtks_ref_lampiran ... JOIN dtks`
  (`src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql:162`) dan
  `MODIFY COLUMN village_id int NOT NULL` (`:167`) tidak pernah mengenai satu
  baris pun.
- Dampak: bagian migration yang paling berisiko (backfill + promosi `NOT NULL`
  pada tabel berisi data) tidak punya bukti otomatis. Test yang ada hanya
  membuktikan "berhenti bila data melanggar" dan "rollback dari schema 0002",
  bukan "berhasil dan menghasilkan `village_id` yang benar".
- Perbaikan: tambah database disposable keempat, migrasi ke `0000 + 0001`, isi
  junction yang valid lintas dua desa (junction pra-0002 belum punya
  `village_id`, jadi baris dapat disisipkan langsung), lalu jalankan 0002 penuh
  dan assert setiap `dtks_ref_lampiran.village_id` sama dengan desa DTKS
  induknya serta kolomnya `NOT NULL`.

**T-4 — [Test] Dua jalur hapus yang diklaim ditelusuri tidak punya test**

- Bukti: `deleteSuplemen` (`src/features/penduduk/infrastructure/suplemen-repository.ts:95`)
  dan `deleteLampiranDtks` (`src/features/penduduk/infrastructure/dtks-repository.ts:423-427`)
  tidak dipanggil satu kali pun oleh test. Cascade yang diuji memakai
  `db.delete(suplemen)` mentah
  (`src/db/b2-dtks-suplemen-composite-fk.integration.test.ts:750`) dan
  `db.delete(dtks)` (`:721`).
- Dampak: laporan bagian 4.2 menyatakan jalur ini sudah ditelusuri, tetapi
  tidak ada bukti bahwa keduanya masih berhasil setelah referensi opsional
  berubah dari `SET NULL` menjadi `RESTRICT`. Bila aturan cascade berubah,
  keduanya akan gagal dengan `ER_ROW_IS_REFERENCED_2` tanpa satu test pun gagal.
- Perbaikan: di berkas test B2, panggil `deleteLampiranDtks` pada lampiran yang
  masih tertaut (assert junction hilang) dan `deleteSuplemen` pada suplemen yang
  masih punya terdata (assert `suplemen_terdata` ikut terhapus).

### 3.2 Risiko operasional tambahan (belum tercatat di laporan)

**T-5 — Backfill berjalan sebagai satu statement tanpa batching**

- Bukti: `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql:162-165`.
- Dampak: pada desa dengan junction besar, satu `UPDATE ... JOIN` memegang lock
  selama seluruh backfill, lalu langsung diikuti `MODIFY NOT NULL` dan
  `ADD CONSTRAINT ... UNIQUE` (`:167`, `:171`) yang membangun ulang index.
  Bila `lock_wait_timeout` terlampaui, DDL MySQL yang auto-commit meninggalkan
  schema parsial — tepat keadaan yang dinyatakan runbook tidak boleh "diperbaiki"
  dengan inverse script.
- Perbaikan minimum: catat estimasi durasi/lock dan cara menaikkan
  `lock_wait_timeout` pada runbook, plus query `information_schema` untuk
  menghitung jumlah baris junction sebelum penjadwalan. Perbaikan lebih baik:
  backfill bertahap per rentang `id`.

**T-6 — Tabel bantu `_b2_preflight_findings` tertinggal di schema saat abort**

- Bukti: `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql:18`
  (dibuat), `:137` (dihapus hanya pada jalur sukses).
- Dampak: disengaja untuk diagnosis, tetapi tabel ini tidak ada di schema
  Drizzle. Menjalankan `db:push`/`db:generate` pada database tersebut akan
  melihat drift. Runbook sudah meminta tabel diperiksa lalu dibuang manual;
  tambahkan larangan eksplisit memakai `db:push` pada database itu.

**T-7 — Fixture test saling bergantung antar `it`** (diperbaiki 13 November 2026)

- Bukti: `src/db/b2-dtks-suplemen-composite-fk.integration.test.ts` memutasi
  fixture bersama pada `:721`, `:750`, `:787`, `:808`, `:828`.
- Dampak: menjalankan satu test secara terpisah gagal; bisect regresi menjadi
  lebih sulit. Bukan blocker, tetapi menyulitkan investigasi saat CI merah.
- Perbaikan: fixture dipindah ke `beforeEach`/`afterEach` (dibangun ulang per
  test, dibersihkan dengan urutan anak→parent). Isi test tidak diubah.

**T-8 — Biaya index bertambah**

- Bukti: tiga unique key `(village_id, id)` dan delapan index composite pada
  enam tabel.
- Dampak: write amplification dan waktu DDL. Dapat diterima untuk isolasi
  tenant, tetapi perlu disebut pada jadwal deploy (index rebuild tidak instan).

Semua temuan di atas sudah ditutup: T-1 dan T-2 pada dokumen operator, T-3 dan
T-4 sebagai test integrasi baru, T-7 sebagai factory fixture. Ketiganya sudah
dijalankan pada MySQL disposable: 18 test B2 PASS, dan test RTM lulus sendirian
(§8). Rincian perubahan ada pada `B2-DTKS-SUPLEMEN-COMPOSITE-FK.md` §10.

## 4. Yang sudah benar (diverifikasi, bukan asumsi)

- Guard di dalam migration mencakup **seluruh** relasi yang ditegakkan composite
  FK, termasuk cabang `IS NOT NULL` untuk referensi opsional
  (`0002:40-46`, `:100-110`) — tidak ada celah yang membuat ALTER gagal setelah
  guard lolos.
- Preflight operator (`B2-preflight.sql`) dan preflight di dalam migration
  setara cakupannya: relasi, jenis (`orphan`/`cross-tenant`), dan perlakuan
  junction yang belum punya `village_id` sama-sama ditangani.
- `village_id` junction ditambahkan `NULL` → di-backfill dari DTKS induk →
  `NOT NULL` → baru diberi FK, sehingga FK ke `villages` tidak pernah melihat
  nilai kosong.
- `SET NULL` tidak dipakai pada composite key; pelepasan referensi opsional
  dilakukan eksplisit di transaksi `deleteKeluarga`
  (`src/features/keluarga/infrastructure/keluarga-repository.ts:332-347`) dan
  `deletePenduduk`
  (`src/features/penduduk/infrastructure/penduduk-repository.ts:584-599`).
- Tidak ada jalur hapus `residents`/`families` lain di `src/` di luar kedua
  repository tersebut, sehingga perubahan `SET NULL` → `RESTRICT` tidak
  memutus jalur yang tidak diperbarui.
- `tautkanLampiran` memverifikasi DTKS dan lampiran sebelum menyisipkan
  junction (`dtks-repository.ts:436-454`); `lepasLampiran` dan
  `listLampiranTerpasang` tenant-scoped.
- `deleteRumahTangga` tetap menolak RTM yang masih dirujuk DTKS — sama seperti
  baseline (`dtks.rtm_id` sudah `RESTRICT`), jadi bukan regresi.

## 5. Validasi yang dijalankan

| Perintah | Hasil |
| --- | --- |
| `git status --short --branch` | PASS — bersih, sinkron `origin` |
| `git diff --check 615712b...HEAD` | PASS — tanpa whitespace error |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | PASS — 7 test |
| `vitest src/db/b2-` (integration, MySQL disposable) | PASS — 18 test (13 + 5), lihat §8 |
| Test tunggal `-t "tetap menolak hapus RTM"` | PASS — 1 test, 12 skipped |
| `npm run test:integration` (14 berkas) | SKIPPED — hanya dua berkas B2 yang dijalankan; berkas lain di luar diff dan tidak dijalankan ulang |
| `npm run test` (suite penuh) | SKIPPED — klaim laporan (187 berkas/1701 test) tidak diverifikasi ulang |

Catatan: baris integration di atas dijalankan pada instance MySQL 8.0.30
disposable (datadir baru, port 3309, loopback, `desa_test_b2_local`), yang
setelahnya dimatikan dan dihapus. Suite integrasi penuh 14 berkas tidak
dijalankan ulang; berkas di luar B2 tidak berubah.

## 6. Risiko tersisa (sudah tercatat di laporan task)

1. DDL MySQL tidak atomik; kegagalan di tengah 0002 meninggalkan schema parsial
   tanpa jalur pemulihan otomatis.
2. Data legacy nyata belum dipindai; guard akan menghentikan migration, dan
   koreksi data adalah keputusan operator.
3. Rollback menghapus `dtks_ref_lampiran.village_id`, sehingga koreksi manual
   atas kolom itu hilang.
4. Aplikasi harus sudah men-deploy transaksi set-null eksplisit sebelum 0002
   diterapkan; urutan ini belum pernah diuji end-to-end pada aplikasi berjalan.
5. Route/UI tidak diuji ulang; test memakai repository langsung.

## 7. Kesimpulan

Implementasi memenuhi tujuan B2: sembilan relasi DTKS/Suplemen kini ditegakkan
database dengan tenant key, guard migration menutup seluruh relasi yang
berubah, dan pelepasan referensi opsional dipindahkan ke transaksi aplikasi
dengan benar. Tidak ada temuan keamanan/tenant baru.

Empat temuan yang perlu ditutup (T-1 sampai T-4) sudah diperbaiki; lihat §8.
Sisanya bersifat operasional dan pantas dicatat di runbook (T-5, T-6).

## 8. Tindak lanjut 13 November 2026

| Temuan | Perubahan | Bukti |
| --- | --- | --- |
| T-1 | Nama berkas test pada `B2-rollback-runbook.md` diperbaiki di dua tempat | `git diff` pada runbook |
| T-2 | Perintah preflight memakai placeholder database + catatan `ERROR 1046` | `B2-preflight.sql` baris 5-11 |
| T-3 | Database disposable keempat `desa_test_b2_backfill_*`: migrasi ke `0000+0001`, isi data legacy sah, migrasi penuh, lalu periksa backfill, `NOT NULL`, tabel bantu, dan 9 FK tenant | `b2-migration-guard-rollback.integration.test.ts` |
| T-4 | Test cascade `deleteLampiranDtks` dan `deleteSuplemen` lewat repository | `b2-dtks-suplemen-composite-fk.integration.test.ts` |
| T-7 | Fixture factory per kebutuhan: `beforeEach` hanya membuat dua desa, tiap test memanggil factory yang dipakai, `afterEach` membersihkan baris | `b2-dtks-suplemen-composite-fk.integration.test.ts` |

Tidak ada perubahan pada schema, migration, atau kode aplikasi: ketiga test
baru hanya menambah bukti.

**Validasi revisi:** `npm run typecheck` PASS, `npm run lint` PASS,
`npm run format:check` PASS, `migrasi-paritas.test.ts` PASS (7 test).

Test integrasi dijalankan pada instance MySQL 8.0.30 disposable (datadir baru,
port 3309, loopback, database `desa_test_b2_local`), lalu instance dimatikan dan
datadir dihapus:

| Perintah | Hasil |
| --- | --- |
| `vitest run --config vitest.integration.config.mts src/db/b2-` | PASS — 2 berkas, 18 test |
| `... -t "tetap menolak hapus RTM"` | PASS — 1 test, 12 skipped |
| Sisa baris setelah suite | 0 (`villages` "Desa B2 %", `dtks_ref_lampiran`) |

Test RTM yang dulu bergantung urutan kini lulus sendirian. Durasi tidak dipakai
sebagai klaim: run pertama setelah refactor mencatat 489 ms, tetapi run ulang
pada lineage `main` terbaru mencatat 23 detik untuk berkas yang sama, sehingga
angkanya tidak stabil. Suite integrasi penuh tidak dijalankan ulang; berkas di
luar B2 tidak berubah.

Perubahan §8 di-port ke lineage `947d5f5` dan dijalankan ulang di sana: 18 test
PASS (`typecheck`, `lint`, `format:check` juga PASS). Commit lama `a685a3f`
tetap tersimpan sebagai branch lokal `backup/b2-local-a685a3f`.

**Status:** siap review maintainer. Tidak siap merge tanpa persetujuan
maintainer.
