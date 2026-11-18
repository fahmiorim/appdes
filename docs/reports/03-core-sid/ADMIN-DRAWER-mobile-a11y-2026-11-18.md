# Drawer Sidebar Mobile: Backdrop, Escape, dan Pengembalian Fokus

- **Task:** melengkapi perilaku drawer sidebar admin pada layar sempit dengan backdrop, penutupan lewat tombol Escape, jebakan fokus di dalam drawer, dan pengembalian fokus ke tombol pemicu.
- **Tanggal:** 18 November 2026
- **Branch:** `task/admin-drawer-a11y` (ditumpuk pada `task/admin-shell-visual-refresh`)
- **Base commit:** `12aec50` (`task/admin-shell-visual-refresh`)
- **Commit hasil:** lihat `git log -1` pada branch ini.

## 1. Kondisi awal

Sidebar admin berubah menjadi drawer di bawah 900 px hanya lewat `transform: translateX(-100%)`. Akibatnya:

- Tidak ada backdrop, sehingga tidak jelas bahwa latar halaman nonaktif dan tidak ada cara menutup drawer dengan sentuhan di luar panel.
- Drawer hanya dapat ditutup dengan tombol ☰ atau tautan navigasi; tombol Escape tidak berfungsi.
- Drawer yang tertutup tetap berada di dalam alur tab karena hanya digeser keluar layar, sehingga fokus keyboard bisa masuk ke tautan yang tidak terlihat.
- Fokus tidak dipindahkan ke drawer saat dibuka dan tidak dikembalikan ke tombol pemicu saat ditutup.

`docs/design/ADMIN-PLATFORM-DESIGN.md` §2 Responsive mensyaratkan drawer dapat ditutup lewat tombol, Escape, klik backdrop, dan navigasi, serta fokus keyboard tetap berada dalam alur drawer dan dikembalikan ke tombol pemicu.

## 2. File yang diperiksa

- `src/components/shell/admin-sidebar.tsx`
- `src/app/globals.css` (blok `.admin-sidebar`, `.mobile-menu-button`, media query ≤900 px)
- `src/app/(admin)/layout.tsx` (pemakaian `AdminSidebar`)
- `docs/design/ADMIN-PLATFORM-DESIGN.md`
- `package.json` (ketersediaan alat uji DOM)

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/components/shell/admin-sidebar.tsx` | Menambah `ref` pemicu dan drawer, backdrop, handler Escape, jebakan fokus Tab, serta pengembalian fokus. |
| `src/app/globals.css` | Menambah gaya `.admin-drawer-backdrop` dan menyembunyikan drawer tertutup dengan `visibility` pada layar sempit. |

## 4. Perubahan

- **Backdrop:** elemen `.admin-drawer-backdrop` dirender hanya ketika drawer terbuka, ditandai `aria-hidden="true"` karena murni visual, dan menutup drawer saat diklik. Lapisan berada di `z-index: 25` — di atas topbar (20) dan di bawah sidebar (30) — serta hanya ditampilkan pada ≤900 px.
- **Escape:** listener `keydown` aktif hanya selama drawer terbuka; Escape menutup drawer dan mengembalikan fokus ke tombol pemicu.
- **Jebakan fokus:** saat drawer dibuka, fokus dipindahkan ke elemen fokus pertama di dalam drawer. Tab dan Shift+Tab berputar di dalam drawer bila fokus mencapai elemen terakhir/pertama atau berada di luar drawer. Elemen diperiksa dengan `getClientRects()` karena `offsetParent` selalu `null` untuk elemen `position: fixed`.
- **Pengembalian fokus:** klik backdrop dan Escape memanggil `triggerRef.current?.focus()`. Tautan navigasi tetap menutup drawer tanpa memindahkan fokus karena halaman berganti.
- **Label pemicu:** `aria-label` berganti menjadi "Tutup navigasi" saat drawer terbuka, sementara `aria-expanded` dan `aria-controls` tetap.
- **Drawer tertutup tidak lagi dapat difokus:** pada ≤900 px, drawer tertutup memakai `visibility: hidden` dan menjadi `visible` saat `data-open="true"`, dengan transisi yang tetap menghormati `prefers-reduced-motion`.
- Tidak ada perubahan pada struktur menu, filter permission, tautan, atau data.

## 5. Security/tenant

Tidak ada perubahan otorisasi atau data. Komponen hanya menambah state UI; `menu`, `canReadDashboard`, dan `isPlatformAdmin` tetap berasal dari layout server-side.

## 6. Validasi

| Perintah | Status | Catatan |
|---|---|---|
| `npm run typecheck` | PASS | Sempat gagal `TS18047` pada closure `handleKeyDown`; diperbaiki dengan membaca `drawerRef.current` dan dibuktikan lulus. |
| `npx eslint src/components/shell/admin-sidebar.tsx` | PASS | Tanpa error, termasuk aturan `react-hooks/exhaustive-deps`. |
| `npm run format:check` | PASS | File sesuai Prettier. |
| `npm run build` | PASS | Build produksi Next.js selesai. |
| Uji otomatis interaksi drawer | SKIPPED | Repo belum memiliki setup DOM (jsdom/Testing Library), sehingga tidak ada uji komponen yang dapat dijalankan tanpa menambah dependency baru. |
| Pemeriksaan manual di browser | SKIPPED | Tidak diminta pada task ini; perilaku diverifikasi lewat pembacaan kode dan pemeriksaan statis. |

## 7. Risiko dan keterbatasan

- Perilaku backdrop, Escape, dan jebakan fokus belum diuji di browser atau dengan uji otomatis; verifikasi masih perlu dilakukan reviewer pada viewport ≤900 px.
- Jebakan fokus aktif selama state `open` benar. Jika jendela diperbesar ke desktop saat drawer terbuka, state tetap terbuka; tampilan desktop tidak terpengaruh tetapi drawer akan tampil terbuka bila jendela dikecilkan kembali.
- Latar halaman masih dapat digulir selama drawer terbuka (scroll lock tidak termasuk lingkup task).

## 8. Kesimpulan

Drawer sidebar mobile kini memiliki backdrop, dapat ditutup dengan Escape, menahan fokus di dalam panel saat terbuka, dan mengembalikan fokus ke tombol pemicu. Perubahan murni presentasi dan perilaku UI; siap review maintainer.
