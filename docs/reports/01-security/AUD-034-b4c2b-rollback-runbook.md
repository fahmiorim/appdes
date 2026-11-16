# AUD-034 Batch 4C-2b — Runbook rollback migration `0010`

- **Tanggal:** 16 November 2026
- **Branch:** `task/AUD-034-b4c2b-rollback-runbook`
- **Base commit:** `5094b7fa72841718a081d08a09245ba46e8563d3` (`main` setelah PR #79)
- **Lingkup:** menyediakan dan menguji skrip rollback untuk `0010_b4c2b_remaining_relations_restrict.sql`. Tidak ada perubahan schema, kode aplikasi, atau data pada environment mana pun.

## 1. Kondisi awal

`0010` mengganti empat relasi `SET NULL` single-column menjadi composite FK `(village_id, id)` dengan `ON DELETE RESTRICT`:

| Child | Kolom | Parent | FK lama (baseline) |
| --- | --- | --- | --- |
| `analisis_indikator` | `kategori_id` | `analisis_kategori` | `SET NULL` |
| `area` | `ref_polygon` | `polygon` | `SET NULL` |
| `inventaris` | `kategori_id` | `inventaris_kategori` | `SET NULL` |
| `kelompok` | `category_id` | `kelompok_master` | `SET NULL` |

Belum ada jalur rollback terdokumentasi untuk batch ini. Tanpa rollback, kegagalan setelah deploy hanya bisa ditangani dengan restore backup penuh.

## 2. Artefak

- `docs/reports/01-security/AUD-034-b4c2b-rollback.sql` — skrip inverse, dijalankan operator, bukan migration Drizzle (tidak masuk `_journal.json`).

Rollback mengembalikan empat FK single-column `SET NULL`, melepas empat unique key parent `(village_id, id)`, dan melepas dua index child yang ditambahkan `0010`. Tidak ada baris domain yang diubah atau dihapus.

## 3. Urutan operasional

1. Pastikan schema benar-benar berada di `0010` dan tidak ada statement rollback yang sudah dijalankan (skrip tidak idempotent).
2. Pastikan `_b4c2b_tenant_preflight_findings` dan `_b4c2b_tenant_preflight_abort` tidak ada.
3. Ambil backup teruji (dump + verifikasi restore) sebelum maintenance window.
4. Hentikan penulisan aplikasi (maintenance mode) agar tidak ada insert/update saat FK dilepas.
5. Jalankan `AUD-034-b4c2b-rollback.sql` **pernyataan demi pernyataan dengan stop-on-error**. Jangan lanjut setelah kegagalan; rekonsiliasi state lewat `information_schema` terlebih dahulu.
6. Jalankan blok verifikasi read-only di akhir skrip: 4 FK `SET NULL`, 0 sisa FK `*_tenant_fk`, 0 sisa unique/index baru.
7. Deploy aplikasi versi sebelum Batch 4C-2b **hanya bila** diperlukan. Kode 4C-2b tetap kompatibel: repository sudah mengosongkan kolom secara eksplisit sebelum menghapus parent, sehingga perilaku `SET NULL` database tidak bertentangan.
8. Setelah rollback, isolasi tenant untuk empat relasi ini kembali hanya dijaga application layer. Catat sebagai risiko sampai `0010` diterapkan ulang.

### Catatan teknis penting

MySQL menolak `DROP INDEX` bila index tersebut masih menopang FK `village_id → villages` (errno 1553). Karena itu skrip:

1. melepas FK composite,
2. membuat index pengganti `analisis_kategori_village_id_villages_id_fk` sebelum melepas `analisis_kategori_village_id_uq`,
3. memulihkan empat FK lama,
4. membuat `analisis_indikator_village_id_villages_id_fk` dan `kelompok_village_id_villages_id_fk` sebelum melepas index composite `0010`.

Tanpa langkah pengganti tersebut, rollback gagal di tengah jalan. Ini ditemukan pada rehearsal, bukan pada produksi.

## 4. Rehearsal

Dijalankan lokal pada database disposable MySQL 8 (`127.0.0.1`, Laragon).

- Nama database: `desa_test_b4c2b_rollback_<run>` (dibuat dan di-drop dalam satu proses; database pengembangan `desa_dev` tidak disentuh).
- Prosedur: migrasi penuh sampai `0010` → isi data uji valid (2 desa, 4 relasi) → jalankan 17 pernyataan rollback → verifikasi.

| # | Pemeriksaan | Hasil |
| --- | --- | --- |
| 1 | Migrasi penuh sampai `0010` diterapkan | PASS |
| 2 | Data uji terisi | PASS |
| 3 | Skrip rollback dijalankan (17 pernyataan) | PASS |
| 4 | 4 FK baseline kembali dengan `SET NULL` | PASS |
| 5 | 4 FK composite tenant sudah hilang | PASS |
| 6 | Unique parent dan dua index baru sudah dilepas (0 sisa) | PASS |
| 7 | Data dan referensi tidak berubah (1 baris per relasi) | PASS |
| 8 | Hapus parent mengosongkan child (`SET NULL` pulih) | PASS |
| 9 | Insert referensi lintas desa diterima lagi (enforcement tenant dilepas) | PASS |

**Ringkasan: 9/9 PASS**, database uji di-drop setelah pengujian.

Dua kegagalan rehearsal sebelumnya (errno 1553 pada `analisis_indikator_village_kategori_idx` dan `analisis_kategori_village_id_uq`) adalah bug urutan DDL pada draf skrip dan sudah diperbaiki sebelum run terakhir.

## 5. Validasi yang dijalankan

| Perintah | Hasil |
| --- | --- |
| `node --env-file=.env .tmp-rollback/run.mjs` (rehearsal disposable) | PASS 9/9 |
| `npx prettier --check docs/reports/01-security/AUD-034-b4c2b-rollback-runbook.md` | PASS |
| `npm run typecheck` | PASS (tidak ada kode aplikasi berubah; dijalankan ulang sebagai baseline) |

Integration test suite tidak dijalankan ulang: tidak ada perubahan schema/kode, dan bukti integrasi untuk `0010` sudah tercatat di `AUD-034-batch-4c2b-remaining-restrict.md` (§8) serta CI PR #78.

## 6. Risiko dan batasan

- Rehearsal hanya membuktikan skrip berjalan pada data sintetis. Belum ada rehearsal pada salinan data produksi.
- Rollback mengembalikan potensi referensi lintas desa; hanya application layer yang mencegahnya. Ini konsekuensi yang disengaja dan harus disetujui maintainer sebelum dipakai.
- MySQL DDL auto-commit: kegagalan di tengah skrip meninggalkan schema parsial. Selalu jalankan pada clone/backup dan dengan stop-on-error.
- Staging/deploy belum dilakukan; tidak ada akses host atau kredensial staging pada task ini.

## 7. Rekomendasi

1. Review dan setujui skrip sebelum dipakai; simpan bersama runbook `AUD-034-runbook-hapus-desa.md`.
2. Bila `0010` akan di-rollback di produksi, lakukan pada maintenance window dengan backup teruji dan catat state akhir lewat blok verifikasi.
3. Rehearsal lanjutan pada salinan data nyata (anonim) sebelum eksekusi produksi.
