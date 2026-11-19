# Audit Implementasi UI Admin Desa terhadap Dokumen Desain

- **Task:** membandingkan implementasi UI Admin Desa pada `origin/main` dengan `DESIGN-SYSTEM.md`, `ADMIN-PLATFORM-DESIGN.md`, `SID_FEATURE_MAP.md`, sepuluh mockup `docs/mockups/village/`, serta laporan implementasi terkait, lalu mencatat selisih yang belum terdokumentasi.
- **Tanggal:** 19 November 2026
- **Branch:** `task/admin-desa-ui-audit`
- **Base commit:** `92e1a90` (`origin/main`, setelah PR #158)
- **Sifat:** audit **report-only**. Tidak ada perubahan source code, schema, migration, konfigurasi, atau data pada task ini.
- **Status:** siap review sebagai laporan audit.

## 1. Tujuan dan batas

Audit ini menjawab satu pertanyaan: **apakah UI Admin Desa yang sudah dibangun sesuai dengan dokumen desain dan mockup yang menjadi acuannya, dan di mana selisihnya?**

Aturan yang dipakai agar tidak salah menilai:

1. Selisih yang sudah dinyatakan sebagai keputusan bertahap di laporan implementasi **bukan defect**. Selisih seperti itu dicatat di §6 sebagai konteks, bukan temuan.
2. Temuan hanya memuat selisih yang **belum tercatat** sebagai keputusan, atau konflik antar-dokumen yang membuat kontrak visual tidak jelas.
3. Baseline adalah `origin/main`. Tambahan form penduduk yang masih berada di PR #159 dicatat terpisah dan tidak dicampur ke status baseline.
4. Tidak ada klaim kesesuaian visual pixel-level: audit ini statis (kode + gambar mockup), tanpa runtime browser.

## 2. Metode dan bukti

- Sepuluh PNG `docs/mockups/village/` dibaca lewat contact sheet 480 × 950 yang dibuat sementara dengan `sharp` (library yang sudah ada di `node_modules`), lalu file sementara dihapus. Aset sumber tidak diubah.
- Struktur route diperiksa dari `git ls-tree origin/main 'src/app/(admin)'` dan `RUTE_ADMIN_TERSEDIA` di `src/features/navigation/domain/menu-tampil.ts:18-35`.
- Shell diperiksa di `src/components/shell/admin-sidebar.tsx`, `src/components/shell/admin-topbar.tsx`, `src/app/(admin)/layout.tsx`, dan blok `data-desa` di `src/app/globals.css:3365-3523`.
- Halaman modul diperiksa langsung: `beranda`, `penduduk`, `penduduk/[id]`, `persuratan/surat`, `keuangan`, `konten/berita`, `konten/galeri`, `pengaduan-admin`, `pengaturan/pengguna`, `pengaturan/grup-akses`.
- Dokumen acuan dibaca: `docs/design/DESIGN-SYSTEM.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md`, `docs/SID_FEATURE_MAP.md`, `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md`, `docs/reports/05-ui-audit/ADMIN-SHELL-VILLAGE-MOCKUP-2026-11-19.md`, `docs/reports/05-ui-audit/ADMIN-BERANDA-V1-2026-11-19.md`, `docs/reports/03-core-sid/ADMIN-PENDUDUK-2026-11-19.md`, `docs/reports/03-core-sid/ADMIN-PENGGUNA-HAK-AKSES-2026-11-19.md`.
- **Tidak dilakukan:** menjalankan aplikasi, login tenant, screenshot runtime, pengukuran kontras, uji keyboard nyata, atau pengujian di viewport mobile. Warna mockup tidak di-sampling ulang pada audit ini.

## 3. Baseline dan cakupan halaman

| Kondisi | Isi |
| --- | --- |
| `origin/main` (`92e1a90`) | 17 `page.tsx` admin: **10 halaman Admin Desa** (`beranda`, `penduduk`, `penduduk/[id]`, `persuratan/surat`, `keuangan`, `konten/berita`, `konten/galeri`, `pengaduan-admin`, `pengaturan/pengguna`, `pengaturan/grup-akses`) dan 7 halaman konsol platform |
| `RUTE_ADMIN_TERSEDIA` | 16 entri: 9 rute desa + `/beranda` + 7 rute platform (`menu-tampil.ts:18-35`) |
| PR #159 (masih terbuka) | Menambah `/penduduk/baru` dan `/penduduk/[id]/ubah`, sehingga Admin Desa menjadi 12 halaman; tidak mengubah halaman yang dibahas di §5 |

`docs/SID_FEATURE_MAP.md` pada `origin/main` sudah menyebut angka 17/10 dan 16 rute, jadi bagian ini **konsisten** dengan kode.

## 4. Matriks mockup terhadap implementasi `origin/main`

Status: **Selaras** (komponen inti mockup ada), **Sebagian** (pola inti ada, beberapa elemen mockup belum), **Baca-saja** (halaman ada tetapi hanya daftar), **Belum ada**.

| # | Mockup | Halaman | Status | Catatan bukti |
| ---: | --- | --- | --- | --- |
| 1 | Beranda | `/beranda` | **Selaras** untuk pola inti | 4 KPI + chip, tab statistik penduduk, grafik tren 6 bulan, daftar permohonan, timeline aktivitas, 6 akses cepat, kartu profil desa (`beranda/page.tsx:272-515`) |
| 2 | Data Penduduk | `/penduduk` | **Sebagian** | KPI, pencarian, filter, paginasi server-side, detail, CSV, tambah/ubah (PR #159). Tab Kartu Keluarga/Mutasi/Statistik dan panel detail samping belum ada |
| 3 | Statistik Penduduk | `/penduduk` (tab statistik beranda) | **Belum ada** sebagai halaman | Agregasi umur/dusun ada untuk beranda; halaman statistik penduduk tersendiri belum ada |
| 4 | Administrasi Surat | `/persuratan/surat` | **Baca-saja** | Tabel nomor/jenis/pemohon/tanggal/status; tanpa KPI, tab, filter, rail, aksi buat/arsip/template |
| 5 | Berita & Informasi | `/konten/berita` | **Baca-saja** | Daftar judul/kategori/terbit; tanpa tab pengumuman/agenda/galeri/video, statistik publikasi, rail pratinjau |
| 6 | Pemerintahan Desa | — | **Belum ada** | Tidak ada `page.tsx` |
| 7 | Transparansi APBDes | `/keuangan` | **Baca-saja** | Tabel APBDes tahun berjalan; tanpa tahun anggaran, KPI, grafik, donut, kegiatan prioritas |
| 8 | Pengaduan Masyarakat | `/pengaduan-admin` | **Baca-saja** | Daftar tiket/judul/pelapor/masuk/status; tanpa KPI, kategori, statistik, tanggapan |
| 9 | Pengaturan Desa | — | **Belum ada** | Tidak ada `page.tsx` |
| 10 | Manajemen Pengguna & Hak Akses | `/pengaturan/pengguna`, `/pengaturan/grup-akses` | **Sebagian** | KPI (tanpa "Diblokir"), tab, tabel, rail role/donut/aktivitas, CRUD, editor izin; pencarian/filter/paginasi client-side |

Status "Baca-saja" dan "Belum ada" di atas **sudah dinyatakan** di `SID_FEATURE_MAP.md` §1 ("`keuangan`, `konten/berita`, `konten/galeri`, `persuratan/surat`, dan `pengaduan-admin` yang masih baca-saja tanpa form") dan di `REVIEW-MOCKUP-ADMIN-DESA` §9. Karena itu tidak dihitung sebagai defect pada audit ini.

## 5. Temuan

Temuan diurutkan berdasarkan dampak. Setiap temuan menyertakan bukti baris pada `origin/main`.

### F1 — Breadcrumb menandai "Dashboard" sebagai halaman aktif di semua halaman modul (Medium)

**Bukti**

- `src/components/shell/admin-topbar.tsx:19-21` — `LABEL_HALAMAN_DESA` hanya berisi `"/beranda": "Beranda"`.
- `src/components/shell/admin-topbar.tsx:34` — label lain menghasilkan `null`.
- `src/components/shell/admin-topbar.tsx:59-69` — bila label `null`, breadcrumb hanya merender satu `<li>` berisi `<span aria-current="page">Dashboard</span>`.

**Dampak:** pada `/penduduk`, `/keuangan`, `/persuratan/surat`, `/pengaduan-admin`, `/konten/*`, `/pengaturan/*`, dan `/penduduk/[id]`, pengguna melihat "Dashboard" sebagai halaman aktif padahal sedang berada di modul lain. Ini juga salah bagi pembaca layar karena `aria-current="page"` menunjuk halaman yang salah. Pada layar ≤480 px, aturan `globals.css:3510-3522` menyembunyikan semua item kecuali yang terakhir, sehingga teks "Dashboard" itu satu-satunya jejak konteks yang tersisa.

**Kontradiksi dokumen**

- `DESIGN-SYSTEM.md` §5: komponen Breadcrumb wajib punya "hierarchy dan current page"; §6.3 dashboard administrasi mensyaratkan "Page title, breadcrumb, dan primary action".
- `ADMIN-PLATFORM-DESIGN.md` §2 Shell masih menyebut topbar menampilkan konteks nama desa, padahal `AdminTopbar` tidak lagi menerima `villageName` (dipindah ke sidebar pada `97f00e5`).
- `ADMIN-SHELL-VILLAGE-MOCKUP-2026-11-19.md` §2 butir 3 menyatakan entri ditambahkan "saat halamannya dibuat". Sembilan halaman desa sudah ada di `origin/main`, tetapi peta label belum diperbarui, dan penundaan ini tidak tercatat sebagai risiko tersisa.

**Rekomendasi:** lengkapi `LABEL_HALAMAN_DESA` untuk seluruh rute desa yang ada (termasuk pola detail seperti `/penduduk/[id]`), atau turunkan label dari `menu` yang sudah dimuat `layout.tsx` agar tidak ada dua sumber kebenaran. Tambahkan test kecil untuk peta label.

### F2 — Kontrak token aksi ungu bertentangan dengan tombol primer yang masih biru (Medium, konflik dokumen vs kode)

**Bukti**

- `src/app/globals.css:10-15` — token `--color-action: #7a20f0`, `--color-action-strong`, `--color-action-soft`, `--color-action-border` dengan komentar "Warna aksi Admin Desa mengikuti mockup `village/`".
- `src/app/globals.css:278-285` — `.button-primary` memakai `--color-brand` (`#0b65f5`), bukan `--color-action`.
- `var(--color-action)` hanya dipakai di blok `.beranda-*` (10 kemunculan, baris 3577-4113) dan item sidebar aktif memakai gradien ungu literal (`globals.css:3418-3423`).
- Pada `origin/main`, tombol `button button-primary` di area desa ada di `penduduk/page.tsx:237`, `penduduk/error.tsx:21`, `pengaturan/pengguna/dialog-pengguna.tsx:196`, `pengaturan/grup-akses/dialog-role.tsx:91`, dan `form-izin.tsx:64`. PR #159 menambah `penduduk/page.tsx:111` dan `penduduk/form-penduduk.tsx:468`. Semuanya mewarisi biru `.button-primary`.

**Kontradiksi dokumen**

- `DESIGN-SYSTEM.md` §4.1.1 menyatakan token "Action purple (Admin Desa)" dipakai untuk "Tab aktif, tombol, CTA, dan grafik pada persona desa".
- `ADMIN-SHELL-VILLAGE-MOCKUP-2026-11-19.md` §2 butir 5 menyatakan tombol "tetap memakai token brand biru karena keputusan palet aksi belum diambil".
- Mockup `village/` konsisten menampilkan CTA utama ungu.

Artinya dokumen desain sudah mengadopsi ungu untuk aksi desa, sedangkan kode dan satu laporan masih menyebut keputusan belum diambil. Ini **bukan** sekadar selisih visual: kontrak token tidak dapat dipakai sebagai acuan sampai salah satu dinyatakan berlaku.

**Rekomendasi:** ambil satu keputusan produk, lalu selaraskan keduanya — bila ungu berlaku, ubah `.button-primary` menjadi `var(--color-action)` di dalam konteks `data-desa` (bukan global, agar konsol platform tetap biru); bila biru dipertahankan, koreksi tabel token dan mockup acceptance. Jangan mengubah keduanya tanpa keputusan.

### F3 — `ADMIN-PLATFORM-DESIGN.md` §4 masih menyebut sidebar desa hanya Beranda + Penduduk + Pengaturan (Low, dokumentasi)

**Bukti:** `docs/design/ADMIN-PLATFORM-DESIGN.md:123` menyatakan kelompok menu Data Desa, Persuratan, Keuangan, dan Layanan "masih target, belum fitur yang sudah diimplementasikan". Pada `origin/main`, sidebar desa sudah dapat menautkan `/persuratan/surat`, `/keuangan`, `/konten/berita`, `/konten/galeri`, dan `/pengaduan-admin` (`menu-tampil.ts:18-27`), dan kelima halaman itu ada.

**Dampak:** reviewer dan agen berikutnya dapat menyimpulkan modul tersebut belum punya UI, lalu mengerjakan ulang atau menilai laporan implementasi sebagai tidak sesuai. `SID_FEATURE_MAP.md` sudah benar, sehingga dua dokumen acuan saling bertentangan.

**Rekomendasi:** perbarui §4 agar menyebut 10 halaman desa dan menandai modul yang masih baca-saja.

### F4 — Halaman surat hanya menampilkan halaman 1 dan tidak punya kontrol navigasi (Low, gap lama yang masih terbuka)

**Bukti**

- `src/app/(admin)/persuratan/surat/page.tsx:18` — `listSuratWithMeta({ search: "", status: null, page: 1 })`, tidak membaca `searchParams`.
- `src/app/(admin)/persuratan/surat/page.tsx:66-68` — menampilkan teks "Halaman {page} dari {pageCount}" tanpa tautan sebelumnya/berikutnya.

**Dampak:** pengguna melihat "Halaman 1 dari 5" tanpa cara membuka halaman berikutnya. Ini sudah dicatat sebagai risiko di `ADMIN-BERANDA-V1-2026-11-19.md` §9.6 butir 1, sehingga **bukan temuan baru**; dilaporkan karena `/penduduk` sudah punya paginasi server-side lengkap dan ketidakcocokan kontrol antar-modul makin terlihat. Bila halaman surat menjadi target berikutnya, pola `penduduk/page.tsx` dapat dipakai ulang.

### F5 — Chip pengguna di topbar menampilkan "Pengguna aktif", bukan peran (Low)

**Bukti:** `src/components/shell/admin-topbar.tsx:72-82` — subjudul chip selalu `Pengguna aktif`.

**Dampak:** mockup menampilkan peran ("Operator Desa") di kartu pengguna. Persyaratan `ADMIN-PLATFORM-DESIGN.md` §2 hanya menyebut "identitas pengguna", jadi ini bukan pelanggaran kontrak, tetapi informasi peran sudah tersedia di sesi (`role`) dan lebih berguna bagi operator. Dicatat sebagai penyempurnaan, bukan defect.

### F6 — Tiga halaman memuat seluruh baris tanpa paginasi (Low, skalabilitas)

**Bukti**

- `src/app/(admin)/pengaduan-admin/page.tsx:17` — `listPengaduanData({})`.
- `src/app/(admin)/konten/berita/page.tsx:16` — `listBeritaAdminData()`.
- `src/app/(admin)/konten/galeri/page.tsx:10` — `listGaleriAdminData()`.

**Dampak:** jumlah baris tumbuh tanpa batas pada desa aktif; tabel dan hitungan dirender penuh. Untuk skala desa saat ini masih wajar, tetapi berbeda dari pola paginasi yang sudah dipakai penduduk dan pengguna. Belum tercatat sebagai risiko di laporan terkait. Rekomendasi: tambahkan batas baris atau paginasi saat halaman ini dinaikkan dari baca-saja.

### F7 — Catatan aksesibilitas kecil (Low)

- `src/components/shell/admin-sidebar.tsx:186` — `aria-disabled="true"` dipasang pada `<span>`, bukan kontrol yang dapat difokus. Efeknya nihil; badge "Segera" sudah menyampaikan status. Bila tetap ingin diumumkan, gunakan teks biasa atau `role="link"` dengan `aria-disabled`.
- `src/components/shell/admin-sidebar.tsx:77-86` — `aria-label` berubah menjadi "Tutup navigasi" saat drawer terbuka, tetapi glyph tetap `☰`. Label aksesibel sudah benar; ikon visual tidak berubah sehingga pengguna sighted tidak mendapat isyarat tutup. Bukan pelanggaran WCAG, tetapi menyimpang dari affordance umum.

## 6. Selisih yang sudah tercatat sebagai keputusan bertahap (bukan defect)

Bagian ini memastikan audit tidak mengulang pekerjaan yang sengaja ditunda.

| Selisih | Bukti keputusan |
| --- | --- |
| Submenu sidebar yang dapat dibuka-tutup, kartu pengguna di kaki sidebar, chip tanggal dan lonceng notifikasi di topbar | `ADMIN-SHELL-VILLAGE-MOCKUP-2026-11-19.md` §2 butir 4 dan §6 "Yang belum dikerjakan" |
| Modul keuangan, berita, galeri, surat, pengaduan masih baca-saja tanpa form/aksi | `SID_FEATURE_MAP.md` §1; `REVIEW-MOCKUP-ADMIN-DESA` §9 |
| Tab Kartu Keluarga, Mutasi, dan Statistik pada Data Penduduk | `ADMIN-PENDUDUK-2026-11-19.md` Risiko dan keterbatasan |
| Status "Diblokir" tidak dimodelkan; KPI tidak diisi angka palsu | `ADMIN-PENGGUNA-HAK-AKSES-2026-11-19.md` Kondisi awal dan risiko |
| Pencarian/filter/paginasi pengguna dilakukan client-side | idem, risiko butir 1 |
| Halaman statistik penduduk, pemerintahan desa, dan pengaturan desa belum ada | `REVIEW-MOCKUP-ADMIN-DESA` §5; `SID_FEATURE_MAP.md` §1 |
| Halaman galeri/berita baca-saja karena belum ada use case tulis | `ADMIN-BERANDA-V1` §9.6 butir 2 |

## 7. Kesesuaian yang terverifikasi secara statis

- **Shell desa terkunci pada persona desa.** Sidebar navy, identitas desa, item aktif ungu hanya berlaku pada `data-desa="true"`; konsol platform tidak terpengaruh (`globals.css:3365-3463`, `admin-sidebar.tsx:90-97`).
- **Drawer mobile memenuhi spesifikasi §2 Responsive.** Backdrop, tombol pemicu ber-`aria-expanded`/`aria-controls`, Escape menutup dan mengembalikan fokus, serta focus trap Tab/Shift+Tab (`admin-sidebar.tsx:30-70,74-97`).
- **Beranda sudah mengikuti pola mockup**, bukan placeholder: 4 KPI nyata, donut/tab statistik, grafik tren 6 bulan tanpa dependency chart, daftar permohonan, timeline aktivitas, 6 akses cepat berizin, dan kartu profil desa (`beranda/page.tsx:238-515`).
- **Penduduk (baseline + PR #159)** memakai paginasi server-side dengan filter terbawa di tautan, penyamaran NIK, dan detail lintas tenant menjadi `notFound()` (`penduduk/page.tsx:34-50,70-78,318-345`, `penduduk/[id]/page.tsx:36-46`).
- **Pengguna/grup akses** hanya menawarkan role desa (`pengguna-admin.ts:32-35`), menyembunyikan aksi tanpa izin, dan menandai akun sendiri (`pengguna-console.tsx:142-190`); otorisasi tetap di use case.
- **Halaman baca-saja tetap konsisten secara struktur**: `modul-page` + `page-heading` + `modul-card` + empty state jujur (mis. `keuangan/page.tsx:13-31`).

## 8. Keamanan dan tenant

Audit ini tidak menemukan jalur baru yang memakai `villageId` dari klien pada halaman yang diperiksa:

- Semua halaman memanggil use case yang memakai `requirePermission` + desa dari sesi; `layout.tsx:14-40` melakukan `verifySession` dan menolak akun warga maupun akun tanpa desa yang bukan platform.
- Aksi UI (tambah penduduk, CRUD pengguna) hanya menyembunyikan kontrol; penolakan tetap di use case/server action.
- Detail penduduk lintas tenant tidak membedakan "tidak ada" dan "milik desa lain" (`penduduk/[id]/page.tsx:36-43`).

Catatan: audit ini tidak meninjau ulang seluruh use case secara menyeluruh; temuan keamanan UI berada di luar cakupan dan tidak diklaim sudah bersih.

## 9. Batas verifikasi dan risiko tersisa

1. **Tidak ada runtime.** Tidak ada login, screenshot, atau perbandingan visual di browser. Pernyataan "selaras" hanya berarti komponen dan datanya ada di kode, bukan bahwa tampilannya identik dengan mockup.
2. **Mockup hanya satu varian desktop 1536 × 1024.** Tidak ada acuan mobile/tablet, state kosong, atau error; perilaku responsif diverifikasi dari CSS saja.
3. **Contact sheet berukuran kecil.** Mockup dibaca lewat pratinjau 480 px untuk inventaris pola; teks kecil, ikon, dan pengukuran px tidak diverifikasi ulang.
4. **Kontras, zoom 200%, dan keyboard nyata** tidak diuji.
5. **PR #159 belum di-merge**, sehingga dua halaman form penduduk tidak termasuk baseline audit; laporan ini tidak menilai kualitas form tersebut.
6. Temuan F2 membutuhkan keputusan produk; audit ini tidak memilih salah satu arah.

## 10. Rekomendasi urutan

1. **F1** — lengkapi breadcrumb; ini bug navigasi dan aksesibilitas yang terlihat di semua modul, perbaikannya kecil dan terlokalisasi.
2. **F2** — putuskan palet aksi desa (ungu vs biru), lalu selaraskan token, `.button-primary` dalam konteks `data-desa`, dan dokumen. Tanpa ini, setiap halaman baru akan menambah ketidakpastian.
3. **F3** — perbarui §4 `ADMIN-PLATFORM-DESIGN.md` agar sesuai 10 halaman yang ada.
4. **F6** — tambahkan batas baris/paginasi saat modul baca-saja dinaikkan menjadi modul kelola.
5. **F4** — tambahkan kontrol paginasi surat bila modul surat masuk prioritas berikutnya.
6. **F5/F7** — penyempurnaan topbar dan ikon drawer, dapat digabung ke task UI berikutnya.

Setiap perbaikan sebaiknya menjadi task terpisah dengan laporan sendiri, sesuai `AGENTS.md` §2 butir 2.

## 11. Status

- **File berubah:** hanya laporan ini dan tautannya di indeks laporan. Tidak ada source code, schema, migration, atau data yang diubah.
- **Validasi:** pembacaan PNG (contact sheet), penelusuran route `src/app`, `RUTE_ADMIN_TERSEDIA`, shell, halaman modul, `globals.css`, serta dokumen acuan. Prettier dijalankan pada laporan ini; typecheck/lint/test tidak dijalankan karena tidak ada perubahan kode.
- **Status:** siap review. Belum ada merge atau deploy.
