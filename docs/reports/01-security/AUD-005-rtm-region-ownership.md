# AUD-005 — Validasi Kepemilikan Wilayah pada Rumah Tangga

- **Tanggal:** 14 November 2026
- **Branch:** `task/AUD-005-rtm-region-ownership-v2`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Menolak `regionId` milik desa lain saat membuat atau mengubah rumah
  tangga (RTM) di layer aplikasi.

## Kondisi awal

Query baca RTM di `main` sudah dibatasi `village_id`, dan composite foreign key
`rtm_region_tenant_fk` tersedia pada migration `0001`. Namun
`createRumahTangga` dan `updateRumahTangga` meneruskan `input.regionId` langsung
ke repository tanpa memeriksa pemilik wilayah.

Dampaknya sama dengan AUD-004: relasi lintas desa dapat tersimpan pada database
yang belum menjalankan migration, dan pada database dengan composite FK input
lintas desa gagal sebagai error SQL 500, bukan kesalahan validasi.

## Perubahan

- `src/features/rumah-tangga/infrastructure/rumah-tangga-repository.ts`
  - Tambah `validateRumahTanggaRegion(villageId, regionId)`: `null` boleh,
    selain itu wilayah harus ada dengan `regions.village_id = villageId`,
    jika tidak lempar `AppError("VALIDATION")`.
- `src/features/rumah-tangga/application/use-cases.ts`
  - Panggil validasi pada `createRumahTangga` dan `updateRumahTangga`.
- `src/features/rumah-tangga/infrastructure/rumah-tangga-tenant-isolation.integration.test.ts`
  - Fixture menyimpan ID wilayah kedua desa.
  - Test baru: wilayah desa lain ditolak (`code: "VALIDATION"`), wilayah sendiri
    dan `null` diterima.

## Security/tenant

- `villageId` berasal dari sesi melalui `resolveVillageId(user)`.
- Repository tetap membatasi `update`/`delete`/penetapan anggota dengan
  `village_id` (sudah ada sebelumnya).
- Test negatif memakai wilayah nyata milik desa kedua pada database uji.

## Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx prettier --check src/features/rumah-tangga` | PASS |
| Integration test rumah tangga pada MySQL 8.0.30 disposable (`desa_test_aud005`, `127.0.0.1:3309`) | PASS — 3 test |

## Risiko tersisa

- RTM lama yang sudah menunjuk wilayah desa lain akan ditolak saat diubah
  sampai operator memilih wilayah desa sendiri.
- Suite integrasi penuh tidak dijalankan pada branch ini.

## Status

Siap review. Belum di-merge dan belum di-deploy.
