# AUD-007 — Tenant isolation pada riwayat mutasi penduduk

- **Tanggal:** 12 November 2026
- **Task:** GitHub Issue #4 — [AUD-007] Tenant Isolation pada Riwayat Mutasi Penduduk.
- **Branch:** `task/AUD-007-riwayat-tenant-isolation`
- **Base commit:** `5a3f7502be6a71d0809600fa14b07c9f4807f1e5` (`origin/main`)
- **Commit kode, test, dan konfigurasi:** `e03407ae53060df86687165945ab6546145c13b1` (laporan ini di-commit terpisah pada branch yang sama)
- **Status:** selesai — siap review, belum merge/deploy.

## Latar belakang dan analisis

Issue #4 mencatat bahwa repository riwayat mutasi memfilter `resident_mutations` berdasarkan `villageId`, tetapi JOIN ke `residents` hanya memakai `residents.id = resident_mutations.residentId`. Karena `resident_mutations` menyimpan `villageId` dan `residentId` secara terpisah tanpa composite foreign key, relasi legacy lintas desa dapat menampilkan nama/NIK penduduk desa lain pada riwayat tenant aktif.

Hasil audit pada `origin/main`:

- `listRiwayatPenduduk()` — JOIN penduduk pada query daftar dan count hanya memakai `residentId`.
- `listRiwayatPendudukExport()` — JOIN penduduk pada ekspor hanya memakai `residentId`.
- `getRiwayatByResident()` — JOIN penduduk pada riwayat per penduduk hanya memakai `residentId`.
- `simpanPendudukBaruDanMutasi()` — penduduk dan mutasi menerima `villageId` masing-masing tanpa pemeriksaan kesamaan; `residentId` memang diambil dari hasil insert.
- `ubahStatusPendudukDanMutasi()` — update penduduk sudah memakai predicate `id + villageId`, tetapi hasil update tidak diperiksa. Bila update tidak mengenai baris (mis. `residentId` milik desa lain), mutasi tetap di-insert dengan `villageId` dari pemanggil. Ini dapat menciptakan pasangan tenant-resident yang tidak konsisten.
- `bumindes-repository.ts` hanya membaca `residentMutations.type` untuk agregasi; tidak membaca identitas penduduk.
- Tidak ada query riwayat mutasi lain yang membaca `residents.name`/`residents.nationalId`.
- Satu-satunya route yang memakai use case ini di `origin/main` adalah `src/app/(admin)/penduduk/riwayat/ekspor/route.ts`; route tersebut memeriksa sesi dan permission `PENDUDUK_RESOURCE:read`, lalu memakai `villageId` dari sesi.

## File diperiksa

