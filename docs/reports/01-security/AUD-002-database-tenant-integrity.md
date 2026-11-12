# AUD-002 — Database-level Tenant Integrity

## Status

Implemented and ready for review. Migration, schema, application cleanup, and
integration tests are on the task branch. No production database was accessed or
changed, no legacy data was backfilled or deleted, and nothing was merged or
deployed.

- **Task:** GitHub Issue #6 — AUD-002, enforce tenant integrity at database level.
- **Tanggal:** 12 November 2026.
- **Branch:** `task/AUD-002-composite-tenant-integrity`.
- **Base commit:** `5a3f7502be6a71d0809600fa14b07c9f4807f1e5`.
- **Commit kode/implementasi:** `884d649`.
- **Commit laporan:** commit dokumentasi setelah `884d649` pada branch yang sama.
- **Database uji:** `desa_test_aud002` pada `127.0.0.1:3306` (disposable).
- **Database dev yang diperiksa preflight:** `desa_dev` (read-only).
- **Production:** tidak disentuh.

## Analisis kondisi awal

Foreign key lama hanya memakai satu kolom, misalnya
`residents.family_id -> families.id`. Constraint tersebut memastikan parent ada,
tetapi tidak memastikan parent berada di `village_id` yang sama. Application
layer sudah memfilter `villageId`, namun direct insert/update, import, restore,
atau bug pada repository masih dapat membuat referensi lintas tenant.

Kendala utama penggantian constraint adalah `village_id` bertipe `NOT NULL`.
Composite foreign key dengan `ON DELETE SET NULL` akan mencoba mengosongkan
`village_id` juga dan dapat gagal atau merusak tenant column. Karena itu relasi
yang sebelumnya `SET NULL` diubah menjadi `RESTRICT` pada database, lalu
repository melakukan pelepasan referensi secara eksplisit di dalam transaksi
sebelum parent dihapus.

Audit menemukan 63 relasi tenant-bound yang dapat diperiksa dengan preflight:

- 19 relasi inti ditegakkan pada migration `0001`.
- 44 relasi lain diaudit dan didokumentasikan sebagai deferred.
- 2 relasi Cdesa (`cdesa_rincian`, `cdesa_mutasi`) sudah memakai composite FK
  sebelum task ini dan tidak diubah.
- Beberapa tabel anak tidak memiliki `village_id` dan tidak dapat memakai
  composite FK tanpa perubahan schema/backfill; isolasinya bergantung pada
  parent. Ini dicatat sebagai keterbatasan, bukan diam-diam dianggap aman.

## Keputusan desain

### Relasi yang ditegakkan

Parent mendapatkan unique key `(village_id, id)` sebagai referenced key. Child
memakai composite foreign key `(village_id, parent_id)`. Dengan pola ini,
reference lintas tenant ditolak database walaupun aplikasi salah mengirim ID.

### Strategi `ON DELETE`

- **CASCADE** dipertahankan untuk child yang memang tidak punya siklus hidup
  independen: `permohonan_surat` terhadap `residents`/`letter_types`,
  `ibu_hamil` dan `bulanan_anak` terhadap `kia`.
- **RESTRICT** dipakai untuk relasi yang sebelumnya `SET NULL`, karena composite
  `SET NULL` tidak aman terhadap `village_id NOT NULL`. Repository melepas
  referensi lebih dulu dalam transaksi.
- **RESTRICT** yang sudah ada dipertahankan untuk `letters.type_id`,
  `kia.ibu_id`, `kia.anak_id`, `ibu_hamil.posyandu_id`, dan
  `bulanan_anak.posyandu_id`.
- `ON UPDATE` tetap `NO ACTION`; primary key `id` tidak diubah oleh aplikasi.

### Alur delete aplikasi

- `deleteKeluarga`: lepas `residents.family_id`, lalu hapus KK.
- `deleteRumahTangga`: lepas `residents.rtm_id` dan `rtm_level`, lalu hapus RTM.
- `deletePenduduk`: lepas `letters.resident_id` dan
  `resident_mutations.resident_id`, lalu hapus penduduk.
