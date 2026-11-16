# AUD-034 — Runbook hapus desa setelah composite FK RESTRICT

- **Status:** prosedur manual untuk DBA/operator. Belum pernah dijalankan pada data produksi.
- **Berlaku sejak:** migration `0008_b4c1_restrict_relations_composite_fk.sql` (Batch 4C-1); diperluas untuk `0009` (Batch 4C-2a) bila PR terkait sudah merged.
- **Prasyarat:** backup terverifikasi, salinan data untuk rehearsal, dan persetujuan tertulis pemilik data.
- **Bukan jalur aplikasi:** tidak ada use case hapus desa di aplikasi. Runbook ini hanya untuk pembersihan manual/DBA (mis. desa uji, pembatalan provisioning, atau penghapusan data sesuai kebijakan).

## 1. Mengapa urutan menjadi penting

`villages` adalah parent cascade untuk hampir semua tabel tenant. Sebelum Batch 4C-1, menghapus satu baris `villages` cukup mengandalkan cascade. Setelahnya, ada composite FK `ON DELETE RESTRICT` **antar-anak desa**:

| Constraint | Child | Parent | Aturan |
| --- | --- | --- | --- |
| `berita_kategori_tenant_fk` | `berita.kategori_id` | `berita_kategori` | `RESTRICT` |
| `perangkat_desa_jabatan_tenant_fk` | `perangkat_desa.jabatan_id` | `jabatan_perangkat` | `RESTRICT` |

InnoDB **tidak menjamin urutan** penghapusan antar-tabel anak saat cascade berjalan. Bila `berita_kategori` diproses lebih dulu sementara `berita` masih menunjuknya, `DELETE FROM villages` gagal dengan `ER_ROW_IS_REFERENCED_2` (1451). Probe Batch 4C-1 membuktikan hasilnya tidak konsisten: satu relasi kebetulan lolos, relasi lain gagal.

Karena itu, referensi yang dilindungi `RESTRICT` harus dilepas **sebelum** baris `villages` dihapus. Cascade setelahnya aman karena tidak ada lagi anak yang menahan parent.

## 2. Constraint yang harus diperhatikan

### 2.1 Wajib (Batch 4C-1, `0008`)

Lepas atau hapus child berikut lebih dulu:

1. `berita` — baris desa tersebut (atau set `kategori_id = NULL`).
2. `perangkat_desa` — baris desa tersebut (atau set `jabatan_id = NULL`).

Baru setelah itu `berita_kategori` dan `jabatan_perangkat` boleh ikut ter-cascade bersama `villages`.

### 2.2 Tambahan bila Batch 4C-2a (`0009`) sudah merged

`letter_classifications` juga dilindungi `RESTRICT`. Lepas/hapus lebih dulu:

1. `incoming_letters`
2. `letter_dinas`
3. `letter_types`
4. `outgoing_letters`

Aplikasi melakukan ini lewat `deleteKlasifikasi` per klasifikasi. Untuk hapus desa, keempat tabel dapat dihapus per `village_id` sebelum `villages`.

## 3. Constraint RESTRICT lain

Database juga memuat `RESTRICT` lama dari batch sebelumnya (mis. `residents → families`, `families/rtm → regions`, `letters → letter_types`, `dtks_*`, `kia_*`). Jangan mengandalkan daftar statis di dokumen ini. Selalu jalankan query blocker pada §4.2 sebelum menghapus; query itu membaca `information_schema` sehingga tetap benar bila constraint berubah.

## 4. Prosedur

### 4.1 Persiapan

1. Pastikan target bukan database produksi bersama. Untuk rehearsal, gunakan salinan disposable.
2. Buat backup penuh dan buktikan restore-nya berhasil.
3. Catat jumlah baris per tabel tenant untuk `village_id` target (lihat §4.2) sebagai pembanding setelah operasi.
4. Jadwalkan di luar jam sibuk; cascade besar memegang lock lama.

### 4.2 Periksa blocker (read-only)

Ganti `:village_id` dengan id desa. Query pertama mendaftar seluruh FK `RESTRICT`/`NO ACTION` yang menunjuk tabel tenant:

```sql
SELECT kcu.TABLE_NAME AS child_table,
       kcu.COLUMN_NAME AS child_column,
       kcu.REFERENCED_TABLE_NAME AS parent_table,
       kcu.REFERENCED_COLUMN_NAME AS parent_column,
       rc.CONSTRAINT_NAME,
       rc.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE kcu
JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
  AND rc.DELETE_RULE IN ('RESTRICT', 'NO ACTION')
ORDER BY parent_table, child_table;
```

Query kedua menghitung sisa baris anak yang masih menunjuk desa target. Ganti pasangan tabel/kolom sesuai hasil query pertama; contoh untuk relasi 4C-1:

