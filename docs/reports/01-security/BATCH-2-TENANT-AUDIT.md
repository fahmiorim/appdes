# Batch 2 — Audit Isolasi Tenant (Revisi terhadap `main` Terbaru)

- **Repository:** `fahmiorim/appdes`
- **Base branch:** `main`
- **Base commit audit ulang:** `a80be9ff2aed2740663a11db9d2f097d23f50094`
- **Branch audit:** `task/AUD-021-batch2-tenant-audit`
- **Tanggal audit awal:** 12 November 2026
- **Tanggal audit ulang:** 14 November 2026
- **Mode:** audit statis read-only terhadap source code dan schema `main`; tidak ada
  perubahan aplikasi, schema, migration, atau database.
- **Batasan:** database development (`desa_dev`) tidak diakses atau diubah; tidak
  ada test runtime yang dijalankan pada putaran audit ini.

## 0. Mengapa laporan ini direvisi

Laporan versi pertama disusun terhadap base `615712b`. Setelah itu `main` menerima
rangkaian PR perbaikan tenant: #11 dan #12 (DTKS & Suplemen), #13–#18 (hardening
Bantuan, Kelompok, Keluarga, Rumah Tangga, Statistik), #23, #25, dan #27
(composite FK). Akibatnya banyak temuan pada laporan awal sudah tidak sesuai kode.

Revisi ini memeriksa ulang setiap temuan terhadap `a80be9f` dan menandainya:

- **Sudah diperbaiki** — predicate/composite FK sudah ada; disertai bukti.
- **False positive** — klaim awal tidak sesuai kode, bahkan pada saat itu.
  Setelah diperiksa ulang terhadap base `615712b`, tidak ada temuan yang masuk
  kategori ini: seluruh klaim awal memang sesuai kode saat itu.
- **Masih terbuka** — belum ada perbaikan pada `main`.

Temuan kode dipisahkan dari rekomendasi hardening. Tidak ada temuan yang
dinyatakan sebagai kerentanan aktif bila predicate tenant sudah ada.

## 1. Ringkasan status

| Status | Jumlah |
|---|---|
| Sudah diperbaiki | 11 |
| False positive | 0 |
| Masih terbuka (kode/skema) | 1 |
| Rekomendasi hardening (bukan temuan) | 4 |

Tidak ada temuan kode terbuka pada DTKS, Suplemen, Bantuan, Kelompok, Keluarga,
Rumah Tangga, dan Statistik. Yang tersisa adalah pekerjaan skema/test untuk modul
di luar cakupan putaran ini.

## 2. DTKS

