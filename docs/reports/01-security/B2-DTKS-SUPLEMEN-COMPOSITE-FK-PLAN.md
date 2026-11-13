# B2 — Composite Tenant FK untuk DTKS & Suplemen

- **Tanggal:** 12 November 2026
- **Branch:** `task/B2-DTKS-SUPLEMEN-COMPOSITE-FK`
- **Base:** `main` — `615712b87a76798cb85a9f5cc26b7b03483cecf1`
- **Status:** rencana implementasi; belum ada perubahan schema, migration, atau database.

## Tujuan

Pindahkan perlindungan relasi DTKS dan Suplemen dari repository-only menjadi integritas database dengan composite foreign key berbasis `(village_id, id)`. Mencegah data anak satu desa menunjuk parent desa lain, termasuk pada SQL langsung.

## Relasi yang masuk scope

### DTKS

1. `dtks(village_id, rtm_id)` → `rtm(village_id, id)`, wajib, RESTRICT.
2. `dtks(village_id, keluarga_id)` → `families(village_id, id)`, nullable, RESTRICT.
3. `dtks_anggota(village_id, dtks_id)` → `dtks(village_id, id)`, CASCADE.
4. `dtks_anggota(village_id, penduduk_id)` → `residents(village_id, id)`, RESTRICT.
5. Tambahkan `village_id` ke `dtks_ref_lampiran`, isi dari parent DTKS, lalu:
   - `dtks_ref_lampiran(village_id, dtks_id)` → `dtks(village_id, id)`, CASCADE.
   - `dtks_ref_lampiran(village_id, lampiran_id)` → `dtks_lampiran(village_id, id)`, CASCADE.

### Suplemen

1. `suplemen_terdata(village_id, id_suplemen)` → `suplemen(village_id, id)`, CASCADE.
2. `suplemen_terdata(village_id, penduduk_id)` → `residents(village_id, id)`, RESTRICT, nullable.
3. `suplemen_terdata(village_id, keluarga_id)` → `families(village_id, id)`, RESTRICT, nullable.

Tambahkan unique key parent `(village_id, id)` yang dibutuhkan. Pertahankan unique/index yang masih dipakai query.

## Keputusan penting soal ON DELETE

Jangan gunakan `ON DELETE SET NULL` pada composite FK yang menyertakan `village_id`: MySQL akan mencoba mengosongkan seluruh kolom child key, termasuk `village_id NOT NULL`. Untuk referensi opsional DTKS keluarga dan Suplemen penduduk/keluarga, gunakan RESTRICT lalu pertahankan perilaku set-null melalui update eksplisit dalam transaksi pada repository/use-case penghapusan parent. Telusuri semua jalur penghapusan keluarga, penduduk, RTM, DTKS, dan Suplemen. Jangan mengandalkan satu halaman UI sebagai satu-satunya jalur.

CASCADE hanya untuk relasi anak yang secara semantik benar-benar dimiliki parent dan memiliki village_id yang sama, yaitu anggota DTKS → DTKS, referensi lampiran → DTKS/lampiran, serta terdata Suplemen → Suplemen.

## Aturan migrasi data lama

- Migration tidak boleh otomatis menghapus, memindahkan, atau menebak pemilik data legacy.
- Buat preflight read-only yang melaporkan semua orphan dan cross-tenant reference pada relasi di atas.
- Jika ada data invalid, migration harus berhenti dengan pesan yang menyebut relasi dan jumlah temuan. Sediakan SQL diagnostik dan runbook untuk keputusan koreksi manual.
- Untuk `dtks_ref_lampiran`, preflight harus memastikan setiap relasi memiliki parent DTKS dan lampiran yang ada serta keduanya berasal dari desa yang sama. Hanya setelah lolos preflight, tambahkan kolom `village_id` dan backfill dari DTKS.
- Jangan jalankan migration terhadap `desa_dev` atau database development yang sudah ada dari sesi coding agent. Gunakan database disposable yang dibuat khusus.

## Test wajib

- Migration pada database disposable bersih.
- Preflight menemukan orphan dan cross-tenant pada setiap relasi; tidak mengubah data.
- Insert/update lintas tenant ditolak database pada semua FK baru.
- Referensi nullable tetap menerima NULL tanpa mengubah `village_id`.
- Delete parent DTKS/Suplemen meng-cascade hanya child tenant yang sama.
- Delete keluarga/penduduk tetap mempertahankan perilaku set-null melalui transaksi aplikasi tanpa mengubah tenant ID.
- Lampiran DTKS tidak dapat ditautkan lintas desa; junction memiliki tenant key.
- Rollback/inverse migration didokumentasikan dan diuji pada database disposable.
- Integration test dijalankan bersama suite AUD-002 yang sudah ada.

## Batasan kerja

- Jangan mengubah `main`, jangan merge PR #11, dan jangan deploy.
- Jangan mengubah data atau schema database development yang sudah ada.
- Jangan menonaktifkan/menurunkan validasi untuk membuat migration/test lolos.
- Periksa nama FK/index aktual dari baseline migration dan schema; jangan mengasumsikan nama generated FK.
- Periksa seluruh repository/use-case yang menghapus keluarga, penduduk, RTM, DTKS, Suplemen, dan lampiran sebelum menetapkan urutan transaksi.
- Perbarui Drizzle schema, migration SQL, migration journal/snapshot sesuai konvensi repo, preflight SQL, runbook, dan integration tests.
- Jalankan typecheck, lint, format:check, unit tests, integration tests pada database disposable.
- Buat commit dan PR draft ke main. Laporkan SHA, URL PR, file berubah, hasil test aktual, serta temuan preflight.