- `deleteSurat`: lepas `permohonan_surat.letter_id`, lalu hapus surat.
- `deleteWilayah`: lepas referensi `families`, `residents`, `rtm`,
  `resident_mutations.from_region_id`, dan `resident_mutations.to_region_id`,
  lalu hapus wilayah.
- `deleteKia`: guard lama dipertahankan; menolak penghapusan bila masih dipakai
  ibu hamil/anak.

Semua cleanup memakai `villageId` pada `WHERE`, sehingga tidak melepas data
tenant lain. Bila ada referensi lintas tenant legacy, delete akan gagal dan
preflight akan melaporkannya; tidak ada pembersihan otomatis.

## Inventory relasi yang ditegakkan

| Relasi anak → induk | ON DELETE lama | ON DELETE baru | FK |
|---|---|---|---|
| `families.region_id → regions.id` | SET NULL | RESTRICT | `families_region_tenant_fk` |
| `residents.family_id → families.id` | SET NULL | RESTRICT | `residents_family_tenant_fk` |
| `residents.rtm_id → rtm.id` | SET NULL | RESTRICT | `residents_rtm_tenant_fk` |
| `residents.region_id → regions.id` | SET NULL | RESTRICT | `residents_region_tenant_fk` |
| `rtm.region_id → regions.id` | SET NULL | RESTRICT | `rtm_region_tenant_fk` |
| `resident_mutations.resident_id → residents.id` | SET NULL | RESTRICT | `resident_mutations_resident_tenant_fk` |
| `resident_mutations.from_region_id → regions.id` | SET NULL | RESTRICT | `resident_mutations_from_region_tenant_fk` |
| `resident_mutations.to_region_id → regions.id` | SET NULL | RESTRICT | `resident_mutations_to_region_tenant_fk` |
| `letters.type_id → letter_types.id` | RESTRICT | RESTRICT | `letters_type_tenant_fk` |
| `letters.resident_id → residents.id` | SET NULL | RESTRICT | `letters_resident_tenant_fk` |
| `permohonan_surat.resident_id → residents.id` | CASCADE | CASCADE | `permohonan_surat_resident_tenant_fk` |
| `permohonan_surat.letter_type_id → letter_types.id` | CASCADE | CASCADE | `permohonan_surat_type_tenant_fk` |
| `permohonan_surat.letter_id → letters.id` | SET NULL | RESTRICT | `permohonan_surat_letter_tenant_fk` |
| `kia.ibu_id → residents.id` | RESTRICT | RESTRICT | `kia_ibu_tenant_fk` |
| `kia.anak_id → residents.id` | RESTRICT | RESTRICT | `kia_anak_tenant_fk` |
| `ibu_hamil.posyandu_id → posyandu.id` | RESTRICT | RESTRICT | `ibu_hamil_posyandu_tenant_fk` |
| `ibu_hamil.kia_id → kia.id` | CASCADE | CASCADE | `ibu_hamil_kia_tenant_fk` |
| `bulanan_anak.posyandu_id → posyandu.id` | RESTRICT | RESTRICT | `bulanan_anak_posyandu_tenant_fk` |
| `bulanan_anak.kia_id → kia.id` | CASCADE | CASCADE | `bulanan_anak_kia_tenant_fk` |

Unique key parent yang ditambahkan: `families_village_id_uq`,
`kia_village_id_uq`, `posyandu_village_id_uq`, `letter_types_village_id_uq`,
`letters_village_id_uq`, `regions_village_id_uq`, `residents_village_id_uq`,
dan `rtm_village_id_uq`. Tiga index composite ditambahkan pada
`resident_mutations` untuk kolom referensi baru.

## Inventory relasi deferred

Relasi berikut tetap memakai single-column FK. Semuanya telah masuk preflight,
tetapi belum diubah pada migration ini karena perubahan `ON DELETE` dan cleanup
per modul memerlukan test masing-masing. Tidak ada perilaku yang diubah secara
diam-diam. Tabel di bawah merangkum 44 relasi; beberapa baris menggabungkan
beberapa kolom dalam satu modul.

### Kandidat CASCADE (aman secara struktur, belum diuji per modul)

