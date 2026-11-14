# FlexiDesa Design System

> Status: **Draft v0.3 — referensi visual 39 screenshot telah ditinjau melalui contact sheet; login diperiksa pada resolusi penuh dan token awal diturunkan dari bukti visual.**
> Sumber referensi: 39 screenshot di `docs/public/`, `docs/account/`, dan `docs/pendukung/`.

## 1. Tujuan dan aturan sumber kebenaran

Design System ini menjadi kontrak visual bersama untuk website publik desa, area akun/warga, dashboard Admin Desa, dan kelak Super Admin.

Urutan sumber kebenaran:
1. Screenshot halaman yang sesuai di folder `docs/`.
2. Token dan komponen bersama dalam dokumen ini setelah diverifikasi terhadap screenshot.
3. Implementasi komponen UI.
4. Preferensi atau improvisasi individual tidak boleh mengalahkan referensi tanpa keputusan desain tercatat.

**Penting:** screenshot PNG telah diperiksa secara visual. Nilai warna berikut adalah baseline hasil sampling dan pembacaan visual, bukan pengesahan final. Nama font persis tidak dapat dipastikan hanya dari raster; font yang dipilih merupakan padanan visual sementara sampai sumber desain aslinya diketahui.

## 2. Prinsip desain

- **Civic, modern, terpercaya:** tampilan layanan publik yang jelas, tidak terasa seperti template admin generik.
- **Content first:** informasi desa, berita, angka statistik, dan formulir menjadi fokus.
- **Konsisten lintas tenant:** struktur dan komponen sama; identitas desa (logo, nama, foto, aksen tema yang diizinkan) dapat dikonfigurasi.
- **Accessible by default:** kontras, focus state, label formulir, navigasi keyboard, dan ukuran target sentuh diperhatikan.
- **Responsive:** mulai dari mobile untuk halaman warga; dashboard tetap nyaman pada tablet dan desktop.
- **State lengkap:** setiap komponen interaktif memiliki default, hover, focus, active, disabled, loading, empty, success, dan error state sesuai konteks.

## 3. Produk dan konteks visual

| Surface | Pengguna | Karakter |
|---|---|---|
| Website publik desa | Masyarakat umum | Informatif, ramah, mudah dibaca, navigasi sederhana |
| Akun/layanan mandiri | Warga terautentikasi | Fokus tugas, form jelas, status permohonan mudah dipahami |
| Admin Desa | Perangkat/operator desa | Padat informasi tetapi terstruktur; tabel, filter, aksi, dan status konsisten |
| Super Admin platform | Operator FlexiDesa | Operasional multi-tenant; harus dibedakan dari Admin Desa |

Jangan mencampur navigasi atau hak akses antar-surface hanya karena komponen visualnya sama.

## 4. Token semantik

Gunakan nama token semantik, bukan nilai warna langsung yang tersebar di komponen. Nilai aktual ditetapkan setelah sampling visual semua kelompok screenshot.

### 4.1 Warna

| Token | Kegunaan |
|---|---|
| `--color-brand` | Aksi utama dan identitas platform |
| `--color-brand-foreground` | Teks/icon di atas warna brand |
| `--color-accent` | Aksen sekunder yang muncul pada referensi |
| `--color-background` | Latar halaman |
| `--color-surface` | Kartu, panel, dropdown |
| `--color-surface-muted` | Area sekunder/terkelompok |
| `--color-text` | Teks utama |
| `--color-text-muted` | Teks bantuan dan metadata |
| `--color-border` | Garis pemisah dan outline |
| `--color-success` | Status berhasil |
| `--color-warning` | Status perlu perhatian |
| `--color-danger` | Error, destruktif, atau risiko |
| `--color-info` | Informasi netral |

