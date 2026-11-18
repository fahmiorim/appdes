# Agenda: Jam, Kategori, dan Status Kegiatan

- **Task:** menambahkan backend agenda untuk jam mulai/selesai, kategori, dan status kegiatan beserta test.
- **Tanggal:** 18 November 2026.
- **Branch:** `task/agenda-waktu-kategori-status`.
- **Base commit:** `12fbc25`.
- **Commit hasil:** `2eb55bd` (backend agenda) dan `3a0f0f4` (laporan audit).
- **Pull request:** https://github.com/fahmiorim/appdes/pull/152
- **Status:** siap review; branch sudah di-push, migration belum dijalankan ke database mana pun.

## 1. Kondisi awal

Schema `agenda_kegiatan` hanya menyimpan `judul`, `mulai`, `selesai`, `lokasi`, `deskripsi`, dan `tayang`. Mockup agenda menampilkan jam kegiatan (`09:00–12:00`), kategori untuk filter (`Pemerintahan`, `Kesehatan`, `Lingkungan`, `Pelatihan`), dan status (`Rencana`, `Berlangsung`, `Selesai`). Ketiganya tidak dapat disimpan maupun dikirim ke halaman publik.

## 2. Pendekatan

- Tambah kolom aditif pada `agenda_kegiatan`:
  - `jam_mulai time NULL`
  - `jam_selesai time NULL`
  - `kategori varchar(50) NOT NULL DEFAULT 'umum'`
  - `status enum('rencana','berlangsung','selesai') NOT NULL DEFAULT 'rencana'`
- Jam dibuat nullable agar agenda lama dan agenda tanpa jam tetap valid.
- Kategori memakai teks bebas dengan default `umum`; belum dibuat tabel kategori agar scope tetap kecil.
- Status disimpan sebagai status editorial, bukan dihitung otomatis dari tanggal. Agenda lama otomatis berstatus `rencana`; pengelola perlu mengubahnya secara eksplisit.
- Validasi jam:
  - format `HH:MM`; nilai `HH:MM:SS` dari MySQL diterima lalu dinormalisasi ke `HH:MM`;
  - jam selesai tanpa jam mulai ditolak;
  - jam selesai yang mendahului jam mulai ditolak bila kegiatannya satu hari;
  - kegiatan lintas hari boleh memiliki jam selesai lebih awal.
- Query publik tetap dibatasi `villageId` dari host dan `tayang = true`.

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/db/schema/agenda-kegiatan.ts` | Menambah kolom jam, kategori, dan status. |
| `src/db/migrations/0013_agenda_waktu_kategori_status.sql` | Migration aditif untuk empat kolom baru. |
| `src/db/migrations/meta/0013_snapshot.json` | Snapshot Drizzle untuk migration baru. |
| `src/db/migrations/meta/_journal.json` | Mencatat migration `0013`. |
| `src/features/agenda/domain/agenda.ts` | Tipe baris, konstanta status, validasi formulir, dan helper label jam. |
| `src/features/agenda/application/agenda-use-cases.ts` | Meneruskan field baru saat simpan dan ke pemetaan publik. |
| `src/features/agenda/infrastructure/agenda-repository.ts` | Memilih/menyimpan field baru dan mengurutkan berdasarkan jam. |
| `src/features/agenda/domain/agenda.test.ts` | Test validasi jam, kategori, status, dan label jam. |
| `src/features/agenda/infrastructure/agenda-repository.integration.test.ts` | Fixture disesuaikan dan test round-trip field baru. |

## 4. Perubahan perilaku

- Formulir agenda menerima `jamMulai`, `jamSelesai`, `kategori`, dan `status`; nilai kosong menjadi `null`, `umum`, dan `rencana`.
- `AgendaRow` dan `AgendaPublikRow` sekarang membawa field baru; halaman publik dapat menampilkannya tanpa query tambahan.
- Agenda publik diurutkan berdasarkan tanggal, lalu jam mulai.
- Belum ada perubahan UI: formulir admin agenda belum tersedia dan halaman publik belum merender jam/kategori/status. Task ini hanya menyiapkan backend dan kontrak datanya.

## 5. Keamanan dan tenant

- Tidak ada perubahan pada sumber `villageId`; seluruh query tetap memakai parameter tenant dari host/sesi.
- `createAgenda`/`updateAgenda` tetap menulis `villageId` dari use case, dan `updateAgenda`/`deleteAgenda` memfilter `villageId` + `id`.
- Pemetaan publik tetap membuang `tayang`; agenda draf tidak dapat bocor lewat halaman publik.
- Tidak ada data pribadi atau secret pada migration, fixture, dan laporan.

## 6. Dampak migration

- **Sifat:** aditif, kompatibel dengan data lama.
- **Backfill:** tidak diperlukan karena kolom jam nullable dan kolom kategori/status memiliki default.
- **Urutan deploy:** jalankan `npm run db:migrate` sebelum aplikasi versi baru menerima input field baru.
- **Lock/downtime:** `ALTER TABLE` empat kolom pada tabel agenda; untuk data kecil umumnya singkat, tetapi tetap ikuti prosedur backup dan jendela deploy yang berlaku.
- **Rollback:** drop keempat kolom akan menghilangkan data jam/kategori/status yang sudah diisi; backup sebelum rollback.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Unit test agenda | `npx vitest run --config vitest.config.mts src/features/agenda` | **PASS** — 21 test |
| Typecheck | `npm run typecheck` dan `npx tsc --noEmit` | **PASS** |
| Lint scoped | `npx eslint src/features/agenda src/db/schema/agenda-kegiatan.ts` | **PASS** |
| Format | `npx prettier --check src/features/agenda src/db/schema/agenda-kegiatan.ts` | **PASS** |
| Integration test | `npm run test:integration` | **SKIPPED** — `TEST_DATABASE_URL` dan `TEST_DATABASE_ACK` belum diisi; tidak ada database uji disposable yang disentuh |
| Migration ke database | — | **TIDAK DIJALANKAN** — tidak ada database uji/production yang dipakai |

## 8. Risiko dan keterbatasan

- Integration test round-trip field baru belum terbukti berjalan; perlu database MySQL disposable untuk menjalankannya.
- Status bersifat editorial, sehingga dapat tertinggal dari tanggal kegiatan bila tidak diperbarui. Jika diinginkan status otomatis, perlu aturan turunan dari tanggal/jam.
- Kategori berupa teks bebas; variasi penulisan dapat memecah filter. Tabel kategori tenant dapat ditambahkan bila filter publik mulai dipakai.
- Jam disimpan sebagai wall-clock tanpa zona waktu. Label "WIB/WITA/WIT" belum ditangani.
- UI admin dan tampilan publik belum memakai field baru; perubahan ini belum terlihat oleh pengguna.

## 9. Rekomendasi lanjutan

1. Jalankan integration test pada database uji disposable dan verifikasi migration `0013`.
2. Tambahkan input jam/kategori/status pada formulir admin agenda saat UI-nya dibuat.
3. Tampilkan jam, kategori, dan badge status pada kartu agenda publik.
4. Putuskan apakah status dihitung otomatis dari tanggal atau tetap editorial.

## 10. Status

Siap review sebagai perubahan backend terfokus. Sudah di-commit dan di-push pada branch `task/agenda-waktu-kategori-status`; PR: https://github.com/fahmiorim/appdes/pull/152. Keputusan merge menunggu reviewer.