| Relasi | Alasan belum ditegakkan |
|---|---|
| `bantuan_peserta.program_id`, `.resident_id`, `.family_id`, `.rtm_id`, `.kelompok_id` | Modul bantuan punya fixture cross-tenant yang sengaja dipakai untuk test isolasi query; perlu penyesuaian fixture dan test delete sebelum enforce. |
| `bukti_pengiriman_notifikasi.pengaduan_id` | Perlu test delete pengaduan. |
| `bumindes_tanah_kas_mutasi.tanah_kas_id` | Perlu test delete tanah kas. |
| `bumindes_item.buku_id` | Perlu test delete buku. |
| `galeri_foto.album_id` | Perlu test delete album. |
| `dokumen_warga.resident_id` | Perlu test delete penduduk dan berkas. |
| `dtks_anggota.dtks_id` | Perlu test delete DTKS. |
| `inventaris_mutasi.inventaris_id` | Perlu test delete inventaris. |
| `kehadiran_izin.resident_id` | Perlu test delete penduduk. |
| `kelompok_anggota.kelompok_id`, `.resident_id` | Perlu test delete kelompok/penduduk. |
| `anggota_grup_kontak.grup_id`, `.kontak_id` | Perlu test delete grup/kontak. |
| `lapak_produk.lapak_id` | Perlu test delete lapak. |
| `pemilihan_kandidat.pemilihan_id` | Perlu test delete pemilihan. |
| `suplemen_terdata.id_suplemen` | Perlu test delete suplemen. |
| `verifikasi_kontak.resident_id` | Perlu test delete penduduk/OTP. |
| `warga_pesan.resident_id` | Perlu test delete penduduk/percakapan. |

### Kandidat RESTRICT (perlu dipertahankan)

| Relasi | Alasan belum ditegakkan |
|---|---|
| `dtks.rtm_id → rtm.id` | Modul DTKS perlu test delete RTM dan pesan error yang jelas. |
| `dtks_anggota.penduduk_id → residents.id` | Modul DTKS perlu test delete penduduk. |

### Kandidat SET NULL lama → RESTRICT + cleanup

| Relasi | Alasan belum ditegakkan |
|---|---|
| `analisis_indikator.kategori_id → analisis_kategori.id` | Perlu cleanup transaksi saat kategori analisis dihapus. |
| `perangkat_desa.jabatan_id → jabatan_perangkat.id` | Perlu cleanup saat jabatan dihapus. |
| `berita.kategori_id → berita_kategori.id` | Perlu cleanup saat kategori berita dihapus. |
| `dtks.keluarga_id → families.id` | Perlu cleanup saat KK dihapus; beririsan dengan modul DTKS. |
| `family_member_logs.family_id → families.id` | Log riwayat perlu dipertahankan dengan `family_id` null. |
| `family_member_logs.resident_id → residents.id` | Log riwayat perlu dipertahankan dengan `resident_id` null. |
| `area.ref_polygon → polygon.id` | Perlu cleanup saat layer polygon dihapus. |
| `incoming_letters.classification_id → letter_classifications.id` | Perlu cleanup saat klasifikasi surat dihapus. |
| `inventaris.kategori_id → inventaris_kategori.id` | Perlu cleanup saat kategori inventaris dihapus. |
| `kelompok.category_id → kelompok_master.id` | Perlu cleanup saat kategori kelompok dihapus. |
| `kontak.resident_id → residents.id` | Perlu cleanup saat penduduk dihapus. |
| `lapak.resident_id → residents.id` | Perlu cleanup saat penduduk dihapus. |
| `letter_dinas.classification_id → letter_classifications.id` | Perlu cleanup saat klasifikasi surat dihapus. |
| `letter_number_archive.letter_id → letters.id` | Arsip nomor harus tetap ada dengan `letter_id` null. |
| `letter_types.classification_id → letter_classifications.id` | Perlu cleanup saat klasifikasi surat dihapus. |
| `notifikasi_terkirim.resident_id → residents.id` | Bukti kirim harus tetap ada dengan `resident_id` null. |
| `outgoing_letters.classification_id → letter_classifications.id` | Perlu cleanup saat klasifikasi surat dihapus. |
| `pendapat.resident_id → residents.id` | Pendapat publik harus tetap ada dengan `resident_id` null. |
| `suplemen_terdata.penduduk_id`, `.keluarga_id` | Perlu cleanup saat penduduk/KK dihapus. |

