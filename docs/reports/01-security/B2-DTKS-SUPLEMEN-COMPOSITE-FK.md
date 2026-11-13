# B2 — Composite Tenant FK untuk DTKS & Suplemen

- **Task:** B2 — implementasi composite tenant foreign key DTKS & Suplemen
  sesuai `docs/reports/01-security/B2-DTKS-SUPLEMEN-COMPOSITE-FK-PLAN.md`.
- **Tanggal:** 12 November 2026
- **Branch:** `task/B2-DTKS-SUPLEMEN-COMPOSITE-FK`
- **Base:** `main` — `615712b87a76798cb85a9f5cc26b7b03483cecf1`
- **Commit implementasi:** `ed63681` (lihat `git log` untuk SHA lengkap)
- **Status:** siap review. Tidak ada merge, deploy, atau perubahan `main`.

## 1. Kondisi awal dan analisis

Baseline hanya memakai FK single-column untuk relasi DTKS/Suplemen, sehingga
`village_id` child tidak terikat ke desa parent. Repository memang memfilter
`village_id`, tetapi SQL langsung, bug jalur hapus, atau data lama dapat
menautkan entitas lintas desa tanpa ditolak database.

Temuan saat menelaah schema dan migration aktual:

| Relasi | Sebelum | Sesudah |
| --- | --- | --- |
| `dtks.rtm_id → rtm.id` | single-column `RESTRICT` | composite `(village_id, rtm_id)`, `RESTRICT` |
| `dtks.keluarga_id → families.id` | single-column `SET NULL` | composite, `RESTRICT` + set-null di transaksi aplikasi |
| `dtks_anggota.dtks_id → dtks.id` | single-column `CASCADE` | composite `CASCADE` |
| `dtks_anggota.penduduk_id → residents.id` | single-column `RESTRICT` | composite `RESTRICT` |
| `dtks_ref_lampiran.dtks_id → dtks.id` | single-column `CASCADE` | composite `CASCADE` |
| `dtks_ref_lampiran.lampiran_id → dtks_lampiran.id` | single-column `CASCADE` | composite `CASCADE` |
| `suplemen_terdata.id_suplemen → suplemen.id` | single-column `CASCADE` | composite `CASCADE` |
| `suplemen_terdata.penduduk_id → residents.id` | single-column `SET NULL` | composite `RESTRICT` + set-null di transaksi aplikasi |
| `suplemen_terdata.keluarga_id → families.id` | single-column `SET NULL` | composite `RESTRICT` + set-null di transaksi aplikasi |

`dtks_ref_lampiran` belum memiliki `village_id`, sehingga junction lampiran
tidak punya tenant key sama sekali. `tautkanLampiran`/`lepasLampiran` juga
mengabaikan parameter `villageId` (`void villageId`).

Nama FK baseline diverifikasi dari `0000_baseline.sql` dan schema aktual (bukan
diasumsikan), lalu diganti dengan pola `*_tenant_fk` seperti
`0001_aud002_composite_tenant_fk.sql`.

## 2. File yang diperiksa

- `docs/reports/01-security/B2-DTKS-SUPLEMEN-COMPOSITE-FK-PLAN.md`
- `docs/reports/01-security/AUD-002-preflight.sql`,
  `AUD-002-rollback.sql`, `AUD-002-rollback-runbook.md`,
  `AUD-002-rollback-verification.md`
- `src/db/migrations/0000_baseline.sql`,
  `src/db/migrations/0001_aud002_composite_tenant_fk.sql`,
  `src/db/migrations/meta/_journal.json`
- `src/db/schema/dtks.ts`, `src/db/schema/suplemen.ts`,
  `src/db/schema/family.ts`, `src/db/schema/resident.ts`,
  `src/db/schema/rumah-tangga.ts`, `src/db/schema/letters.ts`
- `src/features/penduduk/infrastructure/dtks-repository.ts`,
  `src/features/penduduk/infrastructure/suplemen-repository.ts`,
  `src/features/penduduk/infrastructure/penduduk-repository.ts`,
  `src/features/penduduk/application/dtks-use-cases.ts`
- `src/features/keluarga/infrastructure/keluarga-repository.ts`,
  `src/features/rumah-tangga/infrastructure/rumah-tangga-repository.ts`