| ID | Lokasi | Status | Bukti pada `a80be9f` |
|---|---|---|---|
| D2-01 | `dtks-repository.ts:listDtks` | **Sudah diperbaiki** (PR #11) | JOIN `rumahTangga`, `families`, dan `regions` memakai `and(eq(<tabel>.id, ...), eq(<tabel>.villageId, villageId))`; kepala RTM diambil dengan `eq(residents.villageId, villageId)`; pencarian nama/NIK memakai `EXISTS` yang juga menyertakan `residents.villageId`. |
| D2-02 | `dtks-repository.ts:listDtksAnggota` | **Sudah diperbaiki** (PR #11) | `innerJoin(dtks, ... eq(dtks.villageId, villageId))` dan `innerJoin(residents, ... eq(residents.villageId, villageId))`; WHERE menyertakan `dtksAnggota.villageId`. |
| D2-03 | `dtks-repository.ts:listDtksEkspor` | **Sudah diperbaiki** (PR #11) | JOIN RTM, wilayah, KK, dan alias kepala RTM semuanya tenant-scoped; agregat anggota memakai `innerJoin` ke `dtks` dengan `villageId` plus filter `dtksAnggota.villageId`. |
| D2-04 | `dtks-repository.ts:listLampiranTerpasang` | **Sudah diperbaiki** (PR #12) | JOIN `dtksRefLampiran` → `dtksLampiran` menyertakan `eq(dtksRefLampiran.villageId, dtksLampiran.villageId)`, dan JOIN ke `dtks` menyertakan `eq(dtksRefLampiran.villageId, dtks.villageId)`. |
| D2-05 | `dtks-repository.ts:tautkanLampiran/lepasLampiran` | **Sudah diperbaiki** (PR #12) | `villageId` tidak lagi `void`; `pastikanLampiranDanDtksSatuDesa()` memvalidasi DTKS dan lampiran ke desa aktif sebelum insert/delete, dan operasi tulis memakai `dtksRefLampiran.villageId`. |
| D2-06 | `schema/dtks.ts` | **Sudah diperbaiki** (PR #12) | Composite FK + unique parent key: `dtks (village_id, rtm_id)`, `dtks (village_id, keluarga_id)`, `dtks_anggota (village_id, dtks_id)`, `dtks_anggota (village_id, penduduk_id)`; diterapkan di migrasi `0002_b2_dtks_suplemen_composite_fk.sql`. |
| D2-07 | `schema/dtks.ts:dtks_ref_lampiran` | **Sudah diperbaiki** (PR #12) | Pada base `615712b` tabel ini memang hanya punya `dtks_id`/`lampiran_id` (temuan valid). Migrasi `0002` kini menambahkan `village_id` (baris 160–167, `NOT NULL` + FK ke `villages`), index `(village_id, dtks_id)`/`(village_id, lampiran_id)`, dan composite FK ke `dtks` serta `dtks_lampiran` (baris 201–205). |

## 3. Suplemen

| ID | Lokasi | Status | Bukti pada `a80be9f` |
|---|---|---|---|
| S2-01 | `suplemen-repository.ts:listSuplemen` | **Sudah diperbaiki** (PR #11) | Subquery `terdataCount` kini berbunyi `... WHERE suplemen_terdata.id_suplemen = suplemen.id AND suplemen_terdata.village_id = ${villageId}` (baris 47). |
| S2-02 | `suplemen-repository.ts:listSuplemenTerdata` | **Sudah diperbaiki** (PR #11) | `innerJoin` ke `suplemen` dengan `eq(suplemen.villageId, villageId)`; `leftJoin` ke `residents` dan `families` masing-masing dengan predicate `villageId`; WHERE memakai `suplemenTerdata.villageId`. ID referensi yang gagal di-resolve tidak dikembalikan ke pemanggil. |
| S2-03 | `suplemen-publik-repository.ts:getSuplemenPublikBySlug` | **Sudah diperbaiki** (PR #11) | Query data terdata memakai `eq(suplemenTerdata.suplemenId, row.id)` **dan** `eq(suplemenTerdata.villageId, villageId)` (baris 72). |
| S2-04 | `schema/suplemen.ts` | **Sudah diperbaiki** (PR #12) | Composite FK `(village_id, id_suplemen)`, `(village_id, penduduk_id)`, `(village_id, keluarga_id)`; unique key `suplemen_village_id_uq`. |
| S2-05 | `schema/suplemen.ts` perilaku delete | **Sudah diperbaiki** (PR #12) | FK composite memakai `ON DELETE restrict` (bukan `SET NULL`, karena `village_id` bagian dari key); pelepasan referensi dilakukan transaksi aplikasi. Ini keputusan desain yang tercatat di schema dan migrasi. |

## 4. Bantuan, Kelompok, Keluarga, Rumah Tangga, Statistik

| Modul | Status | Bukti pada `a80be9f` |
|---|---|---|
| Bantuan | **Sudah diperbaiki** (#13, #25) | Seluruh JOIN peserta ke program, penduduk, KK, RTM, kelompok, dan wilayah memakai predicate `villageId`; `updateBantuan(villageId, id, ...)` dan `deleteBantuan(villageId, id)` membatasi dengan `village_id` (bukan lagi ID saja). |
| Kelompok | **Sudah diperbaiki** (#14, #23) | JOIN anggota/penduduk/kategori tenant-scoped; `updateKelompok` memanggil `assertKategoriTenant`, `deleteKelompok` memakai `(village_id, id)`; query publik anggota memakai `kelompokAnggota.villageId`. |
| Keluarga | **Sudah diperbaiki** (#15, #29) | JOIN kepala keluarga memakai `(family_id, village_id, relation)`; JOIN wilayah memakai `(families.region_id, regions.village_id = villageId)`; guard `validateKeluargaRegion` menolak `regionId` desa lain saat create/update. |
| Rumah Tangga | **Sudah diperbaiki** (#16, #30) | JOIN wilayah memakai `(rumahTangga.regionId, regions.villageId)`; `validateRumahTanggaRegion` menolak wilayah desa lain. |
| Statistik | **Sudah diperbaiki** (#17) | Seluruh JOIN `regions` pada laporan statistik memakai `and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId))`; JOIN bantuan peserta juga tenant-scoped. |

## 5. Temuan yang masih terbuka

| ID | Lokasi | Temuan | Catatan |
|---|---|---|---|
| B2-R1 | `src/db/schema/*` (modul di luar DTKS/Suplemen/Bantuan/Kesehatan/Surat/Permohonan/Mutasi/GIS/Keluarga/RTM) | Composite FK tenant belum ada untuk modul seperti inventaris, kehadiran, kontak, lapak, notifikasi, survey, bumindes, dokumen warga, dan pemilihan. | Ini pekerjaan **defense-in-depth skema**, bukan bukti kebocoran query. Query layer modul tersebut belum diaudit ulang pada putaran ini, jadi statusnya "belum diverifikasi", bukan "rentan". |

Daftar 44 relasi deferred pada laporan AUD-002 tidak lagi akurat sebagai satu
angka: sebagian sudah ditutup oleh #12, #23, #25, dan #27. Hitungan ulang relasi
yang benar-benar tersisa perlu dilakukan bersama audit query modul terkait.

## 6. Rekomendasi hardening (bukan temuan aktif)

1. **Audit entrypoint menyeluruh:** meski `dal.ts` sudah membaca user aktif,
   status desa, dan permission dari database, setiap Server Action/Route Handler
   baru tetap perlu diuji dengan ID milik desa lain (read/create/update/delete/export).
2. **Rollout composite FK bertahap:** lanjutkan per modul dengan preflight data
   lintas desa, backfill/cleanup, forward + rollback migration, dan test pada
   database disposable.
3. **Regression test lintas tenant** untuk modul yang belum punya: inventaris,
   kehadiran, kontak, lapak, notifikasi, survey, bumindes, dokumen warga, pemilihan.
4. **Cleanup data legacy:** baris lintas desa yang sudah terlanjur ada perlu
   laporan preflight sebelum constraint baru dipaksakan.

## 7. Kondisi test saat ini

Klaim lama "integration test DTKS/Suplemen belum terdaftar" sudah tidak berlaku.
`vitest.integration.config.mts` pada `a80be9f` memuat:

- `src/db/b2-dtks-suplemen-composite-fk.integration.test.ts`
- `src/features/penduduk/infrastructure/dtks-tenant-isolation.integration.test.ts`
- `src/features/penduduk/infrastructure/suplemen-tenant-isolation.integration.test.ts`
- ditambah test tenant isolation bantuan, kelompok, keluarga, rumah tangga,
  statistik, RBAC, GIS, surat, dan permohonan.

Test tersebut tidak dijalankan pada putaran audit ini (read-only, tanpa database
disposable di sesi ini). Statusnya terdaftar, bukan terverifikasi lulus.

## 8. Keterbatasan

- Audit statis: tidak ada query yang dieksekusi terhadap MySQL.
- Cakupan putaran ini adalah temuan laporan Batch 2 dan lima modul yang diminta
  maintainer; modul lain belum diverifikasi ulang.
- Tidak ada perubahan kode, schema, migration, atau database pada PR ini.

## 9. Kesimpulan

Dari 12 temuan pada laporan awal: **11 sudah diperbaiki** di `main` melalui PR
#11–#18, #23, #25, #27, #29, dan #30, dan **tidak ada false positive** — seluruh
klaim awal memang sesuai kode pada base `615712b`. Tidak ada temuan query
terbuka pada modul yang diperiksa ulang. Sisa pekerjaan bersifat hardening skema
dan test untuk modul di luar cakupan, bukan perbaikan kebocoran tenant yang
sedang aktif.
