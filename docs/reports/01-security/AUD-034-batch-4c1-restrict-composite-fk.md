# AUD-034 Batch 4C-1 — Composite FK RESTRICT untuk `berita_kategori` dan `jabatan_perangkat`

- **Task:** AUD-034 Batch 4C-1 — menutup dua relasi `ON DELETE SET NULL` tanpa jalur hapus aplikasi (`berita.kategori_id`, `perangkat_desa.jabatan_id`) sesuai pemetaan sisa 16 relasi Matriks B2.
- **Tanggal:** 16 November 2026.
- **Branch:** `task/AUD-034-batch-4c1-restrict-relations`, ditumpuk di atas `task/AUD-034-batch-4b-cascade-relations` (`7419766`) karena migration `0007` belum merged.
- **Base commit `origin/main`:** `6c662de58be07b7a6486ad6da9cc888f11f877db`. Base branch pekerjaan: `7419766cd489c0915ad95cc13cb60949920b946b`.
- **Commit pekerjaan:** `e5c67df` (schema, migration `0008`, test, penyesuaian fixture).
- **Status:** siap review. Belum di-merge, belum di-deploy, dan migration belum dijalankan pada database produksi.

## 1. Kondisi awal

Kedua relasi masih memakai FK single-column pada base branch, sehingga database menerima baris desa A yang menunjuk parent desa B:

| Child → Parent | FK lama | Aturan delete |
| --- | --- | --- |
| `berita.kategori_id` → `berita_kategori.id` | `berita_kategori_id_berita_kategori_id_fk` | `SET NULL` |
| `perangkat_desa.jabatan_id` → `jabatan_perangkat.id` | `perangkat_desa_jabatan_id_jabatan_perangkat_id_fk` | `SET NULL` |

Kolom child nullable, tetapi `village_id` child `NOT NULL`. Pada composite FK, MySQL menerapkan `SET NULL` ke **semua** kolom FK termasuk `village_id`, sehingga composite `SET NULL` tidak dapat dipakai tanpa mengubah nullability `village_id` (perubahan model data di luar scope).

Kedua parent tidak memiliki use case hapus di aplikasi: tidak ada repository/use case yang menghapus `berita_kategori` atau `jabatan_perangkat`, dan tidak ada use case hapus `villages` sama sekali (hanya test yang menghapus desa). Karena itu `RESTRICT` tidak mengubah perilaku bisnis yang dapat dicapai aplikasi.

## 2. Keputusan yang sebelumnya menunggu maintainer

Keputusan diambil dan dicatat di sini karena task meminta asisten menetapkannya:

1. **4C-1 dilaksanakan sebagai satu PR terfokus** (dua relasi), tidak digabung dengan 4C-2.
2. **4C-2 memakai kebijakan `RESTRICT` + transaksi aplikasi**, dieksekusi bertahap per modul: **4C-2a** `letter_classifications` (4 relasi, modul surat), **4C-2b** `analisis_kategori`, `polygon`, `inventaris_kategori`, dan `kelompok_master` (masing-masing satu relasi, empat modul). Belum dikerjakan pada branch ini.
3. **`users.role_id` tetap tidak dijadikan composite FK**: role platform sah memiliki `village_id IS NULL`, sehingga composite FK akan menolaknya. Enforcement tetap di application layer.

Prasyarat yang diminta laporan pemetaan sudah dipenuhi: (a) `RESTRICT` diterima untuk kedua parent, (b) hapus desa (cascade `villages`) tetap berhasil — dibuktikan test dan probe di §3.3.

## 3. Analisis dan perubahan

### 3.1 Bukti probe sebelum implementasi

Sebelum menulis migration, dua probe MySQL 8.0.30 dijalankan pada database sekali pakai untuk menguji asumsi "hapus desa akan tetap berhasil karena InnoDB meng-cascade anak lebih dulu":

| Probe | Hasil |
| --- | --- |
| `berita` → `berita_kategori` composite `RESTRICT`, lalu hapus desa | **berhasil** — urutan cascade menguntungkan |
| `perangkat_desa` → `jabatan_perangkat` composite `RESTRICT`, lalu hapus desa | **gagal** `ER_ROW_IS_REFERENCED_2` (1451) pada `perangkat_desa_jabatan_tenant_fk` |
| hapus parent yang masih dirujuk | **gagal** 1451, sesuai aturan `RESTRICT` |

Kesimpulan: urutan cascade `villages → child` **tidak dijamin** InnoDB. Akibat yang harus diterima dan didokumentasikan: penghapusan baris `villages` (manual/DBA atau cleanup test) wajib membersihkan `berita`, `berita_kategori`, `perangkat_desa`, dan `jabatan_perangkat` lebih dulu. Karena aplikasi tidak memiliki use case hapus desa, tidak ada jalur produksi yang berubah perilakunya.

### 3.2 Schema Drizzle (`src/db/schema/content.ts`)