### Tidak dapat memakai composite FK tanpa perubahan struktur

- `pembangunan_dokumentasi` tidak memiliki `village_id`; isolasi bergantung pada
  `pembangunan_proyek`.
- `dtks_ref_lampiran` tidak memiliki `village_id`; isolasi bergantung pada
  `dtks`.
- Tabel anak survei tidak memiliki `village_id`; isolasi bergantung pada parent
  survei.
- Foreign key ke katalog global (`users`, `roles`, `agama`, `pekerjaan`,
  `pendidikan`, dan sejenisnya) bukan relasi tenant dan tidak termasuk inventory.

## Preflight read-only

File: `docs/reports/01-security/AUD-002-preflight.sql`.

Preflight memeriksa 63 relasi dan membedakan:

- `orphan`: parent ID tidak ada.
- `cross-tenant`: parent ID ada, tetapi `village_id` parent berbeda.

Query hanya membaca dan hanya mengembalikan ID internal serta `village_id`; tidak
mengembalikan nama, NIK, alamat, atau data pribadi. Transaksi dibuka
`READ ONLY` dan diakhiri `ROLLBACK`.

Perintah yang dijalankan:

```bash
mysql -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 \
  desa_test_aud002 < docs/reports/01-security/AUD-002-preflight.sql

mysql -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 \
  desa_dev < docs/reports/01-security/AUD-002-preflight.sql
```

Hasil:

- `desa_dev`: 0 baris invalid.
- `desa_test_aud002`: 0 baris invalid setelah pembersihan.
- Satu baris `bantuan_peserta` cross-tenant ditemukan pada database disposable,
  kemungkinan sisa cleanup test yang gagal sebelumnya. Baris itu dihapus hanya
  dari database disposable; tidak ada data dev atau production yang diubah.
- Tidak ada data legacy tidak konsisten yang dilaporkan pada `desa_dev`.

Bila preflight production menemukan baris, migration tidak boleh dijalankan
sebelum remediasi manual. Jumlah dan jenis temuan harus dicatat; task ini tidak
melakukan backfill atau pembersihan otomatis.

## Migration

File: `src/db/migrations/0001_aud002_composite_tenant_fk.sql`.

Isi:

- Menghapus 19 single-column FK lama.
- Menambahkan 8 unique key parent `(village_id, id)`.
- Menambahkan 19 composite FK `(village_id, parent_id)`.
- Menambahkan 3 index composite pada `resident_mutations`.
- Snapshot dan journal Drizzle diperbarui.

Migration diuji pada database disposable kosong `desa_test_aud002` dengan:

```bash
DATABASE_URL='mysql://root:@127.0.0.1:3306/desa_test_aud002' \
BETTER_AUTH_SECRET='rahasia-uji-coba-minimal-32-karakter' \
NODE_ENV=test npm run db:migrate
```

### Urutan deployment yang direkomendasikan

1. Backup penuh database dan verifikasi restore pada salinan.
2. Jalankan preflight pada salinan production; wajib 0 temuan.
3. Deploy application code yang sudah memiliki cleanup transaksi lebih dulu.
   Kode lama tidak memiliki cleanup, sehingga delete parent dapat gagal setelah
   `RESTRICT` terpasang.
4. Jalankan migration pada maintenance window. MySQL DDL dapat memicu metadata
   lock dan tidak seluruh `ALTER TABLE` bersifat online; durasi belum diukur.
5. Verifikasi constraint, jalankan smoke test delete KK/RTM/penduduk/surat/
   wilayah, lalu jalankan preflight kembali.

### Backfill

Tidak ada backfill. Migration hanya menambah/mengganti constraint. Data yang
tidak konsisten harus diperbaiki terpisah dan tidak boleh dihapus otomatis.

### Rollback

MySQL DDL tidak berada dalam satu transaksi. Bila migration gagal di tengah,
database dapat berada pada keadaan sebagian. Rollback yang aman adalah restore
dari backup, atau inverse script yang diuji pada salinan lebih dulu:

