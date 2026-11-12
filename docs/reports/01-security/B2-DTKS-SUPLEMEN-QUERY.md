# B2 — DTKS & Suplemen Tenant Query Isolation

- **Tanggal:** 12 November 2026
- **Branch:** `task/B2-DTKS-SUPLEMEN-QUERY`
- **Base:** `main` — `615712b87a76798cb85a9f5cc26b7b03483cecf1`
- **Commit implementasi:** `7cbd283209b93fb35834e2e4da59b23a08c59583`
- **Status:** selesai, siap review. Belum di-merge dan belum menjadi PR (lihat bagian PR).

## Tujuan

Memastikan seluruh query DTKS dan Suplemen hanya membaca, menghitung,
mengekspor, dan menulis data milik desa aktif, termasuk ketika database masih
menyimpan relasi legacy lintas desa dari sebelum composite FK dipasang.

## Kondisi awal dan analisis

Ditemukan jalur lintas tenant pada kode sebelum perubahan:

**DTKS (`dtks-repository.ts`)**

- `listDtks`/`whereDtks` memakai join RTM, keluarga, dan wilayah hanya
  berdasarkan ID, serta EXISTS pencarian penduduk tanpa `village_id`.
- `listDtksEkspor` memakai join RTM/wilayah/keluarga/kepala tanpa tenant dan
  agregat anggota hanya dibatasi daftar ID DTKS.
- `listDtksAnggota` membaca `residents` tanpa tenant dan tidak memastikan parent
  DTKS milik desa yang diminta.
- `listRumahTanggaDenganKepala` mengambil kepala RTM tanpa `village_id`.
- `listLampiranTerpasang` menampilkan lampiran dari desa lain yang tertaut ke
  DTKS desa aktif.
- `tautkanLampiran` dan `lepasLampiran` mengabaikan `villageId`, sehingga relasi
  dengan lampiran desa lain dapat dibuat atau dihapus.

**Suplemen**

- `listSuplemen` menghitung seluruh baris `suplemen_terdata` berdasarkan
  `id_suplemen` tanpa `village_id`.
- `listSuplemenTerdata` membaca identitas penduduk/KK lintas desa dan tidak
  memverifikasi parent suplemen; ID referensi yang gagal di-resolve juga tidak
  boleh dikembalikan ke pemanggil.
- `listSuplemenRekap` mengagregasi terdata tanpa memastikan parent suplemen
  berasal dari desa yang sama.
- `addSuplemenTerdataImpor` tidak memvalidasi parent suplemen maupun sasaran.
- `getSuplemenPublikBySlug` membaca seluruh terdata berdasarkan `id_suplemen`,
  sehingga jumlah dan nama kolom isian dapat tercampur data desa lain.

## File yang diperiksa

- `src/features/penduduk/infrastructure/dtks-repository.ts`
- `src/features/penduduk/infrastructure/suplemen-repository.ts`
- `src/features/penduduk/infrastructure/suplemen-publik-repository.ts`
- `src/features/penduduk/application/dtks-use-cases.ts`
- `src/features/penduduk/application/suplemen-use-cases.ts`
- `src/db/schema/dtks.ts`, `src/db/schema/suplemen.ts`,
  `src/db/schema/rumah-tangga.ts`, `src/db/schema/family.ts`,
  `src/db/schema/region.ts`
- `vitest.integration.config.mts`
- Pola test tenant: `src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts`

## File yang diubah

1. `src/features/penduduk/infrastructure/dtks-repository.ts`
   - JOIN RTM, keluarga, wilayah, dan kepala RTM diberi predicate tenant.
   - EXISTS pencarian penduduk dibatasi `residents.village_id`.
   - Agregat anggota dibatasi `village_id` dan parent DTKS desa aktif.
   - `listDtksAnggota` memverifikasi parent DTKS dan penduduk satu desa.
   - Lampiran dibaca hanya bila lampiran dan DTKS satu desa.
   - Taut/lepas lampiran memvalidasi kepemilikan kedua objek di repository.
   - Baris DTKS legacy dengan RTM/KK desa lain tetap tampil tanpa identitas
     desa lain (`rtmNumber` menjadi `"-"`); jumlah total tetap hanya DTKS desa
     aktif.
2. `src/features/penduduk/infrastructure/suplemen-repository.ts`
   - Subquery `terdataCount` mengikat `village_id`.
   - JOIN parent suplemen, penduduk, dan keluarga diberi predicate tenant.
   - Agregat rekap di-join ke parent suplemen desa aktif.
   - Impor memvalidasi parent suplemen, sasaran penduduk/keluarga, dan tepat
     satu sasaran sebelum menyisipkan baris.
3. `src/features/penduduk/infrastructure/suplemen-publik-repository.ts`
   - Detail publik membatasi terdata dengan `village_id` yang sama.
