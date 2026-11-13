# AUD-004 — Validasi Kepemilikan Wilayah pada Keluarga

- **Tanggal:** 14 November 2026
- **Branch:** `task/AUD-004-keluarga-region-ownership`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Menolak `regionId` milik desa lain saat membuat atau mengubah Kartu
  Keluarga (KK) di layer aplikasi.

## Kondisi awal

Query baca keluarga di `main` sudah dibatasi `village_id`, dan composite foreign
key `families_region_tenant_fk` sudah ada pada migration `0001`. Namun use case
`createKeluarga` dan `updateKeluarga` meneruskan `input.regionId` langsung ke
repository tanpa memeriksa apakah wilayah itu milik desa sesi.

Dampaknya:

- Pada database yang belum menjalankan migration composite FK, KK dapat tertaut
  ke wilayah desa lain.
- Pada database dengan composite FK, input lintas desa gagal sebagai error SQL
  (500) alih-alih kesalahan validasi yang aman (422), dan pesan error database
  berpotensi membocorkan nama constraint.

## Perubahan

- `src/features/keluarga/infrastructure/keluarga-repository.ts`
  - Tambah `validateKeluargaRegion(villageId, regionId)`: `null` selalu boleh,
    selain itu wilayah harus ada dengan `regions.village_id = villageId`,
    jika tidak lempar `AppError("VALIDATION")` dengan pesan generik.
- `src/features/keluarga/application/use-cases.ts`
  - Panggil validasi pada `createKeluarga` dan `updateKeluarga` sebelum menulis.
- `src/features/keluarga/infrastructure/keluarga-tenant-isolation.integration.test.ts`
  - Fixture menyimpan ID wilayah kedua desa.
  - Test baru: wilayah desa lain ditolak (`code: "VALIDATION"`), wilayah sendiri
    dan `null` diterima.

## Security/tenant

- Sumber `villageId` tetap dari sesi melalui `resolveVillageId(user)`; tidak ada
  input klien yang dipakai sebagai bukti otorisasi.
- Repository tetap membatasi `update`/`delete` dengan `village_id` (sudah ada).
- Test negatif memakai wilayah nyata milik desa kedua pada database uji.

## Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx prettier --check src/features/keluarga` | PASS |
| `TEST_DATABASE_URL='mysql://root@127.0.0.1:3309/desa_test_aud004' TEST_DATABASE_ACK=1 NODE_ENV=test npx vitest run --config vitest.integration.config.mts src/features/keluarga/infrastructure/keluarga-tenant-isolation.integration.test.ts` | PASS — 3 test |

Instance MySQL 8.0.30 disposable di `127.0.0.1:3309`, database
`desa_test_aud004`, bukan database pengembangan atau produksi.

## Risiko tersisa

- Perilaku baru menolak KK lama yang sudah terlanjur menunjuk wilayah desa lain
  saat diubah; operator harus memilih wilayah desa sendiri lebih dulu. Ini
  disengaja, tetapi perlu dicatat pada panduan operator.
- Suite integrasi penuh tidak dijalankan pada branch ini.

## Status

Siap review. Belum di-merge dan belum di-deploy.
