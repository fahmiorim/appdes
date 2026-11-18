# Penyegaran Visual Kerangka Admin

- **Task:** penyegaran visual kerangka admin (sidebar, topbar, beranda admin desa). Tujuan: membuat ruang kerja administrasi terasa lebih profesional dan modern tanpa mengubah alur, fitur, otorisasi, atau data.
- **Tanggal:** 18 November 2026
- **Branch:** `task/admin-shell-visual-refresh`
- **Base commit:** `60fe8140b15376faab2d2023114c10d0c4e227b3` (`origin/main`)
- **Commit hasil:** diisi pada commit laporan ini (lihat `git log` branch).

## 1. Kondisi awal

Kerangka admin sudah memakai Design System FlexiDesa (sidebar/topbar putih, brand blue, kartu putih). Beberapa kelemahan visual:

- Sidebar tanpa hierarki visual yang tegas: item aktif hanya berubah warna latar, tidak ada penanda posisi, dan daftar menu tidak dapat digulir bila menu bertambah.
- Topbar datar: judul konteks dan identitas pengguna berbagi bobot tipografi yang sama, tombol keluar menyatu dengan teks pengguna.
- Beranda admin hanya menampilkan tiga kartu angka tanpa ikon, tanpa judul bagian, dan tanpa ritme jarak yang jelas.

## 2. Ruang lingkup

Hanya presentasi: `globals.css` dan markup shell admin desa serta beranda admin. Tidak ada perubahan pada route, use case, permission, query, schema, atau data. Konsol Super Admin memakai `PlatformPageHeader`/`PlatformCard` dan tetap mendapat manfaat perbaikan `.stat-card` secara otomatis, tanpa perubahan markup di halamannya.

## 3. File yang diperiksa

- `src/app/(admin)/layout.tsx`
- `src/components/shell/admin-sidebar.tsx`
- `src/components/shell/admin-topbar.tsx`
- `src/app/(admin)/beranda/page.tsx`
- `src/app/(admin)/super-admin/page.tsx`, `pengguna`, `domain`, `pengaturan`, `template` (pemakaian `Card` dan `stat-card-*`)
- `src/components/ui/card.tsx`, `button.tsx`
- `src/app/(warga)/layanan-mandiri/**` (memakai `stats-grid`, `dashboard-section`, dan `stat-card` yang sama)
- `src/app/globals.css`
- `docs/design/ADMIN-PLATFORM-DESIGN.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/app/globals.css` | Menyegarkan gaya kerangka admin: sidebar, topbar, page heading, kartu statistik, judul bagian, dan aturan responsif. |
| `src/components/shell/admin-sidebar.tsx` | Menambah subjudul merek pada blok brand. Struktur menu, filter permission, dan tautan tidak berubah. |
| `src/components/shell/admin-topbar.tsx` | Memisahkan konteks desa dan chip pengguna; menghapus inline style pada teks status. Logika sign-out tidak berubah. |
| `src/app/(admin)/beranda/page.tsx` | Menambah ikon dekoratif dan judul bagian pada KPI. Data, query, dan redirect tetap sama. |

## 5. Perubahan

- **Sidebar:** brand mark bergradien biru–ungu dengan subjudul "Sistem Informasi Desa"; label kelompok menu lebih kecil dan konsisten; item aktif memakai latar gradien lembut plus penanda batang 3 px di kiri; ikon meredup dan mengikuti warna item saat hover/aktif; daftar menu dapat digulir sendiri sehingga footer tetap terlihat; footer menjadi kartu ringkas.
- **Topbar:** menempel di atas (`position: sticky`) dengan latar semi-transparan dan `backdrop-filter`; judul konteks memakai huruf kapital kecil, nama desa/tenant lebih tegas; identitas pengguna menjadi chip pil berisi avatar gradien, nama, dan label "Pengguna aktif"; tombol keluar lebih ringkas; pada layar ≤620 px chip menyusut menjadi avatar saja.
- **Konten:** area konten dibatasi `max-width: 1320px`, latar `admin-frame` mendapat gradien radial halus agar kedalaman halaman lebih terasa.
- **Kartu statistik:** efek hover angkat 2 px dengan bayangan dan border lebih tegas; nilai, label, dan catatan dirapatkan; kelas baru `.stat-icon` untuk kotak ikon 38 px.
- **Beranda admin:** judul bagian "Data administrasi" di atas KPI dan ikon dekoratif (penduduk, kartu keluarga, surat) yang ditandai `aria-hidden`, sehingga pembaca layar tidak menerima informasi ganda.
- **Aksesibilitas dipertahankan:** state aktif tetap memakai `aria-current="page"`, fokus keyboard tetap memakai `:focus-visible` global, kontras teks tetap di atas ambang, dan seluruh animasi ikut aturan `prefers-reduced-motion` yang sudah ada.

## 6. Security/tenant

Tidak ada perubahan pada jalur otorisasi maupun data. `verifySession`, pemeriksaan `residentId`, `isSuperAdminUser`, `hasPermission`, dan `getMenuForUser` pada layout tidak disentuh. Komponen yang diubah hanya menerima properti yang sudah dihitung server-side; tidak ada `villageId` baru dari klien dan tidak ada query tambahan.

## 7. Validasi

| Perintah | Status | Catatan |
|---|---|---|
| `npm run typecheck` | PASS | `next typegen` + `tsc --noEmit` tanpa error. |
| `npx eslint .` | PASS | Tanpa error/warning. |
| `npm run format:check` | PASS | Seluruh file sesuai Prettier (CSS dirapikan dengan `prettier --write`). |
| `npm run build` | PASS | Build produksi Next.js selesai, seluruh rute admin/super-admin tetap ter-render. |
| Pemeriksaan visual di browser | SKIPPED | Tidak dijalankan; pipeline `visual:qa:*` memerlukan database disposable dan tidak diminta pada task ini. |

## 8. Risiko dan keterbatasan

- Perbaikan `.stat-card`, `.dashboard-section`, dan `.stats-grid` berlaku global, termasuk halaman layanan mandiri warga. Perubahannya bersifat penyempurnaan (hover, jarak, tipografi), bukan perubahan struktur, tetapi tampilan halaman warga sebaiknya ikut ditinjau reviewer.
- Perilaku drawer mobile (backdrop, tombol Escape, pengembalian fokus) belum ditambahkan karena berada di luar lingkup visual dan memerlukan perubahan perilaku.
- Tampilan akhir belum diverifikasi lewat tangkapan layar pada task ini.

## 9. Kesimpulan

Kerangka admin desa kini memiliki hierarki visual, penanda navigasi aktif, topbar yang menempel dan informatif, serta KPI yang lebih terbaca, tanpa mengubah alur, otorisasi, atau data. Siap untuk review maintainer; merge menunggu persetujuan.
