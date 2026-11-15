# AUD-034 Batch 4B — Composite FK untuk Lima Relasi CASCADE

- **Task:** AUD-034 Batch 4B — menutup lima relasi Matriks B2 yang memakai `ON DELETE CASCADE` dan kolom child `NOT NULL`, sesuai pemetaan `AUD-034-sisa-16-relasi-b2-2026-11-16.md`.
- **Tanggal:** 16 November 2026.
- **Branch:** `task/AUD-034-batch-4b-cascade-relations`.
- **Base commit:** `6c662de58be07b7a6486ad6da9cc888f11f877db` (`origin/main`).
- **Commit pekerjaan:** `c95674d` (kode + migration), `dcdbf5d` (laporan awal), `7052607` (perbaikan fixture test kontak yang ditemukan CI).
- **Pull request:** [#67](https://github.com/fahmiorim/appdes/pull/67).
- **Status:** siap review. Belum di-merge, belum di-deploy, dan migration belum dijalankan pada database produksi.

## 1. Kondisi awal

Lima relasi Matriks B2 masih memakai FK single-column pada `main`:

| Child → Parent | FK lama | Aturan delete |
| --- | --- | --- |
| `anggota_grup_kontak.kontak_id` → `kontak.id` | `anggota_grup_kontak_kontak_id_kontak_id_fk` | CASCADE |
| `anggota_grup_kontak.grup_id` → `kontak_grup.id` | `anggota_grup_kontak_grup_id_kontak_grup_id_fk` | CASCADE |
| `incoming_letter_dispositions.incoming_letter_id` → `incoming_letters.id` | `ild_incoming_letter_id_fk` | CASCADE |
| `outgoing_letter_shipments.outgoing_letter_id` → `outgoing_letters.id` | `ols_outgoing_letter_id_fk` | CASCADE |
| `kelompok_anggota.kelompok_id` → `kelompok.id` | `kelompok_anggota_kelompok_id_kelompok_id_fk` | CASCADE |

FK single-column hanya mengikat `id`, sehingga database menerima baris milik desa A yang menunjuk parent desa B. Validasi application layer tidak cukup: foreign reference tenant-scoped wajib dijaga juga di database (AGENTS.md §3).

Kelima kolom child bersifat `NOT NULL` dan aturan delete-nya `CASCADE`. Karena itu composite FK dapat dipasang tanpa mengubah perilaku hapus — berbeda dari relasi `SET NULL` yang ditunda ke batch lain.

## 2. Perubahan

### 2.1 Schema Drizzle

| Berkas | Perubahan |
| --- | --- |
| `src/db/schema/kontak.ts` | `kontak` dan `kontak_grup` mendapat `UNIQUE (village_id, id)`; `anggota_grup_kontak` melepas `.references()` pada `grupId`/`kontakId`, lalu memakai dua composite FK + dua index `(village_id, <parent>_id)` |
| `src/db/schema/letter-agenda.ts` | `incoming_letter_dispositions` dan `outgoing_letter_shipments` memakai composite FK + index `(village_id, ...)`; FK lama diganti nama |
| `src/db/schema/kelompok.ts` | `kelompok_anggota.kelompok_id` memakai composite FK ke `kelompok` (unique key parent sudah ada sejak `0003`) |
| `src/db/schema/incoming-letters.ts` | `UNIQUE (village_id, id)` |
| `src/db/schema/outgoing-letters.ts` | `UNIQUE (village_id, id)` |

Nama constraint baru: `anggota_grup_kontak_kontak_tenant_fk`, `anggota_grup_kontak_grup_tenant_fk`, `ild_incoming_letter_tenant_fk`, `ols_outgoing_letter_tenant_fk`, `kelompok_anggota_kelompok_tenant_fk`.

### 2.2 Migration `0007_b4b_cascade_relations_composite_fk.sql`

Urutan: preflight → drop 5 FK lama → tambah 4 unique parent → tambah 5 index child → tambah 5 composite FK `ON DELETE CASCADE`.

Preflight bersifat read-only terhadap data domain: ia menghitung `orphan` dan `cross-tenant` untuk kelima relasi, menulis temuan ke `_b4b_tenant_preflight_findings`, lalu memicu duplicate-key error pada `_b4b_tenant_preflight_abort` bila ada temuan. Migration berhenti **sebelum** satu pun constraint diubah. Tidak ada backfill, pemindahan, atau penghapusan data.

`0007_snapshot.json` dihasilkan dengan `drizzle-kit generate`, lalu di-rename dari `0008` karena journal sudah memuat entri `0007`; rantai `prevId` diverifikasi menunjuk snapshot `0006`. SQL hasil generate tidak dipakai — satu-satunya perbedaannya adalah `DROP INDEX bumindes_item_village_buku_idx` yang berasal dari drift lama dan sengaja dikeluarkan dari scope (lihat §6).

### 2.3 Test

| Berkas | Isi |
| --- | --- |
| `src/db/b4b-cascade-relations-composite-fk.integration.test.ts` | MySQL 8; insert lintas desa ditolak pada 5 relasi (1452); insert sah diterima; update yang memindahkan relasi ke desa lain ditolak; hapus parent meng-cascade child tanpa menyentuh desa lain |
| `src/db/b4b-tenant-migration-guard.integration.test.ts` | Migrasi sampai `0006`, sisipkan data legacy cross-tenant + orphan dengan `FOREIGN_KEY_CHECKS=0`, lalu jalankan `0007`: migration gagal, 10 temuan tercatat, FK lama dan unique parent tidak terpasang |
| `src/db/tenant-composite-fk.integration.test.ts` | Daftar constraint `*_tenant_fk` diperluas dengan 5 nama baru |
| `vitest.integration.config.mts` | Dua berkas test baru didaftarkan |
| `src/features/kontak/application/kontak-tenant-isolation.integration.test.ts` | Fixture baris legacy lintas desa disisipkan lewat koneksi dengan `FOREIGN_KEY_CHECKS=0`; assertion baca tidak berubah |

## 3. Security dan tenant

- Composite FK mengikat `village_id` child dan parent, sehingga pasangan `(village_id, parent_id)` lintas desa ditolak database, bukan hanya oleh kode aplikasi.
- `UNIQUE (village_id, id)` pada parent tidak mengubah keunikan data: `id` sudah primary key.
- Perilaku hapus tidak berubah: parent dihapus → child ikut terhapus (`CASCADE`) seperti sebelumnya.
- Tidak ada route, use case, atau UI yang diubah; tidak ada jalur otorisasi baru.
- Preflight tidak membaca atau menulis data pribadi; temuan hanya berisi nama relasi, jenis, dan jumlah baris.
- Tidak ada secret, NIK, atau data pribadi pada fixture test (nama desa/kontak fiktif dengan suffix waktu).

## 4. Validasi

Dijalankan pada mesin lokal, MySQL 8.0.30 loopback. Database target `desa_test_b4b` (dibuat oleh guard integration test, lolos allowlist `desa_test_<suffix>`); database pengembangan/produksi tidak disentuh.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** — `next typegen` + `tsc --noEmit` tanpa error |
| `npx eslint <9 berkas berubah>` | **PASS** — tanpa temuan |
| `npm run format:check` | **PASS** — seluruh berkas sesuai Prettier |
| `npm run test:unit` | **PASS** — 197 berkas, 1.754 tes |
| `npx vitest run --config vitest.integration.config.mts src/db/b4b-cascade-relations-composite-fk.integration.test.ts src/db/b4b-tenant-migration-guard.integration.test.ts` | **PASS** — 2 berkas, 8 tes (5 + 3) |
| `npx vitest run --config vitest.integration.config.mts src/db/tenant-composite-fk.integration.test.ts` | **PASS** — 10 tes |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | **PASS** — 7 tes |
| `npm run test:integration` (seluruh suite, database kosong) | **PASS** — 36 berkas / 214 tes |
| CI PR #67 — run [43760473024](https://github.com/fahmiorim/appdes/actions/runs/43760473024) | **PASS** — Unit/quality, Integration (MySQL 8), dan Visual QA login |

Catatan proses:

1. Unit suite sempat FAIL 1 tes (`setiap entri journal memiliki berkas snapshot`) karena snapshot `0007` belum ada. Snapshot dibuat, rename dirapikan, lalu seluruh unit suite dijalankan ulang dan PASS.
2. Integration test pertama kali tidak dapat jalan karena `TEST_DATABASE_ACK`/`TEST_DATABASE_URL` tidak tersedia di shell; setelah database uji disposable disiapkan, kedua berkas dijalankan dan PASS.
3. **CI run pertama (`dcdbf5d`) FAIL pada Integration test.** `kontak-tenant-isolation.integration.test.ts` sengaja menyisipkan baris `anggota_grup_kontak` lintas desa untuk membuktikan repository menyaringnya; setelah `0007`, insert itu ditolak FK. Fixture diperbaiki agar memakai `FOREIGN_KEY_CHECKS=0` (pola yang sama dengan test kelompok), tanpa mengubah assertion. Perbaikan di commit `7052607`, seluruh suite integrasi lokal PASS 36/214, dan CI run berikutnya PASS.

## 5. Diff

`git diff --stat` kode sebelum laporan: 14 berkas, +19.222/−23. Baris besar berasal dari `0007_snapshot.json` (snapshot Drizzle), bukan kode.

Berkas berubah:

- `src/db/schema/{kontak,letter-agenda,kelompok,incoming-letters,outgoing-letters}.ts`
- `src/db/migrations/0007_b4b_cascade_relations_composite_fk.sql` (baru)
- `src/db/migrations/meta/0007_snapshot.json` (baru)
- `src/db/migrations/meta/_journal.json`
- `src/db/b4b-cascade-relations-composite-fk.integration.test.ts` (baru)
- `src/db/b4b-tenant-migration-guard.integration.test.ts` (baru)
- `src/db/tenant-composite-fk.integration.test.ts`
- `vitest.integration.config.mts`
- `src/features/kontak/application/kontak-tenant-isolation.integration.test.ts`
- `docs/reports/01-security/AUD-034-tenant-relation-matrix.md` (§15)

## 6. Risiko dan keterbatasan

1. **Migration belum dijalankan pada database nyata.** Preflight akan gagal pada data legacy yang tidak aman; jumlah baris seperti itu di produksi belum diketahui. Operator perlu menjalankan `0007` pada salinan database lebih dulu.
2. **Migration `0005`/`0006` belum pernah dijalankan di lingkungan nyata.** Test ini membuktikan `0000`–`0007` apply berurutan pada MySQL 8.0.30 kosong, tetapi bukan pada salinan data produksi.
3. **Drift schema lama ditemukan.** `bumindes_item_village_buku_idx` dibuat `0006` tetapi tidak dideklarasikan di schema, sehingga `drizzle-kit generate` ingin mengeluarkan `DROP INDEX`. Drop itu sengaja tidak dimasukkan ke `0007`; akibatnya snapshot `0007` tidak memuat index tersebut dan `db:generate` berikutnya akan menawarkan drop yang sama. Ini perlu task terpisah untuk merekonsiliasi schema `bumindes_item` dengan `0006`.
4. **CI lulus pada `7052607`.** Commit laporan setelahnya hanya menyentuh Markdown; bila CI dijalankan ulang, hasil integrasi tidak berubah karena tidak ada kode yang berubah.
5. **Sisa Matriks B2: 11 relasi** — 10 `SET NULL` (8 menunggu transaksi aplikasi) dan `users.role_id` yang tidak layak composite FK. Belum ada perubahan untuk relasi tersebut.

## 7. Kesimpulan

Batch 4B menutup 5 dari 16 relasi Matriks B2 dengan composite tenant FK, tanpa perubahan kode aplikasi dan tanpa perubahan perilaku hapus. Preflight menjaga migration tetap gagal-closed pada data legacy, dan test membuktikan penolakan lintas desa pada insert maupun update serta cascade yang tetap bekerja.

Langkah berikutnya: review branch ini, lalu putuskan Batch 4C-1 (`RESTRICT` untuk `berita_kategori` dan `jabatan_perangkat`) dan pilihan `RESTRICT + transaksi` vs `app-enforced` untuk delapan relasi `SET NULL` lainnya.