4. `src/features/penduduk/infrastructure/dtks-tenant-isolation.integration.test.ts`
   - 13 test isolasi DTKS dengan dua desa sintetis dan relasi legacy.
5. `src/features/penduduk/infrastructure/suplemen-tenant-isolation.integration.test.ts`
   - 9 test isolasi Suplemen, termasuk impor dan operasi hapus.
6. `vitest.integration.config.mts`
   - Mendaftarkan kedua file test baru.

Tidak ada perubahan schema atau migration pada task ini.

## Perubahan perilaku penting

- Relasi legacy lintas desa tidak lagi menampilkan nomor RTM, nomor KK, dusun,
  nama/NIK kepala atau anggota, serta tidak ikut dihitung pada DTKS desa lain.
- Baris DTKS/terdata yang secara `village_id` milik desa aktif tetap terlihat,
  tetapi identitas referensi dari desa lain disensor atau tidak di-join.
- Taut/lepas lampiran lintas desa ditolak dengan error dan tidak menulis atau
  menghapus relasi.
- Impor Suplemen tidak dapat menulis ke parent atau sasaran desa lain.
- Detail publik hanya menghitung dan membaca kolom isian dari desa pemilik slug.

## Validasi yang dijalankan

Semua perintah dijalankan pada 12 November 2026.

| Perintah | Hasil | Bukti ringkas |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | `next typegen` sukses, `tsc --noEmit` tanpa error |
| `npm run lint` | **PASS** | `eslint .` tanpa error |
| `npm run format:check` | **PASS** | Semua file sesuai Prettier |
| `npm run test` | **PASS** | 187 file, 1701 test |
| Integration terfokus (dua file baru) | **PASS** | 2 file, 22 test |
| `npm run test:integration` | **PASS** | 14 file, 93 test |

Integration dijalankan dengan database disposable baru:

- Fokus: `desa_test_b2_20261112`
- Penuh: `desa_test_b2_full_20261112`

Keduanya menggunakan `TEST_DATABASE_URL`, `DATABASE_URL` yang sama,
`TEST_DATABASE_ACK=1`, dan `NODE_ENV=test`. Database development existing tidak
disentuh.

Test baru mencakup:

- Data desa sendiri tetap terbaca.
- DTKS/terdata desa lain tidak muncul pada daftar, count, rekap, ekspor, atau
  detail publik.
- Relasi legacy RTM/KK/penduduk lintas desa tidak membocorkan identitas.
- Lampiran lintas desa tidak tampil dan taut/lepasnya ditolak.
- Operasi hapus tidak menghapus objek desa lain.
- Impor menolak parent/sasaran desa lain dan tetap idempoten untuk data sendiri.

## Validasi tambahan setelah review

Perbaikan lanjutan pada `listSuplemenTerdata` menyensor `pendudukId` dan
`keluargaId` ketika referensi tidak ditemukan pada tenant aktif. Integration
test menegaskan ID lintas desa tidak keluar melalui DTO. Perubahan ini sudah
masuk ke branch, tetapi seluruh test perlu dijalankan ulang setelah commit
review-fix.

## Risiko dan keterbatasan

1. **Belum ada composite FK/`village_id` baru.** Sesuai batasan task, schema dan
   migration tidak diubah. Isolasi ditegakkan di repository; jalur query baru
   atau akses SQL langsung masih harus mematuhi aturan yang sama.
2. **Cascade delete legacy.** Menghapus parent DTKS/Suplemen masih dapat
   menghapus baris anak legacy milik desa lain melalui FK single-column
   `ON DELETE CASCADE`. Perbaikan memerlukan keputusan schema/migration pada
   task database terpisah.
3. **`dtks_ref_lampiran` tidak memiliki `village_id`.** Kepemilikan divalidasi
   dari kedua parent di application layer, bukan oleh constraint database.
4. **Scope terbatas pada fungsi yang diminta.** Fungsi DTKS lain seperti
   `createOrGetDtks`, `getDtksDetail`, `updateDtks`, dan CRUD lampiran tidak
   direfactor pada task ini.
5. **PR belum dibuat.** Environment tidak memiliki `gh` maupun token GitHub
   (`gh_unavailable`, token absent), sehingga branch hanya dapat di-push dan PR
   harus dibuat manual dari GitHub.

## Rekomendasi berikutnya

- Buat PR dari branch ini ke `main` setelah push, lalu jalankan review.
- Task database terpisah: composite FK/`village_id` untuk `dtks`, `dtks_anggota`,
  `dtks_ref_lampiran`, dan `suplemen_terdata` beserta strategi backfill dan
  penanganan cascade lintas tenant.
- Audit lanjutan fungsi DTKS di luar daftar B2 bila akan dipakai untuk operasi
  tulis baru.
