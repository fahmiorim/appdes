# Layout Super Admin Mengikuti Mockup

- **Task:** menyelaraskan layout konsol Super Admin dengan 38 mockup di `docs/mockups/platform/super-admin/` — sidebar, topbar, header halaman, KPI, dashboard, dan konsol tenant.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/super-admin-layout-mockup`.
- **Base commit:** `92e1a90` (`origin/main`).
- **Commit hasil:** `(SHA diisi setelah commit)`.

## 1. Kondisi awal

Shell platform sudah ada, tetapi arah visualnya belum mengikuti mockup:

- Sidebar navy-biru dengan menu datar, tanpa grup dan tanpa footer bergaya mockup.
- Topbar memuat judul serta deskripsi halaman, tanpa breadcrumb, pencarian, lonceng, atau menu akun.
- KPI berupa kartu putih seragam tanpa tona dan tanpa ikon di sisi kanan.
- Dashboard dibuka dengan banner sambutan yang tidak ada di mockup.
- Konsol tenant memakai `<select>` untuk status, bukan tab berjumlah seperti mockup.
- Aksi utama platform masih biru (`--color-brand`), sedangkan mockup memakai ungu.

## 2. Analisis dan pendekatan

Mockup memperlihatkan satu sistem visual yang konsisten: sidebar indigo-ungu gelap, item aktif berupa pil gradien ungu, topbar putih berisi breadcrumb + pencarian + lonceng + menu akun, header halaman besar dengan CTA ungu, KPI bertone (ungu/hijau/amber/merah/biru), tab pil, dan tabel kartu.

Perubahan dibatasi pada shell/layout dan komponen presentasi. Tidak ada fitur baru yang tidak punya sumber data:

- Angka KPI, tabel, dan panel tetap berasal dari use case yang sudah ada.
- Pencarian topbar mengirim `q` ke `/super-admin/tenant`, lalu menjadi filter klien yang sudah ada.
- Lonceng diarahkan ke audit trail; tidak ada badge notifikasi palsu.
- Grafik tren dihitung dari `createdAt` tenant yang sudah dimuat; tidak ada deret contoh.
- Menu sidebar hanya memuat tujuh route yang benar-benar ada.

## 3. File yang diperiksa

- `docs/mockups/platform/super-admin/` (38 PNG, contact sheet dan dua layar utama pada resolusi lebih besar).
- `src/app/(admin)/layout.tsx`, `src/components/shell/admin-sidebar.tsx`, `admin-topbar.tsx`, `platform-topbar-head.tsx`.
- Tujuh halaman `src/app/(admin)/super-admin/**/page.tsx`.
- `src/features/multi-desa/presentation/platform-ui.tsx`, `tenant-console.tsx`.
- `src/features/navigation/domain/menu-platform.ts`, `header-platform.ts` beserta test.
- `src/app/globals.css` (blok shell, platform, dan beranda desa).
- `docs/design/DESIGN-SYSTEM.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md`.

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/navigation/domain/menu-platform.ts` | Menambahkan `grup` dan helper `grupMenuPlatform()` untuk sidebar bergrup. |
| `src/components/shell/admin-sidebar.tsx` | Merender grup menu platform dan footer ilustrasi + pil Super Admin. |
| `src/components/shell/platform-topbar-head.tsx` | Mengganti judul topbar dengan breadcrumb, pencarian `q`, pintasan `Ctrl/Cmd+K`, dan tautan audit. |
| `src/components/shell/admin-topbar.tsx` | Menu akun platform (nama, `Platform FlexiDesa`, chevron) dengan aksi keluar di dalam dropdown. |
| `src/features/multi-desa/presentation/platform-ui.tsx` | Menambahkan `PlatformPageHeader`, tona `PlatformStat`, dan grafik `PlatformTrend`. |
| `src/features/multi-desa/domain/tren-tenant.ts` | Fungsi murni tren tenant kumulatif enam bulan. |
| `src/features/multi-desa/domain/tren-tenant.test.ts` | Test tren tenant (baru). |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Tab status berjumlah, dukungan `queryAwal`, dan URL yang mempertahankan `q`. |
| Tujuh halaman `super-admin` | Header halaman, KPI bertone, dashboard dua kolom, dan CTA di header. |
| `src/app/globals.css` | Blok visual platform baru; blok lama (`platform-welcome`, topbar berjudul) dicabut. |
| `docs/design/DESIGN-SYSTEM.md`, `ADMIN-PLATFORM-DESIGN.md` | Mencatat keputusan arah visual Super Admin dan token aksi ungu platform. |
| `docs/reports/02-super-admin/SUPER-ADMIN-LAYOUT-MOCKUP-2026-11-19.md` | Laporan ini. |

