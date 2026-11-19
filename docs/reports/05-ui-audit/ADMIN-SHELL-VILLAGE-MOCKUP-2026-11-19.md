# Penyesuaian Shell Admin Desa dengan Mockup `village/`

- **Task:** menyamakan shell Admin Desa (sidebar navy, topbar breadcrumb) dengan mockup di `docs/mockups/village/`, tanpa mengubah konsol Super Admin.
- **Tanggal:** 19 November 2026
- **Branch:** `task/admin-desa-shell-mockup` (diturunkan dari `task/review-village-admin-mockups`)
- **Base commit:** `204b91a` (`feat(auth): pisahkan login Admin Desa dari login warga`)
- **Lingkup:** presentasi/shell saja. Tidak ada perubahan route, query, schema, permission, atau perilaku otorisasi.

## 1. Kondisi awal

Shell Admin Desa dan konsol platform memakai komponen yang sama (`AdminSidebar`, `AdminTopbar`) dengan pembeda atribut `data-platform`. Sebelum perubahan:

- Sidebar putih 264 px, item aktif berwarna biru dengan garis penanda kiri, kepala sidebar memuat `FlexiDesa.id` + "Sistem Informasi Desa Modern" untuk kedua persona.
- Topbar memuat teks statis "Ruang kerja administrasi" di kiri dan chip pengguna + tombol Keluar di kanan.
- Nama desa (`villageName`) hanya dikirim ke topbar, tidak dipakai sidebar.

Mockup `village/` menampilkan sidebar navy dengan identitas desa, menu aktif berupa pil ungu, dan topbar berisi breadcrumb `Dashboard › <halaman>`.

## 2. Keputusan implementasi

1. **Perubahan dikunci pada persona desa.** Sidebar mendapat atribut `data-desa="true"` hanya saat `isPlatformAdmin` false. Seluruh aturan CSS baru memakai selector `.admin-sidebar[data-desa="true"]`, sehingga konsol platform (`data-platform="true"`) tetap memakai sistem visualnya sendiri tanpa perubahan.
2. **Identitas desa pindah ke kepala sidebar.** `villageName` sekarang dikirim ke `AdminSidebar`; kepala sidebar menampilkan nama desa + label "Admin Desa". Persona platform tetap `FlexiDesa.id` + "Konsol Super Admin".
3. **Topbar desa memakai breadcrumb.** Teks statis "Ruang kerja administrasi" dan prop `villageName` pada `AdminTopbar` dihapus. Breadcrumb `Dashboard › <halaman>` dirender sebagai `<nav aria-label="Breadcrumb">` berisi `<ol>`, dengan `aria-current="page"` pada halaman aktif. Label halaman diambil dari peta eksplisit `LABEL_HALAMAN_DESA` yang hanya berisi rute yang benar-benar ada (`/beranda`), sehingga rute tanpa halaman tidak muncul sebagai tujuan breadcrumb.
4. **Fungsi keluar tetap di topbar.** Mockup menempatkan kartu pengguna di kaki sidebar dan hanya avatar di topbar. Kartu pengguna/keluar tidak diduplikasi ke sidebar karena akan menambah kontrol keluar kedua; chip pengguna dan tombol Keluar yang sudah ada dipertahankan.
5. **Warna aksi ungu diterapkan hanya pada item menu aktif.** Tombol dan aksi lain tetap memakai token brand biru karena keputusan palet aksi (ungu vs biru) belum diambil — lihat `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md` §3.

## 3. File yang diperiksa

- `src/app/(admin)/layout.tsx` — pemanggilan shell dan sumber `villageName`.
- `src/components/shell/admin-sidebar.tsx` — struktur merek, menu, kaki sidebar, drawer mobile.
- `src/components/shell/admin-topbar.tsx` — konteks kiri, chip pengguna, alur keluar per persona.
- `src/components/shell/platform-topbar-head.tsx` — memastikan topbar platform tidak terpengaruh.
- `src/features/navigation/domain/menu-tampil.ts` — `RUTE_ADMIN_TERSEDIA` (hanya `/beranda` untuk desa).
- `src/app/globals.css` — aturan shell generik, blok `data-platform`, media query 620/900 px.
- `docs/mockups/village/*.png` — acuan visual sidebar dan topbar.

## 4. File yang diubah

