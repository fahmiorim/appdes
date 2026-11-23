# Spesifikasi Layar Admin Desa — 12 Halaman Aktif

> Status: **Draft 1 — 19 November 2026; snapshot historis per 23 November 2026.**
> Cakupan: 12 route Admin Desa yang sudah memiliki `page.tsx` pada branch `task/docs-implementation-audit` (base `36c595e`).
> Dokumen ini adalah spesifikasi desain dan pemetaan implementasi, bukan acceptance test, bukan bukti bahwa seluruh mockup sudah setara, dan bukan izin untuk mengubah kode di luar task.
>
> **Jangan dibaca sebagai status terkini.** Per 23 November 2026 ada 89 halaman Admin Desa non-super-admin, dan beberapa status di bawah sudah berubah (mis. Keuangan dan Galeri kini memiliki alur tulis, sedangkan Berita masih baca-saja). Gunakan dokumen ini untuk acuan layout, data, permission, dan test per layar; status route terbaru ada di [SID_FEATURE_MAP](../SID_FEATURE_MAP.md) dan [MODULE-INVENTORY](../architecture/MODULE-INVENTORY.md).

## 1. Tujuan dan batas

Dokumen ini menjawab satu pertanyaan: **untuk setiap halaman Admin Desa yang sudah ada, apa yang harus terlihat, data apa yang dipakai, siapa yang boleh mengakses, dan di mana batas antara implementasi sekarang dengan mockup acuan?**

Yang termasuk:

- 7 halaman utama: Beranda, Data Penduduk, Keuangan, Berita, Galeri, Administrasi Surat, Pengaduan.
- 3 subhalaman penduduk: detail, tambah, ubah.
- 2 halaman pengaturan: Manajemen Pengguna dan Hak Akses/Grup.

Yang tidak termasuk:

- 34 layar desa yang belum memiliki halaman.
- 39 layar Super Admin.
- Perubahan source code, schema, migration, data, atau aset mockup.
- Klaim fidelity piksel. Mockup ditinjau dari salinan 1200 x 800; warna di bawah berasal dari CSS implementasi dan token desain, bukan sampling ulang seluruh layar.

Urutan sumber kebenaran:

1. Screenshot mockup yang ditautkan pada setiap layar.
2. Token dan komponen di [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md).
3. Shell dan batasan di [`ADMIN-PLATFORM-DESIGN.md`](./ADMIN-PLATFORM-DESIGN.md).
4. Implementasi `page.tsx`, use case, repository, dan schema yang disebut pada dokumen ini.
5. Mockup adalah arah visual. Angka, nama, dan isi tabel pada mockup adalah ilustrasi, bukan fixture atau acceptance data.

## 2. Ringkasan 12 layar

