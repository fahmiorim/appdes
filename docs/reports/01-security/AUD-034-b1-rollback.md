# AUD-034 Batch B1 — rollback migration `0011`

- **Task:** rollback/skrip inverse untuk `0011_b1_set_null_relations_composite_fk.sql` (Batch B1, delapan relasi `SET NULL`).
- **Tanggal:** 2026-11-16.
- **Branch:** `task/AUD-034-b1-rollback-main-2026-11-17`.
- **Base commit:** `2fdf91f` (`main`; `0011` sudah merged melalui PR #84).
- **Status:** siap review; artefak rollback diport ke `main` dari PR #87.

## 1. Kondisi awal

Batch B1 (`0011`) mengubah delapan relasi `ON DELETE SET NULL` menjadi composite tenant FK `RESTRICT`:

| Child | Kolom | Parent | Constraint 0011 |
| --- | --- | --- | --- |
| `users` | `resident_id` | `residents` | `users_resident_tenant_fk` |
| `family_member_logs` | `family_id` | `families` | `family_member_logs_family_tenant_fk` |
| `family_member_logs` | `resident_id` | `residents` | `family_member_logs_resident_tenant_fk` |
| `pendapat` | `resident_id` | `residents` | `pendapat_resident_tenant_fk` |
| `kontak` | `resident_id` | `residents` | `kontak_resident_tenant_fk` |
| `letter_number_archive` | `letter_id` | `letters` | `letter_number_archive_letter_tenant_fk` |
| `lapak` | `resident_id` | `residents` | `lapak_resident_tenant_fk` |
| `notifikasi_terkirim` | `resident_id` | `residents` | `notifikasi_terkirim_resident_tenant_fk` |

`0011` melakukan tiga jenis perubahan fisik:

1. `DROP FOREIGN KEY` delapan FK single-column baseline (`*_resident_id_residents_id_fk`, `*_family_id_families_id_fk`, `*_letter_id_letters_id_fk`).
2. `CREATE INDEX` tujuh composite index child (`users_village_resident_idx`, `family_member_logs_village_family_idx`, `family_member_logs_village_resident_idx`, `pendapat_village_resident_idx`, `letter_number_archive_village_letter_idx`, `lapak_village_resident_idx`, `notifikasi_village_resident_idx`). `kontak_village_resident_idx` sudah ada sejak baseline sehingga tidak dibuat ulang.
3. `ADD CONSTRAINT` delapan FK composite `(village_id, <kolom>) -> parent(village_id, id)` dengan `ON DELETE RESTRICT`.

Efek samping yang ditemukan saat rehearsal: `DROP FOREIGN KEY` juga menghapus index auto-generated milik FK tersebut, dan dua index single-column `village_id` yang mendukung FK ke `villages` (`users_village_id_villages_id_fk`, `notifikasi_terkirim_village_id_villages_id_fk`) hilang karena perannya diambil composite index baru. Skrip rollback harus mengembalikan keduanya, jika tidak `DROP INDEX` composite gagal dengan errno 1553.

## 2. File yang diperiksa

- `src/db/migrations/0011_b1_set_null_relations_composite_fk.sql`
- `src/db/migrations/0000_baseline.sql` (nama dan aturan FK baseline)
- `docs/reports/01-security/AUD-034-b4c2b-rollback.sql` (pola skrip inverse yang berlaku)
- `docs/reports/01-security/AUD-034-runbook-hapus-desa.md` (dampak rollback ke prosedur hapus desa)
- `src/db/schema/{auth,family-log,pendapat,kontak,letter-number-archive,lapak,notifikasi-terkirim}.ts` (definisi index/FK)

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `docs/reports/01-security/AUD-034-b1-rollback.sql` | Skrip inverse `0011`: drop 8 composite FK, buat ulang 2 index `villages`, drop 7 composite index, restore 8 FK `SET NULL` baseline. |
| `docs/reports/01-security/AUD-034-b1-rollback.md` | Laporan ini. |

Tidak ada perubahan source code, schema Drizzle, journal, atau migration pada task ini.

## 4. Isi skrip

Urutan eksekusi (stop-on-error, dijalankan sebagai operator, bukan migration Drizzle):

1. `DROP FOREIGN KEY` delapan constraint `*_tenant_fk` buatan `0011`.
2. `CREATE INDEX users_village_id_villages_id_fk (village_id)` dan `CREATE INDEX notifikasi_terkirim_village_id_villages_id_fk (village_id)` — harus dibuat **sebelum** composite index dihapus.
3. `DROP INDEX` tujuh composite index buatan `0011`.
4. `ADD CONSTRAINT` delapan FK baseline single-column dengan `ON DELETE SET NULL ON UPDATE NO ACTION`, nama sama dengan baseline.

Catatan operasional yang ditulis di header skrip:

- DDL MySQL auto-commit dan skrip tidak atomik/idempotent.
- Hanya dijalankan pada backup/clone yang terverifikasi, saat maintenance window, dengan write aplikasi dihentikan.
- Kode aplikasi Batch B1 tetap kompatibel: repository sudah meng-`NULL`-kan kolom child dalam transaksi sebelum menghapus parent, dan itu juga sah ketika FK database kembali `SET NULL`.
- Setelah rollback, isolasi tenant delapan relasi ini kembali hanya dijaga application layer.
- Jika `_b1_tenant_preflight_findings`/`_b1_tenant_preflight_abort` masih ada, migration forward sebelumnya gagal dan state harus direkonsiliasi manual.
- Query verifikasi read-only disertakan di akhir skrip (8 FK `SET NULL`, 0 `*_tenant_fk`, 0 composite index `0011`, 2 index `villages`).

## 5. Rehearsal pada MySQL disposable

Database: `desa_test_rollback_0011` (MySQL 8.0.30 lokal, disposable).

| Langkah | Perintah inti | Hasil |
| --- | --- | --- |
| 1 | `CREATE DATABASE desa_test_rollback_0011` lalu apply `0000`–`0010` | PASS — `UP_TO_0010_OK`, 60 constraint `%_tenant_fk` |
| 2 | Rekam snapshot FK + index 10 tabel terkait | PASS — 103 baris (`b1_base.txt`) |
| 3 | Apply `0011` | PASS — `MIGRATION_0011_OK`, diff menampilkan 8 FK composite + 7 index baru dan hilangnya 2 index `villages` |
| 4 | Apply `AUD-034-b1-rollback.sql` | PASS — `ROLLBACK_0011_OK` |
| 5 | Rekam snapshot setelah rollback, `diff` dengan snapshot langkah 2 | **PASS — diff kosong**, state FK/index identik dengan `0010` |
| 6 | Hitung `%_tenant_fk` | PASS — 60 (kembali ke nilai pra-`0011`) |
| 7 | Apply ulang `0011` (uji jalur forward setelah rollback) | PASS — `REMIGRATE_0011_OK`, 68 `%_tenant_fk` |
| 8 | Cek tabel preflight `_b1_*` | PASS — 0 baris tersisa |

Perbedaan yang tercatat pada langkah 3 dan dikembalikan penuh pada langkah 5:

- Hilang: `users_resident_id_residents_id_fk`, `family_member_logs_family_id_families_id_fk`, `family_member_logs_resident_id_residents_id_fk`, `pendapat_resident_id_residents_id_fk`, `kontak_resident_id_residents_id_fk`, `letter_number_archive_letter_id_letters_id_fk`, `lapak_resident_id_residents_id_fk`, `notifikasi_terkirim_resident_id_residents_id_fk` (index + constraint), serta index `users_village_id_villages_id_fk` dan `notifikasi_terkirim_village_id_villages_id_fk`.
- Bertambah: 8 constraint composite dan 7 composite index `0011`.

## 6. Validasi

| Pemeriksaan | Perintah | Status |
| --- | --- | --- |
| Rehearsal rollback + diff baseline | `mysql desa_test_rollback_0011 < docs/reports/01-security/AUD-034-b1-rollback.sql` | PASS |
| Kesetaraan state FK/index dengan `0010` | `diff /tmp/rb/b1_base.txt /tmp/rb/b1_rolledback.txt` | PASS (diff kosong) |
| Forward ulang `0011` setelah rollback | apply `0011` | PASS |
| Format Markdown/prettier | `npx prettier --check docs/reports/01-security/AUD-034-b1-rollback.md docs/reports/01-security/AUD-034-b1-rollback.sql` | PASS |
| Verifikasi statis nama constraint/index | Pemeriksaan Node terhadap `0000`, `0011`, dan skrip rollback | PASS — 8 FK composite, 7 index baru, dan 8 FK baseline semuanya cocok |
| Unit/integration test aplikasi | — | SKIPPED — tidak ada perubahan source code, schema, atau API; rehearsal DB di atas menjadi bukti utama |

## 7. Risiko dan batasan

- Belum diuji pada data produksi/volume nyata; rehearsal memakai DB kosong tanpa baris domain, sehingga skenario orphan/cross-tenant tidak relevan untuk proses inverse ini (FK `SET NULL` tidak memvalidasi data lama).
- `0011` sudah berada di `main` melalui PR #84; skrip ini diport dari PR #87 dengan base `2fdf91f`. Jika `0011` berubah setelah port, skrip ini harus disesuaikan.
- Skrip tidak atomik dan tidak idempotent; kegagalan di tengah jalan harus direkonsiliasi manual dengan memeriksa `information_schema`.
- Setelah rollback, perlindungan lintas tenant delapan relasi kembali bergantung pada application layer, dan prosedur hapus desa pada `AUD-034-runbook-hapus-desa.md` harus mengikuti state lama.
- Rollback `0011` belum disertakan pada runbook hapus desa; bila diminta, dapat ditambahkan sebagai lampiran operator.

## 8. Port ke `main`

PR #87 membuat dan me-rehearse skrip ini, tetapi PR tersebut di-merge ke branch
`task/AUD-034-b5-set-null-composite-fk`, bukan ke `main`. Setelah PR #84
memasukkan `0011` ke `main`, dua artefak rollback ini tidak ikut terbawa.

Task ini memport isi skrip dari merge commit `af607e8` tanpa mengubah logika
rollback. SHA-256 skrip tetap `884ce0192c2ca2dc0abe404ce11ec94c5c68be8c9679352fc5170a7661f170e4`,
sama dengan versi PR #87. Base baru adalah `2fdf91f`; `0011` sudah ada di `main`
dan tidak diubah. Rehearsal pada bagian 5 tetap menjadi bukti asli untuk isi
skrip yang sama; tidak ada database yang dijalankan ulang pada task port ini.

## 9. Kesimpulan

Skrip inverse `0011` tersedia di `main`, mengembalikan schema tepat ke kondisi
`0010` (dibuktikan diff kosong pada snapshot FK/index), dan jalur forward `0011`
tetap dapat dijalankan ulang setelah rollback. Tidak ada perubahan kode aplikasi
pada task ini.