## 5. Perubahan

### Shell

- Sidebar 276 px dengan gradien indigo-ungu, glow ungu di bawah, brand `FlexiDesa.id` + `Konsol Super Admin`.
- Menu dikelompokkan: Menu utama, Tenant, Platform.
- Item aktif berupa pil gradien `#7C3AED → #9333EA` dengan shadow, ikon tile.
- Footer: ilustrasi desa, `FlexiDesa.id`, `Platform Desa Terpadu`, pil `Super Admin`.
- Topbar putih 62 px: breadcrumb `Dashboard Super Admin › <halaman>`, pencarian tenant, tautan audit trail, menu akun.
- Aksi keluar tetap tersedia, kini di dalam dropdown akun platform.

### Header halaman

- `PlatformPageHeader` memakai `HEADER_PLATFORM` sebagai sumber tunggal judul/deskripsi.
- Header tampil di konten untuk ketujuh halaman; aksi halaman (daftar desa, tambah pengguna, buka konsol tenant) berada di kanan header.

### KPI dan dashboard

- `PlatformStat` menerima `tone`; kartu utama ungu penuh, kartu lain hijau/oranye/merah/biru.
- Dashboard: lima KPI (total desa, desa aktif, desa nonaktif, domain, pengguna desa), panel pertumbuhan tenant, tenant terbaru, perlu perhatian, dan aktivitas.
- Perhatian baru: akun platform tanpa role, dihitung dari data pengguna platform yang sudah dimuat.
- Banner sambutan dihapus karena tidak ada di mockup; konteks dipindahkan ke header halaman.

### Konsol tenant

- Tab `Semua / Aktif / Nonaktif / Siap purge` dengan jumlah nyata, menggantikan `<select>`.
- Pencarian dari topbar (`?q=`) menjadi nilai awal kolom pencarian; memilih tab mempertahankan `q`.
- Tabel memakai header kecil, hover, dan radius kartu sesuai mockup.

## 6. Keamanan dan tenant

- Tidak ada perubahan otorisasi, resolusi tenant, atau query database.
- Tidak ada `villageId` dari klien yang dipakai sebagai bukti otorisasi.
- `q` hanya dipakai sebagai filter tampilan di klien setelah halaman lolos `pastikanSuperAdmin()`; nilainya di-`trim` dan dibatasi 120 karakter saat dibaca dari URL.
- Grafik dan KPI memakai baris tenant yang sudah diotorisasi; tidak ada data lintas tenant baru yang dibuka.
- Tidak ada notifikasi, uptime, atau angka contoh yang dirender sebagai data nyata.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | **PASS** — `next typegen && tsc --noEmit` tanpa error. |
| `npx eslint` pada 10 file shell/fitur/domain dan folder `super-admin` | **PASS** — tanpa output. |
| `npx vitest run menu-platform.test.ts header-platform.test.ts tren-tenant.test.ts super-admin/page.test.ts` | **PASS** — 4 file, 19 test. |
| `npx prettier --check` pada file yang diubah | **PASS** setelah `--write` pada dua file. |
| Pemeriksaan browser / screenshot comparison | **SKIPPED** — tidak ada Playwright di lingkungan ini; belum dijalankan. |

## 8. Risiko dan keterbatasan

- Kesesuaian visual belum diverifikasi di browser; belum ada perbandingan screenshot atau contrast check formal.
- Mockup memuat 38 layar; implementasi ini hanya menyelaraskan shell dan tujuh halaman yang sudah ada. Paket, monitoring, keamanan, laporan, peta sebaran, ekspor, dan detail tenant belum dibangun karena belum ada model data/halaman.
- Grafik tren memakai bulan kalender dan total kumulatif; mockup memakai rentang harian dan persentase perubahan yang tidak tersedia tanpa agregasi baru.
- Tabel tenant belum menampilkan storage, paket, kecamatan, checkbox pilih-baris, dan paginasi server seperti mockup karena datanya belum ada.
- Layout mobile sudah memiliki aturan CSS, tetapi belum diuji di viewport nyata.
- Perubahan mockup desa (file terhapus/baru) yang sudah ada di working tree sebelum task ini tidak disentuh dan tidak termasuk commit.

## 9. Kesimpulan

Shell dan layout konsol Super Admin kini mengikuti pola visual mockup: sidebar indigo-ungu bergrup, topbar breadcrumb + pencarian, header halaman, KPI bertone, dashboard dua kolom, dan tab tenant. Seluruh data yang ditampilkan tetap berasal dari tenant nyata.

**Status:** siap review. Belum di-merge dan belum di-deploy.