Persyaratan:
- Sediakan pasangan foreground/background yang lolos pemeriksaan kontras WCAG AA untuk teks normal.
- Status tidak boleh dibedakan dengan warna saja; sertakan label/icon.
- Warna tenant dibatasi pada token/slot tema yang aman; tenant tidak boleh mengubah warna status semantik.
- Dark theme hanya diterapkan bila screenshot/keputusan produk menetapkannya; jangan mengasumsikan seluruh aplikasi harus dark.

### 4.1.1 Baseline warna hasil inspeksi screenshot

Referensi yang diperiksa: `docs/account/Modern Indonesian Village Login Portal.png` (1199 × 1312), `docs/public/Sistem Informasi Desa Suka Maju.png` (1024 × 1536), dan `docs/pendukung/SID Desa Sukamaju 404 Page.png` (1536 × 1024). Sampel pixel login mengonfirmasi biru hero sekitar `#0387FE`, ungu sekitar `#A776FC`, tombol sekitar `#0166FE`, dan footer sekitar `#0D2136`.

| Peran | Baseline CSS | Bukti/pemakaian |
|---|---|---|
| Brand/action blue | `#0B65F5` | Tombol utama, link, ikon aktif; didekatkan ke biru tombol referensi |
| Brand blue strong | `#064FC9` | Hover/pressed |
| Accent purple | `#8A58F5` | Gradient hero dan aksen sekunder |
| Accent soft | `#F1ECFF` | Panel aksen lembut |
| Page background | `#F4F8FE` | Latar halaman |
| Footer navy | `#0D2136` | Footer gelap pada referensi publik/login/pendukung |
| Main text | `#111A3B` | Heading dan teks utama |
| Muted text | `#58688B` | Deskripsi dan metadata |
| Border | `#DCE4F5` | Outline input, divider, card |

Nilai tersebut adalah token baseline v0.3; tetap lakukan contrast check dan screenshot comparison sebelum status stable.

### 4.1.2 Aset visual reusable

Aset vektor halaman login disimpan di `public/images/` dan dipakai ulang melalui path statis:
- `flexidesa-mark.svg`: simbol brand platform.
- `login-security.svg`: ilustrasi keamanan di kartu login.
- `benefit-fast.svg`, `benefit-secure.svg`, `benefit-services.svg`, `benefit-devices.svg`: ikon empat manfaat layanan.

Aset ini adalah aset implementasi FlexiDesa, bukan klaim bahwa logo/ilustrasi tersebut merupakan file sumber dari desain referensi. Identitas logo desa/tenant yang resmi harus tetap berasal dari konfigurasi tenant.

### 4.2 Tipografi

Token ukuran yang perlu distandarkan:

| Token | Penggunaan |
|---|---|
| `--font-size-xs` | Label tambahan, timestamp |
| `--font-size-sm` | Metadata, helper text |
| `--font-size-base` | Isi utama dan form |
| `--font-size-lg` | Subheading |
| `--font-size-xl` | Heading section |
| `--font-size-2xl` | Page title |
| `--font-size-display` | Hero/angka utama yang memang menonjol |

Aturan: gunakan hierarchy konsisten, line-height nyaman, panjang baris terkendali untuk artikel, dan jangan menggunakan banyak jenis font. Screenshot memakai sans-serif geometris tebal. Karena nama font tidak dapat diidentifikasi pasti dari PNG, implementasi memakai DM Sans untuk body dan Plus Jakarta Sans untuk heading sebagai padanan visual sementara.

### 4.3 Spacing, layout, dan breakpoint

Gunakan skala spacing berbasis kelipatan 4 px sebagai kandidat awal, lalu validasi dengan screenshot:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Layout:
- Publik: container terpusat, grid konten responsif, whitespace cukup.
- Admin: shell navigasi + area konten; tabel tidak memaksa viewport mobile melebar tanpa kontrol.
- Form: label, field, helper/error, dan action dikelompokkan rapat secara konsisten.
- Hindari menetapkan lebar tetap untuk seluruh halaman.

