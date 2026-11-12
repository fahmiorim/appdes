# AUD-003 — Validasi foreign reference penduduk

- **Tanggal:** 12 November 2026
- **Task:** AUD-003 — memastikan relasi keluarga dan wilayah pada penduduk berasal dari tenant yang sama.
- **Branch:** `task/AUD-003-penduduk-tenant-references`
- **Base commit:** `5a3f7502be6a71d0809600fa14b07c9f4807f1e5`
- **Status:** implementasi awal selesai, menunggu validasi lokal.

## Kondisi awal dan analisis

Audit statis menemukan bahwa `familyId` dan `regionId` pada input penduduk diterima tanpa pemeriksaan eksplisit bahwa record induknya dimiliki `villageId` dari sesi. Query detail dan data surat juga menggabungkan keluarga/wilayah hanya berdasarkan ID. Update/delete repository penduduk menggunakan ID saja walaupun use case sudah melakukan pemeriksaan tenant sebelumnya.

Katalog agama, pendidikan, pekerjaan, status perkawinan, hubungan keluarga, golongan darah, dan kewarganegaraan merupakan tabel referensi global pada schema saat ini; validasi tenant tidak diterapkan pada tabel global tersebut.

## File diperiksa

- `AGENTS.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/MASTER_ROADMAP.md`
- `src/features/penduduk/domain/penduduk.ts`
- `src/features/penduduk/application/use-cases.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/db/schema/resident.ts`
- `src/db/schema/family.ts`
- `src/db/schema/region.ts`

## File diubah

1. `src/features/penduduk/infrastructure/penduduk-repository.ts`
   - Tambah `validatePendudukTenantReferences(villageId, input)`.
   - Periksa keberadaan KK dengan pasangan `id + villageId`.
   - Periksa keberadaan wilayah dengan pasangan `id + villageId`.
   - Tolak referensi yang tidak valid dengan pesan generik; tidak membocorkan apakah ID ada pada tenant lain.
   - Query detail penduduk dan data penduduk untuk surat membatasi join keluarga/wilayah dengan `villageId`.
   - Update dan delete penduduk kini memakai predicate `id + villageId`.

2. `src/features/penduduk/application/use-cases.ts`
   - Jalankan validasi foreign reference sebelum create dan update.
   - Kirim `villageId` ke repository update/delete agar predicate tenant ditegakkan di query mutasi.

## Security dan tenant review

- Tenant ID bersumber dari `resolveVillageId(user)`, bukan dari input klien.
- Foreign reference tenant-scoped yang disentuh task ini adalah KK dan wilayah.
- Katalog referensi lain pada schema saat ini bersifat global.
- Pesan validasi tidak mengungkap keberadaan ID milik tenant lain.
- Join detail dan data surat untuk KK/wilayah dibatasi ke tenant aktif.
- Mutation update/delete dibatasi tenant di SQL, bukan hanya mengandalkan pemeriksaan use case.
- Belum menambahkan composite FK; perubahan schema/migration lintas modul tidak termasuk scope task terfokus ini.
- Query daftar penduduk yang memiliki join keluarga/wilayah juga tercatat pada AUD-012 dan tidak diklaim selesai oleh task ini.
- Data legacy yang sudah terlanjur memiliki relasi silang perlu diinventarisasi terpisah sebelum menyatakan seluruh integritas data bersih.

## Validasi

Pemeriksaan belum dapat dijalankan dari koneksi GitHub.

| Pemeriksaan | Status | Catatan |
|---|---|---|
| Format check | SKIPPED | Jalankan lokal pada branch ini. |
| Typecheck | SKIPPED | Jalankan lokal pada branch ini. |
| Lint | SKIPPED | Jalankan lokal pada branch ini. |
| Unit test penduduk | SKIPPED | Belum ada test runtime baru yang dijalankan. |
| Integration test dua tenant | SKIPPED | Perlu MySQL test disposable; jangan gunakan database production. |
| Build | SKIPPED | Jalankan lokal pada branch ini. |

Perintah yang disarankan untuk validasi lokal:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Tambahkan/konfirmasi integration test dengan dua tenant: create dan update penduduk harus menolak `familyId`/ `regionId` milik tenant lain; referensi milik tenant sendiri dan nilai `null` harus tetap diterima. Pastikan query update/delete menyertakan kedua predicate tenant dan ID.

## Risiko dan batasan

- Pemeriksaan ownership dilakukan sebelum insert/update, belum dibungkus dalam transaksi dengan row lock. ID tenant pada tabel induk saat ini tidak diubah melalui alur normal; tetap pertimbangkan composite FK pada pekerjaan AUD-002 untuk pertahanan tingkat database.
- Tidak ada backfill atau perubahan data existing.
- AUD-012 (seluruh join daftar penduduk) tetap menjadi task terpisah.
- Belum ada klaim test, build, atau integration test lulus.

## Kesimpulan

Perubahan application/repository untuk menolak KK dan wilayah lintas tenant telah dibuat pada branch task. Status siap untuk validasi lokal dan review kode, belum siap dinyatakan merge atau production. Tunggu bukti validasi Freebuff sebelum keputusan berikutnya.
