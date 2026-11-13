# AUD-034 Batch 2 — Isolasi tenant pada layer aplikasi (kontak & rekap kehadiran)

| Item | Nilai |
| --- | --- |
| Task | Issue #34, Batch 2: validasi tenant pada use case kontak, join rekap kehadiran, dan audit Lapak/`users.resident_id` |
| Tujuan | Relasi tenant-scoped yang diisi dari input tidak dapat menautkan data desa lain; rekap kehadiran tidak meminjam identitas penduduk desa lain; temuan yang tidak memiliki jalur aktif dicatat, bukan diubah |
| Tanggal | 14 November 2026 |
| Branch | `task/AUD-034-batch-2-application-isolation` |
| Base branch commit | `94534b6638bcb2fb9b3a2dfd9d0238ee882006f6` (`origin/main` setelah `git fetch`, merge PR #36) |
| Commit implementasi | HEAD branch task pada saat penyerahan (SHA di ringkasan handoff) |

## Kondisi awal dan analisis

Batch 1 (PR #36) sudah menutup relasi `resident_id` di level database untuk lima tabel: `dokumen_warga`, `kehadiran_izin`, `kelompok_anggota`, `verifikasi_kontak`, `warga_pesan`. Composite FK membuat pasangan `(village_id, resident_id)` lintas desa ditolak database pada jalur tulis normal. Batch 2 menggarap sisa celah di layer aplikasi, tanpa migration/schema change.

1. **`createKontakUseCase`** menyimpan `{ ...input, villageId }` ke `kontak` tanpa memeriksa `input.residentId`. Nilai `villageId` dari input memang ditimpa nilai server, tetapi `residentId` tetap diteruskan apa adanya.
2. **`updateKontakUseCase`** memiliki celah yang sama dan lebih lebar: `updateKontak(input.id!, villageId, input)` mengirim seluruh objek input ke `.set()`, termasuk `villageId` dari klien. `WHERE village_id` mencegah update lintas desa, tetapi `residentId` lintas desa tetap bisa ditulis dan `villageId` dari input ikut menjadi nilai `.set()`.
3. **`addAnggotaGrupUseCase`** langsung memanggil `addAnggotaGrup` tanpa memverifikasi `grupId` maupun `kontakId` milik desa aktif, sehingga anggota grup dapat menunjuk kontak desa lain (belum ada composite FK pada `anggota_grup_kontak`).
4. **`listAnggotaGrupDetail`** melakukan `innerJoin(kontak, eq(anggotaGrupKontak.kontakId, kontak.id))` lalu menyaring `anggotaGrupKontak.villageId`. Baris anggota lama yang `kontak_id`-nya milik desa lain akan tetap terbaca lengkap dengan nama/telepon kontak desa lain.
5. **Rekap kehadiran** (`tambahkanIzinDisetujui`) mencocokkan izin warga ke perangkat lewat NIK dengan `innerJoin(residents, eq(residents.id, kehadiranIzin.residentId))`. NIK hanya unik **per desa** (`residents` unique `(village_id, national_id)`), sehingga join tanpa predikat desa dapat memakai identitas penduduk desa lain yang kebetulan NIK-nya sama dan menambah hitungan izin/sakit perangkat desa lain.

## Temuan yang tidak diubah (bukti jalur aktif)

Scope Batch 2 membatasi perubahan pada temuan yang terbukti dari jalur aktif. Dua temuan berikut **tidak diubah** karena tidak ada jalur aktif yang dapat dicapai:

- **`createLapak` / `updateLapak`** — `src/app/**` tidak memuat satu pun route/halaman Lapak (`grep -rln "lapak" src/app` kosong). Satu-satunya pemanggil adalah `src/features/isolasi-village.integration.test.ts`. `createLapak(data)` menerima `villageId` di dalam `data` tanpa parameter tenant terpisah, jadi semantik "desa aktif" belum dapat dipastikan dari kode. Tidak diubah; perlu keputusan maintainer saat route Lapak dibuat.
- **`users.resident_id`** — kolom ini ditulis hanya oleh `createWargaAccount` (`src/features/warga/infrastructure/warga-repository.ts:135`), yang memvalidasi penduduk lewat `findResidentForAccount(villageId, residentId)`. `createWargaAccount`/`findResidentForAccount` tidak memiliki pemanggil di kode aplikasi (hanya `src/features/layanan-mandiri/integrasi-warga.test.ts`). Penulis `users` lain — `provisioning-repository.ts:448` (admin desa) dan `pengguna-repository.ts:105` (staf) — tidak mengisi `residentId`, sehingga nilainya `null` untuk akun non-warga. Jalur baca aktif (`src/lib/dal.ts`) mengambil `residentId` bersama `villageId` langsung dari DB dan use case warga selalu memakai pasangan `(villageId, residentId)`; tidak ada jalur baca yang memperlakukan `residentId` sebagai otorisasi lintas desa. Karena penulisnya belum terpasang dan sudah tenant-scoped saat dipakai, tidak ada perubahan; statusnya dicatat sebagai **belum terverifikasi pada jalur aktif**.

## File diperiksa

- `src/features/kontak/application/use-cases.ts`, `src/features/kontak/infrastructure/kontak-repository.ts`
- `src/db/schema/kontak.ts`, `src/db/schema/resident.ts`, `src/db/schema/kehadiran-izin.ts`
- `src/features/kehadiran/infrastructure/kehadiran-repository.ts`
- `src/features/lapak/infrastructure/lapak-repository.ts`, `src/app/**` (pencarian route Lapak)
- `src/features/warga/infrastructure/warga-repository.ts`, `src/features/pengguna/infrastructure/pengguna-repository.ts`, `src/features/multi-desa/infrastructure/provisioning-repository.ts`, `src/lib/dal.ts`, `src/lib/auth.ts`
- `src/lib/errors.ts` (`validationError`, `notFound`)
- `src/features/kelompok/infrastructure/kelompok-tenant-isolation.integration.test.ts` (pola test isolasi tenant)
- `vitest.integration.config.mts`, `src/testing/migrasi-uji.ts`, `src/testing/setup-integration.ts`, `src/testing/db-test-guard.ts`

## File berubah

- `src/features/kontak/infrastructure/kontak-repository.ts` — tambah `findKontak(villageId, id)`, `findKontakGrup(villageId, id)`, `residentExists(villageId, residentId)` (semua tenant-scoped); `listAnggotaGrupDetail` sekarang menyaring join `kontak` dengan `kontak.villageId = villageId`.
- `src/features/kontak/application/use-cases.ts` — helper `pastikanPendudukDesa` dipakai `createKontakUseCase` dan `updateKontakUseCase`; `updateKontakUseCase` memverifikasi kontak target milik desa aktif lalu hanya mengirim field yang di-whitelist; `updateKontakGrupUseCase` mendapat pemeriksaan tenant dan whitelist yang sama; `addAnggotaGrupUseCase` memverifikasi grup dan kontak milik desa aktif sebelum insert; 11 alias repository langsung dihapus dari ekspor (lihat tindak lanjut review).
- `src/features/kehadiran/infrastructure/kehadiran-repository.ts` — join `residents` pada rekap izin ditambah `residents.villageId = kehadiranIzin.villageId`; komentar menjelaskan alasan (NIK unik per desa).
- `src/features/kontak/application/kontak-tenant-isolation.integration.test.ts` (baru) — 14 test: penolakan `residentId`/`kontakId`/`grupId` lintas desa pada create, update, dan tambah anggota; pesan seragam untuk data tidak ada; jalur sah satu desa; `villageId` spoof tidak dapat memindahkan kontak/grup; ID kontak/grup desa lain menghasilkan `NOT_FOUND` dan barisnya tidak berubah; pembacaan baris anggota legacy.
- `src/features/kehadiran/infrastructure/rekap-kehadiran-tenant-isolation.integration.test.ts` (baru) — 3 test: izin sah desa sendiri terhitung, izin yang menunjuk penduduk desa lain dengan NIK sama tidak terhitung, desa lain tidak melihat perangkat desa ini.
- `vitest.integration.config.mts` — mendaftarkan kedua integration test baru.

Tidak ada perubahan schema, migration, data, maupun konfigurasi deployment.

## Perubahan dan hasil

- `villageId` selalu berasal dari parameter use case yang diisi pemanggil server-side; nilai `villageId` di dalam `input` ditimpa dan tidak pernah dipakai untuk otorisasi.
- Validasi kepemilikan memakai query `(village_id, id)` di database, bukan pemeriksaan di UI.
- Pesan kesalahan seragam: `validationError("Penduduk tidak ditemukan.")` dan `validationError("Kontak tidak ditemukan.")` untuk kasus "tidak ada" maupun "milik desa lain", sehingga keberadaan baris tenant lain tidak dapat disimpulkan dari respons. Kontak/grup desa lain pada update dan tambah anggota menghasilkan `NOT_FOUND` dengan pesan yang sama seperti baris yang memang tidak ada.
- `updateKontakUseCase` dan `updateKontakGrupUseCase` hanya mengirim kolom domain ke `.set()`; `id` dan `villageId` tidak pernah masuk SET, sehingga input klien tidak dapat memindahkan baris antar desa. Nilai `undefined` tetap dibiarkan agar semantik "tidak dikirim = tidak diubah" tidak berubah.
- Rekap kehadiran tetap kompatibel: hari izin/sakit/cuti yang disetujui dan belum punya catatan kehadiran tetap dihitung seperti sebelumnya, hanya identitas penduduk yang kini wajib satu desa.

## Security/tenant

- `createKontak`/`updateKontak`/`addAnggotaGrup` tetap memakai `villageId` pemberian server; `residentId`, `kontakId`, dan `grupId` dari input diverifikasi terhadap tenant aktif sebelum menulis.
- `listAnggotaGrupDetail` tidak lagi dapat menampilkan nama/telepon kontak desa lain melalui baris anggota lama.
- Join rekap kehadiran tidak lagi memakai identitas penduduk desa lain meski NIK sama.
- Tidak ada data tenant lain yang dikembalikan lewat pesan error, count, atau metadata.
- Audit alias: 11 alias repository langsung yang dulu diekspor dari modul use case (`ubahKontak`, `tambahKontak`, `hapusKontak`, `tambahGrupKontak`, `ubahGrupKontak`, `hapusGrupKontak`, `tambahAnggotaGrup`, `hapusAnggotaGrup`, `daftarKontakPenuh`, `daftarGrupKontak`, `daftarAnggotaGrup`) **tidak punya satu pun call-site** di `src/**` selain deklarasinya sendiri. Semua dihapus agar tidak ada jalur tulis yang dapat melewati validasi tenant, dan modul kini hanya mengekspor fungsi use case (didokumentasikan di komentar modul).
- `anggota_grup_kontak` **belum** memiliki composite FK `(village_id, kontak_id)`; validasi Batch 2 bersifat application-layer saja. Penguatan constraint kandidat Batch 4.

## Validasi

Dijalankan pada MySQL **8.0.30** lokal, database uji disposable `desa_test` (loopback), `TEST_DATABASE_ACK=1`. Tidak ada migration yang dijalankan ke database pengembangan bersama/production.

- **PASS** — `npm run typecheck` (`next typegen && tsc --noEmit`).
- **PASS** — `npm run lint` (`eslint .`). Percobaan pertama menemukan satu error `@typescript-eslint/no-unused-vars` (`eq` tidak terpakai di test kehadiran); import dihapus lalu lint diulang dan lulus.
- **PASS** — `npm run format:check` (`prettier --check .`). Percobaan pertama menandai file test kontak baru; `npx prettier --write` dijalankan pada file itu, lalu pemeriksaan ulang lulus.
- **PASS** — `npm run test:unit`: **192 test files, 1720 tests passed**.
- **PASS** — test terfokus Batch 2 (`vitest run --config vitest.integration.config.mts <dua file baru>`): **2 files, 17 tests passed** (kontak 14, rekap 3).
- **PASS (bukti red)** — file test kontak dijalankan terhadap `src/features/kontak/application/use-cases.ts` versi `origin/main`: **10 gagal / 4 lulus**, termasuk seluruh test update, create lintas desa, dan tambah anggota lintas desa. Versi Batch 2 dipulihkan setelah pengujian dan diff diverifikasi kembali.
- **PASS** — `npm run test:integration` (seluruh suite): **27 test files, 157 tests passed**, termasuk dua file baru dan suite composite FK/migration guard Batch 1. Durasi ±78 detik.
- **PASS** — `npm run build` (Next.js production build).
- **PASS** — `git diff --check`.

## Tindak lanjut review PR #37

Review maintainer pada PR #37 meminta empat hal; semuanya dikerjakan pada commit lanjutan (tanpa migration):

1. **Regression test `updateKontakUseCase`** — ditambahkan empat test: penduduk desa lain ditolak dan baris tidak berubah; penduduk desa sendiri berhasil; `villageId` spoof tidak memindahkan baris; ID kontak desa lain menghasilkan `NOT_FOUND` dengan pesan identik seperti ID yang tidak ada, dan baris milik desa lain tidak berubah. Ditambah dua test `updateKontakGrupUseCase` (tolak grup desa lain, update sah tanpa memindahkan desa).
2. **Audit jalur tulis yang melewati use case** — 11 alias repository langsung di `use-cases.ts` diperiksa dengan `grep` per simbol di `src/**`: tidak ada call-site di luar file deklarasinya (termasuk tidak ada di `src/app/**`). Semuanya dihapus, dan modul diberi komentar bahwa hanya use case yang boleh diekspor agar validasi tenant tidak bisa dilewati.
3. **Payload update di-whitelist** — `updateKontakUseCase` hanya mengirim `residentId`, `nama`, `telepon`, `email`, `telegram`, `hubungWarga`, `keterangan`; `updateKontakGrupUseCase` hanya `namaGrup` dan `keterangan`. `id` dan `villageId` tidak lagi masuk SET.
4. **Verifikasi ulang** — typecheck, lint, format, unit, seluruh integration MySQL 8, dan build dijalankan ulang setelah perubahan; angka aktual tercatat di bagian Validasi. Laporan dan body PR diperbarui.

## Risiko tersisa

- Seluruh use case kontak (termasuk `updateKontakUseCase`) belum dipanggil route/Server Action mana pun saat ini (`grep` hanya menemukan deklarasinya). Karena itu:
  - pemanggil belum ada, sehingga `requirePermission`/`resolveVillageId` belum terpasang di dalam use case dan `villageId` masih bergantung pada pemanggil di masa depan;
  - kode ini belum teruji end-to-end lewat HTTP, hanya lewat integration test langsung.
  Rekomendasi: saat form/route kontak dibuat, panggil `requirePermission` + `resolveVillageId` di action dan teruskan `villageId` hasil resolusi server.
- Baris legacy lintas desa pada `anggota_grup_kontak` dan `kehadiran_izin` masih mungkin ada di database tenant; Batch 2 hanya memastikan baris tersebut tidak terbaca/dihitung, tidak melakukan backfill atau pembersihan (di luar scope dan dilarang).
- Guard join rekap kehadiran bersifat pertahanan berlapis: setelah Batch 1, composite FK sudah menolak pasangan lintas desa pada jalur tulis normal, jadi test negatif rekap memakai baris legacy yang disisipkan dengan `FOREIGN_KEY_CHECKS=0`.
- `createLapak`/`updateLapak` dan `users.resident_id` hanya diaudit sejauh bukti jalur aktif; semantik tenant keduanya perlu ditinjau saat route terkait dibuat.

## Kesimpulan

Celah isolasi tenant pada layer aplikasi untuk direktori kontak dan rekap kehadiran sudah ditutup dengan perubahan minimal tanpa migration: tiga query tenant-scoped baru, validasi kepemilikan sebelum tulis, whitelist field update, penghapusan 11 alias repository yang bisa melewati validasi, join rekap dibatasi desa, dan 17 test isolasi (kontak 14, rekap 3). Test kontak terbukti gagal pada kode `origin/main` (10 dari 14) dan lulus setelah perbaikan. Seluruh pemeriksaan lokal (typecheck, lint, format, unit, integration MySQL 8, build) lulus. Lapak dan `users.resident_id` dicatat sebagai temuan tanpa jalur aktif dan tidak diubah. Batch 3 tidak dimulai; menunggu review maintainer.