Breakpoint harus mengikuti kebutuhan konten dan diuji pada viewport kecil, sedang, dan lebar; angka final disepakati ketika implementasi layout dimulai.

### 4.4 Radius, border, elevation

Gunakan token:
- `--radius-control`
- `--radius-card`
- `--radius-dialog`
- `--border-default`
- `--shadow-card`
- `--shadow-overlay`

Hindari shadow dekoratif berlebihan. Nilai radius dan elevation final harus diturunkan dari screenshot yang telah diaudit.

## 5. Komponen bersama

Komponen berikut perlu satu implementasi bersama dan API konsisten. Jangan membuat versi berbeda per modul kecuali ada kebutuhan visual yang terbukti.

| Komponen | Variasi/state minimum |
|---|---|
| Button | primary, secondary, outline, ghost, danger; loading/disabled |
| Link | default, hover, focus, visited bila relevan |
| Text input | default, focus, invalid, disabled, read-only |
| Textarea | default, focus, invalid, disabled |
| Select/combobox | closed, open, selected, empty, invalid |
| Checkbox/radio/switch | checked, unchecked, disabled, focus |
| Form field | label, required, helper, error |
| Card/panel | default, interactive bila diperlukan |
| Badge/status | success, warning, danger, info, neutral |
| Alert/notice | info, success, warning, danger |
| Table | loading, empty, populated, pagination, responsive |
| Tabs | active, inactive, keyboard focus |
| Breadcrumb | hierarchy dan current page |
| Dropdown/menu | open/closed, keyboard navigation |
| Dialog/drawer | open/close, focus trap, escape |
| Toast | success/error/info; tidak untuk pesan permanen |
| Pagination | current, disabled, previous/next |
| Search/filter bar | query, clear, filter active |
| File upload | idle, uploading, success, error |
| Empty state | pesan dan next action yang relevan |
| Skeleton/loading | bentuk mendekati konten aktual |
| Confirmation | aksi destruktif dengan konteks jelas |

## 6. Pola halaman

### 6.1 Website publik
- Header dan navigasi utama.
- Hero/intro sesuai halaman, bukan selalu hero besar.
- Breadcrumb pada halaman dalam.
- Konten utama dengan hierarchy yang jelas.
- Sidebar hanya bila membantu navigasi/konteks.
- Footer dengan identitas dan tautan resmi desa.

### 6.2 Akun dan layanan warga
- Layout fokus pada tugas, tidak terlalu banyak navigasi.
- Form dibagi menjadi langkah/kelompok jika panjang.
- Tampilkan syarat, status, nomor referensi, dan riwayat secara jelas.
- Hindari menampilkan data pribadi sensitif pada halaman publik.

### 6.3 Dashboard administrasi
- Sidebar/topbar konsisten.
- Page title, breadcrumb, dan primary action.
- Ringkasan KPI hanya bila membantu tugas.
- Filter dan tabel konsisten lintas modul.
- Aksi berisiko perlu konfirmasi dan audit.
- Data sensitif harus mengikuti permission; menyembunyikan tombol bukan kontrol keamanan.

### 6.4 Halaman sistem
404, maintenance, forbidden, pencarian, kebijakan privasi, dan syarat ketentuan memakai shell yang konsisten tetapi sesuai konteks.

## 7. Aksesibilitas dan kualitas

- Semua kontrol memiliki accessible name/label.
- Focus keyboard terlihat dan tidak tertutup sticky header/dialog.
- Kontras teks normal minimal WCAG AA.
- Error form terhubung ke field yang relevan dan dijelaskan dengan teks.
- Jangan mengandalkan placeholder sebagai label.
- Dialog mengelola focus dan mengembalikan focus saat ditutup.
- Target sentuh mobile cukup besar dan memiliki jarak.
- Tabel kompleks memiliki alternatif responsif yang masuk akal.
- Uji zoom 200% dan reduced motion.

## 8. Aturan implementasi

