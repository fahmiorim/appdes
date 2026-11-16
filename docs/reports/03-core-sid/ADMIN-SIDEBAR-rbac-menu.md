# Laporan: Menu Admin Berbasis Modul dan Izin RBAC

- **Task:** menampilkan menu admin dari modul yang diizinkan RBAC, bukan satu tautan tetap.
- **Tanggal:** 16 November 2026
- **Branch:** `task/admin-menu-rbac`
- **Base commit:** `6c662de` (`main`)
- **Commit pekerjaan:** `502572f`

## Kondisi awal

`AdminSidebar` hanya merender satu tautan (Beranda atau Dashboard platform) dan menampilkan catatan "Menu operasional desa akan ditampilkan sesuai modul dan hak akses." Fungsi `getMenuForUser` sudah ada di `src/features/navigation/application/get-menu.ts` beserta `buildMenu`, tetapi tidak pernah dipanggil, sehingga seluruh modul yang boleh dibaca pengguna tidak muncul di navigasi.

Menautkan seluruh modul juga tidak aman: RBAC menyimpan modul yang boleh dibaca, sementara belum semua modul punya halaman di `src/app/(admin)`, sehingga tautan langsung akan menghasilkan 404.

## File yang diperiksa

- `src/features/navigation/application/get-menu.ts` — sumber menu dari izin efektif.
- `src/features/navigation/application/build-menu.ts` — tipe `MenuNode` dan penyusunan hierarki.
- `src/features/rbac/application/authorization.ts` — `readableResources`, `DEFAULT_RESOURCE`, `hasPermission`.
- `src/features/rbac/infrastructure/rbac-repository.ts` — `listModules(villageId)`.
- `src/app/(admin)/layout.tsx` dan `src/components/shell/admin-sidebar.tsx` — titik render menu.
- Daftar rute nyata di `src/app/(admin)` untuk menentukan halaman yang sudah tersedia.

## File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/navigation/domain/menu-tampil.ts` | Fungsi murni: normalisasi path, penanda rute tersedia, perataan menu bersarang. |
| `src/features/navigation/domain/menu-tampil.test.ts` | 8 test untuk normalisasi path dan perataan menu. |
| `src/app/(admin)/layout.tsx` | Mengambil menu dan nama desa secara paralel, meneruskan `menu` ke sidebar. |
| `src/components/shell/admin-sidebar.tsx` | Merender grup dan item; item tanpa halaman menjadi label non-aktif berbadge "Segera". |
| `src/app/globals.css` | Kelas `.admin-nav-pending` dan `.admin-nav-badge`. |

## Perubahan

- `AdminLayout` memanggil `getMenuForUser(user)` bersamaan dengan `getNamaDesaUseCase` memakai `Promise.all`.
- Sidebar menerima `menu: readonly MenuNode[]`, meratakannya, lalu merender:
  - simpul beranak sebagai judul grup,
  - daun dengan halaman tersedia sebagai `Link` (dengan `aria-current` saat aktif),
  - daun tanpa halaman sebagai `<span aria-disabled>` berbadge **Segera**.
- Tautan utama (Beranda/Dashboard platform) tetap dirender terpisah dan difilter dari daftar agar tidak dobel.
- Rute yang dianggap tersedia didaftarkan eksplisit di `RUTE_ADMIN_TERSEDIA` (`/beranda`, `/super-admin`). Daftar ini sengaja manual: menebak dari `modules.url` akan menghasilkan tautan mati.
- Badge memakai `margin-left: auto` sehingga menempel di kanan tanpa mengubah struktur grid sidebar.

## Security dan tenant

- Menu hanya lapisan tampilan. Setiap halaman tetap memeriksa izin di server (`hasPermission`/DAL), jadi menyembunyikan tautan bukan kontrol otorisasi.
- `getMenuForUser` memakai `user.villageId` dari sesi ke `listModules`, sehingga modul tenant lain tidak pernah ikut terbaca.
- Tidak ada data tenant yang dikirim ke klien di luar label dan URL modul yang memang boleh dibaca pengguna.
- Super admin platform tetap memakai `isPlatformAdmin` yang sudah ada; role desa `administrator` tidak disamakan dengan `super-admin`.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npm run format:check` | **PASS** |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS** — 0 error, 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:unit` | **PASS** — 198 file, 1.762 test (termasuk 8 test baru `menu-tampil.test.ts`) |
| `npm run test:integration` | **PASS** — 34 file, 206 test, terhadap MySQL 8.0.30 disposable `desa_test` @ `127.0.0.1:3307` |
| `npm run build` | **PASS** — `next build` selesai, seluruh rute terkompilasi |
| Verifikasi di browser | **SKIPPED** — tidak diminta |

## Risiko dan keterbatasan

1. **Daftar rute manual.** Setiap halaman admin baru harus ditambahkan ke `RUTE_ADMIN_TERSEDIA`; bila lupa, modulnya tetap berlabel "Segera" meski halamannya sudah ada. Ini disengaja agar tidak ada 404, tetapi menimbulkan pekerjaan perawatan.
2. **Daftar "Segera" bisa panjang** untuk role dengan banyak izin, sehingga sidebar terasa penuh. Bila mengganggu, alternatifnya menyembunyikan modul yang belum siap.
3. **Satu query tambahan** (`listModules`) pada setiap render layout admin. Belum diukur dampaknya; `listModules` sudah ada dan tidak menambah pola akses baru.
4. Belum ada test yang merender komponen sidebar (butuh DOM testing yang belum dipakai proyek); logika yang diuji adalah fungsi murni, bukan output React. Integration suite lulus tetapi tidak menyentuh sidebar karena komponen tidak dirender di sana.

## Kesimpulan

Menu admin kini mengikuti modul dan izin efektif pengguna tanpa menghasilkan tautan mati. Perubahan siap direview; pemetaan rute perlu diperbarui setiap kali halaman admin baru ditambahkan.