```sql
SELECT 'berita' AS tabel, COUNT(*) AS baris
FROM berita WHERE village_id = :village_id
UNION ALL
SELECT 'perangkat_desa', COUNT(*)
FROM perangkat_desa WHERE village_id = :village_id
UNION ALL
SELECT 'berita_kategori', COUNT(*)
FROM berita_kategori WHERE village_id = :village_id
UNION ALL
SELECT 'jabatan_perangkat', COUNT(*)
FROM jabatan_perangkat WHERE village_id = :village_id;
```

Untuk 4C-2a, tambahkan `incoming_letters`, `letter_dinas`, `letter_types`, `outgoing_letters`, dan `letter_classifications`.

### 4.3 Urutan hapus

Jalankan dalam satu transaksi pada salinan lebih dulu, lalu ulangi pada target setelah hasilnya sesuai harapan:

```sql
START TRANSACTION;

-- 4C-1: lepas anak yang menahan parent RESTRICT.
DELETE FROM berita WHERE village_id = :village_id;
DELETE FROM perangkat_desa WHERE village_id = :village_id;

-- 4C-2a (bila 0009 sudah merged):
DELETE FROM incoming_letters WHERE village_id = :village_id;
DELETE FROM letter_dinas WHERE village_id = :village_id;
DELETE FROM letter_types WHERE village_id = :village_id;
DELETE FROM outgoing_letters WHERE village_id = :village_id;

-- Parent RESTRICT ikut ter-cascade bersama desa.
DELETE FROM villages WHERE id = :village_id;
```

Alternatif yang mempertahankan riwayat: ubah referensi menjadi `NULL` alih-alih menghapus baris:

```sql
UPDATE berita SET kategori_id = NULL WHERE village_id = :village_id;
UPDATE perangkat_desa SET jabatan_id = NULL WHERE village_id = :village_id;
```

Pilihan hapus vs `NULL` adalah keputusan bisnis pemilik data, bukan teknis. `NULL` mempertahankan surat/berita tetapi menghilangkan klasifikasinya; hapus baris membuang arsip.

### 4.4 Verifikasi sebelum COMMIT

```sql
SELECT COUNT(*) FROM villages WHERE id = :village_id;                 -- harus 0
SELECT COUNT(*) FROM berita WHERE village_id = :village_id;           -- harus 0
SELECT COUNT(*) FROM perangkat_desa WHERE village_id = :village_id;   -- harus 0
SELECT COUNT(*) FROM berita_kategori WHERE village_id = :village_id;  -- harus 0
SELECT COUNT(*) FROM jabatan_perangkat WHERE village_id = :village_id;-- harus 0
```

Bila salah satu gagal atau jumlahnya tidak sesuai, `ROLLBACK`. Jangan memperbaiki sebagian dengan `DELETE` ad-hoc di luar transaksi.

### 4.5 Setelah COMMIT

1. Bandingkan jumlah baris tabel tenant lain dengan catatan §4.1; cascade seharusnya mengosongkan semuanya untuk desa tersebut.
2. Periksa log aplikasi terhadap `ER_ROW_IS_REFERENCED_2` (1451) atau `ER_NO_REFERENCED_ROW_2` (1452).
3. Bila desa dihapus untuk pembatalan provisioning, pastikan akun pengguna, domain, dan media penyimpanan terkait juga dibersihkan sesuai prosedur terpisah.

## 5. Larangan

- Jangan menjalankan `DELETE FROM villages` tanpa membersihkan referensi 4C-1/4C-2a lebih dulu; kegagalan 1451 dapat meninggalkan pekerjaan separuh jalan bila autocommit aktif.
- Jangan menonaktifkan `FOREIGN_KEY_CHECKS` untuk melewati `RESTRICT` pada data produksi. Itu membuat referensi yatim dan melanggar invariant tenant.
- Jangan menjalankan prosedur ini pada database test bersama tanpa memastikan tidak ada suite lain yang berjalan.
- Jangan menyalin data desa ke lingkungan lain tanpa dasar bisnis dan persetujuan; data kependudukan bukan fixture.

## 6. Catatan untuk test otomatis

Fixture integration test yang membuat klasifikasi/jabatan/kategori lalu menghapus `villages` harus membersihkan child lebih dulu. Contoh yang sudah disesuaikan:

- `src/features/surat/infrastructure/penomoran-archive.integration.test.ts` (Batch 4C-2a)
- `src/db/b4c1-restrict-relations-composite-fk.integration.test.ts` (Batch 4C-1)

Pola aman: hapus child terdalam → parent → `villages`, atau gunakan `FOREIGN_KEY_CHECKS=0` **hanya** pada database test disposable untuk menyiapkan/membersihkan data legacy, bukan untuk melewati constraint pada data nyata.