1. Hentikan deployment aplikasi bila perlu.
2. Drop 19 composite FK baru.
3. Drop 3 index composite dan 8 unique key.
4. Buat kembali 19 single-column FK lama dengan `ON DELETE` semula.
5. Verifikasi constraint dan data, lalu deploy ulang kode lama bila diperlukan.

Inverse script belum dibuat sebagai artifact migration dan belum diuji; ini
risiko operasional yang harus ditutup sebelum production. Jangan mengandalkan
rollback otomatis dari Drizzle untuk DDL MySQL.

## File yang diperiksa

- `src/db/schema/*.ts` untuk seluruh tabel tenant-scoped dan relasi FK.
- `src/db/migrations/0000_baseline.sql`, journal, dan snapshot.
- `src/features/keluarga/`, `penduduk/`, `rumah-tangga/`, `wilayah/`, `surat/`,
  `kesehatan/`, `bantuan/`, `dtks/`, `inventaris/`, `kelompok/`, `kontak/`, dan
  modul lain yang memiliki parent delete atau referensi tenant.
- `src/testing/migrasi-uji.ts`, `src/testing/db-test-guard.ts`,
  `vitest.integration.config.mts`.
- `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`,
  `docs/MASTER_ROADMAP.md`, serta laporan AUD-003 dan AUD-007 sebagai pembanding.

## File yang diubah

| File | Alasan |
|---|---|
| `src/db/schema/family.ts` | Unique parent key dan composite FK region. |
| `src/db/schema/resident.ts` | Unique parent key dan composite FK family/RTM/region. |
| `src/db/schema/rumah-tangga.ts` | Unique parent key dan composite FK region. |
| `src/db/schema/region.ts` | Unique parent key `(village_id, id)`. |
| `src/db/schema/letters.ts` | Composite FK jenis surat dan penduduk. |
| `src/db/schema/letter-types.ts` | Unique parent key. |
| `src/db/schema/permohonan-surat.ts` | Composite FK penduduk, jenis surat, dan surat. |
| `src/db/schema/kesehatan.ts` | Unique parent key serta composite FK KIA/posyandu. |
| `src/db/schema/resident-mutation.ts` | Tiga composite FK dan tiga index; single FK dihapus. |
| `src/db/migrations/0001_aud002_composite_tenant_fk.sql` | Migration constraint. |
| `src/db/migrations/meta/0001_snapshot.json`, `_journal.json` | Metadata Drizzle. |
| `src/db/tenant-composite-fk.integration.test.ts` | Test direct insert/update, NULL, delete, rollback, preflight. |
| `src/features/keluarga/application/use-cases.ts` | Meneruskan `villageId` ke repository. |
| `src/features/keluarga/infrastructure/keluarga-repository.ts` | Cleanup transaksi sebelum delete KK. |
| `src/features/rumah-tangga/application/use-cases.ts` | Meneruskan `villageId`. |
| `src/features/rumah-tangga/infrastructure/rumah-tangga-repository.ts` | Cleanup transaksi sebelum delete RTM. |
| `src/features/penduduk/application/use-cases.ts` | Meneruskan `villageId`. |
| `src/features/penduduk/infrastructure/penduduk-repository.ts` | Lepas surat dan mutasi sebelum delete penduduk. |
| `src/features/surat/infrastructure/surat-repository.ts` | Lepas permohonan sebelum delete surat. |
| `src/features/wilayah/infrastructure/wilayah-repository.ts` | Cleanup wilayah, KK, penduduk, RTM, dan mutasi. |
| `src/features/kesehatan/infrastructure/kesehatan-repository.ts` | Filter `villageId` konsisten pada delete KIA. |
| `src/features/bantuan/integrasi-warga.test.ts` | Cleanup fixture menyesuaikan RESTRICT. |
| `vitest.integration.config.mts` | Mendaftarkan test AUD-002. |
| `docs/reports/01-security/AUD-002-preflight.sql` | Preflight 63 relasi. |
| `docs/reports/01-security/AUD-002-database-tenant-integrity.md` | Laporan hasil audit, implementasi, dan validasi. |