| Tabel | Perubahan |
| --- | --- |
| `jabatan_perangkat` | tambah `UNIQUE (village_id, id)` bernama `jabatan_perangkat_village_id_uq` sebagai parent key |
| `berita_kategori` | tambah `UNIQUE (village_id, id)` bernama `berita_kategori_village_id_uq` sebagai parent key |
| `perangkat_desa` | lepas `.references()` pada `jabatanId`; tambah index `(village_id, jabatan_id)` dan composite FK `perangkat_desa_jabatan_tenant_fk` `ON DELETE RESTRICT` |
| `berita` | lepas `.references()` pada `kategoriId`; tambah index `(village_id, kategori_id)` dan composite FK `berita_kategori_tenant_fk` `ON DELETE RESTRICT` |

Index single-column lama (`berita_kategori_idx`, `perangkat_desa_jabatan_idx`) dipertahankan; menghapusnya di luar scope.

### 3.3 Migration `0008_b4c1_restrict_relations_composite_fk.sql`

Urutan: preflight → drop 2 FK lama → tambah 2 unique parent → tambah 2 index child → tambah 2 composite FK `ON DELETE RESTRICT ON UPDATE NO ACTION`.

Preflight read-only terhadap data domain: menghitung `orphan` dan `cross-tenant` untuk kedua relasi (memakai `IS NOT NULL` karena kolom nullable), menulis temuan ke `_b4c1_tenant_preflight_findings`, lalu memicu duplicate-key error pada `_b4c1_tenant_preflight_abort` bila ada temuan. Pesan berawalan `B4C1` dan memuat relasi, jenis, serta jumlah baris. Migration berhenti **sebelum** satu pun constraint diubah; tabel helper sengaja ditinggalkan untuk diagnosis dan di-`DROP IF EXISTS` pada awal retry.

Snapshot `0008_snapshot.json` dihasilkan `npx drizzle-kit generate`; SQL hasil generate (yang identik isinya dengan DDL di atas, tanpa preflight) dibuang dan journal di-rename ke tag `0008_b4c1_restrict_relations_composite_fk`. Rantai `prevId` diverifikasi menunjuk snapshot `0007` (`51cceb04-f462-41db-abd8-e8d4d38ba89b`). Pada generate kali ini tidak ada drift `bumindes_item_village_buku_idx`, karena snapshot `0007` sudah tidak melacaknya.

### 3.4 Test

| Berkas | Isi |
| --- | --- |
| `src/db/b4c1-restrict-relations-composite-fk.integration.test.ts` (baru, 6 tes) | insert lintas desa ditolak 1452 pada kedua relasi; insert sewilayah dan `NULL` diterima; update yang memindahkan relasi ke desa lain ditolak; hapus parent yang masih dirujuk ditolak 1451 lalu berhasil setelah referensi dilepas; hapus desa berhasil setelah anak dibersihkan |
| `src/db/b4c1-tenant-migration-guard.integration.test.ts` (baru, 3 tes) | migrasi sampai `0007`, sisipkan data legacy cross-tenant + orphan (`FOREIGN_KEY_CHECKS=0`), jalankan `0008`: migration gagal dengan pesan `B4C1`, 4 temuan tercatat, FK lama tetap ada dan unique parent tidak terpasang |
| `src/db/tenant-composite-fk.integration.test.ts` | daftar `*_tenant_fk` diperluas dengan `berita_kategori_tenant_fk` dan `perangkat_desa_jabatan_tenant_fk` |
| `vitest.integration.config.mts` | dua berkas test baru didaftarkan |
| `src/features/konten/dokumen-publik.integration.test.ts` | fixture berita lintas desa disisipkan lewat koneksi `FOREIGN_KEY_CHECKS=0`; cleanup menghapus `berita` dan `berita_kategori` sebelum `villages`; assertion baca tidak berubah |
| `src/features/publik/application/pengumuman-publik.integration.test.ts` | cleanup menghapus `berita` dan `berita_kategori` sebelum `villages` |

## 4. Security dan tenant

- Composite FK mengikat `village_id` child dan parent, sehingga pasangan `(village_id, kategori_id)` dan `(village_id, jabatan_id)` lintas desa ditolak database, bukan hanya application layer (AGENTS.md §3).
- `UNIQUE (village_id, id)` pada parent tidak mengubah keunikan: `id` sudah primary key.
- `RESTRICT` mencegah penghapusan parent yang masih dirujuk, sehingga referensi tidak menjadi yatim secara diam-diam.
- Tidak ada route, use case, permission, atau UI yang diubah; tidak ada jalur otorisasi baru.
- Preflight hanya menyimpan nama relasi, jenis, dan jumlah baris. Tidak ada NIK, data pribadi, atau secret pada migration, fixture, maupun laporan.
- Test negatif lintas tenant tersedia untuk kedua relasi, termasuk jalur update (bukan hanya insert).

## 5. Validasi