- `src/features/penduduk/infrastructure/riwayat-penduduk-repository.ts`
- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts`
- `src/features/penduduk/domain/riwayat-penduduk.ts`
- `src/db/schema/resident-mutation.ts`
- `src/db/schema/resident.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts` (fungsi `findPendudukById`, `nationalIdExists`)
- `src/features/bumindes/infrastructure/bumindes-repository.ts`
- `src/app/(admin)/penduduk/riwayat/ekspor/route.ts`
- `src/lib/errors.ts`, `src/lib/dal.ts`, `src/features/desa/application/resolve-village.ts` (alur tenant)
- `src/testing/migrasi-uji.ts`, `vitest.integration.config.mts`
- `AGENTS.md`, `docs/TECHNICAL_AUDIT.md`, `docs/MASTER_ROADMAP.md`

## File diubah

1. `src/features/penduduk/infrastructure/riwayat-penduduk-repository.ts`
   - Menambahkan helper `joinResidentTenant(villageId)` yang memasangkan `residents.id` dan `residents.villageId`.
   - `listRiwayatPenduduk()`: JOIN daftar dan count memakai helper tersebut.
   - `listRiwayatPendudukExport()`: JOIN ekspor memakai helper tersebut.
   - `getRiwayatByResident()`: memakai `innerJoin` dengan helper tersebut agar ID penduduk tenant lain tidak membuka baris mutasi desa ini, termasuk baris legacy.
   - `simpanPendudukBaruDanMutasi()`: menolak `mutasi.villageId` yang berbeda dari `penduduk.villageId`; nilai `villageId` mutasi diambil dari penduduk yang baru di-insert.
   - `ubahStatusPendudukDanMutasi()`: menolak payload mutasi dengan desa berbeda; memeriksa `affectedRows` dan melempar `NOT_FOUND` bila update tidak mengenai penduduk tenant tersebut, sehingga mutasi tidak tersimpan dan transaksi rollback.

2. `src/features/penduduk/infrastructure/riwayat-penduduk-tenant-isolation.integration.test.ts` (baru)
   - Regression test dua desa sintetis (A dan B), satu baris legacy desa A yang menunjuk penduduk desa B, dan aktor user nyata agar FK `actorId` valid.

3. `vitest.integration.config.mts`
   - Menambahkan test AUD-007 ke daftar `include`.

4. `docs/reports/01-security/AUD-007-riwayat-mutasi-tenant-isolation.md`
   - Laporan ini.

Tidak ada perubahan schema, migration, UI, atau data production.

## Perilaku setelah perbaikan

- Daftar dan ekspor tetap menampilkan baris mutasi legacy milik tenant aktif, tetapi `residentName` dan `residentNationalId` menjadi `null` karena JOIN identitas tidak cocok dengan tenant. Ini memenuhi ketentuan issue: baris boleh tetap tampil, identitas lintas tenant tidak boleh bocor.
- Pencarian nama/NIK penduduk desa lain tidak menemukan baris karena predikat pencarian memakai kolom `residents` yang telah dibatasi tenant.
- Total count memakai JOIN yang sama dengan query daftar, sehingga pencarian dan pagination konsisten.
- Riwayat per penduduk hanya mengembalikan mutasi yang penduduknya berada di tenant yang sama.
- Penulisan mutasi tidak dapat menghasilkan pasangan `residentId`/`villageId` lintas tenant melalui repository.

## Cakupan regression test (12 test)

1. Daftar menampilkan identitas penduduk desa sendiri dan menyembunyikan identitas lintas desa.
2. Total count dan pagination konsisten pada dua halaman.
3. Pencarian nama dan NIK penduduk desa lain menghasilkan nol baris.
4. Pencarian nomor referensi legacy menampilkan baris tanpa identitas penduduk.
5. Desa B tetap dapat membaca identitas penduduknya sendiri.
6. Ekspor tidak membawa nama/NIK penduduk desa lain.
7. Riwayat per penduduk hanya mengembalikan mutasi penduduk tenant tersebut; ID penduduk desa B tidak membuka riwayat desa A.
8. `catatKelahiran` dan `catatKematian` menulis penduduk dan mutasi dengan `villageId` yang sama.
9. `simpanPendudukBaruDanMutasi` menolak desa penduduk dan mutasi berbeda serta rollback (tidak ada penduduk/mutasi tersimpan).
10. `ubahStatusPendudukDanMutasi` menolak penduduk desa lain dengan `NOT_FOUND`, status tidak berubah, mutasi tidak tersimpan.
11. `ubahStatusPendudukDanMutasi` menolak payload `villageId` berbeda dengan `VALIDATION`.
12. Use case `catatKematian` menolak `residentId` desa lain sebelum menulis mutasi.

## Security dan tenant review

- `villageId` berasal dari `resolveVillageId(user)` pada use case, bukan dari input klien.
- Seluruh query daftar/count/ekspor/per-penduduk yang membaca identitas kini mensyaratkan `residents.villageId` sama dengan tenant mutasi.
- Baris legacy lintas tenant tidak dihapus dan tidak di-backfill; identitasnya disuppress pada output.
- Jalur tulis memeriksa konsistensi desa sebelum insert dan memeriksa hasil update di dalam transaksi.
- Permission dan sesi tetap diperiksa oleh route ekspor dan use case; task ini tidak mengubah perilaku aktor global.
- Tidak ada composite FK baru; enforcement database tetap dikoordinasikan dengan AUD-002 sesuai batasan issue.

## Validasi

Dijalankan lokal pada branch ini. Integration test memakai database disposable `desa_test @ 127.0.0.1`.

| Pemeriksaan | Status | Bukti |
|---|---|---|
| `npm run typecheck` | PASS | `next typegen` sukses, `tsc --noEmit` exit 0 |
| `npm run lint` | PASS | `eslint .` exit 0 |
| `npm run format:check` | PASS | `All matched files use Prettier code style!` |
| `npm run test:unit` | PASS | 187 file, 1701 test lulus |
| Integration test AUD-007 | PASS | `12 passed (12)`, 1 file, exit 0 |
| `npm run build` | SKIPPED | Tidak dijalankan pada sesi ini |
| Seluruh `npm run test:integration` | SKIPPED | Hanya test terfokus AUD-007 yang dijalankan |

Perintah integration (kredensial tidak dicantumkan):

```bash
TEST_DATABASE_URL='mysql://<user>:<password>@127.0.0.1:3306/desa_test' \
TEST_DATABASE_ACK=1 NODE_ENV=test \
npx vitest run --config vitest.integration.config.mts \
  src/features/penduduk/infrastructure/riwayat-penduduk-tenant-isolation.integration.test.ts
```

## Temuan tambahan (di luar scope, tidak diubah)

- Pada `origin/main`, `updatePenduduk(id)` dan `deletePenduduk(id)` belum memakai predicate `villageId`. Ini sudah ditangani pada branch/PR AUD-003 (#3) dan tidak diubah di branch ini.
- `simpanPendudukBaruDanMutasi` tetap menerima `familyId`/`regionId` dari use case; validasi referensi keluarga/wilayah lintas tenant adalah scope AUD-003, bukan AUD-007.
- `resident_mutations` belum memiliki composite foreign key `(resident_id, village_id)`; enforcement database perlu dikoordinasikan dengan AUD-002.
- `getRiwayatByPendudukId` dan `listRiwayat` belum memiliki pemanggil UI di `origin/main` selain route ekspor; query tetap diperketat sebagai pertahanan berlapis.

## Risiko dan batasan

- Perbaikan ini adalah enforcement application-layer. Data legacy lintas tenant masih ada dan belum diinventarisasi/di-backfill; task backfill memerlukan persetujuan terpisah.
- Belum ada composite FK atau constraint database yang menjamin `resident_mutations.village_id` sama dengan `residents.village_id`.
- `ubahStatusPendudukDanMutasi` memakai `affectedRows` untuk mendeteksi penduduk yang tidak ada di tenant. Jalur use case selalu mengubah status, sehingga no-op bukan skenario normal; bila status tidak berubah, repository akan menolak operasi.
- Build dan seluruh integration suite tidak dijalankan; statusnya SKIPPED, bukan PASS.
- Tidak ada merge, deploy, force push, atau perubahan database production.

## Kesimpulan

Seluruh JOIN `resident_mutations -> residents` yang membaca identitas penduduk telah dibatasi tenant, pencarian/pagination/count/ekspor konsisten, dan jalur tulis mutasi tidak lagi dapat menyimpan pasangan tenant-resident yang tidak konsisten. Regression test dua tenant lulus 12/12.

Status: **siap review**. Belum siap merge atau production tanpa persetujuan maintainer.
