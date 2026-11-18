# Penyelarasan Visual Beranda Super Admin

- **Task:** merapikan tampilan beranda Super Admin (`/super-admin`) agar selaras dengan kerangka admin yang baru.
- **Tanggal:** 18 November 2026
- **Branch:** `task/super-admin-beranda-visual` (ditumpuk pada `task/admin-shell-visual-refresh`)
- **Base commit:** `12aec50` (`task/admin-shell-visual-refresh`)
- **Commit hasil:** lihat `git log -1` pada branch ini.

## 1. Kondisi awal

Penyegaran shell admin desa mengubah tipografi judul halaman, ritme jarak, serta tampilan kartu statistik. Beranda Super Admin belum mengikuti perubahan itu:

- Judul halaman memakai tracking dan jarak bawah yang berbeda dari beranda admin desa.
- Empat KPI langsung mengikuti judul halaman tanpa judul bagian, sehingga hierarki halaman berbeda dari beranda admin.
- Kartu KPI hanya berisi angka tanpa penanda visual, padahal beranda admin desa kini memakai ikon.

## 2. Ruang lingkup

Hanya presentasi pada beranda konsol platform dan gaya bersama konsol. Tidak ada perubahan pada use case, guard `pastikanSuperAdmin`, query, permission, data, atau rute. Halaman konsol lain tetap memakai gaya `.platform-*` yang sama dan ikut menerima penyelarasan tipografi tanpa perubahan markup.

## 3. File yang diperiksa

- `src/app/(admin)/super-admin/page.tsx`
- `src/app/(admin)/super-admin/guard.ts`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/app/(admin)/super-admin/{tenant,domain,pengguna,audit,template,pengaturan}/page.tsx` (pemakaian `platform-stat-grid`, `PlatformPageHeader`, `PlatformCard`)
- `src/app/(admin)/beranda/page.tsx`
- `src/app/globals.css` (blok `.platform-*`, `.stat-card`, `.section-heading`)
- `docs/design/ADMIN-PLATFORM-DESIGN.md` §3

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/components/ui/stat-icon.tsx` | Komponen baru: kotak ikon dekoratif bersama untuk kartu statistik (`aria-hidden`), dipakai beranda admin dan konsol. |
| `src/app/(admin)/beranda/page.tsx` | Memakai `StatIcon` bersama, bukan duplikasi lokal. |
| `src/app/(admin)/super-admin/page.tsx` | Menambah judul bagian dan ikon dekoratif pada empat KPI. |
| `src/app/globals.css` | Menyamakan tracking judul, jarak bawah kepala halaman, dan tracking judul kartu platform dengan kerangka admin baru. |

## 5. Perubahan

- **Judul bagian:** "Gambaran platform" dengan keterangan "Agregat seluruh desa, domain, dan akun pengelola" sebelum grid KPI, mengikuti pola beranda admin desa.
- **KPI:** ikon dekoratif untuk total desa, pengguna desa, domain terdaftar, dan pengguna platform. Ikon ditandai `aria-hidden` lewat `StatIcon`, sehingga pembaca layar hanya menerima label dan angka.
- **Tipografi:** `.platform-page-head h1` memakai `letter-spacing: -0.05em` dan `margin-bottom: 26px`, sama dengan `.page-heading`; `.platform-card-head h2` memakai tracking `-0.02em` seperti `.dashboard-section h2`.
- **Komponen bersama:** `StatIcon` dipindahkan ke `src/components/ui/` agar beranda admin dan konsol tidak menduplikasi markup ikon.
- Tidak ada perubahan teks data, angka, tautan, atau aksi.

## 6. Security/tenant

Tidak ada perubahan otorisasi atau data. `pastikanSuperAdmin()` tetap dijalankan di awal halaman, seluruh angka masih berasal dari use case platform yang sudah dibatasi peran, dan tidak ada parameter baru dari klien.

## 7. Validasi

| Perintah | Status | Catatan |
|---|---|---|
| `npm run typecheck` | PASS | `next typegen` + `tsc --noEmit` tanpa error. |
| `npx eslint` pada tiga file yang berubah | PASS | Tanpa error/warning. |
| `npm run format:check` | PASS | Seluruh file sesuai Prettier. |
| `npm run build` | PASS | Compiled successfully, 75/75 halaman statis, seluruh rute `/super-admin` tetap ter-render. |
| Pemeriksaan visual di browser | SKIPPED | Tidak diminta; perubahan diperiksa lewat kode dan build. |

## 8. Risiko dan keterbatasan

- Ikon KPI hanya ditambahkan pada beranda `/super-admin`; halaman konsol lain tetap menampilkan kartu angka tanpa ikon. Tipografi dan jarak tetap konsisten karena memakai komponen yang sama.
- Tampilan akhir belum diverifikasi dengan tangkapan layar, sehingga proporsi ikon dan jarak perlu ditinjau reviewer.
- Branch ini ditumpuk pada `task/admin-shell-visual-refresh`; PR-nya bergantung pada PR shell admin.

## 9. Kesimpulan

Beranda Super Admin kini memiliki hierarki judul, judul bagian, dan kartu KPI yang sejalan dengan beranda admin desa, tanpa mengubah data maupun otorisasi. Siap review maintainer.
