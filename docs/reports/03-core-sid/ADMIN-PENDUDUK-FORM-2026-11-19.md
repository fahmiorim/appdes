# Laporan — Form Tambah dan Ubah Penduduk

- **Task:** Melengkapi UI pengelolaan penduduk dengan form tambah dan ubah.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/admin-penduduk-form`.
- **Base commit:** `92e1a90` (`main` setelah PR #157 dan #158).
- **Commit kode:** `55d132f`.
- **Status:** siap review; belum di-merge atau di-deploy.

## 1. Kondisi awal

Backend penduduk sudah memiliki `createPenduduk`, `updatePenduduk`, dan
`deletePenduduk` beserta validasi izin, validasi foreign reference tenant, audit
trail, dan test isolasi tenant. Namun UI Admin Desa baru menyediakan daftar,
filter, detail, dan ekspor. Pengguna tidak dapat menambah atau mengubah penduduk
dari aplikasi, sehingga alur core SID belum utuh.

## 2. Analisis dan pendekatan

- Form dibuat sebagai halaman penuh, bukan dialog, karena memuat sekitar 20 field
  dan lebih mudah dipakai pada layar kecil.
- Satu komponen form dipakai untuk mode tambah dan ubah agar aturan field tidak
  bercabang.
- Server Action hanya memetakan `FormData` ke `pendudukFormSchema`; aturan bisnis
  dan otorisasi tetap di use case yang sudah ada.
- Data referensi (katalog, KK, wilayah) diambil lewat use case baru yang memakai
  izin `update` dan `villageId` dari sesi, bukan dari parameter klien.
- Tombol tambah/ubah hanya dirender bila pengguna memiliki izin `update`; server
  tetap menolak permintaan langsung tanpa izin.

## 3. File yang diperiksa

- `src/features/penduduk/application/use-cases.ts`
- `src/features/penduduk/domain/penduduk.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/features/penduduk/infrastructure/reference-repository.ts`
- `src/app/(admin)/penduduk/page.tsx`
- `src/app/(admin)/penduduk/[id]/page.tsx`
- `src/app/(admin)/pengaturan/pengguna/actions.ts`
- `src/app/(admin)/pengaturan/pengguna/dialog-pengguna.tsx`
- `src/lib/forms.ts`, `src/lib/action-state.ts`, `src/lib/dal.ts`
- Test penduduk dan integration test foreign reference yang sudah ada.

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/penduduk/application/use-cases.ts` | Use case `getPendudukFormData` dengan izin `update`, data referensi desa sesi, dan pencarian penduduk ber-`villageId`. |
| `src/app/(admin)/penduduk/actions.ts` | Server Action tambah/ubah, validasi Zod, revalidasi halaman. |
| `src/app/(admin)/penduduk/form-penduduk.tsx` | Komponen form tambah/ubah dan penanganan hasil aksi. |
| `src/app/(admin)/penduduk/baru/page.tsx` | Halaman tambah penduduk. |
| `src/app/(admin)/penduduk/[id]/ubah/page.tsx` | Halaman ubah penduduk. |
| `src/app/(admin)/penduduk/page.tsx` | Tombol tambah untuk pengguna berizin. |
| `src/app/(admin)/penduduk/[id]/page.tsx` | Tombol ubah untuk pengguna berizin. |
| `src/app/globals.css` | Gaya form dan aksi form yang mengikuti komponen yang ada. |
| `src/app/(admin)/penduduk/actions.test.ts` | Test pemetaan input, validasi, id ubah, dan propagasi error. |
| `src/features/penduduk/application/penduduk-dashboard-use-cases.test.ts` | Test izin `update`, desa sesi, data tidak ditemukan, dan penolakan akses. |
| `src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts` | Test negatif form ubah tidak membuka penduduk desa lain. |
| `docs/SID_FEATURE_MAP.md` | Status UI penduduk dan jumlah halaman admin. |
| `docs/architecture/MODULE-INVENTORY.md` | Regenerasi dari commit kode `55d132f`. |

