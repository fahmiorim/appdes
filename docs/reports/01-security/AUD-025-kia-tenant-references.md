# AUD-025 — Kepemilikan Referensi Ibu/Anak pada KIA

- **Tanggal:** 14 November 2026
- **Branch:** `task/AUD-025-kia-tenant-references-v2`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Menolak `ibuId`/`anakId` milik desa lain saat membuat atau mengubah
  data KIA.

## Kondisi awal

`tambahKia` dan `ubahKia` hanya memvalidasi bentuk input dengan Zod. `villageId`
diambil dari sesi, tetapi `ibuId`/`anakId` diteruskan apa adanya ke repository.
Database yang belum menjalankan migration composite FK dapat menyimpan KIA
dengan referensi penduduk desa lain; pada database dengan composite FK input
tersebut gagal sebagai error SQL, bukan kesalahan validasi.

`ubahKia` juga tidak memeriksa apakah baris KIA benar-benar milik desa aktif
sebelum update; `updateKia` memang sudah membatasi `where village_id`, tetapi
pemanggil tidak mendapat 404 yang jelas.

## Perubahan

- `src/features/kesehatan/infrastructure/kesehatan-repository.ts`
  - `findKiaReferenceById(villageId, id)` — ambil `ibuId`/`anakId` dengan filter
    desa.
  - `kiaResidentReferencesOwned(villageId, ibuId, anakId)` — pastikan semua ID
    penduduk yang dirujuk ada di desa aktif.
- `src/features/kesehatan/application/kia-use-cases.ts`
  - `tambahKia`: tolak referensi lintas desa dengan `AppError("VALIDATION")`.
  - `ubahKia`: ambil referensi saat ini (404 bila tidak ada di desa aktif),
    gabungkan dengan input parsial, lalu validasi kepemilikan sebelum update.
- `src/features/kesehatan/application/kia-use-cases.test.ts`
  - Mock repository diperluas; tiga test baru: tolak tambah dengan referensi
    desa lain, tolak ubah dengan referensi desa lain (memakai referensi lama),
    dan 404 saat KIA tidak ada pada desa aktif.

Perubahan pada branch lama yang **tidak** diambil: branch
`task/AUD-025-kia-tenant-references` juga menghapus filter `villageId` pada
pemeriksaan dependensi `deleteKia`. Itu melemahkan isolasi tenant (menghitung
data desa lain), sehingga `main` yang sudah tenant-scoped dipertahankan.

## Security/tenant

- `villageId` berasal dari sesi (`konteksKia` → `resolveVillageId`).
- Validasi kepemilikan dijalankan sebelum insert/update, bukan hanya di UI.
- Pesan kesalahan bersifat generik dan tidak menyebut data desa lain.
- Query referensi dan pencarian KIA selalu menyertakan `village_id`.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/features/kesehatan` | PASS — 4 file, 45 test |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx prettier --check src/features/kesehatan` | PASS |

## Risiko tersisa

- Test memakai repository tiruan; belum ada integration test yang menyentuh
  baris `residents` desa lain secara nyata untuk modul KIA.
- Data KIA lama yang sudah menunjuk penduduk desa lain akan ditolak saat diubah
  sampai diperbaiki manual.

## Status

Siap review. Belum di-merge dan belum di-deploy.