- `src/db/tenant-composite-fk.integration.test.ts`,
  `src/db/migrasi-paritas.test.ts`, `vitest.integration.config.mts`
- `src/testing/migrasi-uji.ts`, `src/testing/db-test-guard.ts`,
  `src/testing/setup-integration.ts`

Jalur hapus yang ditelusuri: `deleteKeluarga`, `deletePenduduk`,
`deleteRumahTangga`, `deleteDtks`, `deleteLampiranDtks`, `deleteSuplemen`,
`removeSuplemenTerdata`, `lepasLampiran`, serta hapus desa (CASCADE).

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/db/schema/dtks.ts` | composite FK, unique `(village_id, id)`, `village_id` pada junction, index composite |
| `src/db/schema/suplemen.ts` | composite FK, unique parent, index composite |
| `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql` | migration baru: preflight fail-closed, backfill, FK/index |
| `src/db/migrations/meta/_journal.json`, `meta/0002_snapshot.json` | journal + snapshot Drizzle (hasil `drizzle-kit generate`, SQL diedit manual untuk guard/backfill) |
| `src/features/penduduk/infrastructure/dtks-repository.ts` | `tautkanLampiran` memverifikasi DTKS + lampiran desa; `lepasLampiran`/`listLampiranTerpasang` tenant-scoped |
| `src/features/keluarga/infrastructure/keluarga-repository.ts` | `deleteKeluarga` melepas `dtks.keluarga_id` dan `suplemen_terdata.keluarga_id` dalam transaksi |
| `src/features/penduduk/infrastructure/penduduk-repository.ts` | `deletePenduduk` melepas `suplemen_terdata.penduduk_id` dalam transaksi |
| `src/db/migrasi-paritas.test.ts` | pengurai paritas juga membaca `ALTER TABLE ... ADD` (kolom baru pada tabel lama) |
| `src/db/tenant-composite-fk.integration.test.ts` | daftar `*_tenant_fk` yang diharapkan ditambah 9 constraint B2 |
| `src/db/b2-dtks-suplemen-composite-fk.integration.test.ts` | test baru: constraint, lintas tenant, nullable, cascade, delete repository, lampiran, cascade hapus lampiran/Suplemen lewat repository, fixture per test (§10) |
| `src/db/b2-migration-guard-rollback.integration.test.ts` | test baru: preflight read-only, guard migration, rollback rehearsal, rehearsal backfill atas data legacy sah (§9) |
| `vitest.integration.config.mts` | mendaftarkan dua berkas test integrasi baru |
| `docs/reports/01-security/B2-preflight.sql` | preflight read-only untuk operator |
| `docs/reports/01-security/B2-rollback.sql` | inverse migration |
| `docs/reports/01-security/B2-rollback-runbook.md` | runbook rollback + batas keselamatan |

Tidak ada perubahan pada route, UI, atau modul lain.

## 4. Perubahan faktual

### 4.1 Migration dan integritas data

- Preflight di awal migration hanya membaca tabel domain dan menulis temuan ke
  `_b2_preflight_findings`. Bila ada temuan, statement pemicu sengaja gagal
  dengan `ER_DUP_ENTRY` sehingga pesan mysql2 memuat
  `B2 preflight gagal: <relasi> <orphan|cross-tenant> = <n> baris`. Tidak ada
  `CREATE ROUTINE`/`CREATE TRIGGER`, jadi tidak butuh privilege tambahan; tabel
  temuan sengaja ditinggalkan untuk diagnosis dan dibuat ulang pada retry.
- Tidak ada data legacy yang dihapus atau dipindahkan otomatis.
- `dtks_ref_lampiran.village_id` ditambahkan `NULL` → di-backfill dari DTKS
  parent → `MODIFY NOT NULL`, lalu FK cascade ke `villages`.
- Sembilan composite FK + tiga unique parent `(village_id, id)` + delapan index
  composite. Index dibuat sebelum FK agar InnoDB tidak membuat index otomatis
  dengan nama constraint (duplikat).
- `SET NULL` tidak dipakai pada composite key; referensi opsional memakai
  `RESTRICT` dan dilepas eksplisit oleh transaksi aplikasi.

### 4.2 Aplikasi

- `deleteKeluarga`: dalam satu transaksi, `residents.family_id`,
  `dtks.keluarga_id`, dan `suplemen_terdata.keluarga_id` di-`NULL`-kan sebelum
  baris `families` dihapus. `village_id` tidak disentuh.
- `deletePenduduk`: `residents` hanya dilepas dari `letters`,
  `resident_mutations`, dan `suplemen_terdata`; `dtks_anggota` tetap
  `RESTRICT` sehingga anggota DTKS harus dikeluarkan dari DTKS lebih dulu.
- `tautkanLampiran`: memverifikasi DTKS dan lampiran milik desa yang sama,
  melempar `"DTKS atau lampiran tidak ditemukan."` bila tidak, lalu menyisipkan
  junction dengan `village_id`.
- `lepasLampiran` dan `listLampiranTerpasang` memfilter junction berdasarkan
  `village_id`.
- Hapus RTM yang masih dirujuk DTKS tetap ditolak (perilaku baseline), lalu
  berhasil setelah DTKS dihapus.

## 5. Security / tenant

- Semua referensi lintas tenant ditolak database (error 1452) pada insert dan
  update, termasuk percobaan memindahkan `dtks.village_id` ke desa lain.
- Junction lampiran kini memiliki tenant key dan dua composite FK, jadi
  lampiran desa lain tidak dapat ditautkan walau lewat SQL langsung.
- CASCADE hanya menghapus child dengan desa yang sama; child tenant lain tetap
  utuh (dibuktikan test).
- `village_id` tidak pernah diubah oleh jalur set-null; test memeriksa nilainya
  tetap desa asal setelah referensi opsional di-`NULL`-kan.
- Negative test lintas tenant ada di kedua tingkat (database dan repository).
- Preflight dan guard tidak menampilkan NIK/nama/alamat; hanya ID internal dan
  `village_id`.

## 6. Validasi (perintah aktual dan hasil)

Database target seluruh perintah: `desa_test_b2_composite_20261112`
(disposable, dibuat dari nol), dengan `TEST_DATABASE_ACK=1`. Test guard/rollback
membuat `desa_test_b2_guard_*`, `desa_test_b2_rollback_*`,
`desa_test_b2_baseline_*` dan menghapusnya di `afterAll`.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npm run test` | PASS — 187 berkas, 1701 test |
| `TEST_DATABASE_URL=… TEST_DATABASE_ACK=1 npm run test:integration` | PASS — 14 berkas, 86 test |
| Preflight read-only pada database guard (data legacy sintetis) | PASS — 11 temuan, jumlah baris tidak berubah |
| Guard migration pada database dengan data legacy | PASS — migration berhenti, pesan memuat relasi + jumlah, tidak ada constraint/kolom terpasang |
| Rollback rehearsal + perbandingan schema baseline | PASS — kolom/index/FK keenam tabel identik dengan `0000+0001` |

