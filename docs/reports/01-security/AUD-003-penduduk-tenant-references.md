# AUD-003 — Validasi foreign reference penduduk

- **Tanggal:** 12 November 2026
- **Task:** AUD-003 — memastikan relasi keluarga dan wilayah pada penduduk berasal dari tenant yang sama, query/JOIN tenant-scoped, dan tersedia regression test dua tenant.
- **Branch:** `task/AUD-003-penduduk-tenant-references`
- **Base commit:** `5a3f7502be6a71d0809600fa14b07c9f4807f1e5` (`origin/main`)
- **Commit kode dan test:** `d65332f81694b8812c1f1ae0751f2d5269a44387` (laporan ini di-commit terpisah pada branch yang sama)
- **Status:** selesai — siap review, belum merge/production.

## Kondisi awal dan analisis

Pemeriksaan dilakukan pada branch task yang sudah memuat tiga commit AUD-003 terdahulu (`4576055`, `ef01ecd`, `af726e4`). `origin/main` berada di `5a3f750` dan menjadi ancestor langsung branch. Working tree bersih sebelum sesi remediasi ini.

Implementasi yang sudah ada:

- Create dan update memanggil validasi `familyId` dan `regionId` dengan pasangan ID + `villageId`.
- Target penduduk dibaca dengan `villageId`; query update/delete memakai predicate ID + `villageId`.
- JOIN keluarga/wilayah pada detail dan data surat sudah menyertakan `villageId`.
- Belum ada regression test penduduk khusus yang membuktikan penolakan lintas tenant atau predicate JOIN.

Gap yang ditemukan:

- Dua JOIN pada `listPenduduk` (data dan count) memasangkan keluarga/wilayah hanya dengan ID. Label KK/wilayah dapat berasal dari desa lain bila ada relasi legacy yang salah.
- JOIN wilayah pada laporan kependudukan tidak membatasi `regions.villageId`.
- Empat query DPT (daftar, count, ringkasan, ekspor) menggabungkan wilayah hanya dengan ID.
- Jalur `catatKelahiran` dan `catatDatang` membuat penduduk baru tanpa memvalidasi `familyId`/`regionId` terhadap tenant aktif.
- Tidak ditemukan jalur import langsung ke tabel `residents`; insert penduduk ditemukan di repository penduduk dan repository riwayat penduduk.

Katalog formulir `religions`, `educations`, `occupations`, `maritalStatuses`, `familyRelations`, `bloodTypes`, dan `citizenships` pada `src/db/schema/reference.ts` bersifat global (tanpa `villageId`), sehingga bukan katalog tenant-scoped dan tidak diberi validasi silang.

Root cause: sebagian query membaca relasi keluarga/wilayah berdasarkan ID saja, dan dua use case riwayat membuat penduduk tanpa memanggil validasi ownership yang sudah tersedia.

## File diperiksa

