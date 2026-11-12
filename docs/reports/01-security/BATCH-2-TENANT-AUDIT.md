# Batch 2 — Audit Isolasi Tenant (Read-only)

- **Repository:** `fahmiorim/appdes`
- **Base branch:** `main`
- **Base commit:** `615712b87a76798cb85a9f5cc26b7b03483cecf1`
- **Branch audit:** `task/AUD-021-batch2-tenant-audit`
- **Tanggal:** 12 November 2026
- **Mode:** audit source code dan schema; belum ada perubahan aplikasi atau database.
- **Batasan:** database development existing, termasuk `desa_dev`, tidak diakses atau diubah.

## 1. Tujuan

Melanjutkan AUD-002/AUD-003/AUD-007 dengan memetakan celah isolasi antar-desa yang masih tersisa. Sasaran utamanya adalah memastikan data tenant A tidak dapat dibaca, dihitung, ditautkan, diubah, atau dihapus melalui jalur tenant B, termasuk bila terdapat baris legacy yang relasinya tidak konsisten.

Audit ini membedakan tiga lapisan:
1. **Database integrity:** composite foreign key dan unique parent key.
2. **Repository/query isolation:** predicate tenant pada JOIN, subquery, aggregate, update, dan delete.
3. **Application authorization:** user, permission, dan tenant context pada setiap entrypoint.

## 2. Ringkasan hasil

### Temuan prioritas tinggi — DTKS

| ID | Lokasi | Temuan | Dampak potensial |
|---|---|---|---|
| D2-01 | `dtks-repository.ts:listDtks` | JOIN `rtm`, `families`, dan `regions` hanya berdasarkan ID. JOIN kepala RTM ke `residents` juga belum menyertakan tenant. | Baris legacy dengan relasi lintas desa dapat memengaruhi label, filter dusun, atau identitas kepala RTM. |
| D2-02 | `dtks-repository.ts:listDtksAnggota` | JOIN `dtks_anggota` ke `residents` hanya berdasarkan `pendudukId`; WHERE membatasi tenant pada tabel anak saja. | Identitas penduduk tenant lain dapat tampil pada anggota DTKS legacy yang tidak konsisten. |
| D2-03 | `dtks-repository.ts:listDtksEkspor` | JOIN RTM, wilayah, KK, dan alias kepala RTM belum semuanya membatasi tenant. Agregat anggota mengambil baris berdasarkan `dtksId` saja. | Ekspor/rekap dapat membaca label atau jumlah dari relasi yang tidak cocok tenant. |
| D2-04 | `dtks-repository.ts:listLampiranTerpasang` | Query memfilter tenant DTKS, tetapi tidak memastikan `dtksLampiran.villageId` sama dengan tenant DTKS. | Lampiran tenant lain dapat ikut ditampilkan jika link legacy lintas desa ada. |
| D2-05 | `dtks-repository.ts:tautkanLampiran/lepasLampiran` | Parameter `villageId` tidak digunakan (`void villageId`); operasi link hanya menggunakan ID DTKS dan lampiran. | Validasi tenant bergantung pada caller dan tidak ditegakkan pada repository. |
| D2-06 | `schema/dtks.ts` | FK `dtks.rtm_id`, `dtks.keluarga_id`, `dtks_anggota.dtks_id`, dan `dtks_anggota.penduduk_id` masih single-column. | Database belum menolak semua referensi lintas desa untuk relasi DTKS. |
| D2-07 | `schema/dtks.ts:dtks_ref_lampiran` | Tabel penghubung tidak membawa `village_id`. | Tidak bisa langsung memakai composite FK tenant tanpa perubahan struktur/backfill atau strategi validasi lain. |

### Temuan prioritas tinggi — Suplemen

| ID | Lokasi | Temuan | Dampak potensial |
|---|---|---|---|
| S2-01 | `suplemen-repository.ts:listSuplemen` | Subquery `terdataCount` menghitung berdasarkan `id_suplemen` saja, tidak mengikat `village_id` dengan parent suplemen. | Jumlah data tenant lain berpotensi masuk hitungan jika terdapat relasi legacy lintas tenant. |
| S2-02 | `suplemen-repository.ts:listSuplemenTerdata` | JOIN ke `residents` dan `families` hanya berdasarkan ID. | Nama/NIK/nomor KK dari tenant lain berpotensi tampil pada label terdata. |
| S2-03 | `suplemen-publik-repository.ts:getSuplemenPublikBySlug` | Pengambilan kolom isian menggunakan `suplemenId` saja, tanpa predicate `villageId`. | Metadata kolom publik dapat terpengaruh oleh baris terdata tenant lain yang menunjuk ID suplemen sama. |
| S2-04 | `schema/suplemen.ts` | FK `suplemen_terdata.id_suplemen`, `penduduk_id`, dan `keluarga_id` masih single-column. | Database belum memastikan semua referensi berasal dari desa yang sama. |
| S2-05 | `schema/suplemen.ts` | FK penduduk/keluarga menggunakan `SET NULL`; perubahan menjadi composite FK perlu desain cleanup yang mempertahankan perilaku penghapusan dan nilai nullable. | Perlu migrasi dan test delete terpisah, bukan sekadar mengganti definisi FK. |

### Temuan tambahan lintas modul