Test yang dijalankan (semua PASS):

- `src/db/b2-dtks-suplemen-composite-fk.integration.test.ts` — 11 test (ditambah 2 test
  pada §10):
  keberadaan 9 composite FK + aturan delete, tidak ada FK single-column lama,
  `village_id` junction `NOT NULL` dan konsisten, insert lintas tenant (10
  kasus), update lintas tenant (7 kasus), referensi `NULL`, cascade DTKS,
  cascade Suplemen, repository lampiran, set-null hapus keluarga, set-null hapus
  penduduk, RESTRICT RTM.
- `src/db/b2-migration-guard-rollback.integration.test.ts` — 4 test (ditambah 1 test
  backfill pada §10).
- `src/db/tenant-composite-fk.integration.test.ts` — 10 test (regresi AUD-002).
- Suite integrasi lain (isolasi desa, referensi penduduk, GIS, surat, dsb.) —
  PASS.

Tidak ada FAIL dan tidak ada SKIPPED pada perintah di atas. Tidak ada galat yang
disembunyikan: kegagalan yang muncul selama pengembangan (kolom `villages.code`
terlalu panjang pada fixture, urutan nama FK, bentrok unique `dtks`, dan index
`suplemen_terdata` yang masih dipakai FK desa saat rollback) diperbaiki pada
kode/test, bukan dengan melemahkan assertion.

