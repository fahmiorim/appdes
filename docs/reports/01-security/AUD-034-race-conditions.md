# AUD-034 — Perbaikan race condition keuangan, kuota media, dan status surat

- **Tanggal:** 2026-11-16
- **Branch:** `task/AUD-034-race-conditions`
- **Base commit:** `30b81de` (`origin/main`)
- **Task:** menutup tiga temuan race condition: AUD-013 (agregasi keuangan), AUD-014 (kuota media), AUD-016 (transisi status permohonan surat).

## 1. Analisis

Ketiganya berpola sama: baca state → putuskan di aplikasi → tulis, tanpa penguncian. Transaksi saja tidak cukup pada dua kasus karena baris yang dibaca belum tentu ada (`SELECT ... FOR UPDATE` tidak mengunci baris yang belum lahir), dan pada kasus media state-nya ada di disk, bukan di tabel.

| Temuan | Pola lama | Akibat |
| --- | --- | --- |
| AUD-013 | `saveKeuanganNilai` membaca nilai setahun, menghitung ulang induk, lalu upsert tanpa serialisasi | Dua penyimpanan bersamaan saling menimpa; nilai induk tidak sama dengan jumlah anak |
| AUD-014 | `pastikanKuotaMedia` menghitung pemakaian disk lalu berkas ditulis | Unggahan paralel sama-sama lolos pemeriksaan dan melewati kuota |
| AUD-016 | `prosesPermohonan` membaca status, memvalidasi transisi, lalu update berdasarkan `id` saja | Dua operator memproses bersamaan; yang terakhir menimpa hasil yang pertama |

## 2. Perubahan

### 2.1 Helper kunci MySQL — `src/db/kunci-mysql.ts` (baru)

`denganKunciMysql(nama, blok)` memakai `GET_LOCK(nama, 10)` pada **koneksi pool tersendiri**, menjalankan `blok`, lalu `RELEASE_LOCK` di `finally`.

Kunci dipegang di luar transaksi kerja dengan sengaja. Versi pertama task ini memasang `GET_LOCK` di dalam transaksi Drizzle dan **gagal pada test**: `RELEASE_LOCK` berjalan sebelum `COMMIT`, sehingga penulis berikutnya memperoleh kunci sambil membaca state yang belum ter-commit. Gejalanya terukur: nilai induk `8.000.000` sementara jumlah anak `10.000.000`. Dengan kunci di koneksi terpisah, commit selesai lebih dulu, baru kunci dilepas.

### 2.2 AUD-013 — `src/features/keuangan/infrastructure/keuangan-repository.ts`

- `saveKeuanganNilai` sekarang berjalan di `denganKunciMysql('keuangan:<village>:<tahun>', …)`.
- Di dalamnya tetap satu `db.transaction` untuk baca → hitung induk → upsert, agar pembaca lain melihat hasil lengkap atau tidak sama sekali.
- Kunci per (desa, tahun), jadi desa/tahun berbeda tidak saling menunggu.

### 2.3 AUD-014 — `src/features/publik/infrastructure/media-storage.ts`

- `simpanUnggahanMedia` dan `simpanUnggahanMediaDenganPengaturan` menjalankan cek kuota + penulisan berkas di dalam `denganKunciMysql('media:<village>', …)`.
- Urutan validasi MIME/ukuran tetap di luar kunci; hanya bagian yang bergantung pada state disk yang diserialkan.
- `pastikanKuotaMedia` diberi catatan bahwa ia hanya aman bila pemanggil memegang kunci desa.

### 2.4 AUD-016 — `src/features/layanan-mandiri/infrastructure/layanan-mandiri-repository.ts`

- Update menjadi optimistik: `... WHERE village_id = ? AND id = ? AND status = <status yang dibaca>`.
- `affectedRows === 0` sekarang menghasilkan `conflict("Permohonan sudah diproses pengguna lain. Muat ulang data sebelum mencoba lagi.")`.
- Validasi transisi (`canTransitionPermohonan`) tidak berubah; yang berubah hanya jaminan bahwa keputusan diambil atas state yang masih berlaku.

## 3. Test

| File (baru) | Isi |
| --- | --- |
| `src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts` | 4 penyimpanan paralel per tahun (3 tahun berbeda); induk harus sama dengan jumlah anak |
| `src/features/publik/infrastructure/media-quota-concurrency.integration.test.ts` | kuota 1 MB, 4 unggahan 400 KB paralel; tepat 2 berhasil, 2 ditolak dengan pesan kuota, pemakaian disk ≤ kuota |
| `src/features/layanan-mandiri/infrastructure/permohonan-status-concurrency.integration.test.ts` | dua transisi sah dari status 1 (ke 2 dan ke 5) dijalankan bersamaan; tepat satu berhasil, yang lain konflik, status akhir = pemenang |

Ketiganya didaftarkan di `vitest.integration.config.mts`.

## 4. Validasi yang dijalankan

Database uji disposable `desa_test_race_local` (MySQL 8.0.30 loopback), bukan database pengembangan/produksi.

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint` (7 file berubah/baru) | **PASS** |
| `npx prettier --check` (file berubah) | **PASS** |
| `npx vitest run --config vitest.config.mts src/features/keuangan src/features/layanan-mandiri src/features/publik` | **PASS** — 27 file, 260 test |
| `npx vitest run --config vitest.integration.config.mts src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts` | **PASS** |
| `npx vitest run --config vitest.integration.config.mts src/features/publik/infrastructure/media-quota-concurrency.integration.test.ts` | **PASS** |
| `npx vitest run --config vitest.integration.config.mts src/features/layanan-mandiri/infrastructure/permohonan-status-concurrency.integration.test.ts` | **PASS** |
| Seluruh suite `npm run test:integration` | **SKIPPED** — hanya file baru dan unit test fitur terkait yang dijalankan. |

Bukti test benar-benar menangkap bug: pada implementasi kunci versi pertama (di dalam transaksi), test keuangan gagal dengan `expected '8000000.00' to be '10000000.00'`. Setelah urutan kunci diperbaiki, test lulus.

## 5. Risiko dan keterbatasan

- `GET_LOCK` membuat operasi menunggu hingga 10 detik lalu gagal dengan pesan jelas (fail-closed). Bila satu penyimpanan macet, penyimpanan lain untuk desa/tahun yang sama ikut gagal, bukan diam-diam menimpa.
- Kunci media hanya mengoordinasi proses yang memakai MySQL yang sama. Bila `storage/media` dibagi lewat NFS antar-host, konsistensi tetap bergantung pada filesystem bersama; belum diuji.
- Pemeriksaan kuota masih memindai seluruh direktori desa per unggahan (O(jumlah berkas)). Rekonsiliasi/agregat pemakaian belum ditambahkan; audit AUD-014 menyarankannya sebagai langkah lanjutan, bukan syarat perbaikan race.
- `upsertKeuanganBatch` (impor APBDes) menulis tanpa kunci yang sama. Impor yang berjalan bersamaan dengan penyimpanan manual masih dapat menghasilkan induk tidak konsisten; di luar scope task ini.
- Test konkurensi bersifat probabilistik: ia membuktikan perilaku pada interleaving yang terjadi saat dijalankan, bukan semua kemungkinan. Penguncian deterministik diverifikasi lewat pembacaan kode + kegagalan versi pertama.
- `docs/TECHNICAL_AUDIT.md` tidak diubah karena dokumen itu baseline audit, bukan status hidup.

## 6. Status

Siap review. Belum di-merge, belum dijalankan pada staging/produksi.