| No | Route | Judul halaman | Modul | Mockup acuan | Status implementasi |
|---:|---|---|---|---|---|
| 1 | `/beranda` | Dashboard Admin Desa | `beranda` | [#46](#mockup-46) | Dinamis, baca |
| 2 | `/penduduk` | Data Penduduk | `penduduk` | [#8](#mockup-8), pendukung [#7](#mockup-7) | Dinamis, baca + tambah/ubah |
| 3 | `/penduduk/[id]` | Detail Penduduk | `penduduk` | Turunan [#8](#mockup-8) | Dinamis, baca |
| 4 | `/penduduk/baru` | Tambah Penduduk | `penduduk` | Turunan [#8](#mockup-8) | Form tulis |
| 5 | `/penduduk/[id]/ubah` | Ubah Data Penduduk | `penduduk` | Turunan [#8](#mockup-8) | Form tulis |
| 6 | `/keuangan` | Keuangan Desa | `keuangan` | [#30](#mockup-30), pendukung [#29](#mockup-29) | Baca-saja |
| 7 | `/konten/berita` | Berita Desa | `berita` | [#5](#mockup-5) | Baca-saja |
| 8 | `/konten/galeri` | Galeri Desa | `galeri` | [#5](#mockup-5) | Baca-saja |
| 9 | `/persuratan/surat` | Administrasi Surat | `surat` | [#12](#mockup-12) | Baca-saja |
| 10 | `/pengaduan-admin` | Pengaduan Warga | `pengaduan` | Tidak ada mockup khusus; [#19](#mockup-19) dan [#17](#mockup-17) hanya referensi | Baca-saja |
| 11 | `/pengaturan/pengguna` | Manajemen Pengguna & Hak Akses | `pengguna` | [#42](#mockup-42), pendukung [#44](#mockup-44) | Dinamis, baca + CRUD |
| 12 | `/pengaturan/grup-akses` | Hak Akses & Permission | `grup-akses` | [#43](#mockup-43) | Dinamis, baca + CRUD + izin |

Pada snapshot 19 November, lima halaman baca-saja adalah Keuangan, Berita, Galeri, Administrasi Surat, dan Pengaduan. Per 23 November 2026, kelima area itu sudah memiliki modul dan grant di template tenant. Modul dan grant hanya membuka akses sisi server; kedalaman alur tulis tetap mengikuti status per halaman pada tabel ini dan inventaris modul, bukan otomatis menjadi CRUD lengkap.

## 3. Aturan lintas layar

### 3.1 Shell dan layout

- Shell Admin Desa: sidebar kiri, topbar dengan breadcrumb/identitas pengguna, lalu area konten `admin-main`.
- Judul dan deskripsi halaman berada di `page-heading` di area konten, bukan di topbar.
- Halaman memakai `modul-page`; kartu memakai `platform-card` atau varian kartu halaman.
- Grid KPI desktop: 4 kolom untuk Beranda/Penduduk/Pengguna, 3 kolom untuk Grup Akses.
- Grid konten utama: 2 kolom pada desktop; tabel panjang memakai `modul-scroll` atau `tenant-table-scroll`.
- Form penduduk memakai grid 2 kolom; field alamat dapat melebar satu baris; aksi form rata kanan.
- Pada layar sempit, grid KPI dan grid konten turun menjadi satu kolom, tabel dapat digeser horizontal, dan tombol form dapat menjadi selebar container. Jangan mengandalkan hover untuk informasi penting.

### 3.2 Token warna dan aset

| Peran | Nilai/token | Pemakaian |
|---|---|---|
| Aksi desa | `--color-action` `#7A20F0` | Tombol utama, tab aktif, tautan aksi, grafik |
| Aksi desa hover | `--color-action-strong` `#6512CF` | Hover/pressed |
| Aksi desa lembut | `--color-action-soft` `#EDE1FF` | Chip ungu, latar ikon |
| Border aksi | `--color-action-border` `#DCC6FF` | Outline ikon/chip |
| Brand/info | `--color-brand` `#0B65F5` | Informasi, tautan, segmen laki-laki |
| Latar halaman | `--color-background` `#F4F8FE` | Kanvas |
| Permukaan | `--color-surface` `#FFFFFF` | Kartu, dialog, tabel |
| Teks utama | `--color-text` `#111A3B` | Heading dan isi |
| Teks muted | `--color-text-muted` `#58688B` | Metadata dan helper |
| Border | `--color-border` `#DCE4F5` | Input, divider, kartu |
| Sukses | `--color-success` `#16845B` | Status selesai/aktif |
| Peringatan | `--color-warning` `#A96A08` | Status menunggu/perlu perhatian |
| Bahaya | `--color-danger` `#C23B48` | Status ditolak/penghapusan |
| Donut kosong | `#E6E9F4` | Tidak ada data |
| Donut pengguna | `#16A36A` aktif, `#F0A020` nonaktif | Statistik pengguna |

Palet grafik penduduk yang benar-benar dipakai: `#7A20F0`, `#0B65F5`, `#0F9D8A`, `#F5A524`, `#EC4899`, `#64748B`, `#94A3B8`. Grid grafik tren: `#E8ECF7`; label sumbu: `#7C88A6`; garis/area: `#7A20F0`.

Aset:

- Logo desa berasal dari `villages.logo`; fallback `/images/logo.png`.
- Ikon KPI memakai `StatIcon` atau SVG inline; tidak ada foto produk pada 12 halaman.
- Mockup menampilkan thumbnail berita, foto galeri, foto kegiatan, dan avatar. Implementasi 12 halaman belum menampilkan aset tersebut kecuali logo desa dan inisial avatar pengguna.
- Jangan menambahkan aset dekoratif baru tanpa keputusan desain; halaman baca-saja tidak perlu ilustrasi untuk menutupi tabel kosong.

### 3.3 Permission dan tenant

Istilah UI dipetakan ke model akses sebagai berikut:

| Aksi UI | Action server | Access level | Contoh |
|---|---|---|---|
| Baca daftar/detail | `read` | `read` | membuka halaman, mencari, mengekspor |
| Tambah/Ubah | `update` | `write` | form penduduk, CRUD pengguna/role |
| Hapus | `delete` | `manage` | hapus pengguna/role, hapus pengaduan |

Aturan:

- Permission diperiksa di use case/server action, bukan hanya dengan menyembunyikan tombol.
- `villageId` selalu berasal dari sesi yang sudah diverifikasi (`resolveVillageId`) atau host tepercaya untuk halaman publik. `villageId`, `roleId`, dan ID entitas dari body/query tidak menjadi bukti otorisasi.
- Role yang ditampilkan untuk pengguna desa harus milik desa sesi. Role platform (`super-admin`) tidak boleh ditawarkan atau dipakai.
- Role sistem tidak boleh diubah/dihapus; matriks izinnya hanya baca.
- Pengguna tidak boleh menghapus akun sendiri; role dan status akun sendiri tidak dapat diubah dari dialog.
- Halaman Beranda hanya memanggil `verifySession()` dan mengalihkan pengguna platform ke `/super-admin`; tidak ada `requirePermission("beranda", "read")` di page. Ini perlu diverifikasi sebagai keputusan produk, bukan diasumsikan sebagai kontrol modul.
- Halaman baca-saja tetap memeriksa permission resource masing-masing di use case: `keuangan`, `berita`, `galeri`, `surat`, `pengaduan`.

### 3.4 Data sensitif

- NIK disamarkan pada daftar dan detail dengan pola enam digit awal, enam titik, dua digit akhir. NIK lengkap hanya muncul pada form tambah/ubah yang membutuhkan izin tulis.
- NIK orang tua juga disamarkan pada detail.
- Pengaduan menyimpan salinan nama, NIK, telepon, email, dan alamat pelapor. Daftar admin hanya menampilkan nama pelapor; detail belum dibangun. Saat detail dibangun, data tersebut harus mengikuti least privilege dan tidak boleh masuk log/analytics.
- Audit trail tidak boleh memuat kata sandi, token, atau NIK lengkap; gunakan nama/resource ID seperlunya.
- Jangan memakai data penduduk asli pada fixture, screenshot, atau laporan.

### 3.5 State dan komponen

- Empty state memakai `modul-empty` dengan kalimat yang menjelaskan langkah berikutnya.
- Tombol simpan menampilkan `Menyimpan...` dan disabled saat pending.
- Error form ditampilkan per field; error aksi ditampilkan sebagai alert dan tidak membocorkan detail internal.
- Dialog destruktif menjelaskan dampak dan tidak boleh menjadi satu-satunya konfirmasi untuk aksi massal.
- Pagination Penduduk dan Pengguna 10 baris/halaman; Surat memakai default use case 20 baris/halaman.
- Halaman di luar rentang Penduduk diarahkan ke halaman terakhir, bukan menampilkan tabel kosong.
- Status tidak boleh dibedakan hanya dengan warna; chip selalu memiliki label teks.

## 4. Peta backend ringkas

| Route | Page loader | Use case/action | Repository utama | Tabel utama | Permission |
|---|---|---|---|---|---|
| `/beranda` | `AdminHomePage` | `dashboardStats`, `dashboardStatistikUmur`, `dashboardTrenPermohonan`, `dashboardPermohonanTerbaru`, `dashboardAktivitasTerbaru`, `getStatistikDesa`, `getIdentitasDesaUseCase` | `dashboard-repository`, `statistik-desa-repository`, `desa-repository` | `residents`, `families`, `pengaduan`, `permohonan_surat`, `audit_logs`, `users`, `villages`, `regions` | `verifySession`; modul `beranda` untuk menu |
| `/penduduk` | `PendudukPage` | `getRingkasanPendudukData`, `getPendudukFilterOptionsData`, `listPenduduk` | `penduduk-repository`, `wilayah-repository` | `residents`, `families`, `regions`, `religions` | `penduduk:read`; tombol tambah `write` |
| `/penduduk/[id]` | `PendudukDetailPage` | `getPendudukDetailData` | `penduduk-repository` | `residents`, `families`, `regions`, katalog referensi | `penduduk:read`; tombol ubah `write` |
| `/penduduk/baru` | `TambahPendudukPage` | `getPendudukFormData`, `buatPendudukAction` -> `createPenduduk` | `penduduk-repository`, `reference-repository` | `residents`, `families`, `regions`, `family_member_logs`, `audit_logs` | `penduduk:write` |
| `/penduduk/[id]/ubah` | `UbahPendudukPage` | `getPendudukFormData`, `ubahPendudukAction` -> `updatePenduduk` | `penduduk-repository`, `reference-repository` | sama dengan tambah | `penduduk:write` |
| `/keuangan` | `KeuanganPage` | `listKeuangan` | `keuangan-repository` | `keuangan`, `keuangan_template` | `keuangan:read` |
| `/konten/berita` | `BeritaAdminPage` | `listBeritaAdminData` | `content-repository` | `berita`, `berita_kategori` | `berita:read` |
| `/konten/galeri` | `GaleriAdminPage` | `listGaleriAdminData` | `content-repository` | `galeri_album`, `galeri_foto` | `galeri:read` |
| `/persuratan/surat` | `SuratPage` | `listSuratWithMeta` | `surat-repository` | `letters`, `letter_types`, `residents` | `surat:read` |
| `/pengaduan-admin` | `PengaduanAdminPage` | `listPengaduanData` | `pengaduan-repository` | `pengaduan`, `users` | `pengaduan:read` |
| `/pengaturan/pengguna` | `PenggunaPage` | `getPenggunaAdminData`, `getAuditLogPageData`; aksi pengguna | `pengguna-repository`, `audit-repository` | `users`, `accounts`, `roles`, `audit_logs` | `pengguna:read/write/manage`; audit `read` |
| `/pengaturan/grup-akses` | `GrupAksesPage` | `getGrupAksesAdminData`; aksi role | `rbac-repository`, `pengguna-repository` | `roles`, `modules`, `role_permissions`, `users`, `audit_logs` | `grup-akses:read/write/manage` |

Catatan: tabel `modules` dipakai untuk katalog menu/izin, bukan untuk menyimpan route baru secara otomatis. Menambah halaman harus disertai entri `RUTE_ADMIN_TERSEDIA`, modul, dan grant yang disengaja.

## 5. Spesifikasi per layar

### 5.1 Beranda — `/beranda`

**Mockup acuan:** [FlexiDesa Village Administration Dashboard (#46)](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20Village%20Administration%20Dashboard.png).

**Identitas halaman.** H1 `Dashboard Admin Desa`; paragraf `Selamat datang, <nama>. Kelola data, layanan, dan informasi desa di sini.`; tanggal Indonesia di kanan; tidak ada eyebrow. Halaman adalah server component yang membaca data desa sesi dan mengalihkan pengguna platform ke `/super-admin`.

**Layout.**

1. `page-heading`: H1, sapaan pengguna, dan tanggal. Tidak ada aksi di heading.
2. Baris 4 KPI.
3. Grid dua kolom: `Statistik Penduduk` (donut bertab) dan `Tren Layanan Surat` (area 6 bulan).
4. Grid dua kolom: `Permohonan Surat Terbaru` dan `Aktivitas Terbaru`.
5. Grid bawah: `Akses Cepat` (6 tautan) dan kartu profil desa (logo, nama, kecamatan/kabupaten, tautan profil).

**KPI.** Empat kartu: Jumlah Penduduk, Jumlah KK, Permohonan Surat, Pengaduan. Setiap kartu memakai ikon, angka `toLocaleString("id-ID")`, label, dan chip pendukung: chip pertumbuhan penduduk/KK, `X menunggu` untuk permohonan, serta `X belum ditindaklanjuti` atau `Semua ditindaklanjuti` untuk pengaduan. Jangan menampilkan angka mockup sebagai placeholder.

**Card dan grafik.**

- `Statistik Penduduk`: tab `Per Gender`, `Per Dusun`, `Per Umur`. Donut dengan total jiwa di tengah, legenda label + jumlah + persen. Segmen dusun dibatasi 6; sisanya digabung menjadi `Lainnya`. Gender memakai biru `#0B65F5` untuk laki-laki dan ungu `#7A20F0` untuk perempuan. Tanpa data: cincin `#E6E9F4`, teks `—`, pesan `Belum ada data penduduk pada kelompok ini.`
- `Tren Layanan Surat`: area chart 6 bulan, garis ungu, grid `#E8ECF7`, label bulan `#7C88A6`, total di judul. Tooltip boleh menampilkan jumlah; sumbu Y tidak boleh mengarang skala.
- `Permohonan Surat Terbaru`: daftar maksimal 5, tiap baris jenis surat, nama pemohon, waktu relatif, chip status.
- `Aktivitas Terbaru`: daftar maksimal 5, label aktivitas, aktor, waktu relatif. Bila audit trail kosong, tampilkan empty state.
- `Akses Cepat`: enam tautan `Data Penduduk`, `Arsip Surat`, `Berita Desa`, `Galeri Desa`, `Keuangan Desa`, `Pengaduan Warga`; hanya tautan yang izin bacanya dimiliki. Ikon memakai SVG inline atau ikon modul.

**Tabel/kolom.** Tidak ada tabel pada halaman ini; dua daftar ringkas di atas adalah list, bukan tabel.

**Filter/aksi.** Tidak ada filter. Aksi tunggal `Lihat Profil Desa`. Tidak ada tombol buat surat, ekspor, atau pengumuman pada implementasi saat ini.

**State.** Empty state untuk statistik, tren, permohonan, aktivitas, dan akses cepat. Bila identitas desa tidak ditemukan, kartu profil tidak dirender; halaman tetap boleh tampil dengan data sesi. Tidak ada skeleton khusus; jangan mengklaim loading state yang belum ada.

**Warna/aset.** Token aksi `#7A20F0`, kartu putih, border `#DCE4F5`, latar `#F4F8FE`, teks `#111A3B`, muted `#58688B`. Logo dari `villages.logo` atau `/images/logo.png`.

**Permission/tenant.** `verifySession`; pengguna platform dialihkan. Data diambil untuk `villageId` sesi, bukan parameter klien. Tautan akses cepat disaring berdasarkan izin baca. Page belum memanggil `requirePermission("beranda", "read")`; jangan menyimpulkan modul Beranda sudah terlindungi sebagai resource.

**Backend/schema.** `dashboard-repository`, `statistik-desa-repository`, `desa-repository`; tabel `residents`, `families`, `pengaduan`, `permohonan_surat`, `audit_logs`, `users`, `villages`, `regions`.

**Gap terhadap mockup.**

- Mockup memiliki 5 KPI termasuk `Realisasi APBDes 69,1%` dan nilai rupiah; implementasi hanya 4 KPI dan tidak menampilkan APBDes.
- Mockup memiliki donut realisasi APBDes, kartu `Program & Kegiatan Prioritas`, `Pengumuman & Informasi`, dan aksi `Buat Surat`; implementasi belum memiliki semuanya.
- Mockup menampilkan notifikasi di topbar dan panel program; implementasi hanya memiliki akses cepat dan feed aktivitas/permohonan.
- Mockup lebih padat dan bergaya dashboard eksekutif; implementasi lebih sederhana dan berorientasi daftar. Jangan menganggap perbedaan ini sebagai bug tanpa keputusan produk.

**Test terkait.** Tidak ditemukan test khusus untuk page Beranda. Test domain/statistik yang ada tidak membuktikan render, permission, atau query lintas tenant pada halaman ini. Gap: page loader dan agregasi tenant-scoped belum memiliki test langsung.

### 5.2 Data Penduduk — `/penduduk`

**Mockup acuan:** [FlexiDesa Population Dashboard (1) (#8)](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard%20%281%29.png) untuk KPI + tabel; [#7](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard.png) hanya pendukung untuk arah analitik. Implementasi bukan dashboard penuh, melainkan halaman daftar.

**Identitas halaman.** Eyebrow `Kependudukan`; judul `Data Penduduk`; deskripsi `Kelola data penduduk desa, termasuk biodata, status, dan wilayah. NIK disamarkan pada tampilan ini.` Metadata halaman tidak menyetel `robots: noindex`; akses bergantung pada autentikasi/otorisasi.

**Layout.** Page heading + 4 KPI; panel filter; panel tabel dengan header jumlah data dan aksi ekspor/tambah; footer pagination. Tidak ada panel detail samping pada desktop.

**KPI.** Total Penduduk, Jumlah KK, Laki-laki, Perempuan. Angka dari ringkasan desa sesi; label gender memakai teks, bukan hanya warna.

**Card/grafik.** Tidak ada grafik. Jangan menambahkan piramida/tren dari mockup #7 tanpa task terpisah.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| No | Nomor urut lintas halaman | Bukan ID database |
| NIK | `6 digit••••••2 digit` | Monospace, muted; NIK tidak boleh lengkap |
| Nama lengkap | Nama, tautan ke detail; nomor KK di bawahnya | KK ditampilkan sebagai `KK <nomor>` |
| JK | `L`/`P` | Singkatan, bukan label penuh |
| Tempat, tanggal lahir | Tempat, tanggal Indonesia, usia | Usia dihitung dari tanggal lahir |
| Wilayah | `regionLabel` | Bila kosong tampilkan `Belum diisi` |
| Status | Chip `Hidup`/`Mati`/`Pindah`/`Hilang`/`Pergi`/`Tidak Valid` | Label dari `LIFE_STATUS_LABELS` |
| Aksi | `Lihat` | Tidak ada hapus di daftar |

**Filter/aksi.** Pencarian `q` (NIK/nama/nomor KK), status, jenis kelamin, dusun, RW, RT. Tombol `Terapkan`, tautan `Bersihkan`, dan `Reset filter (n)` saat filter aktif. `Ekspor CSV` mempertahankan filter dan mengunduh data desa sesi. `Tambah Penduduk` hanya tampil bila izin tulis; tetap divalidasi server. Pagination 10 baris; halaman di luar rentang diarahkan ke halaman terakhir.

**State.** Empty state membedakan `belum ada data` dan `tidak ada hasil filter`. Ekspor tanpa data menampilkan pesan, bukan file kosong yang menyesatkan. Tombol tambah/ekspor disabled saat proses yang relevan.

**Warna/aset.** Chip status: `Hidup` hijau, `Mati`/`Pindah` oranye, status lain netral. Ikon KPI inline SVG; tidak ada foto. NIK memakai `font-variant-numeric: tabular-nums` bila tersedia.

**Permission/tenant.** `penduduk:read`. Filter dusun/RW/RT hanya opsi milik desa sesi. Detail dan ekspor memakai `villageId` sesi; ID region dari query tidak dipercaya sebagai otorisasi. Tombol tambah membutuhkan `write` (action `update`).

**Backend/schema.** `getRingkasanPendudukData`, `getPendudukFilterOptionsData`, `listPenduduk`; ekspor `src/app/(admin)/penduduk/ekspor/route.ts`; `penduduk-repository`, `wilayah-repository`; `residents`, `families`, `regions`, `religions`.

**Gap terhadap mockup.**

- Mockup #8 memiliki 5 KPI (termasuk belum KTP), tab wilayah/status, panel detail di kanan, serta aksi impor/ekspor/cetak. Implementasi hanya 4 KPI, tanpa tab, tanpa panel detail, tanpa impor/cetak; ekspor CSV sudah ada.
- Mockup #7 memiliki tren 12 bulan, piramida, komposisi, dan tabel dusun; tidak ada di halaman daftar. Ini bukan cacat tabel, tetapi gap dashboard kependudukan.
- Masking NIK adalah kontrol privasi yang dipertahankan; jangan “memperbaiki” tampilan dengan menampilkan NIK lengkap agar mirip mockup.

**Test terkait.** `src/app/(admin)/penduduk/actions.test.ts`; `src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts`; test domain penduduk. Tidak ditemukan test render/page untuk daftar, filter, pagination, dan ekspor. Status eksekusi test tidak diklaim pada dokumen ini.

### 5.3 Detail Penduduk — `/penduduk/[id]`

**Mockup acuan:** tidak ada layar detail khusus. Panel detail di sisi kanan [#8](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard%20%281%29.png) menjadi referensi terdekat; tata letak halaman penuh adalah turunan, bukan hasil peniruan piksel.

**Identitas halaman.** Eyebrow `Kependudukan`; metadata `Detail Penduduk`; H1 adalah nama penduduk; tautan `← Kembali ke Data Penduduk`. Header profil: nama, NIK tersamar, jenis kelamin, usia, chip status, dan tombol `Ubah Data` bila berwenang.

**Layout.** Grid dua kolom: kolom utama berisi tiga kartu (Identitas, Alamat & Kontak, Orang Tua); rail kanan berisi kartu Kartu Keluarga dan catatan privasi. Pada layar sempit menjadi satu kolom.

**KPI/card/grafik.** Tidak ada KPI dan grafik. Kartu:

- **Identitas Penduduk:** NIK tersamar, nama lengkap, jenis kelamin, tempat lahir, tanggal lahir, usia, agama, kewarganegaraan, golongan darah, status perkawinan, hubungan keluarga, pendidikan terakhir, pekerjaan.
- **Alamat & Kontak:** alamat, telepon, wilayah, status tempat tinggal, status kependudukan. Nilai kosong `—`.
- **Data Orang Tua:** nama ayah/ibu dan NIK tersamar; jangan menampilkan NIK lengkap.
- **Kartu Keluarga:** nomor KK (implementasi saat ini menampilkan penuh), alamat KK, wilayah; bila tidak terhubung tampil `Penduduk ini belum terhubung ke Kartu Keluarga.` Jangan mengarang tautan bila route KK belum ada.
- **Catatan Privasi:** menjelaskan bahwa NIK dan data pribadi hanya untuk pengguna berwenang.

**Tabel/kolom.** Tidak ada tabel; data ditampilkan sebagai pasangan label-nilai.

**Filter/aksi.** Tidak ada filter. Aksi `Kembali` dan `Ubah Data` (izin tulis). Tidak ada hapus.

**State.** `notFound()` bila ID tidak ada, bukan milik desa sesi, atau sudah tidak tersedia. NIK kosong ditampilkan `—`. Data referensi yang tidak ditemukan tidak boleh membocorkan nama tenant lain.

**Warna/aset.** Kartu putih, header dengan aksen ungu lembut, chip status; tanpa foto profil. Avatar/inisial boleh dipakai bila konsisten dengan shell, tetapi bukan keharusan.

**Permission/tenant.** `penduduk:read`; detail diambil dengan `villageId` sesi dan ID penduduk. Jangan memakai `villageId` dari query/header. Tombol ubah membutuhkan `write`; server action tetap memeriksa kepemilikan.

**Backend/schema.** `getPendudukDetailData`; `penduduk-repository`; `residents`, `families`, `regions`, katalog referensi (`religions`, `educations`, `occupations`, `marital_statuses`, `family_relations`, `blood_types`, `citizenships`).

**Gap terhadap mockup.** Tidak ada mockup khusus, sehingga tidak ada target fidelity. Dibanding panel #8, implementasi menampilkan lebih banyak field dan tidak menampilkan foto/aksi cepat. Pertahankan masking NIK dan pemisahan kartu agar informasi sensitif tidak tercampur dengan data biasa. Nomor KK masih ditampilkan penuh; evaluasi masking sebagai data pribadi pada task privasi terpisah, jangan mengubahnya diam-diam di task visual.

**Test terkait.** Tidak ditemukan test page/detail langsung. Test tenant reference dan test domain penduduk mencakup sebagian aturan, tetapi bukan bukti bahwa ID lintas tenant ditolak pada loader detail. Gap negative test khusus detail.

### 5.4 Tambah Penduduk — `/penduduk/baru`

**Mockup acuan:** tidak ada form khusus. Tombol `Tambah Penduduk` pada [#8](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard%20%281%29.png) adalah referensi masuk; layout form adalah turunan dari kebutuhan field, bukan mockup.

**Identitas halaman.** Eyebrow `Kependudukan`; judul `Tambah Penduduk`; deskripsi singkat; tombol `Batal` dan `Simpan Penduduk`.

**Layout.** Satu form dengan empat bagian kartu:

1. **Identitas Penduduk:** NIK (opsional, 16 digit), nama, jenis kelamin, tempat lahir, tanggal lahir, agama, kewarganegaraan, golongan darah.
2. **Pendidikan & Pekerjaan:** pendidikan terakhir, pendidikan sedang ditempuh, pekerjaan, status perkawinan.
3. **Keluarga, Wilayah & Kontak:** nomor KK, hubungan dalam keluarga, dusun/region, telepon, alamat, status tinggal, status hidup. Pilih KK yang sudah ada; jangan membuat KK baru diam-diam dari form ini.
4. **Data Orang Tua:** nama dan NIK ayah/ibu (NIK orang tua opsional).

**KPI/card/grafik.** Tidak ada.

**Tabel/kolom.** Tidak ada tabel. Field wajib ditandai; pesan error berada di bawah field.

**Filter/aksi.** Tidak ada filter. `Batal` kembali ke daftar tanpa menyimpan; `Simpan Penduduk` mengirim server action. Tidak ada simpan-dan-tambah-lagi, impor, atau draft.

**State.** Pending: tombol disabled + `Menyimpan...`. Sukses: redirect ke detail penduduk dan pesan sukses. Gagal validasi: pertahankan isian, tampilkan error per field. Gagal otorisasi: pesan umum, tanpa membocorkan data tenant lain. Referensi yang tidak valid ditolak server, bukan hanya oleh dropdown.

**Warna/aset.** Form putih, border `#DCE4F5`, fokus cincin aksi, tombol utama ungu. Tidak ada foto.

**Permission/tenant.** `penduduk:write` pada page dan action. `createPenduduk` memverifikasi region, KK, dan seluruh referensi milik desa sesi; satu KK hanya boleh memiliki satu kepala keluarga. NIK duplikat ditolak sesuai constraint/domain. Jangan menerima `villageId` dari form.

**Backend/schema.** `getPendudukFormData`; `buatPendudukAction` -> `pendudukFormSchema.parse` -> `createPenduduk`; `penduduk-repository`, `reference-repository`; `residents`, `families`, `regions`, `family_member_logs`, `audit_logs`.

**Gap terhadap mockup.** Tidak ada target visual. Gap fungsional: belum ada impor massal, pemindaian KTP, atau pembuatan KK baru; jangan menambahkannya tanpa task dan aturan tenant yang jelas.

**Test terkait.** `src/app/(admin)/penduduk/actions.test.ts` dan test domain form. `penduduk-tenant-references.integration.test.ts` mencakup referensi lintas tenant, tetapi status eksekusi tidak diklaim di sini. Gap: test render form dan test aksesibilitas field belum ditemukan.

### 5.5 Ubah Penduduk — `/penduduk/[id]/ubah`

**Mockup acuan:** turunan panel detail [#8](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard%20%281%29.png); tidak ada layar edit khusus.

**Identitas halaman.** Eyebrow `Kependudukan`; judul `Ubah Data Penduduk`; tautan `← Kembali ke Detail Penduduk`; tombol `Batal` dan `Simpan Perubahan`.

**Layout.** Form yang sama dengan Tambah, terisi data existing. ID penduduk disimpan sebagai field tersembunyi dan tidak boleh dapat diubah pengguna. NIK lengkap boleh tampil karena konteksnya izin tulis, tetapi tetap jangan dikirim ke analytics/log.

**KPI/card/grafik.** Tidak ada.

**Tabel/kolom.** Tidak ada tabel. Perubahan hubungan KK dan status tinggal harus dijelaskan sebagai perubahan data keluarga, bukan sekadar field biasa.

**Filter/aksi.** `Batal` kembali ke detail; `Simpan Perubahan` memanggil action. Tidak ada hapus, reset, atau ubah massal.

**State.** Sama dengan Tambah. Bila data berubah sejak dibuka, server tetap memvalidasi; jangan mengandalkan versi form. Bila ID tidak ditemukan/bukan milik desa, hasilnya `notFound()` atau error umum.

**Permission/tenant.** `penduduk:write`; `updatePenduduk` memeriksa ID + `villageId` sesi dan seluruh referensi baru. Jangan mengizinkan pindah KK ke keluarga tenant lain. Perubahan dicatat ke `family_member_logs` dan `audit_logs` sesuai use case.

**Backend/schema.** `getPendudukFormData`, `ubahPendudukAction` -> `updatePenduduk`; tabel sama dengan Tambah.

**Gap terhadap mockup.** Tidak ada target visual. Gap: belum ada optimistic concurrency/version indicator di UI; risiko overwrite perlu diuji bila dua admin mengubah bersamaan.

**Test terkait.** Sama dengan Tambah; test aksi mencakup validasi ID. Tidak ditemukan test khusus render edit, konflik versi, atau perubahan KK lintas tenant di UI. Status eksekusi tidak diklaim.

### 5.6 Keuangan Desa — `/keuangan`

**Mockup acuan:** [FlexiDesa APBDes Dashboard (#30)](../mockups/village/Keuangan%20%26%20Pembangunan/FlexiDesa%20APBDes%20Dashboard.png) untuk tabel hierarki APBDes; [#29](../mockups/village/Keuangan%20%26%20Pembangunan/FlexiDesa%20Financial%20Dashboard.png) hanya pendukung untuk KPI/analitik. Implementasi adalah tabel baca-saja, bukan dashboard keuangan.

**Identitas halaman.** Eyebrow `Perencanaan`; judul `Keuangan Desa`; subjudul `APBDes tahun anggaran <tahun>.` atau `Belum ada APBDes untuk tahun <tahun>.` Tidak ada pemilih tahun di UI meskipun use case menyediakan daftar tahun.

**Layout.** Page heading + satu panel tabel. Tidak ada baris KPI, tab, donut, atau panel samping.

**KPI/card/grafik.** Tidak ada di implementasi. Mockup #30 memiliki 5 KPI (Pagu, Realisasi, Sisa, Persentase, Kegiatan), tab `Ringkasan/Pendapatan/Belanja/Pembiayaan`, donut komposisi, rekap bidang, dan dokumen. Mockup #29 memiliki KPI, bar per bidang, tren realisasi, donut kegiatan, proyek prioritas, agenda, dan aksi cepat. Semua itu belum ada.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| Uraian | Nama akun/kegiatan | Indentasi mengikuti level; baris induk lebih tebal; kode tidak ditampilkan sebagai kolom |
| Anggaran | Rupiah `id-ID` | Rata kanan, tabular numerals |
| Realisasi | Rupiah `id-ID` | Rata kanan |

Tidak ada kolom kode, persentase, selisih, status, aksi, atau dokumen. Jangan menambahkan perhitungan persentase di UI bila tidak ada nilai resmi dari backend.

**Filter/aksi.** Tidak ada filter, pencarian, ekspor, atau tombol tambah/ubah. Tahun yang dipakai adalah tahun tersedia terakhir; bila tidak ada data, halaman menampilkan empty state, bukan memilih tahun acak.

**State.** Empty: `Anggaran desa belum disusun. Data akan tampil setelah APBDes diisi.` Subjudul membedakan `APBDes tahun anggaran <tahun>` dan `Belum ada APBDes untuk tahun <tahun>`. Data besar: tabel dapat digeser, header tetap terbaca. Tidak ada state pending karena baca-saja.

**Warna/aset.** Angka memakai teks utama dan rata kanan; baris induk lebih tebal; baris anak menjorok. Tidak ada foto/dokumen.

**Permission/tenant.** `keuangan:read`; query dibatasi `villageId` sesi dan tahun. **Template tenant belum menyemai modul/grant `keuangan`**, sehingga tenant baru dapat memperoleh 403 dan menu tidak muncul. Jangan mengatasi dengan mematikan guard; tambahkan modul/grant secara eksplisit pada task terpisah.

**Backend/schema.** `listKeuangan`, `listKeuanganTahunTersedia`, `listKeuanganTahun`; `keuangan-repository`; `keuangan`, `keuangan_template`.

**Gap terhadap mockup.**

- Belum ada KPI, tab sumber dana, donut, bar bidang, tren realisasi, kegiatan prioritas, agenda, dokumen, atau aksi cepat.
- Belum ada pemilih tahun, pencarian, ekspor, dan detail baris.
- Mockup #30 adalah dashboard APBDes lengkap; halaman ini baru “tabel APBDes”. Jangan menyebutnya setara mockup.

**Test terkait.** `src/features/keuangan/application/keuangan-use-cases.test.ts`, `src/features/keuangan/domain/keuangan.test.ts`, `src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts`. Tidak ditemukan test page/tabel, pemilih tahun, atau empty state. Status eksekusi tidak diklaim.

### 5.7 Berita Desa — `/konten/berita`

**Mockup acuan:** [FlexiDesa Konten dan Publikasi Dashboard (#5)](../mockups/village/Website%20Desa/FlexiDesa%20Konten%20dan%20Publikasi%20Dashboard.png). Implementasi hanya daftar berita terbit; mockup adalah dashboard konten dengan tab dan aksi.

**Identitas halaman.** Eyebrow `Publikasi`; judul `Berita Desa`; subjudul `N berita tersimpan pada desa ini.` Metadata halaman tidak menyetel `robots: noindex`.

**Layout.** Page heading + panel tabel. Tidak ada KPI, tab, filter, atau panel samping.

**KPI/card/grafik.** Tidak ada. Mockup #5 memiliki 5 KPI, tab `Berita/Pengumuman/Agenda/Galeri/Video`, kartu statistik, dan panel kanan; semua belum ada.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| Judul | Judul berita + ringkasan `excerpt` | Implementasi berupa teks tebal, bukan tautan; jangan membuat URL palsu |
| Kategori | Nama kategori | Chip muted/lembut |
| Terbit | Tanggal `id-ID` atau `Belum terbit` | Waktu kosong tidak boleh diisi “hari ini” |

Tidak ada kolom penulis, status, aksi, atau tanggal diperbarui.

**Filter/aksi.** Tidak ada filter/pencarian dan tidak ada tombol tambah/ubah/hapus. Daftar dibatasi 50 item tanpa pagination. Tidak ada tombol pratinjau.

**State.** Empty: `Belum ada berita yang ditulis.` Bila query mengembalikan 0 karena semua masih draft, pesan ini menyesatkan; lihat gap.

**Warna/aset.** Chip kategori memakai tone netral; tidak ada thumbnail di tabel meskipun mockup menampilkannya.

**Permission/tenant.** `berita:read`; query `villageId` sesi. **Modul/grant `berita` belum disemai di template tenant.**

**Backend/schema.** `listBeritaAdminData` (`src/features/publik/application/konten-admin.ts`); `listBerita` (`src/features/publik/infrastructure/content-repository.ts`); `berita`, `berita_kategori`. Loader saat ini memakai predikat publik: `status=published` dan (`terbitPada` null atau sudah lewat), sehingga draft dan berita terjadwal tidak muncul di halaman admin. Ini adalah gap fungsional penting: halaman admin tidak dapat melihat atau mengelola draft, meskipun judulnya “Kelola”.

**Gap terhadap mockup.**

- Tidak ada KPI, tab, pencarian, filter kategori/status, kolom penulis/status/aksi, pagination, atau panel statistik.
- Tidak ada alur tambah/ubah/hapus/pratinjau; halaman bukan dashboard konten.
- Draft dan berita terjadwal tidak terlihat. Bila akan dijadikan alur authoring, loader admin harus berbeda dari loader publik dan tetap tenant-scoped.

**Test terkait.** `src/features/konten/domain/berita.test.ts` mencakup aturan domain, bukan loader admin. Tidak ditemukan test page/loader/use case khusus daftar berita. Gap: test draft visibility, filter tenant, dan permission belum ada.

### 5.8 Galeri Desa — `/konten/galeri`

**Mockup acuan:** [FlexiDesa Konten dan Publikasi Dashboard (#5)](../mockups/village/Website%20Desa/FlexiDesa%20Konten%20dan%20Publikasi%20Dashboard.png), tab Galeri. Implementasi hanya daftar album aktif; bukan dashboard galeri.

**Identitas halaman.** Eyebrow `Publikasi`; judul `Galeri Desa`; subjudul `N album · M foto.` Metadata halaman tidak menyetel `robots: noindex`.

**Layout.** Page heading + panel tabel. Tidak ada grid foto, KPI, filter, atau aksi.

**KPI/card/grafik.** Tidak ada. Mockup menampilkan KPI konten, tab, dan thumbnail; belum ada di implementasi.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| Album | Nama album + deskripsi | Tanpa thumbnail |
| Keterangan | Deskripsi album | Muted, maksimal beberapa baris |
| Foto | Jumlah foto aktif | Angka saja; bukan daftar foto |

Tidak ada kolom status, tanggal, sampul, atau aksi.

**Filter/aksi.** Tidak ada pencarian, filter, pagination, atau tombol tambah/ubah/hapus. Hanya album `aktif` yang ditampilkan; album nonaktif tidak terlihat.

**State.** Empty: `Belum ada album galeri yang dibuat.` Bila semua album nonaktif, pesan ini tidak membedakan “belum ada” dan “disembunyikan”.

**Warna/aset.** Tidak ada thumbnail; jangan memakai foto mockup sebagai aset aplikasi. Bila nanti menampilkan sampul, gunakan URL penyimpanan tenant yang tervalidasi, bukan path sembarang dari input.

**Permission/tenant.** `galeri:read`; query album/foto dibatasi `villageId` sesi. **Modul/grant `galeri` belum disemai di template tenant.**

**Backend/schema.** `listGaleriAdminData` (`src/features/publik/application/konten-admin.ts`); `listAlbumGaleri` (`src/features/publik/infrastructure/content-repository.ts`); `galeri_album`, `galeri_foto`. Jumlah foto dihitung dari foto aktif milik album desa sesi.

**Gap terhadap mockup.**

- Tidak ada KPI, tab, grid/thumbnail, pencarian, status, tanggal, atau aksi authoring.
- Album nonaktif tidak dapat dikelola dari halaman ini.
- Belum ada alur unggah; bila dibangun, validasi ukuran, MIME, magic bytes, nama/path, kepemilikan tenant, dan lokasi penyimpanan wajib mengikuti `AGENTS.md`.

**Test terkait.** `src/features/konten/domain/galeri.test.ts` mencakup aturan domain, bukan loader admin. Tidak ditemukan test page/loader/use case khusus galeri admin. Gap: test album nonaktif, hitungan foto, dan isolasi tenant belum ada.

### 5.9 Administrasi Surat — `/persuratan/surat`

**Mockup acuan:** [FlexiDesa Surat Administration Dashboard (#12)](../mockups/village/Administrasi%20Surat/FlexiDesa%20Surat%20Administration%20Dashboard.png). Implementasi hanya tabel surat baca-saja.

**Identitas halaman.** Eyebrow `Administrasi`; judul `Administrasi Surat`; subjudul `N surat tercatat pada desa ini.` Metadata halaman tidak menyetel `robots: noindex`.

**Layout.** Page heading + panel tabel. Tidak ada KPI, tab, grafik, panel detail, atau panel aksi.

**KPI/card/grafik.** Tidak ada. Mockup #12 memiliki 5 KPI, tren 12 bulan, komposisi jenis, status bulan ini, surat paling dimohon, tabel permohonan, dan aktivitas. Semua belum ada.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| Nomor | Nomor surat | Monospace; kosong `—` |
| Jenis surat | Nama jenis + `purpose` di bawahnya | Muted, dipotong bila panjang |
| Pemohon | Nama penduduk | Kosong `—` |
| Tanggal | Tanggal surat `id-ID` | — |
| Status | Chip status | Label teks, bukan hanya warna |

Tidak ada kolom petugas, aksi, atau tautan PDF. Route PDF `[id]/pdf` ada, tetapi tidak ditautkan dari tabel.

**Filter/aksi.** Tidak ada pencarian/filter dan tidak ada tombol kontrol pagination di UI, meskipun loader mengambil opsi jenis/penduduk, rekap status, dan syarat. Pagination memakai 20 baris/halaman dari use case; halaman berikutnya tidak dapat dijangkau tanpa kontrol. Tidak ada tombol tambah, verifikasi, tanda tangan, arsip, atau ekspor.

**State.** Empty: `Belum ada surat yang dibuat.` Bila halaman lebih dari satu, teks `Halaman X dari Y · N baris per halaman` tampil, tetapi tidak ada tombol navigasi. Data panjang tidak dapat ditelusuri tanpa URL manual.

**Warna/aset.** Chip status saat ini selalu memakai tone netral, bukan warna per status; jangan mengklaim success/warning/danger yang belum dipakai. Tidak ada pratinjau dokumen atau foto.

**Permission/tenant.** `surat:read`; query surat dibatasi desa sesi. Surat menyangkut penduduk dan jenis surat tenant-scoped; jangan pernah memakai ID surat tanpa memeriksa `villageId`. **Modul/grant `surat` belum disemai di template tenant.**

**Backend/schema.** `listSuratWithMeta`; `surat-repository`; `letters`, `letter_types`, `residents`. Loader juga memuat data pendukung yang belum dipakai UI; jangan menghapusnya tanpa memeriksa call site.

**Gap terhadap mockup.**

- Tidak ada KPI, tren, komposisi, status bulan ini, surat terpopuler, aktivitas, dan aksi cepat.
- Tidak ada filter/pagination controls, pencarian, detail, PDF, tambah, verifikasi, atau ekspor dari halaman.
- Data pendukung sudah diambil tetapi tidak dirender; ini indikasi UI belum selesai, bukan sekadar perbedaan visual.

**Test terkait.** `src/features/surat/domain/surat.test.ts` dan test penomoran/PDF yang terkait. Tidak ditemukan test page/loader/daftar surat, filter, pagination, atau akses lintas tenant dari halaman. Status eksekusi tidak diklaim.

### 5.10 Pengaduan Warga — `/pengaduan-admin`

**Mockup acuan:** **tidak ada mockup khusus.** [#19 Pengajuan Layanan](../mockups/village/Pelayanan%20Publik/Purple%20Village%20Services%20Dashboard.png) dan [#17 Dashboard Pelayanan](../mockups/village/Pelayanan%20Publik/Dashboard%20Pelayanan%20Publik%20Desa%20FlexiDesa.png) hanya referensi visual terdekat; jangan mengklaim fidelity terhadap keduanya.

**Identitas halaman.** Eyebrow `Layanan Warga`; judul `Pengaduan Warga`; subjudul `N pengaduan masuk · M belum ditangani.` Metadata halaman tidak menyetel `robots: noindex`.

**Layout.** Page heading + panel tabel. Tidak ada KPI, filter, panel detail, atau form tanggapan.

**KPI/card/grafik.** Tidak ada. Mockup #17/#19 memiliki KPI, tren, komposisi, IKM, dan list-detail; tidak satu pun diimplementasikan di halaman ini.

**Tabel/kolom.**

| Kolom | Isi | Catatan |
|---|---|---|
| Tiket | Nomor tiket | Monospace |
| Judul | Judul pengaduan + nama petugas bila sudah ditangani | Tidak menampilkan isi penuh |
| Pelapor | Nama pelapor | Jangan tampilkan NIK/telepon di daftar |
| Masuk | Tanggal dibuat `id-ID` | Kosong `—` |
| Status | Chip status | `Baru` memakai warning; label teks |

Tidak ada kolom kategori, prioritas, lampiran, atau aksi.

**Filter/aksi.** Tidak ada filter status/kategori/tanggal, pencarian, pagination, detail, tanggapan, perubahan status, atau hapus — meskipun use case pengaduan menyediakan sebagian kemampuan tersebut. Jangan menambahkan aksi hanya karena backend ada; perlu task UI dan aturan otorisasi.

**State.** Empty: `Belum ada pengaduan dari warga.` Subjudul: `N pengaduan masuk · M belum ditangani.` Jumlah baru dihitung dari status `baru`. Tidak ada state “sedang diproses” di UI.

**Warna/aset.** Chip status hanya memakai tone `peringatan` untuk `baru` dan `netral` untuk status lain; jangan mengklaim palet success/danger yang belum dipakai. Tanpa lampiran/foto di daftar.

**Permission/tenant.** `pengaduan:read`; query dibatasi `villageId` sesi. **Modul/grant `pengaduan` belum disemai di template tenant.** Data pelapor adalah data pribadi; daftar hanya menampilkan nama. Bila detail dibangun, NIK/telepon/alamat harus mengikuti least privilege dan tidak boleh masuk log.

**Backend/schema.** `listPengaduanData`; `pengaduan-repository`; `pengaduan`, `users` (petugas/penanggung jawab bila ada).

**Gap terhadap mockup.** Tidak ada mockup khusus, jadi gap utama bersifat fungsional: belum ada filter, detail, tanggapan, perubahan status, prioritas, lampiran, atau pagination. Halaman baru “daftar pengaduan”, belum “manajemen pengaduan”.

**Test terkait.** `src/features/pengaduan/domain/pengaduan.test.ts` dan test notifikasi/status terkait. Tidak ditemukan test page/loader/daftar pengaduan, filter, detail, atau akses lintas tenant dari halaman. Gap negative test untuk ID pengaduan tenant lain.

### 5.11 Manajemen Pengguna & Hak Akses — `/pengaturan/pengguna`

**Mockup acuan:** [FlexiDesa User Access Management Dashboard (#42)](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20User%20Access%20Management%20Dashboard.png) untuk KPI/tabel/rail; [FlexiDesa User Activity Dashboard (#44)](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20User%20Activity%20Dashboard.png) untuk audit. Implementasi sudah mendekati struktur mockup, tetapi tidak identik.

**Identitas halaman.** Eyebrow `Pengaturan`; H1 `Manajemen Pengguna & Hak Akses` (metadata `Manajemen Pengguna`); deskripsi `Kelola akun pengguna, role, dan izin modul untuk desa ini.`

**Layout.** Page heading; 4 KPI; tab navigasi; grid dua kolom berisi console pengguna (kiri) dan rail aksi/role/statistik/aktivitas (kanan); panel `Log Aktivitas` penuh di bawah.

**KPI.** Total Pengguna (dengan jumlah role), Aktif (persen dari total), Nonaktif (`Akun tidak dapat masuk`), Total Role (`Role milik desa ini`). Warna tone ungu, hijau, oranye, biru.

**Card/grafik.**

- Donut statistik pengguna: `#16A36A` aktif, `#F0A020` nonaktif, `#E6E9F4` bila kosong. Legenda + persentase.
- Rail `Daftar Role`: jumlah role, nama role, jumlah anggota (aktif + nonaktif), tautan kelola.
- Rail `Aktivitas Terbaru`: maksimal 5 baris audit; hanya dirender bila izin `audit-log:read`.
- Panel `Log Aktivitas`: tabel Peristiwa/Aktor/Resource/Waktu; hanya bila berizin.

**Tabel/kolom.** Console pengguna: No., Pengguna (avatar inisial + nama; penanda `Akun Anda`), Username (monospace), Role/Hak Akses, Kontak (email), Status, Terakhir Login, Aksi. Aksi `Ubah` dan `Hapus`; tombol tambah berada di header panel. Tabel audit memakai 4 kolom seperti di atas.

**Filter/aksi.** Pencarian nama/username/email, filter role, filter status; filter berjalan client-side pada data yang sudah dimuat. Pagination 10 baris. `Tambah Pengguna` membuka dialog; `Ubah` membuka dialog berisi nama, username, email, role, status aktif, kata sandi opsional; `Hapus` membuka dialog konfirmasi. Tidak ada bulk action, impor, ekspor, atau reset kata sandi massal.

**State.** Dialog pending menampilkan `Menyimpan...`; error validasi di dalam dialog. Pengguna tanpa hasil filter mendapat empty state berbeda dari “belum ada pengguna”. Akun sendiri: tombol hapus tidak tersedia; role/status sendiri tidak dapat diubah; pesan penolakan harus jelas. Role tanpa anggota tetap tampil dengan `0 anggota`.

**Warna/aset.** Avatar inisial memakai aksen lembut; status aktif/nonaktif memakai titik indikator dan label teks; ikon KPI inline SVG; tanpa foto pengguna. Role sistem memakai penanda teks, bukan hanya warna.

**Permission/tenant.** `pengguna:read` untuk halaman; `pengguna:write` untuk tambah/ubah; `pengguna:manage` untuk hapus. Hanya role milik desa sesi yang boleh dipilih; role platform ditolak server. `deletePenggunaData` melindungi akun sendiri dan akun dengan relasi yang tidak boleh dihapus. `villageId` berasal dari sesi, bukan form. Audit hanya untuk pemegang izin `audit-log:read`.

**Backend/schema.** `getPenggunaAdminData`, `getAuditLogPageData`; `buatPenggunaAction`, `ubahPenggunaAction`, `hapusPenggunaAction`; `pengguna-repository`, `audit-repository`; `users`, `accounts`, `roles`, `audit_logs`. Kata sandi di-hash oleh use case; jangan pernah mengembalikannya ke client.

**Gap terhadap mockup.**

- Mockup #42 memiliki 5 KPI (termasuk total permission) dan tampilan rail yang lebih kaya; implementasi 4 KPI.
- Tab implementasi adalah navigasi: `Daftar Pengguna`, `Hak Akses (Role)`, `Grup & Permission`, `Log Aktivitas`. Tab role mengarah ke halaman grup, bukan panel dalam halaman; ini keputusan arsitektur, bukan bug.
- Mockup menampilkan tabel lebih padat dan panel hak akses; implementasi memakai console + rail + audit. Jangan menambah kolom mockup yang datanya tidak tersedia.

**Test terkait.** `src/features/pengguna/application/pengguna-use-cases.test.ts` mencakup CRUD/role lintas tenant; `domain/pengguna.test.ts` dan `domain/statistik-pengguna.test.ts` mencakup aturan domain; test RBAC tenant isolation terkait. Tidak ditemukan test render page, dialog, filter client-side, pagination, atau self-protection di UI. Status eksekusi tidak diklaim.

### 5.12 Hak Akses & Permission — `/pengaturan/grup-akses`

**Mockup acuan:** [FlexiDesa Role Access Dashboard (#43)](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20Role%20Access%20Dashboard.png). Implementasi memakai model tiga level, bukan empat checkbox mockup.

**Identitas halaman.** Eyebrow `Pengaturan`; H1 `Hak Akses & Permission`; deskripsi `Atur role desa dan izin baca, tulis, serta kelola untuk setiap modul.`; tombol `+ Tambah Grup` hanya untuk izin tulis.

**Layout.** Page heading; 3 KPI; tab navigasi yang sama dengan halaman pengguna; grid dua kolom: daftar role (kiri) dan matriks izin (kanan). Pada layar sempit menjadi satu kolom.

**KPI.** Total Role, Role Kustom (`Dapat diubah dan dihapus`), Role Sistem (`Nama dan izin terkunci`). Anggota dihitung dari pengguna aktif dan nonaktif.

**Card/grafik.** Tidak ada grafik. Daftar role menampilkan nama, slug, penanda `Sistem`/`Kustom`, jumlah anggota, serta aksi ubah/hapus untuk role kustom. Role terpilih ditandai dan dapat dipilih lewat tautan/`searchParams role`.

**Tabel/kolom.** Matriks izin: Modul, Baca, Tulis, Kelola. Setiap baris adalah modul tenant; setiap sel checkbox. Role sistem menampilkan checkbox disabled/read-only. Catatan UI: `Tulis mencakup baca; kelola mencakup tulis. Perubahan berlaku pada permintaan berikutnya.` Tidak ada kolom “Tambah/Ubah/Hapus” terpisah.

**Filter/aksi.** `+ Tambah Grup` membuka dialog nama; `Ubah` mengganti nama role kustom; `Hapus` menghapus role kustom dengan konfirmasi; `Simpan izin` mengirim seluruh matriks modul. Tidak ada pencarian role, duplicate, reset ke default, atau bulk assignment pengguna. Memilih role memuat ulang halaman dengan `?role=`.

**State.** Role sistem: nama dan izin terkunci; aksi ubah/hapus tidak tersedia. Role tanpa anggota tetap tampil. Bila role yang diminta bukan milik desa, jangan tampilkan izinnya; fallback ke role pertama/empty state. Pending simpan menampilkan status dan mencegah klik ganda. Perubahan izin berlaku pada permintaan berikutnya, bukan langsung mencabut sesi yang sedang berjalan.

**Warna/aset.** Role sistem memakai chip muted/abu; role kustom memakai aksi lembut. Checkbox harus memiliki label yang dapat dibaca screen reader; jangan hanya mengandalkan warna. Tidak ada aset gambar.

**Permission/tenant.** `grup-akses:read` untuk halaman; `write` untuk tambah/ubah nama dan simpan izin; `manage` untuk hapus. Role dan modul dibatasi tenant; role platform tidak boleh muncul. `saveRolePermissions` hanya menerima module ID yang valid untuk desa. Jangan menerima `roleId` lintas tenant dari query/form. Role sistem tidak boleh dihapus/diubah namanya. Perubahan izin dicatat ke audit.

**Backend/schema.** `getGrupAksesAdminData`; `buatRoleAction`, `ubahRoleAction`, `hapusRoleAction`, `simpanIzinAction`; `rbac-repository`, `pengguna-repository`; `roles`, `modules`, `role_permissions`, `users`, `audit_logs`.

**Gap terhadap mockup.**

- Mockup #43 memiliki 5 KPI, matriks empat aksi (`Lihat/Tambah/Ubah/Hapus`), toggle modul, detail role, duplicate/reset, dan panel anggota; implementasi hanya 3 level (`Baca/Tulis/Kelola`) dan 3 KPI.
- Jangan memetakan empat checkbox mockup secara naif ke model tiga level. Bila produk membutuhkan empat aksi, perlu keputusan model izin dan migration, bukan perubahan UI saja.
- Role sistem sudah read-only; ini kontrol positif yang harus dipertahankan.

**Test terkait.** `src/features/rbac/application/grup-use-cases.test.ts`, `application/authorization.test.ts`, `domain/permission.test.ts`, dan `infrastructure/rbac-tenant-isolation.integration.test.ts`. Tidak ditemukan test render matriks, role sistem read-only di UI, atau `searchParams role` lintas tenant. Status eksekusi tidak diklaim.

## 6. Ringkasan gap dan prioritas

Prioritas di sini adalah urutan kerja desain/implementasi, bukan severity kerentanan:

- **P0 — halaman tidak dapat dipakai tenant baru:** modul/grant belum ada, atau route tidak muncul.
- **P1 — alur utama belum lengkap:** pengguna tidak dapat melihat/mengelola data yang menjadi tujuan halaman.
- **P2 — parity visual/analitik:** KPI, grafik, panel, dan kepadatan mockup belum ada, tetapi alur dasar tetap berjalan.

| Layar | P0 | P1 | P2 |
|---|---|---|---|
| Beranda | — | Verifikasi keputusan tidak memakai guard modul `beranda` | 5 KPI + APBDes, donut APBDes, program prioritas, pengumuman, aksi buat surat, notifikasi |
| Penduduk | — | — | KPI belum KTP, tab, panel detail samping, impor/cetak, analitik #7 |
| Detail Penduduk | — | — | Foto/profil dan tautan KK bila route tersedia |
| Tambah/Ubah | — | Konflik versi belum terlihat | Impor/scan KTP, wizard, draft |
| Keuangan | Modul/grant `keuangan` belum disemai | Pemilih tahun, filter, detail baris, ekspor | 5 KPI, tab, donut, bar bidang, tren, kegiatan, dokumen |
| Berita | Modul/grant `berita` belum disemai | Draft/terjadwal tidak terlihat; tidak ada authoring | 5 KPI, tab, filter, kolom penulis/status/aksi, panel statistik |
| Galeri | Modul/grant `galeri` belum disemai | Album nonaktif tidak terlihat; tidak ada unggah | Grid/thumbnail, KPI, filter, status |
| Surat | Modul/grant `surat` belum disemai | Kontrol pagination/filter tidak dirender; data pendukung tidak dipakai; tidak ada aksi | 5 KPI, tren, komposisi, top surat, aktivitas |
| Pengaduan | Modul/grant `pengaduan` belum disemai | Tidak ada detail, filter, tanggapan, atau perubahan status | Tidak ada mockup khusus; gap visual tidak dapat diukur |
| Pengguna | — | — | 5 KPI vs 4; kekayaan rail/dashboard |
| Grup Akses | — | Empat aksi mockup tidak dipetakan ke tiga level | 5 KPI vs 3, duplicate/reset, panel anggota |

Gap lintas layar:

1. **Template tenant belum mencerminkan lima halaman baca-saja.** Ini menghalangi penggunaan nyata pada tenant baru dan harus diselesaikan sebelum menilai parity visual halaman tersebut.
2. **Halaman admin Berita memakai query publik.** Dampaknya bukan hanya visual: draft dan berita terjadwal tidak dapat dikelola dari halaman admin.
3. **Beberapa halaman baca-saja sudah mengambil data pendukung tetapi tidak merendernya.** Surat adalah contoh paling jelas. Jangan menghapus query sebelum ada keputusan UI, karena dapat memutus rencana filter/pagination.
4. **Mockup lebih dashboard-oriented daripada implementasi.** Perbedaan KPI/grafik bukan otomatis bug; perlu keputusan produk apakah targetnya dashboard penuh atau tabel operasional.
5. **Kontrol privasi yang sudah benar jangan dikorbankan demi mockup.** NIK tersamar di daftar/detail dan role sistem read-only harus dipertahankan.

## 7. Matriks test yang tersedia

Tabel ini mencatat **file test yang ditemukan**, bukan status lulus. Tidak ada test yang dijalankan untuk task dokumentasi ini.

| Area | File test ditemukan | Yang tercakup | Gap utama |
|---|---|---|---|
| Beranda | Test domain dashboard/statistik terkait | Perhitungan/format sebagian | Tidak ada test page loader, agregasi tenant, atau render |
| Penduduk daftar | `src/app/(admin)/penduduk/actions.test.ts`; test domain penduduk | Validasi aksi dan aturan domain | Tidak ada test filter/pagination/ekspor/render |
| Penduduk detail | Test domain/referensi | Sebagian aturan data | Tidak ada test loader detail atau ID lintas tenant |
| Penduduk tambah/ubah | `actions.test.ts`; `penduduk-tenant-references.integration.test.ts` | Validasi form dan referensi tenant | Tidak ada test render/konflik versi |
| Keuangan | `src/features/keuangan/application/keuangan-use-cases.test.ts`; `domain/keuangan.test.ts`; `keuangan-concurrency.integration.test.ts` | Use case, domain, konkurensi | Tidak ada test page/tahun kosong/render |
| Berita | `src/features/konten/domain/berita.test.ts` | Aturan domain berita | Tidak ada test admin loader, draft visibility, filter tenant |
| Galeri | `src/features/konten/domain/galeri.test.ts` | Aturan domain galeri | Tidak ada test admin loader, album nonaktif, hitungan foto |
| Surat | `src/features/surat/domain/surat.test.ts`; `surat-dinas.test.ts`; `infrastructure/surat-pdf.test.ts` | Domain, surat dinas, PDF/penomoran | Tidak ada test daftar/filter/pagination |
| Pengaduan | `src/features/pengaduan/domain/pengaduan.test.ts` | Aturan domain/status | Tidak ada test daftar/detail/tanggapan |
| Pengguna | `src/features/pengguna/application/pengguna-use-cases.test.ts`; `domain/pengguna.test.ts`; `domain/statistik-pengguna.test.ts` | CRUD, role, domain, statistik | Tidak ada test dialog/filter/self-protection UI |
| Grup Akses | `src/features/rbac/application/grup-use-cases.test.ts`; `application/authorization.test.ts`; `domain/permission.test.ts`; `infrastructure/rbac-tenant-isolation.integration.test.ts` | Role, izin, isolasi tenant | Tidak ada test render matriks/role sistem |

Integration test di atas memerlukan database test disposable. Status eksekusinya **SKIPPED** untuk dokumen ini karena tidak ada database test yang dijalankan atau diverifikasi pada task dokumentasi. Jangan membaca tabel ini sebagai bukti PASS.

## 8. Indeks mockup yang ditinjau

Seluruh mockup berukuran 1536 x 1024, satu varian desktop. Peninjauan dilakukan pada preview 1200 x 800; bukan pengukuran piksel final.

<a id="mockup-46"></a>
- **#46 Beranda:** [FlexiDesa Village Administration Dashboard](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20Village%20Administration%20Dashboard.png)

<a id="mockup-7"></a>
- **#7 Population Dashboard:** [FlexiDesa Population Dashboard](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard.png)

<a id="mockup-8"></a>
- **#8 Population Dashboard (1):** [FlexiDesa Population Dashboard (1)](../mockups/village/Data%20Kependudukan/FlexiDesa%20Population%20Dashboard%20%281%29.png)

<a id="mockup-5"></a>
- **#5 Konten dan Publikasi:** [FlexiDesa Konten dan Publikasi Dashboard](../mockups/village/Website%20Desa/FlexiDesa%20Konten%20dan%20Publikasi%20Dashboard.png)

<a id="mockup-12"></a>
- **#12 Surat Administration:** [FlexiDesa Surat Administration Dashboard](../mockups/village/Administrasi%20Surat/FlexiDesa%20Surat%20Administration%20Dashboard.png)

<a id="mockup-29"></a>
- **#29 Financial Dashboard:** [FlexiDesa Financial Dashboard](../mockups/village/Keuangan%20%26%20Pembangunan/FlexiDesa%20Financial%20Dashboard.png)

<a id="mockup-30"></a>
- **#30 APBDes Dashboard:** [FlexiDesa APBDes Dashboard](../mockups/village/Keuangan%20%26%20Pembangunan/FlexiDesa%20APBDes%20Dashboard.png)

<a id="mockup-17"></a>
- **#17 Dashboard Pelayanan:** [Dashboard Pelayanan Publik Desa FlexiDesa](../mockups/village/Pelayanan%20Publik/Dashboard%20Pelayanan%20Publik%20Desa%20FlexiDesa.png)

<a id="mockup-19"></a>
- **#19 Pengajuan Layanan:** [Purple Village Services Dashboard](../mockups/village/Pelayanan%20Publik/Purple%20Village%20Services%20Dashboard.png)

<a id="mockup-42"></a>
- **#42 User Access Management:** [FlexiDesa User Access Management Dashboard](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20User%20Access%20Management%20Dashboard.png)

<a id="mockup-43"></a>
- **#43 Role Access:** [FlexiDesa Role Access Dashboard](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20Role%20Access%20Dashboard.png)

<a id="mockup-44"></a>
- **#44 User Activity:** [FlexiDesa User Activity Dashboard](../mockups/village/Manajemen%20Pengguna%20%26%20Hak%20Akses/FlexiDesa%20User%20Activity%20Dashboard.png)

Mockup lain di katalog tidak diuraikan dalam dokumen ini. Jangan menyatakan seluruh 126 mockup telah ditinjau.

## 9. Batasan dan langkah berikutnya

**Batasan dokumen ini.**

- Tidak ada source code, schema, migration, data, atau aset mockup yang diubah.
- Tidak ada build, typecheck, unit test, integration test, atau runtime check yang dijalankan untuk 12 layar. Dokumen ini tidak membuktikan halaman berjalan atau test lulus.
- Fidelity visual tidak diukur dengan screenshot aplikasi. Perbandingan dilakukan terhadap preview mockup 1200 x 800 dan kode/CSS, bukan pixel diff.
- Tiga layar tidak memiliki mockup khusus: detail penduduk, tambah penduduk, ubah penduduk. Pengaduan tidak memiliki mockup khusus; #17/#19 hanya referensi.
- Lima halaman baca-saja sudah memiliki modul dan grant pada template tenant per 23 November 2026. Itu tidak menghilangkan gap kedalaman alur tulis; status per halaman tetap mengikuti tabel dan inventaris modul.

**Urutan kerja yang disarankan.**

1. **Verifikasi akses tenant baru:** modul dan grant untuk `keuangan`, `berita`, `galeri`, `surat`, dan `pengaduan` sudah ditambahkan ke template. Jalankan provisioning test pada database test disposable untuk memastikan tenant baru memperoleh menu dan izin yang benar; jangan mematikan guard.
2. **Perbaiki alur admin Berita:** pisahkan query admin dari query publik agar draft dan berita terjadwal terlihat, tetap dibatasi `villageId` dan permission.
3. **Lengkapi alur operasional:** kontrol pagination/filter pada Surat, detail/tanggapan pada Pengaduan, lalu pemilih tahun/filter pada Keuangan. Setiap aksi baru memerlukan aturan otorisasi dan negative test lintas tenant.
4. **Baru ke parity visual:** KPI, grafik, panel prioritas, dan kepadatan mockup. Jangan menambahkan grafik yang datanya belum tersedia atau belum tervalidasi.
5. **Untuk form penduduk:** pertimbangkan indikator versi/konflik hanya bila ada kebutuhan nyata; jangan mengubah model data tanpa migration dan rencana backfill.

**File implementasi utama yang diperiksa.**

- Beranda: `src/app/(admin)/beranda/page.tsx`, `statistik-penduduk.tsx`, `tren-layanan-surat.tsx`.
- Penduduk: `src/app/(admin)/penduduk/page.tsx`, `[id]/page.tsx`, `baru/page.tsx`, `[id]/ubah/page.tsx`, `form-penduduk.tsx`, `actions.ts`, `ekspor/route.ts`.
- Keuangan: `src/app/(admin)/keuangan/page.tsx`; `src/features/keuangan/application/`.
- Konten: `src/app/(admin)/konten/berita/page.tsx`, `src/app/(admin)/konten/galeri/page.tsx`; `src/features/publik/application/konten-admin.ts`, `src/features/publik/infrastructure/content-repository.ts`.
- Surat: `src/app/(admin)/persuratan/surat/page.tsx`; `src/features/surat/`.
- Pengaduan: `src/app/(admin)/pengaduan-admin/page.tsx`; `src/features/pengaduan/`.
- Pengguna/grup: `src/app/(admin)/pengaturan/pengguna/page.tsx`, `pengguna-console.tsx`, `dialog-pengguna.tsx`, `actions.ts`; `src/app/(admin)/pengaturan/grup-akses/page.tsx`, `dialog-role.tsx`, `form-izin.tsx`, `actions.ts`; `src/features/pengguna/`, `src/features/rbac/`.
- Template/route: `src/db/templates/tenant-template.ts`, `src/features/navigation/domain/menu-tampil.ts`.
- Desain: `docs/design/DESIGN-SYSTEM.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md`, `docs/mockups/README.md`.

**Kesimpulan.** Dua belas halaman sudah memiliki route dan alur baca/tulis dasar yang nyata. Gap terbesar bukan warna atau ikon, melainkan: (a) lima halaman belum terhubung ke template tenant, (b) halaman admin Berita belum dapat melihat draft, dan (c) beberapa halaman baca-saja belum mengekspos kontrol operasional yang datanya sudah tersedia. Parity visual sebaiknya dikerjakan setelah akses dan alur utama benar.