| Modul | Lokasi yang perlu ditangani | Temuan awal |
|---|---|---|
| Bantuan | `bantuan-repository.ts` | JOIN peserta ke penduduk/keluarga/RTM/kelompok dan wilayah belum konsisten menyertakan tenant predicate. `updateBantuanRow` dan `deleteBantuanRow` menulis berdasarkan ID saja setelah pemeriksaan scope di use case; repository sebaiknya tetap menerima dan menerapkan `villageId`. |
| Kelompok | `kelompok-repository.ts` | JOIN anggota ke penduduk/kelompok/kategori belum konsisten tenant-scoped. Beberapa update/delete repository memakai ID saja setelah validasi use case. Perlu predicate tenant sebagai pertahanan berlapis. |
| Keluarga | `keluarga-repository.ts` | JOIN kepala keluarga dan wilayah berdasarkan ID saja. Composite FK Batch 1 melindungi relasi region dan penduduk pada data baru, tetapi query tetap perlu aman untuk data legacy. |
| Rumah Tangga | `rumah-tangga-repository.ts` | JOIN wilayah berdasarkan ID saja. Composite FK region sudah ada; tambahkan predicate tenant agar pembacaan legacy tetap terisolasi. |
| Statistik | `statistik-repository.ts` | Beberapa JOIN wilayah/penduduk perlu diperiksa satu per satu terhadap predicate tenant dan parent scope. |
| Autentikasi/RBAC | `dal.ts`, `rbac-repository.ts` | Gerbang utama mengambil user aktif dari DB dan memeriksa permission. Audit lanjutan perlu memeriksa seluruh entrypoint dan operasi pengelolaan role/module, bukan menyimpulkan aman hanya dari gerbang pusat. |

## 3. Relasi deferred AUD-002

Laporan AUD-002 sebelumnya mencatat 44 relasi single-column yang belum ditegakkan dengan composite FK. Kelompok utamanya:
- Bantuan: `bantuan_peserta` ke program, penduduk, keluarga, RTM, dan kelompok.
- DTKS: RTM, anggota DTKS, penduduk, dan keluarga.
- Suplemen: parent suplemen, penduduk, dan keluarga.
- Kelompok, inventaris, kehadiran, kontak, lapak, surat, notifikasi, GIS, Bumindes, galeri, dokumen warga, dan pemilihan.
- Relasi `SET NULL` memerlukan keputusan cleanup/retensi data sebelum diubah menjadi `RESTRICT`.
- `pembangunan_dokumentasi`, `dtks_ref_lampiran`, dan anak survei tidak membawa `village_id`; pendekatannya harus diputuskan berdasarkan parent dan kebutuhan query, bukan dipaksakan menjadi composite FK tanpa desain migrasi.

Daftar relasi lengkap dan alasan deferred tetap tercatat pada `AUD-002-database-tenant-integrity.md`.

## 4. Authorization dan tenant context

Pemeriksaan awal pada `src/lib/dal.ts` menunjukkan:
- User aktif dan `villageId/roleId` dibaca ulang dari database, bukan hanya mengandalkan cookie sesi.
- `requirePermission(resource, action)` memeriksa izin efektif.
- Use case modul Bantuan yang diperiksa memanggil permission guard dan menyelesaikan `villageId` sebelum memanggil repository.

Hal ini merupakan fondasi yang baik, tetapi belum cukup untuk menyatakan semua entrypoint aman. Audit berikutnya harus memeriksa Server Action, Route Handler, Server Component, dan repository yang dapat dipanggil dari lebih dari satu jalur. Setiap operasi tulis harus menggunakan tenant context hasil sesi/host yang tervalidasi, bukan ID tenant dari input klien.

## 5. Kesenjangan test

- Konfigurasi `vitest.integration.config.mts` saat ini belum mendaftarkan integration test khusus DTKS atau Suplemen.
- Test domain dan test use case publik Suplemen yang ada belum membuktikan isolasi database dua desa.
- Pola test integrasi AUD-003/AUD-007 sudah tersedia: database disposable, dua/lebih desa sintetis, baris legacy lintas tenant dibuat hanya melalui koneksi test terpisah, lalu diuji pada list/detail/export/count/write.
- Test Batch 2 harus menggunakan `TEST_DATABASE_URL` dan guard database disposable. Jangan menyentuh `desa_dev` atau database development existing.

## 6. Urutan implementasi yang direkomendasikan

1. **B2-DTKS-QUERY:** perbaiki seluruh JOIN, EXISTS, aggregate, export, dan lampiran agar tenant-scoped; tambahkan regression test legacy cross-tenant.
2. **B2-DTKS-DB:** tambahkan composite FK untuk relasi DTKS yang memiliki `village_id`; tambahkan unique parent key bila belum ada; desain khusus untuk `dtks_ref_lampiran`.
3. **B2-SUPLEMEN-QUERY:** perbaiki subquery count, JOIN, detail publik, impor, dan seluruh jalur baca/tulis.
4. **B2-SUPLEMEN-DB:** composite FK untuk parent suplemen, penduduk, dan keluarga; rancang perilaku delete/null secara eksplisit.
5. **B2-CROSS-MODULE:** prioritaskan Bantuan dan Kelompok, lalu repository lain dari daftar 44 deferred.
6. **B2-AUTH-REGRESSION:** audit entrypoint dan uji akses desa A terhadap ID desa B untuk read/create/update/delete/export.

Setiap task harus berupa perubahan terfokus, memiliki test positif dan negatif, dan tidak menggabungkan banyak modul dalam satu PR besar. Migration wajib memiliki preflight, forward, inverse/rollback, serta test pada database disposable yang baru.

## 7. Batasan dan status

- Audit ini membaca source code/schema pada `main` dan dokumen audit terdahulu.
- Belum menjalankan test lokal atau integration test karena tidak ada akses ke workspace lokal dan database disposable milik developer pada sesi ini.
- Belum ada perubahan kode aplikasi, schema, migration, atau database.
- Branch ini hanya memuat laporan audit.
- Tidak ada merge ke `main`.