## 7. Keamanan database development

- `.env` `desa_dev` tidak pernah menjadi target: seluruh perintah integrasi
  memakai `TEST_DATABASE_URL` yang divalidasi `db-test-guard`
  (`desa_test_*`, loopback, `TEST_DATABASE_ACK=1`).
- Verifikasi read-only pada `desa_dev` setelah pekerjaan:
  `dtks_ref_lampiran` masih berkolom `id, dtks_id, lampiran_id` (tanpa
  `village_id`), tidak ada tabel bantu `_b2_*`, dan `desa_dev` tetap 148 tabel.
- Tidak ada migration yang dijalankan ke `desa_dev`, tidak ada reset/drop
  database development.

## 8. Risiko dan batasan tersisa

1. **DDL MySQL tidak atomik.** Bila 0002 gagal di tengah ALTER (mis. setelah
   sebagian FK terpasang), schema tertinggal parsial. Runbook meminta
   rekonsiliasi `information_schema`, bukan rerun membabi buta; inverse script
   bukan alat perbaikan parsial.
2. **Data legacy nyata belum dipindai.** Preflight diuji dengan data sintetis.
   Pada database berisi data, migration akan berhenti bila ada orphan/cross
   tenant; koreksi harus diputuskan operator. Belum ada backfill otomatis.
3. **Kehilangan koreksi manual junction saat rollback.** Inverse menghapus
   `dtks_ref_lampiran.village_id`; bila operator pernah mengoreksi nilai itu
   manual, nilai tersebut hilang dan akan diturunkan ulang dari DTKS saat 0002
   diterapkan lagi.
4. **Waktu CI bertambah.** Test guard/rollback menjalankan tiga migrasi dan
   rollback (± 50 detik) serta butuh MySQL 8 dengan izin `CREATE/DROP DATABASE`.
5. **Belum diverifikasi terhadap aplikasi berjalan.** Test memakai repository
   langsung; alur UI/route tidak diuji ulang dan tidak diubah.
6. **PR draft belum dibuat dari lingkungan ini.** `gh`/`GITHUB_TOKEN` tidak
   tersedia; lihat bagian penyerahan. Branch dan commit di-push ke GitHub.
7. `migrasi-paritas.test.ts` diperluas agar mengenali kolom dari
   `ALTER TABLE ... ADD`; ini menambah cakupan, bukan melonggarkan pemeriksaan.

## 9. Kesimpulan dan langkah berikutnya

Implementasi memenuhi seluruh relasi pada dokumen rencana, dengan bukti test
untuk insert/update lintas tenant, nullable, cascade per tenant, set-null
aplikasi, preflight read-only, guard migration, dan rollback. Database
development tidak disentuh.

Langkah berikutnya untuk reviewer:

1. Review diff dan laporan ini pada branch `task/B2-DTKS-SUPLEMEN-COMPOSITE-FK`.
2. Jalankan `B2-preflight.sql` pada salinan database nyata sebelum menjadwalkan
   0002; putuskan koreksi data bila ada temuan.
3. Setujui urutan deploy: aplikasi (yang sudah set-null eksplisit) lebih dulu,
   lalu migration, dengan jendela maintenance dan backup teruji.
4. Putuskan kelanjutan PR #11 (B2 query) dan PR B2 composite ini secara
   terpisah; keduanya belum di-merge.

## 10. Revisi 13 November 2026 — tindak lanjut review

Review read-only menemukan dua kesalahan dokumen operator dan dua celah bukti
test. Semuanya ditutup pada revisi ini; tidak ada perubahan pada schema,
migration, atau kode aplikasi.

### 10.1 Dokumen

| Temuan | Perbaikan |
| --- | --- |
| `B2-rollback-runbook.md` menyebut `src/db/migration-guard-rollback.integration.test.ts` (berkas tidak ada) | Diperbaiki menjadi `src/db/b2-migration-guard-rollback.integration.test.ts` pada kedua tempat |
| `B2-preflight.sql` mendokumentasikan `mysql ... < B2-preflight.sql` tanpa nama database, padahal semua tabel dirujuk tanpa kualifikasi | Perintah memakai placeholder `<nama_database_salinan>`, dengan catatan `ERROR 1046` bila kosong |

### 10.2 Test baru