## Test dan validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Format | `npm run format:check` | PASS |
| Unit test | `npm run test:unit` | PASS — 187 file, 1701 test |
| Integration test | `TEST_DATABASE_URL='mysql://root:@127.0.0.1:3306/desa_test_aud002' TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration` | PASS — 10 file, 44 test |
| Build | `npm run build` | PASS — warning tracing `whatsapp-baileys` sudah ada dan tidak terkait task |
| Migration disposable | `npm run db:migrate` pada `desa_test_aud002` | PASS |
| Preflight dev | Query read-only pada `desa_dev` | PASS — 0 temuan |
| Preflight disposable | Query read-only pada `desa_test_aud002` | PASS — 0 temuan |
| Production | Tidak dijalankan | SKIPPED — dilarang |
| Rollback drill | Tidak dijalankan | SKIPPED — belum ada inverse script teruji |

Test baru mencakup:

- Direct insert lintas tenant untuk keluarga, RTM, wilayah, surat, KIA, dan
  mutasi tanpa melewati use case.
- Direct update lintas tenant dan pemeriksaan bahwa nilai lama tidak berubah.
- Referensi `NULL` tetap diterima tanpa mengubah `village_id`.
- Delete parent ditolak `RESTRICT`, lalu berhasil setelah repository cleanup.
- Rollback transaksi ketika composite FK menolak insert.
- Preflight mendeteksi cross-tenant legacy yang dibuat dengan FK check
  dimatikan sementara; data dibersihkan dan FK check diaktifkan kembali.
- Negative test memastikan aplikasi tidak dapat mengandalkan filter UI saja.

## Diff

Commit `884d649`: 25 file, +19.927 / -69 baris. Sebagian besar penambahan berasal
 dari snapshot Drizzle yang di-generate (`0001_snapshot.json`, 17.949 baris).
 Perubahan logika aplikasi kecil dan terpusat pada cleanup delete transaksional.

## Risiko tersisa

1. **44 relasi deferred masih hanya dijaga application layer.** Direct insert
   lintas tenant pada modul tersebut belum ditolak database.
2. **Migration DDL tidak atomik.** Kegagalan di tengah dapat meninggalkan
   sebagian constraint terpasang. Backup dan uji pada clone wajib.
3. **Lock/downtime belum diukur.** 19 `ALTER TABLE` pada tabel besar dapat
   memblokir operasi; perlu maintenance window dan pemantauan metadata lock.
4. **Inverse/rollback script belum dibuat dan belum diuji.**
5. **Race condition delete belum diuji dengan beban konkuren.** Cleanup dan
   delete berada dalam transaksi, tetapi deadlock/lock wait belum diukur.
6. **Modul lain masih dapat menahan delete penduduk.** Composite FK ini tidak
   mengubah guard modul seperti KIA, DTKS, atau bantuan; kegagalan delete dari
   constraint lain harus ditangani terpisah.
7. **PR #3 dan #5 belum merge.** File `penduduk-repository.ts`,
   `wilayah-repository.ts`, dan area mutasi beririsan dengan AUD-003/AUD-007;
   konflik merge mungkin terjadi dan harus diselesaikan manual.
8. **Preflight production belum dijalankan.** Hasil 0 hanya berlaku untuk
   `desa_dev` dan database disposable.

## Kesimpulan

Implementasi menegakkan tenant ownership di database untuk graph inti penduduk,
keluarga, RTM, wilayah, surat, dan kesehatan. Migration, preflight, test
negatif, cleanup delete, dan rollback transaksi telah dijalankan pada database
disposable. Perubahan siap direview, tetapi belum siap merge atau production
sampai reviewer menyetujui migration plan, preflight production, backup, dan
pengujian rollback.

## Rekomendasi langkah berikutnya

1. Review diff dan putuskan apakah 44 relasi deferred masuk fase lanjutan.
2. Jalankan preflight pada salinan production dan catat jumlah/jenis temuan.
3. Buat serta uji inverse migration pada clone sebelum deployment.
4. Ukur lock duration pada salinan data berukuran production.
5. Setelah PR #3 dan #5 merge, selesaikan konflik dan ulangi full validation.