1. Token disimpan terpusat; hindari warna, radius, dan spacing hard-coded per halaman.
2. Komponen dasar tidak mengetahui aturan bisnis desa.
3. Komponen feature boleh menggabungkan komponen dasar tetapi tidak menduplikasi primitive.
4. Konten, identitas desa, dan tema tenant berasal dari konfigurasi terverifikasi.
5. Semua halaman privat tetap memeriksa session, permission, dan tenant di server; UI bukan batas keamanan.
6. Screenshot test/visual regression menggunakan fixture sintetis dan tidak memuat data warga asli.
7. Perbedaan desain dari screenshot harus dicatat pada matriks implementasi.

## 9. Gerbang pengesahan token final

Sebelum mengubah status dokumen menjadi stable:
- Audit minimal 3 screenshot representatif per kelompok (publik, akun, pendukung) dan seluruh screenshot yang memiliki pola unik.
- Catat warna, font, ukuran, grid, radius, shadow, ikon, dan breakpoint yang terlihat.
- Tentukan komponen yang benar-benar berulang.
- Uji kontras dan responsive behavior.
- Minta review desain/produk dan update tabel token dengan nilai aktual.

## 10. Status dan keputusan implementasi (14 November 2026)

| Area | Status |
|---|---|
| Inventaris screenshot | 39 file terdaftar: 21 publik, 11 akun, 7 pendukung |
| Audit struktur repository | Dilakukan pada `main` `681753b`; halaman UI aktif: `/masuk`, `/beranda`, `/super-admin` |
| Audit visual referensi | Contact sheet 39 PNG ditinjau; login, beranda publik, dan 404 diperiksa pada resolusi penuh |
| Prinsip dan semantik token | Draft; dapat dipakai sebagai kontrak semantik |
| Baseline warna | Draft v0.3 diturunkan dari sampel visual; perlu contrast check dan browser comparison |
| Komponen bersama | Spesifikasi awal; perlu visual review dan konsolidasi |
| Admin Desa dan Super Admin | Tidak memiliki screenshot khusus; perlu keputusan produk yang dicatat terpisah dari referensi screenshot |
| Responsive rules final | Belum diverifikasi pada viewport desktop/mobile |
| Visual regression baseline | Belum dibuat; perlu runtime browser dan fixture sintetis |

### 10.1 Temuan kode yang harus ditindaklanjuti

- `src/app/globals.css` mengimpor DM Sans dan Plus Jakarta Sans, tetapi `--font-sans` dan `--font-display` masih menggunakan Segoe UI/Arial. Jangan memilih salah satunya sebagai final sebelum font referensi dibaca dari PNG.
- Login memakai split layout pada desktop dan menyembunyikan panel visual pada breakpoint 900px. Perlu dibandingkan dengan mockup, khususnya apakah panel/brand tetap harus hadir pada mobile.
- Dashboard Admin dan Super Admin saat ini memakai satu admin shell. Perbedaan label dan navigasi sudah ada, tetapi visual hierarchy kedua persona belum melalui design review.

### 10.2 Gate sebelum status Stable

1. Render dan periksa 39 PNG asli; catat ukuran, viewport, warna, tipografi, grid, radius, shadow, ikon, dan elemen berulang.
2. Audit minimal tiga referensi representatif per kelompok serta seluruh pola unik.
3. Revisi token hanya berdasarkan hasil inspeksi; sertakan nilai dan bukti referensi.
4. Bandingkan `/masuk` dengan screenshot login pada ukuran viewport yang sama.
5. Buat spesifikasi visual Admin Desa dan Super Admin sebagai keputusan produk baru karena tidak ada screenshot khusus.
6. Jalankan aplikasi pada browser, ambil screenshot desktop dan mobile, lalu lakukan visual comparison.
7. Perbarui matriks dengan status `implemented`, `visually reviewed`, atau `accepted` hanya jika bukti tersedia.