- **Backfill 0002 di atas data legacy yang sah**
  (`b2-migration-guard-rollback.integration.test.ts`). Database disposable
  keempat (`desa_test_b2_backfill_*`) dimigrasi ke `0000 + 0001`, diisi dua desa
  dengan dua junction lampiran masing-masing (foreign key tetap aktif, jadi
  datanya benar-benar valid sebelum 0002), lalu dimigrasi penuh. Test
  memeriksa: migration berhasil, keempat baris junction terisi desa DTKS
  induknya (dua desa berbeda), kolom menjadi `NOT NULL`, tabel bantu preflight
  sudah dibuang, dan tepat 9 constraint `*_tenant_fk` terpasang.
- **Cascade hapus lampiran DTKS lewat repository**
  (`b2-dtks-suplemen-composite-fk.integration.test.ts`): `deleteLampiranDtks`
  pada lampiran yang masih tertaut harus menghapus junction-nya.
- **Cascade hapus Suplemen lewat repository** (berkas yang sama):
  `deleteSuplemen` pada Suplemen yang masih punya terdata harus menghapus baris
  `suplemen_terdata`.
- **Fixture factory per kebutuhan**
  (`b2-dtks-suplemen-composite-fk.integration.test.ts`). Sebelumnya satu fungsi
  seed membuat ± 40 baris pada tujuh tabel untuk tiap test, lalu dimutasi antar
  `it` (DTKS, Suplemen, keluarga, penduduk, RTM, dan lampiran dihapus oleh test
  yang berbeda), sehingga test hanya lulus bila urutannya utuh dan satu test
  tidak bisa dijalankan sendiri. Sekarang `beforeEach` hanya membuat dua desa,
  setiap test memanggil factory yang dipakainya (`buatRtm`, `buatDtks`,
  `buatAnggota`, `buatLampiran`, `buatJunction`, `buatSuplemen`, `buatTerdata`,
  dst.), dan `afterEach` membersihkan baris dengan urutan anak→parent. Assertion
  tidak dilonggarkan: test kolom junction justru ditambah pemeriksaan bahwa baris
  yang dibuatnya terisi desa pemilik DTKS.

### 10.3 Validasi revisi

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | PASS — 7 test |
| `npx vitest run --config vitest.integration.config.mts src/db/b2-` | PASS — 2 berkas, 18 test |
| Test tunggal `-t "tetap menolak hapus RTM"` | PASS — 1 test, 12 skipped |

Test integrasi dijalankan pada instance MySQL 8.0.30 disposable yang dibuat
khusus untuk verifikasi ini: datadir baru di `node_modules/.cache`, port 3309,
host loopback, tanpa data lain. Database target bernama `desa_test_b2_local`
sehingga lolos allowlist `db-test-guard`; instance dimatikan dan datadir dihapus
setelah verifikasi.

Hasil pada kode revisi ini (factory per kebutuhan):

- `b2-dtks-suplemen-composite-fk.integration.test.ts` — 13 test PASS.
  Durasi tidak dipakai sebagai klaim: run pertama mencatat 489 ms, run berikutnya
  pada lineage `main` terbaru mencatat 23 detik untuk berkas yang sama, jadi
  angka itu tidak stabil dan bukan bukti percepatan. Yang berkurang secara
  struktural hanya jumlah baris seed per test.
- `b2-migration-guard-rollback.integration.test.ts` — 5 test PASS (termasuk
  rehearsal backfill atas data legacy sah).
- Test RTM dijalankan sendirian (`-t`) juga PASS, dan setelah suite selesai
  tidak ada baris fixture tersisa (`villages` "Desa B2 %" = 0,
  `dtks_ref_lampiran` = 0).

Tidak ada FAIL dan tidak ada SKIPPED pada kedua berkas B2. Suite integrasi
penuh tidak dijalankan ulang pada revisi ini; berkas di luar B2 tidak berubah
sejak run sebelumnya.

Saat push, branch ini ternyata sudah di-force-push maintainer ke `947d5f5`
(lineage `main` terbaru dengan merge PR #11). Perubahan §10 di-port ke atas
lineage tersebut dan dijalankan ulang di sana: 18 test B2 PASS, `typecheck`,
`lint`, dan `format:check` PASS.
