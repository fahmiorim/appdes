# Panel Kelola tenant — form isian dipindah ke dialog

- **Task:** lanjutan perapian konsol Super Admin — cari aksi konsol platform yang masih memakai form inline dan ubah ke pola tombol + dialog.
- **Tanggal:** 18 November 2026
- **Branch:** `task/tenant-panel-dialog-actions`
- **Base commit:** `adf09aa` (`main` setelah PR #126 dan #127)
- **Commit kode:** `8523d0c`
- **Pull request:** https://github.com/fahmiorim/appdes/pull/129
- **Status:** siap review

## 1. Kondisi awal

PR #126 memindahkan form pendaftaran desa ke dialog, sehingga halaman tenant tidak lagi dibuka dengan form 8 kolom. Aksi lain di konsol diperiksa dengan mencari elemen `<form>` pada seluruh halaman `src/app/(admin)/super-admin/**` dan pada komponen presentasinya.

Hasil pemeriksaan:

| Lokasi | Bentuk | Keputusan |
|---|---|---|
| Panel Kelola tenant — tambah domain | Form isian (`domain`) selalu terbuka | Dipindah ke dialog |
| Panel Kelola tenant — kuota media | Form isian (`kuotaMediaMb`) selalu terbuka | Dipindah ke dialog |
| Panel Kelola tenant — purge permanen | Form isian (`konfirmasi`) selalu terbuka | Dipindah ke dialog |
| Panel Kelola tenant — status, reset akses, ekspor | Form tanpa isian (satu tombol) | Dibiarkan |
| Daftar domain — jadikan utama, hapus | Form tanpa isian (satu tombol) | Dibiarkan |
| `/super-admin/audit` — filter | Form pencarian GET dengan parameter URL | Dibiarkan; filter harus terlihat agar status filter jelas |
| `/super-admin/domain`, `/pengaturan`, `/template`, `/pengguna` | Tidak ada `<form>` isian | Tidak ada perubahan |

Masalah pada tiga form isian: seluruh input selalu terbuka di dalam panel yang bisa dibuka-tutup per baris. Untuk tenant tanpa domain atau yang belum siap purge, area input tetap memakan ruang panel, mendorong keterangan status dan aksi lain ke bawah, dan membuat panel terlihat seperti formulir, bukan ringkasan kondisi tenant.

## 2. File yang diperiksa

- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/features/multi-desa/presentation/dialog-daftar-desa.tsx`, `dialog-tambah-pengguna.tsx`, `dialog-bagian.tsx`
- `src/app/(admin)/super-admin/{page,tenant/page,domain/page,pengguna/page,audit/page,template/page,pengaturan/page}.tsx`
- `src/app/(admin)/super-admin/actions.ts` (nama field yang dipakai Server Action)
- `src/app/globals.css` (blok `.tenant-*` dan `.platform-dialog*`)
- `vitest.config.mts` (pola file test)

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/presentation/dialog-form-tenant.tsx` | Komponen baru: tombol pemicu + `<dialog>` native yang membungkus form apa pun, dengan `useActionState` per aksi dan `router.refresh()` setelah sukses. |
| `src/features/multi-desa/presentation/dialog-form-tenant.test.ts` | Test kontrak render: form dan tombol submit berada di dalam `<dialog>`, ada `aria-labelledby`, tombol tutup, tombol Batal, dan field bernama sesuai input. |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Tiga form isian diganti tombol + dialog; `useActionState` untuk kuota dan purge dihapus dari panel karena state kini dimiliki dialog. Nilai kuota berjalan dan status purge tetap tampil sebagai keterangan. |
| `src/features/multi-desa/presentation/dialog-daftar-desa.tsx`, `dialog-tambah-pengguna.tsx` | Memakai `PesanDialog`/`GalatField` bersama dari `dialog-bagian.tsx`, menghapus dua salinan helper yang sama. Perilaku tidak berubah. |
| `src/app/globals.css` | Kelas `.tenant-panel-actions` untuk menyejajarkan tombol dialog dengan keterangannya. |

Tidak ada perubahan pada Server Action, use case, schema, migration, maupun data.

## 4. Perubahan

- Panel Kelola sekarang menampilkan tombol **Tambah domain**, **Ubah kuota**, dan **Purge data desa** (hanya saat purge boleh dijalankan) beserta satu baris keterangan.
- Dialog memakai elemen `<dialog>` native: fokus terkurung, Escape menutup, klik di luar menutup, dan tombol tutup berlabel `Tutup dialog`.
- Field, atribut, dan nama yang dikirim ke Server Action identik dengan sebelumnya:

| Aksi | Field |
|---|---|
| Tambah domain | `villageId`, `domain` (`required`, `maxLength=255`) |
| Kuota media | `villageId`, `kuotaMediaMb` (`number`, `min=1`, kosong = tanpa batas) |
| Purge | `villageId`, `konfirmasi` (`required`, placeholder slug) |

- Setelah tambah domain dan simpan kuota berhasil, dialog menutup dan daftar tenant di-refresh agar perubahan langsung terlihat.
- Purge sengaja **tidak** menutup otomatis: dialog menampilkan ringkasan `jumlahBarisDihapus`, `tabelDiproses`, dan status `mediaDihapus`, lalu ditutup manual. Ini tindakan permanen, jadi hasilnya harus terbaca sebelum dialog hilang.
- Tombol pemicu nonaktif ketika tenant sudah di-purge; purge tetap hanya tersedia saat status `siap-purge` dan ekspor berlaku, dengan pesan alasan yang sama seperti sebelumnya.
- Keterangan kuota menampilkan nilai berjalan ("Saat ini 2.048 MB" atau "Saat ini tanpa batas") di luar dialog.

## 5. Security dan tenant

- Tidak ada perubahan pada jalur otorisasi: seluruh aksi tetap lewat Server Action yang sudah ada (`pastikanSuperAdmin` di halaman, validasi tenant di use case).
- `villageId` tetap dikirim dari server sebagai hidden input di dalam form dialog, bukan dari input pengguna, dan tidak menjadi bukti otorisasi.
- Purge tetap memerlukan konfirmasi slug dan tetap dibatasi status retensi serta ketersediaan ekspor di sisi server.
- Dialog tidak menambah endpoint, tidak mengekspos data tenant lain, dan tidak menampilkan data sensitif baru.

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/multi-desa/presentation/dialog-form-tenant.test.ts` (sebelum implementasi) | FAIL — modul `./dialog-form-tenant` belum ada (RED terverifikasi) |
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/multi-desa/presentation/dialog-form-tenant.test.ts` | PASS — 2 test |
| `npx tsc --noEmit` | PASS |
| `npx eslint src/features/multi-desa/presentation/` | PASS |
| `npx prettier --check .` | PASS |
| `npm run check` | PASS — 219 file, 1908 test |
| Verifikasi klik di Chrome headless (CDP, halaman probe sementara) | PASS |

Catatan verifikasi browser: halaman asli butuh login Super Admin, jadi tiga dialog dirender melalui halaman probe sementara tanpa autentikasi (dihapus setelah uji, tidak masuk commit). Klik dilakukan dengan `Input.dispatchMouseEvent` agar hit-testing nyata, bukan `element.click()`. Hasil: panel Kelola terbuka, lalu

- "Tambah domain" → `dialog.open`, `:modal` true, judul "Tambah domain atau alias", field `villageId`, `domain`.
- "Ubah kuota" → `:modal` true, judul "Kuota media", field `villageId`, `kuotaMediaMb`; keterangan "Saat ini 2.048 MB" tampil di panel.
- "Purge data desa" (baris siap purge) → `:modal` true, judul "Purge data desa", field `villageId`, `konfirmasi`.

Alur submit sungguhan (menekan tombol simpan dan melihat hasil server) tidak dijalankan karena Server Action asli memerlukan sesi Super Admin dan database; ini keterbatasan verifikasi, bukan klaim PASS.

## 7. Risiko dan hal yang belum diverifikasi

- Interaksi dialog tidak diuji dengan jsdom karena konfigurasi Vitest repo memakai environment `node`; test yang ada memeriksa struktur render, bukan perilaku buka/tutup. Perilaku buka/tutup diverifikasi manual via CDP.
- Submit nyata ke Server Action (domain duplikat, kuota tidak valid, konfirmasi purge salah) belum diuji end-to-end di sesi ini; validasi Zod dan use case tidak berubah sehingga risiko regresi rendah.
- `dialog-bagian.tsx` sudah berada di `main` sejak merge PR #127 (file ikut terbawa pada commit merge); pada perubahan ini file tersebut baru benar-benar dipakai `dialog-form-tenant.tsx` dan dua dialog sebelumnya.
- Tampilan panel pada layar sangat sempit belum diperiksa ulang secara visual di luar pengujian desktop headless.

## 8. Kesimpulan

Tiga form isian konsol tenant — satu-satunya form isian yang tersisa di konsol platform selain filter audit yang memang harus terlihat — kini memakai pola tombol + dialog yang sama dengan pendaftaran desa dan penambahan pengguna platform. Kontrak server tidak berubah, aksi tombol-saja dan filter dibiarkan, dan pemeriksaan repo lulus.

Langkah berikutnya yang mungkin: menambahkan integration test untuk submit domain/kuota/purge lewat database test, dan memeriksa tampilan panel pada lebar 320–768 px.
