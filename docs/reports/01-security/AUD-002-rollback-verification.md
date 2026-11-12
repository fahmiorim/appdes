# AUD-002 — Forward/Inverse Migration Verification

## Ringkasan dan status

Forward migration dan inverse migration AUD-002 telah dieksekusi pada MySQL
disposable. Inverse awal berhasil secara exit status, tetapi review
`information_schema.STATISTICS` menemukan bahwa 14 index pendukung FK yang
dibuat otomatis oleh InnoDB tertinggal. SQL inverse diperbaiki untuk menghapus
14 index tersebut secara eksplisit, lalu diuji ulang. Sesudah perbaikan, seluruh
schema hasil rollback cocok persis dengan schema baseline pada metadata kolom,
foreign key beserta aksi referensial, dan index.

- **Task:** AUD-002 — Execute Forward/Inverse Migration Verification.
- **Tanggal:** 12 November 2026.
- **Branch:** `task/AUD-002-rollback-runbook`.
- **Base migration branch:** `task/AUD-002-composite-tenant-integrity`.
- **Base commit:** `33f706a54d5785509511dabf114bbca30c6b8416`.
- **PR utama:** [#7 — Enforce database-level tenant integrity](https://github.com/fahmiorim/appdes/pull/7).
- **PR rollback yang diaudit:** [#8 — Add inverse migration and rollback runbook](https://github.com/fahmiorim/appdes/pull/8).
- **Versi MySQL:** `8.0.30` (MySQL Community Server, Windows x86_64).
- **Production:** tidak diakses.
- **`desa_dev` dan database lain yang sudah ada:** tidak diubah.

## Environment dan database disposable

Server lokal terverifikasi dengan:

```text
mysql.exe Ver 8.0.30 for Win64 on x86_64
SELECT VERSION() -> 8.0.30
Host -> 127.0.0.1:3306
```

Sebelum integration test, `DATABASE_URL` dan `TEST_DATABASE_URL` dari shell
terdeteksi unset. Semua test integration selanjutnya menerima DSN eksplisit
yang menunjuk `127.0.0.1` dan database `desa_test_aud002_rollback`; guard
`TEST_DATABASE_ACK=1` dan `NODE_ENV=test` juga digunakan.

Database lokal disposable yang dibuat khusus untuk rehearsal:

| Database | Tujuan | Operasi |
|---|---|---|
| `desa_test_aud002_rollback` | Forward/inverse normal | Dibuat kosong, baseline dimuat, forward lalu inverse |
| `desa_test_aud002_rollback_fail` | Failure injection | Baseline + forward + fixture, inverse dihentikan paksa di tengah |
| `desa_test_aud002_rollback_restore` | Recovery/restore | Dipulihkan dari backup penuh, kemudian inverse dijalankan |
| `desa_test_aud002_rollback_baseline` | Pembanding murni | Fresh baseline tanpa AUD-002 |

Semua nama database tersebut secara eksplisit diawali `desa_test_` dan hanya
dibuat atau diubah untuk task ini. Tidak ada database lain yang dihapus.

## Catatan persiapan baseline

`0000_baseline.sql` adalah berkas migration Drizzle dan memiliki pemisah
`--> statement-breakpoint`. Menjalankannya langsung melalui CLI MySQL gagal
pada baris 14 dengan syntax error 1064 di marker tersebut, setelah hanya satu
tabel (`agenda_kegiatan`) sempat dibuat. Database disposable persiapan itu
kemudian dibuat ulang dan marker dihapus ke file eksekusi sementara sebelum
baseline dijalankan. File migration yang committed tidak diubah.

Perintah persiapan setara yang digunakan:

```bash
sed 's/--> statement-breakpoint//g' \
  src/db/migrations/0000_baseline.sql > tmp/aud002-rollback/0000_baseline.exec.sql
mysql -h 127.0.0.1 -P 3306 -u root \
  desa_test_aud002_rollback < tmp/aud002-rollback/0000_baseline.exec.sql
```

Baseline fresh berhasil dibuat: 147 tabel, 234 FK, 1431 kolom, 454 index.
File hasil preprocessing berada pada direktori kerja sementara lokal dan tidak
dimasukkan ke commit.

## Forward migration

Forward migration `src/db/migrations/0001_aud002_composite_tenant_fk.sql`
dijalankan pada schema baseline di `desa_test_aud002_rollback`. Pemisah
Drizzle juga dihapus pada salinan eksekusi sementara; isi DDL tidak diubah.

```bash
sed 's/--> statement-breakpoint//g' \
  src/db/migrations/0001_aud002_composite_tenant_fk.sql \
  > tmp/aud002-rollback/0001_forward.exec.sql
mysql -h 127.0.0.1 -P 3306 -u root \
  desa_test_aud002_rollback < tmp/aud002-rollback/0001_forward.exec.sql
```

Hasil: exit status 0.

### Verifikasi object forward

`information_schema.KEY_COLUMN_USAGE` dan `REFERENTIAL_CONSTRAINTS`:

- **19/19** composite FK `*_tenant_fk` terpasang.
- **0/19** single-column FK baseline AUD-002 masih ada.
- FK tenant tetap menuju dua kolom parent `(village_id, id)`.
- Aksi delete/update cocok dengan migration AUD-002.

`information_schema.STATISTICS`:

- **8/8** unique key tambahan `(village_id, id)` terpasang.
- **3/3** index eksplisit pada `resident_mutations` terpasang.
- **14** index pendukung otomatis InnoDB ditemukan, bernama mengikuti 14
  composite FK yang tidak mempunyai index child dengan prefix yang sesuai.
- Tidak ada index baseline yang hilang setelah forward.

| Objek unik | Hasil |
|---|---:|
| Constraint `%_tenant_fk` | 19 |
| Baseline FK dari daftar 19 nama | 0 |
| Index `*_village_id_uq` yang berbeda | 8 |
| Tiga index `resident_mutations_village_*_idx` | 3 |
| Index implisit bernama sesuai constraint tenant FK | 14 |

### Aksi `ON DELETE` composite forward

| Constraint | Aksi delete |
|---|---|
| `families_region_tenant_fk` | RESTRICT |
| `bulanan_anak_posyandu_tenant_fk` | RESTRICT |
| `bulanan_anak_kia_tenant_fk` | CASCADE |
| `ibu_hamil_posyandu_tenant_fk` | RESTRICT |
| `ibu_hamil_kia_tenant_fk` | CASCADE |
| `kia_ibu_tenant_fk` | RESTRICT |
| `kia_anak_tenant_fk` | RESTRICT |
| `letters_type_tenant_fk` | RESTRICT |
| `letters_resident_tenant_fk` | RESTRICT |
| `permohonan_surat_resident_tenant_fk` | CASCADE |
| `permohonan_surat_type_tenant_fk` | CASCADE |
| `permohonan_surat_letter_tenant_fk` | RESTRICT |
| `residents_family_tenant_fk` | RESTRICT |
| `residents_rtm_tenant_fk` | RESTRICT |
| `residents_region_tenant_fk` | RESTRICT |
| `resident_mutations_resident_tenant_fk` | RESTRICT |
| `resident_mutations_from_region_tenant_fk` | RESTRICT |
| `resident_mutations_to_region_tenant_fk` | RESTRICT |
| `rtm_region_tenant_fk` | RESTRICT |

Semua aksi update yang diperiksa adalah `NO ACTION`.

### Preflight

`docs/reports/01-security/AUD-002-preflight.sql` dieksekusi pada database
forward disposable. Hasilnya: **0 orphan/cross-tenant rows**. Database kosong
setelah baseline/forward, sesuai ekspektasi.

## Temuan inverse awal dan perbaikan

Inverse SQL awal (versi dari PR #8) berhasil exit 0, mengembalikan nama FK dan
menghapus 8 unique key serta 3 index eksplisit. Namun, sesudah `DROP FOREIGN
KEY`, InnoDB mempertahankan index child yang dibuat otomatis untuk memenuhi
kebutuhan composite FK. Ditemukan **14 index tambahan** bernama sama dengan
constraint `*_tenant_fk`; akibatnya schema tidak sama dengan baseline meskipun
constraint sudah diganti.

Perbaikan pada `docs/reports/01-security/AUD-002-rollback.sql` menambahkan 14
`DROP INDEX` eksplisit sebelum penghapusan tiga index eksplisit dan delapan
unique key:

- `bulanan_anak_kia_tenant_fk`
- `bulanan_anak_posyandu_tenant_fk`
- `families_region_tenant_fk`
- `ibu_hamil_kia_tenant_fk`
- `ibu_hamil_posyandu_tenant_fk`
- `kia_anak_tenant_fk`
- `kia_ibu_tenant_fk`
- `letters_resident_tenant_fk`
- `permohonan_surat_letter_tenant_fk`
- `permohonan_surat_resident_tenant_fk`
- `permohonan_surat_type_tenant_fk`
- `residents_region_tenant_fk`
- `residents_rtm_tenant_fk`
- `rtm_region_tenant_fk`

Ketiga FK komposit `resident_mutations` menggunakan index eksplisit baru
sebagai index child, sehingga setelah FK dilepas dan tiga index tersebut
kemudian di-drop, tidak tertinggal index FK bernama implisit.

## Inverse migration dan perbandingan schema

Setelah database disposable direset dan baseline + forward dijalankan ulang,
inverse diperbaiki dieksekusi dengan stop-on-error:

```bash
mysql -h 127.0.0.1 -P 3306 -u root \
  desa_test_aud002_rollback < docs/reports/01-security/AUD-002-rollback.sql
```

Hasil: exit status 0.

### Verifikasi 19 FK baseline

Hasil query gabungan terhadap `information_schema.KEY_COLUMN_USAGE` dan
`information_schema.REFERENTIAL_CONSTRAINTS` menunjukkan **19/19** constraint
baseline kembali dengan nama, kolom child, parent, kolom parent, `DELETE_RULE`,
dan `UPDATE_RULE` sama dengan definisi baseline.

| Nama constraint baseline | Kolom child | Parent | DELETE_RULE |
|---|---|---|---|
| `families_region_id_regions_id_fk` | `region_id` | `regions.id` | SET NULL |
| `bulanan_anak_posyandu_id_posyandu_id_fk` | `posyandu_id` | `posyandu.id` | NO ACTION |
| `bulanan_anak_kia_id_kia_id_fk` | `kia_id` | `kia.id` | CASCADE |
| `ibu_hamil_posyandu_id_posyandu_id_fk` | `posyandu_id` | `posyandu.id` | NO ACTION |
| `ibu_hamil_kia_id_kia_id_fk` | `kia_id` | `kia.id` | CASCADE |
| `kia_ibu_id_residents_id_fk` | `ibu_id` | `residents.id` | NO ACTION |
| `kia_anak_id_residents_id_fk` | `anak_id` | `residents.id` | NO ACTION |
| `letters_type_id_letter_types_id_fk` | `type_id` | `letter_types.id` | RESTRICT |
| `letters_resident_id_residents_id_fk` | `resident_id` | `residents.id` | SET NULL |
| `permohonan_surat_resident_id_residents_id_fk` | `resident_id` | `residents.id` | CASCADE |
| `permohonan_surat_letter_type_id_letter_types_id_fk` | `letter_type_id` | `letter_types.id` | CASCADE |
| `permohonan_surat_letter_id_letters_id_fk` | `letter_id` | `letters.id` | SET NULL |
| `residents_family_id_families_id_fk` | `family_id` | `families.id` | SET NULL |
| `residents_rtm_id_rtm_id_fk` | `rtm_id` | `rtm.id` | SET NULL |
| `residents_region_id_regions_id_fk` | `region_id` | `regions.id` | SET NULL |
| `resident_mutations_resident_id_residents_id_fk` | `resident_id` | `residents.id` | SET NULL |
| `resident_mutations_from_region_id_regions_id_fk` | `from_region_id` | `regions.id` | SET NULL |
| `resident_mutations_to_region_id_regions_id_fk` | `to_region_id` | `regions.id` | SET NULL |
| `rtm_region_id_regions_id_fk` | `region_id` | `regions.id` | SET NULL |

Tidak ada `*_tenant_fk` AUD-002 yang tersisa.

### Verifikasi 8 unique keys dan 3 index

- **8/8** key `*_village_id_uq` tidak ada sesudah inverse.
- **3/3** index eksplisit `resident_mutations_village_resident_idx`,
  `resident_mutations_village_from_region_idx`, dan
  `resident_mutations_village_to_region_idx` tidak ada sesudah inverse.
- **14/14** index implisit FK tenant tidak ada sesudah inverse.
- Tidak ada index baseline yang hilang.

### Diff metadata seluruh schema

Schema pembanding dibuat dari baseline segar pada
`desa_test_aud002_rollback_baseline`. Schema sesudah inverse berasal dari
`desa_test_aud002_rollback`. Perbandingan memakai metadata seluruh schema,
bukan hanya tabel AUD-002:

| Metadata | Baseline | Sesudah inverse | Perbandingan |
|---|---:|---:|---|
| Base tables | 147 | 147 | sama |
| Kolom (baris `information_schema.COLUMNS`) | 1431 | 1431 | byte-for-byte query TSV sama |
| FK (baris hasil query unik, termasuk aksi referensial) | 234 | 234 | byte-for-byte query TSV sama |
| Index (baris unik table/name/columns/type) | 454 | 454 | byte-for-byte query TSV sama |

`diff -q` pada hasil query seluruh kolom, FK, dan index masing-masing
menghasilkan exact match. Perbandingan meliputi FK non-AUD-002 juga, sehingga
constraint lain yang hilang/berubah akan terlihat.

Query index menggunakan `information_schema.STATISTICS` dengan
`TABLE_NAME`, `INDEX_NAME`, `NON_UNIQUE`, urutan `COLUMN_NAME`, dan
`INDEX_TYPE`; query FK menggunakan `KEY_COLUMN_USAGE` dan
`REFERENTIAL_CONSTRAINTS`.

## Failure and recovery test

Pada `desa_test_aud002_rollback_fail`, baseline + forward migration dijalankan,
fixture sintetis kecil dimasukkan, lalu full backup dibuat sebelum failure:

```bash
mysqldump -h 127.0.0.1 -P 3306 -u root \
  --single-transaction --routines --triggers --add-drop-table --skip-comments \
  desa_test_aud002_rollback_fail > tmp/aud002-rollback/forward-backup.sql
```

Ukuran backup: **200,817 bytes**. Untuk mensimulasikan operator melanjutkan
secara tidak tepat setelah DDL parsial, script terkendali menjalankan 25 DDL
invers pertama, lalu mengulang `DROP FOREIGN KEY` yang sudah sukses. CLI MySQL
tanpa `--force` berhenti dengan:

```text
ERROR 1091 (42000): Can't DROP 'families_region_tenant_fk'; check that column/key exists
```

Kondisi parsial yang diperiksa:

- 0 composite FK tersisa (19 FK sudah di-drop).
- 6 FK baseline kembali; 13 FK baseline belum kembali.
- 25 index tambahan masih ada (14 index implisit + 3 index eksplisit + 8 unique).
- Data fixture masih utuh: desa 1, penduduk 1, surat 1, permohonan 1, KIA 1.

Runbook mengharuskan stop, inspect metadata, dan recovery terkontrol; script
inverse tidak boleh dijalankan ulang dari awal atau dilanjutkan tanpa rekonsiliasi
state. Untuk rehearsal ini, recovery dipilih dengan restore backup penuh ke
schema disposable yang baru.

## Backup/restore drill

Backup di atas dipulihkan ke database baru `desa_test_aud002_rollback_restore`:

```bash
mysql -h 127.0.0.1 -P 3306 -u root \
  desa_test_aud002_rollback_restore < tmp/aud002-rollback/forward-backup.sql
```

Hasil:

- Restore exit status 0, waktu sekitar **9 detik** pada mesin lokal.
- 147 tabel kembali.
- 19 composite FK AUD-002 kembali.
- Seluruh fixture kembali dengan count yang sama (1 desa, 1 penduduk, 1 surat,
  1 permohonan, 1 KIA).
- Inverse dijalankan pada hasil restore: exit status 0, sekitar **2 detik**.
- Metadata schema hasil restore + inverse dibanding fresh baseline kembali
  exact match untuk kolom, FK/actions, dan index.

Durasi hanya menunjukkan schema kosong dengan satu fixture lokal; bukan estimasi
untuk volume production.

## Application validation

| Check | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Format | `npm run format:check` | PASS |
| Unit | `npm run test:unit` | PASS — 187 file, 1701 tests |
| Integration | `TEST_DATABASE_URL='mysql://root:@127.0.0.1:3306/desa_test_aud002_rollback' TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration` | PASS — 10 files, 44 tests |
| Build | `DATABASE_URL='mysql://root:@127.0.0.1:3306/desa_test_aud002_rollback' BETTER_AUTH_SECRET='(dummy test secret)' NODE_ENV=test npm run build` | PASS — warning dynamic filesystem tracing di `whatsapp-baileys.ts:93` |

Integration DB direset ke schema kosong sebelum test; suite memasang migration
melalui guard disposable. Build/typecheck/lint/unit tidak menjalankan migration.
Tidak ada secret production yang digunakan.

## Perubahan dalam follow-up ini

- `docs/reports/01-security/AUD-002-rollback.sql`: tambah 14 `DROP INDEX`
  untuk index otomatis InnoDB; perjelas jumlah implicit index di komentar.
- `docs/reports/01-security/AUD-002-rollback-runbook.md`: perbarui status
  berdasarkan rehearsal nyata dan tambahkan prosedur memeriksa semua index,
  bukan hanya 11 index eksplisit.
- `docs/reports/01-security/AUD-002-rollback-verification.md`: laporan ini.
- `src/db/migrations/0000_baseline.sql` tidak diubah.
- Tidak ada source application code, schema Drizzle, atau migration forward yang
  diubah pada follow-up ini.

## Masalah dan perbaikan

1. Marker Drizzle `--> statement-breakpoint` bukan komentar SQL yang dapat
   dieksekusi MySQL CLI secara langsung. Untuk rehearsal, marker dihapus pada
   salinan sementara; file baseline/migration tidak diubah.
2. Inverse awal menghapus FK tetapi membiarkan 14 implicit InnoDB indexes.
   Ditambahkan 14 drop eksplisit, lalu forward/inverse diulang dan seluruh
   schema dibandingkan ulang.
3. Simulasi failure memperlihatkan MySQL DDL non-atomic sebagaimana runbook
   peringatkan. Stop-on-error dan restore backup pulih dengan benar.

## Risiko tersisa

- Tidak ada pengukuran metadata-lock, waktu DDL pada volume production, deadlock,
  maupun beban tulis konkuren; rehearsal memakai schema kosong dan fixture kecil.
- Rollback menghapus tenant-level enforcement AUD-002. Cross-tenant reference
  kembali mungkin setelah inverse; batasi write path selama rollback.
- Recovery yang didemonstrasikan memakai full backup restore ke database baru;
  prosedur cutover/restore untuk deployment nyata harus direncanakan operator.
- Inverse hanya aman jika state awal benar-benar lengkap pada forward migration
  AUD-002. Untuk forward yang parsial, jangan jalankan inverse ini tanpa
  rekonsiliasi berdasarkan `information_schema`.
- PR #3/AUD-003 dan PR #5/AUD-007 tetap terpisah dan tidak diubah.

## Kesimpulan

**PASS untuk rehearsal disposable.** SQL inverse versi diperbaiki mengembalikan
semua FK, aksi referensial, kolom, dan index persis seperti baseline pada MySQL
8.0.30; failure injection berhenti pada statement error dan backup restore
memulihkan schema serta fixture. Hasil ini membuktikan prosedur pada clone
kosong berukuran lokal, bukan kesiapan deployment production. Tidak ada merge,
deploy, atau akses production.