## 5. Perilaku yang ditambahkan

- `/penduduk/baru` menampilkan form tambah dengan katalog global serta pilihan KK
  dan wilayah milik desa sesi.
- `/penduduk/[id]/ubah` memuat data penduduk dari desa sesi; ID desa lain
  diperlakukan sebagai tidak ditemukan.
- Setelah berhasil, pengguna diarahkan ke detail penduduk.
- NIK dan NIK orang tua divalidasi 16 angka bila diisi, dan boleh kosong.
- Relasi KK/wilayah diverifikasi ulang oleh use case sebelum disimpan.
- Perubahan mencatat audit trail dan riwayat anggota KK melalui use case lama.

## 6. Security dan tenant

- Otorisasi create/update tetap di `requirePermission(PENDUDUK_RESOURCE, "update")`
  pada use case; Server Action tidak menjadi jalur bypass.
- `villageId` berasal dari sesi melalui `resolveVillageId`, bukan body, query,
  header, atau hidden input.
- Data referensi KK dan wilayah dibatasi `villageId`; `familyId`/`regionId` milik
  desa lain ditolak use case dan diuji pada integration test yang sudah ada.
- ID penduduk pada hidden input hanya menjadi target; use case mencari dengan
  predicate `id + villageId`, sehingga ID tenant lain tidak dapat diubah.
- Form hanya dirender untuk izin `update`; halaman mengembalikan 404 untuk
  pengguna tanpa izin tersebut.
- Tidak ada secret, NIK asli, atau data pribadi yang dimasukkan ke test, log,
  laporan, atau commit.

## 7. Validasi

| Perintah | Hasil | Bukti |
|---|---|---|
| `npm run typecheck` | **PASS** | `next typegen` dan `tsc --noEmit` selesai tanpa error. |
| `npm run lint` | **PASS** | 0 error; 2 warning `no-console` yang sudah ada di `scripts/wilayah/generate-wilayah.mjs`. |
| `npm run test:unit` | **PASS** | 230 berkas, 1.988 test lulus. |
| Test terfokus (`vitest run` dua berkas) | **PASS** | 13 test lulus. |
| `npm run build` | **PASS** | Build produksi selesai. |
| `npm run test:integration` | **SKIPPED** | `TEST_DATABASE_URL`/`TEST_DATABASE_ACK` tidak diisi; tidak ada database uji disposable. Ini bukan bukti integrasi lulus. |
| `npx prettier --check` pada file berubah | **PASS** | Semua sesuai format. |
| `npm run docs:inventory -- 55d132f` | **PASS** | 48 halaman, 82 route, 7 berkas Server Action, 19 halaman admin. |

## 8. Risiko dan keterbatasan

- Test integrasi lintas tenant yang baru ditambahkan belum dijalankan pada MySQL;
  jalankan `npm run test:integration:ci` di database uji disposable sebelum merge.
- Tampilan form belum diverifikasi di browser atau dengan pembaca layar.
- NIK lengkap dikirim ke komponen klien pada mode ubah; ini hanya untuk pengguna
  dengan izin `update`, tetapi tetap data pribadi yang harus dijaga.
- Aturan satu kepala keluarga per KK masih mengandalkan pengecekan aplikasi dan
  belum diuji untuk race condition saat dua permintaan menyimpan bersamaan.
- Setelah merge, inventaris modul sebaiknya diregenerasi dari `main` agar rujukan
  commit dokumen kembali ke branch utama.

## 9. Rekomendasi berikutnya

1. Jalankan integration test pada database uji disposable.
2. Uji alur tambah/ubah di staging dengan role Admin Desa dan role baca-saja.
3. Lanjut ke halaman keluarga/rumah tangga atau form mutasi penduduk.
4. Pertimbangkan guard CI agar inventaris dan peta test diperbarui otomatis.
