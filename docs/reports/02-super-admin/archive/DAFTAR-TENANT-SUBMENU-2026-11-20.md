# Super Admin — submenu dan ringkasan Daftar Tenant

- **Task:** melanjutkan halaman **Manajemen tenant → Daftar tenant** agar navigasi dan ringkasannya sesuai mockup.
- **Tanggal:** 20 November 2026
- **Branch:** `task/super-admin-mockup-phase-1`
- **Base commit:** `0b18f43` (merge PR #174)
- **Commit implementasi:** `d28e9df`
- **PR:** #180

## 1. Tujuan

Menjadikan **Daftar tenant** submenu yang jelas di bawah **Manajemen tenant**, menampilkan breadcrumb yang sesuai, dan menambahkan ringkasan KPI tenant di atas tabel. Semua angka harus berasal dari data tenant, domain, pengguna, dan penduduk yang sudah dimuat server.

## 2. Kondisi awal

- Sidebar platform masih datar: **Manajemen tenant** berupa satu tautan tanpa submenu.
- Breadcrumb halaman tenant hanya menampilkan **Dashboard Super Admin → Daftar tenant**, tanpa induk **Manajemen tenant**.
- Halaman tenant sudah memiliki tabel, pencarian, filter status/kecamatan/tema, dan pagination, tetapi belum memiliki KPI ringkasan seperti mockup.
- Mockup menampilkan paket langganan, storage, dan status ditangguhkan. Ketiganya belum memiliki model data sehingga tidak dibuat atau diisi angka contoh.

## 3. File yang diperiksa

- `docs/mockups/platform/super-admin/Manajemen Tenant/FlexiDesa.id Tenant Management Dashboard.png`
- `src/app/(admin)/super-admin/tenant/page.tsx`
- `src/app/(admin)/super-admin/tenant/page.test.ts`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/navigation/domain/menu-platform.ts`
- `src/features/navigation/domain/menu-platform.test.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/features/navigation/domain/header-platform.test.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/components/shell/platform-topbar-head.tsx`
- `src/app/globals.css`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/navigation/domain/menu-platform.ts` | Menambahkan model submenu dan item **Daftar tenant** |
| `src/features/navigation/domain/menu-platform.test.ts` | Menguji submenu Manajemen tenant |
| `src/features/navigation/domain/header-platform.ts` | Judul **Daftar tenant** dan remah **Manajemen tenant** |
| `src/features/navigation/domain/header-platform.test.ts` | Menyesuaikan judul dan menguji remah |
| `src/components/shell/admin-sidebar.tsx` | Merender grup submenu yang dapat dibuka/ditutup |
| `src/components/shell/platform-topbar-head.tsx` | Merender remah breadcrumb tambahan |
| `src/app/(admin)/super-admin/tenant/page.tsx` | Menghitung dan menampilkan enam KPI tenant |
| `src/app/(admin)/super-admin/tenant/page.test.ts` | Menguji KPI baru |
| `src/app/globals.css` | Gaya submenu sidebar dan grid enam KPI |

Tidak ada perubahan schema, migration, dependency, konfigurasi deployment, atau data database.

## 5. Perubahan

### Navigasi

- **Manajemen tenant** menjadi grup sidebar yang dapat dibuka/ditutup.
- Submenu **Daftar tenant** aktif pada `/super-admin/tenant` dan sub-rutenya.
- Breadcrumb menjadi **Dashboard Super Admin → Manajemen tenant → Daftar tenant**.
- Judul halaman dan metadata berubah dari **Tenant desa** menjadi **Daftar tenant**.

### Ringkasan halaman

Enam KPI dihitung dari data yang sudah ada:

1. Total tenant.
2. Tenant aktif beserta persentasenya.
3. Tenant nonaktif beserta jumlah yang siap purge.
4. Total pengguna desa lintas tenant.
5. Total penduduk yang tercatat pada profil desa.
6. Domain terdaftar beserta jumlah desa yang belum berdomain.

Tabel, pencarian, filter, pagination, dan panel pengelolaan tenant yang sudah ada tidak diubah perilakunya.

## 6. Security dan tenant

- Halaman tetap memanggil `pastikanSuperAdmin()` sebelum memuat data.
- KPI dihitung dari hasil `daftarDesaSuperAdmin()` dan `daftarSemuaDomain()` yang sudah dibatasi untuk pengelola platform.
- Tidak ada `villageId` dari body/query yang dijadikan dasar otorisasi.
- Tidak ada data pribadi penduduk yang ditampilkan; hanya jumlah agregat yang sudah tersedia pada query konsol.
- Submenu hanya mengubah navigasi tampilan. Akses route tetap dijaga guard server-side.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npm test -- --run src/features/navigation/domain/menu-platform.test.ts src/features/navigation/domain/header-platform.test.ts "src/app/(admin)/super-admin/tenant/page.test.ts"` | **PASS** — 3 file, 18 test |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** — 0 error, 2 warning lama di `scripts/wilayah/generate-wilayah.mjs` |
| `npm run format:check` | **PASS** — seluruh file sesuai Prettier |
| `git diff --check` | **PASS** — tidak ada whitespace error |
| Visual QA browser | **SKIPPED** — belum ada sesi Super Admin dengan data seed pada task ini |

`npm test` penuh tidak dijalankan ulang pada sub-task ini. Pemeriksaan yang dijalankan adalah test fokus untuk file yang berubah.

## 8. Risiko dan batasan

- Tampilan submenu dan KPI belum diverifikasi lewat browser atau tangkapan layar.
- KPI **total penduduk** adalah agregat seluruh tenant; angka ini bukan data sensus resmi dan tidak menggantikan laporan kependudukan.
- Pagination dan filter tenant masih berjalan di klien karena seluruh tenant dimuat dari server.
- Paket langganan, storage, dan status **ditangguhkan** belum dibuat karena belum ada model data.
- Submenu baru hanya memuat **Daftar tenant**. **Tambah tenant** masih berupa aksi di header halaman, bukan submenu tersendiri.
- Perhitungan domain memakai seluruh baris domain yang dimuat halaman; bila ada domain yatim di luar daftar tenant, asumsi `total tenant - desa berdomain` perlu ditinjau ulang.

## 9. Kesimpulan

Halaman **Daftar tenant** kini memiliki submenu, breadcrumb, dan ringkasan KPI yang jelas dengan data nyata. Perubahan siap direview bersama PR #180; visual QA dan keputusan merge tetap menunggu reviewer.