| File | Alasan |
| --- | --- |
| `src/components/shell/admin-sidebar.tsx` | Prop `villageName`, atribut `data-desa`, kepala sidebar menampilkan identitas desa. |
| `src/components/shell/admin-topbar.tsx` | Breadcrumb desa, penghapusan teks statis dan prop `villageName`. |
| `src/app/(admin)/layout.tsx` | Memindahkan `villageName` dari topbar ke sidebar. |
| `src/app/globals.css` | Aturan sidebar navy + breadcrumb yang dibatasi `[data-desa="true"]`; menghapus aturan `.admin-topbar-context`/`.admin-topbar-title` yang tidak lagi dipakai. |

## 5. Perubahan visual

- Sidebar desa: latar gradien navy `#0b1c3b → #0a1730` dengan sorot radial halus, tanpa border kanan, dipisahkan bayangan. Lebar tetap 264 px agar grid dan `margin-left` konten tidak berubah.
- Kepala sidebar: logo dalam chip translusif, nama desa putih 15 px, label "Admin Desa" kapital 9 px, garis pemisah translusif.
- Menu: teks `#c3cee6`, hover `rgb(255 255 255 / 8%)`, item aktif berupa pil gradien ungu `#7a20f0 → #8b3dff` dengan teks putih dan bayangan; garis penanda kiri lama disembunyikan. Item belum tersedia dan badge disesuaikan agar terbaca di navy.
- Fokus keyboard: outline putih translusif 3 px khusus sidebar desa, agar tetap terlihat di latar gelap.
- Topbar: breadcrumb 12 px `Dashboard › Beranda`; tautan `Dashboard` mengarah ke `/beranda`, halaman aktif tebal dan dipotong dengan elipsis bila panjang. Di bawah 480 px level `Dashboard` disembunyikan agar halaman aktif dan chip pengguna tetap muat. Sisi kanan tidak berubah.

Kontras teks utama: putih di navy dan putih di `#7a20f0` berada di atas ambang WCAG AA untuk teks normal.

## 6. Keamanan dan multi-tenant

Tidak ada perubahan pada pengambilan sesi, resolusi tenant, permission, atau query. `villageName` berasal dari layout server yang sudah memakai konteks desa pengguna; nilainya hanya untuk tampilan. Breadcrumb tidak membaca parameter klien dan tidak menautkan rute di luar `/beranda`. Tidak ada data pribadi baru yang dirender atau dilog.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Format | `npx prettier --write` pada 4 file yang diubah | PASS |
| Lint | `npx eslint src/components/shell/admin-sidebar.tsx src/components/shell/admin-topbar.tsx "src/app/(admin)/layout.tsx"` | PASS (`eslint_exit=0`) |
| Typecheck | `npm run typecheck` (`next typegen && tsc --noEmit`) | PASS (`typecheck_exit=0`) |

Tidak dijalankan: unit test shell (belum ada test untuk komponen presentasi ini), build produksi, dan pemeriksaan visual di browser. Perubahan CSS diverifikasi lewat pembacaan aturan dan pewarisan selector, bukan tangkapan layar.

## 8. Risiko dan batasan

- **Belum diverifikasi secara visual.** Perlu pemeriksaan manual di `/beranda` (desktop dan drawer mobile) untuk memastikan logo desa kontras di navy dan breadcrumb tidak terpotong pada lebar kecil.
- **Lebar sidebar mockup 256 px pada kanvas 1536** (±240 px pada 1440). Implementasi tetap 264 px; menyempitkan sidebar berarti menyesuaikan `margin-left`/`width` konten dan berpotensi menggeser seluruh halaman. Perlu keputusan terpisah.
- **Kartu pengguna di kaki sidebar, chip tanggal, lonceng notifikasi, dan pemilih desa** dari mockup belum dibuat karena belum ada data/notifikasi admin dan tidak termasuk permintaan ini.
- **Palet aksi ungu vs biru** masih terbuka; hanya item aktif menu yang memakai ungu, sehingga shell belum sepenuhnya sewarna mockup.
- Menu masih memakai grup dan ikon dari modul saat ini, bukan struktur menu mockup.

## 9. Kesimpulan

Sidebar Admin Desa kini navy dengan identitas desa dan item aktif ungu, serta topbar desa menampilkan breadcrumb, tanpa perubahan pada konsol Super Admin. Lint dan typecheck lolos. Pekerjaan siap review lokal; belum di-push sesuai instruksi.

## 10. Langkah berikutnya

1. Pemeriksaan visual `/beranda` desktop + mobile, lalu koreksi kontras/lebar bila perlu.
2. Putuskan palet aksi (ungu mengikuti mockup atau biru mengikuti design system) sebelum menyentuh tombol dan kartu.
3. Lanjutkan komponen isi halaman: KPI dan panel beranda mengikuti mockup, setelah shell disetujui.