Dijalankan lokal, MySQL 8.0.30 loopback. Database target `desa_test_b4c1` (allowlist guard) dan database sementara `desa_test_aud034b4c1g_*` yang dibuat serta di-drop oleh guard test. Database pengembangan/produksi tidak disentuh.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** — `next typegen` + `tsc --noEmit` tanpa error |
| `npx eslint <7 berkas berubah>` | **PASS** — tanpa temuan |
| `npm run format:check` | **FAIL** awal pada 2 berkas test baru/berubah → `prettier --write` → **PASS** |
| `npm run test:unit` | **PASS** — 197 berkas, 1.754 tes |
| `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | **PASS** — 7 tes |
| `npx vitest run --config vitest.integration.config.mts src/db/b4c1-restrict-relations-composite-fk.integration.test.ts src/db/b4c1-tenant-migration-guard.integration.test.ts src/db/tenant-composite-fk.integration.test.ts` | **PASS** — 3 berkas, 19 tes (6 + 3 + 10) |
| `npm run test:integration` (seluruh suite) | **PASS** — 38 berkas, 223 tes |

Catatan proses:

1. Test FK ditulis lebih dulu dan dijalankan tanpa migration: **3 tes FAIL** (insert/update lintas desa diterima, hapus parent tidak ditolak). Setelah `0008` dipasang, 6/6 PASS. Ini bukti test benar-benar menguji constraint, bukan lulus secara kebetulan.
2. Run integrasi penuh pertama **FAIL 2 berkas** sebagai akibat langsung constraint baru: fixture `dokumen-publik` menyisipkan `berita.kategori_id` lintas desa (1452), dan `afterAll` kedua berkas menghapus `villages` sebelum `berita`/`berita_kategori` (1451). Fixture diperbaiki tanpa mengubah assertion; run berikutnya PASS 38/223.
3. Suite integrasi penuh dijalankan ulang setelah semua perbaikan; angka di tabel adalah run terakhir yang benar-benar dijalankan.

## 6. Diff

`git show --stat e5c67df`: 10 berkas, +19.076/−12. Baris besar berasal dari `0008_snapshot.json` (snapshot Drizzle), bukan kode.

Berkas berubah:

- `src/db/schema/content.ts`
- `src/db/migrations/0008_b4c1_restrict_relations_composite_fk.sql` (baru)
- `src/db/migrations/meta/0008_snapshot.json` (baru)
- `src/db/migrations/meta/_journal.json`
- `src/db/b4c1-restrict-relations-composite-fk.integration.test.ts` (baru)
- `src/db/b4c1-tenant-migration-guard.integration.test.ts` (baru)
- `src/db/tenant-composite-fk.integration.test.ts`
- `vitest.integration.config.mts`
- `src/features/konten/dokumen-publik.integration.test.ts`
- `src/features/publik/application/pengumuman-publik.integration.test.ts`
- `docs/reports/01-security/AUD-034-batch-4c1-restrict-composite-fk.md` (laporan ini)
- `docs/reports/01-security/AUD-034-tenant-relation-matrix.md` (§16)

## 7. Risiko dan keterbatasan

1. **Urutan hapus desa berubah menjadi tanggung jawab pemanggil.** Setelah `0008`, `DELETE FROM villages` untuk desa yang masih memiliki `perangkat_desa` atau `berita` akan gagal 1451 dan harus dibersihkan manual berurutan. Aplikasi tidak memiliki use case hapus desa, jadi risiko ini terbatas pada operasi manual/DBA dan cleanup test. Perlu dicatat di runbook operasional.
2. **Migration belum dijalankan pada data nyata.** Preflight akan gagal-closed bila produksi memuat baris lintas desa/orphan pada kedua relasi; jumlahnya belum diketahui. Operator perlu mencoba `0008` pada salinan database lebih dulu (setelah `0007`).
3. **Branch ditumpuk.** Branch ini memuat seluruh commit Batch 4B; PR harus di-review setelah (atau bersama) PR #67, dan nomor migration `0008` bergantung pada `0007` yang belum merged.
4. **Drift `bumindes_item_village_buku_idx` masih terbuka** dan tetap di luar scope (task terpisah).
5. **Sisa Matriks B2 setelah batch ini: 9 relasi** — 8 relasi `SET NULL` yang menunggu transaksi aplikasi (4C-2a/4C-2b) dan `users.role_id` yang tetap app-enforced.

## 8. Kesimpulan

Dua relasi `SET NULL` dengan parent tanpa jalur hapus aplikasi kini dienforce database lewat composite FK `RESTRICT`, dengan preflight fail-closed dan test negatif lintas tenant untuk insert maupun update. Tidak ada perubahan kode aplikasi. Perilaku yang perlu disepakati reviewer: penghapusan parent/desa manual kini ditolak selama masih dirujuk, bukan mengosongkan kolom.

Langkah berikutnya: review PR ini bersama PR #67, lalu putuskan eksekusi 4C-2a (`letter_classifications`, 4 relasi) sebagai PR terpisah dengan transaksi aplikasi.