- `AGENTS.md`, `docs/TECHNICAL_AUDIT.md`, `docs/MASTER_ROADMAP.md`
- `src/features/penduduk/domain/penduduk.ts`
- `src/features/penduduk/application/use-cases.ts`
- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/features/penduduk/infrastructure/laporan-penduduk-repository.ts`
- `src/features/penduduk/infrastructure/dpt-repository.ts`
- `src/features/penduduk/infrastructure/riwayat-penduduk-repository.ts`
- `src/features/penduduk/domain/tte*.ts` (hanya untuk memastikan tidak ada jalur lain yang menyentuh referensi penduduk)
- `src/db/schema/resident.ts`, `family.ts`, `region.ts`, `reference.ts`
- `src/features/wilayah/domain/wilayah.ts`
- `src/testing/migrasi-uji.ts`, `vitest.integration.config.mts`
- `package.json`

## File diubah

1. `src/features/penduduk/infrastructure/penduduk-repository.ts`
   - JOIN keluarga dan wilayah pada daftar serta count kini memakai `and(id match, villageId)`.
   - Menambahkan `joinedRegionId` dari hasil JOIN; label wilayah hanya dibentuk jika JOIN berhasil, sehingga relasi lintas tenant menghasilkan `null` dan bukan label palsu.
   - Validasi `validatePendudukTenantReferences` tetap dipakai create/update; detail dan data surat tetap tenant-scoped.
   - Perapian format Prettier pada blok yang sebelumnya belum sesuai (tanpa perubahan perilaku).

2. `src/features/penduduk/infrastructure/laporan-penduduk-repository.ts`
   - JOIN `regions` pada statistik kependudukan menambahkan `regions.villageId = villageId`.

3. `src/features/penduduk/infrastructure/dpt-repository.ts`
   - Empat JOIN `regions` (daftar, count, ringkasan, ekspor) dibatasi tenant.

4. `src/features/penduduk/application/riwayat-penduduk-use-cases.ts`
   - `validatePendudukTenantReferences(villageId, parsed)` dipanggil pada `catatKelahiran` dan `catatDatang` sebelum insert.

5. `src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts` (baru)
   - Regression test dua tenant dengan tiga desa sintetis (A, B, C). Desa C menyimpan relasi legacy lintas desa yang dimasukkan langsung ke database untuk menguji JOIN read-only.

6. `vitest.integration.config.mts`
   - Menambahkan file test AUD-003 ke daftar `include` integration test.

7. `docs/reports/01-security/AUD-003-penduduk-tenant-references.md`
   - Laporan ini.

## Perubahan dan cakupan test

15 test integration yang dijalankan:

- Create penduduk menolak `familyId` desa lain dan `regionId` desa lain, serta memastikan tidak ada baris tersimpan.
- Create penduduk menerima referensi desa sendiri.
- `catatKelahiran` menolak `familyId` desa lain; `catatDatang` menolak `regionId` desa lain; keduanya memastikan tidak ada baris tersimpan.
- Update menolak `familyId`/`regionId` desa lain tanpa mengubah data lama.
- Update menolak ID penduduk milik desa lain (`NOT_FOUND`) tanpa mutasi.
- Update menerima referensi desa sendiri dan menulis dengan predicate `id + villageId`.
- Daftar penduduk tidak menampilkan nomor KK/label wilayah desa lain, termasuk untuk relasi legacy.
- Pencarian nomor KK tidak menemukan keluarga desa lain.
- Detail dan data surat tidak membawa keluarga/wilayah desa lain.
- Laporan kependudukan tidak memberi label wilayah desa lain.
- DPT daftar, ekspor, dan rekap tidak memakai wilayah desa lain.
- Katalog referensi formulir terbukti global tanpa `villageId`.

Test memakai mock `requirePermission`/`resolveVillageId` dengan sesi per desa dan mock `recordAuditEvent` agar actor fixture sintetis tidak melanggar FK audit. Database yang dipakai adalah `desa_test` disposable di `127.0.0.1`; database `desa_dev` dan database test lain tidak disentuh.

## Database test

Sesuai instruksi, database test lama di-drop dan dibuat ulang, lalu migrasi dijalankan ulang. Hanya `desa_test` yang di-drop setelah nama diverifikasi terhadap pola guard `^desa_test(?:_[a-z0-9][a-z0-9_]{0,31})?$`.

Hasil migrasi: berhasil, 148 tabel, 1 migrasi tercatat. Tidak ada migration atau data production yang disentuh.

## Security dan tenant review

- Tenant ID bersumber dari `resolveVillageId(user)` pada use case, bukan dari body/query/header klien.
- Validasi create/update memakai pasangan `id + villageId`; pesan error generik tidak mengungkap keberadaan ID tenant lain.
- Mutation update/delete dibatasi tenant di SQL, bukan hanya di use case.
- Semua JOIN keluarga/wilayah yang diperbaiki kini menyertakan `villageId`, termasuk count dan ekspor.
- Relasi legacy lintas tenant tidak lagi menampilkan data tenant lain; label menjadi `null`, bukan label fallback yang menyesatkan.
- Katalog global tidak diperlakukan sebagai tenant-scoped.
- Belum menambahkan composite FK; hal ini tetap menjadi pekerjaan AUD-002 dan tidak diklaim selesai di sini.
- Tidak ada perubahan UI, schema, atau migration pada task ini.

## Validasi

Semua perintah dijalankan lokal pada branch ini. Database integration: `desa_test @ 127.0.0.1`.

| Pemeriksaan | Status | Bukti |
|---|---|---|
| `npm run format:check` | PASS | `All matched files use Prettier code style!`, exit 0 |
| `npm run typecheck` | PASS | `next typegen` sukses, `tsc --noEmit` exit 0 |
| `npm run lint` | PASS | `eslint .` exit 0, tanpa error |
| `npm run test:unit` | PASS | 187 file, 1701 test lulus, exit 0 |
| Integration test AUD-003 | PASS | `15 passed (15)`, 1 file, exit 0 |
| `npm run build` | SKIPPED | Tidak dijalankan pada sesi ini |
| Seluruh `npm run test:integration` | SKIPPED | Hanya test terfokus AUD-003 yang dijalankan |

Perintah integration yang dipakai (nilai kredensial tidak dicantumkan di laporan):

```bash
TEST_DATABASE_URL='mysql://<user>:<password>@127.0.0.1:3306/desa_test' \
TEST_DATABASE_ACK=1 NODE_ENV=test \
npx vitest run --config vitest.integration.config.mts \
  src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts
```

Sebelum perbaikan, test yang sama menghasilkan `6 failed | 9 passed`. Kegagalan mencakup `catatKelahiran`/`catatDatang`, label KK/wilayah daftar, pencarian nomor KK lintas desa, laporan wilayah, dan DPT. Setelah perbaikan seluruh 15 test lulus.

Catatan validasi:

- Satu kegagalan lanjutan `expected 'Wilayah tanpa nama' to be null` diperbaiki dengan memakai `joinedRegionId` sebagai penentu label.
- Error FK `audit_logs_actor_id_users_id_fk` pada percobaan awal diatasi dengan mock audit pada test, bukan dengan melonggarkan constraint.

## Risiko dan batasan

- Validasi ownership dilakukan sebelum insert/update dan belum dibungkus transaksi dengan row lock. ID tenant pada tabel induk tidak diubah melalui alur normal, tetapi composite FK tetap diperlukan untuk pertahanan tingkat database (AUD-002).
- Belum ada backfill atau pembersihan data legacy yang sudah terlanjur memiliki relasi silang. Query sekarang tidak menampilkannya, tetapi inventarisasi data tetap perlu.
- Build dan seluruh integration suite tidak dijalankan; status keduanya SKIPPED, bukan PASS.
- Test integration bergantung pada database MySQL disposable dan tidak dijalankan terhadap production.
- Perbaikan ini tidak mengklaim seluruh query penduduk di luar daftar/count/laporan/DPT sudah tenant-scoped; area lain tetap mengikuti audit masing-masing.

## Kesimpulan

Foreign reference penduduk pada create/update, jalur riwayat kelahiran/kedatangan, daftar/count penduduk, laporan kependudukan, dan DPT telah dibatasi tenant serta dilindungi regression test dua tenant. Seluruh pemeriksaan yang diminta berstatus PASS; build dan full integration suite belum dijalankan dan dilaporkan sebagai SKIPPED.

Status: **siap review**. Belum siap merge atau production tanpa persetujuan maintainer.
