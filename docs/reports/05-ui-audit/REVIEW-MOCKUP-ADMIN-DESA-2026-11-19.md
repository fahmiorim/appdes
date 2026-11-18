# Review Mockup Admin Desa — Folder `docs/mockups/village`

- **Task:** meninjau sembilan mockup baru untuk area Admin Desa, memetakannya ke halaman dan kemampuan backend yang ada, serta mendokumentasikan bahasa visual dan kesenjangannya.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/review-village-admin-mockups`, base commit `204b91abd45f30922fc9a02dfad0d28ba8cfbc36`.
- **Status:** dokumentasi selesai; **tidak ada perubahan source code**. Belum di-commit dan belum di-push atas permintaan pemilik task.
- **Sifat dokumen:** snapshot audit. Status implementasi yang dicatat di sini berlaku pada base commit di atas.

## 1. Tujuan dan batas

Review ini menjawab tiga hal:

1. Apa bahasa visual yang dipakai sembilan mockup Admin Desa, sehingga bisa dijadikan acuan implementasi.
2. Sejauh mana setiap layar mockup sudah punya pasangan halaman dan data di repository.
3. Pekerjaan apa yang harus ditutup lebih dulu agar tampilan Admin Desa bisa mengikuti mockup tanpa mengarang data.

Review **tidak** mengubah UI, tidak menjalankan aplikasi di browser, dan tidak menilai kesiapan produksi. Semua penilaian visual berasal dari file PNG, bukan dari tangkapan layar runtime.

## 2. Metode dan bukti

- Sembilan file PNG di `docs/mockups/village/` dibuka langsung dan diperiksa satu per satu.
- Seluruh file berukuran **1536 × 1024 piksel**, format PNG, rentang 1,55–1,78 MB. Tidak ada varian mobile atau state hover/error di folder ini.
- Untuk membaca tata letak, gambar diperkecil sementara ke 1100 × 740 di folder sementara di luar Git; folder tersebut sudah dihapus dan tidak masuk repository.
- Warna diambil dengan kuantisasi piksel (Pillow) pada area sidebar, kanvas konten, baris KPI, dan tombol utama. Nilai warna adalah hasil sampling area, bukan token resmi desain.
- Pemetaan route diperiksa dari `src/app`, daftar `RUTE_ADMIN_TERSEDIA` di `src/features/navigation/domain/menu-tampil.ts`, shell di `src/app/(admin)/layout.tsx`, `src/components/shell/admin-sidebar.tsx`, `src/components/shell/admin-topbar.tsx`, dan `src/app/globals.css`.
- Kecukupan data diperiksa dari use case dan repository terkait (`dashboard-repository.ts`, `penduduk`, `keuangan`, `pengaduan`, `publik`, `layanan-mandiri`).
- Tidak ada tangkapan layar runtime, pengujian browser, pengujian aksesibilitas, atau pengukuran viewport pada review ini.

## 3. Ringkasan temuan

1. **Mockup ini adalah referensi dashboard Admin Desa yang sebelumnya tidak ada.** Sebelumnya `docs/design/ADMIN-PLATFORM-DESIGN.md` dan `DESIGN-SYSTEM.md` menyatakan Admin Desa tidak punya screenshot acuan. Pernyataan itu tidak lagi berlaku untuk area ini.
2. **Shell dalam mockup berbeda material dari shell saat ini.** Mockup memakai sidebar navy gelap dengan identitas desa, menu bergrup yang bisa dibuka-tutup, kartu pengguna di kaki sidebar, serta topbar berisi breadcrumb, chip tanggal, notifikasi, dan avatar. Implementasi sekarang memakai sidebar putih 264 px, brand platform `FlexiDesa.id`, tanpa breadcrumb, tanpa tanggal, tanpa notifikasi.
3. **Hanya satu dari sembilan layar yang punya halaman Admin Desa.** `/beranda` adalah satu-satunya `page.tsx` di area Admin Desa. Delapan layar lainnya belum punya halaman; sebagian modulnya hanya memiliki route ekspor (`penduduk`, `statistik`, `permohonan-surat`, `keuangan`, `hubung-warga`, `desa`).
4. **Backend lebih siap daripada UI untuk beberapa modul.** Daftar dan detail penduduk, laporan keuangan tahunan/triwulan, daftar pengaduan beserta tanggapan, berita, dan permohonan surat sudah punya use case. Yang belum ada adalah agregasi grafik (tren waktu, komposisi usia/pendidikan/pekerjaan), hitungan "surat populer", dan aktivitas terbaru lintas modul.
5. **Mockup menampilkan data pribadi contoh.** Nama warga, NIK, nomor KK, dan foto muncul di tabel. Asal data tersebut tidak dapat diverifikasi dari PNG, jadi perlakukan sebagai data sensitif: implementasi wajib memakai fixture sintetis dan membaca data tenant dari sesi, bukan dari parameter klien.
6. **Mockup memakai aksen ungu sebagai warna aksi utama**, sedangkan design system saat ini menetapkan biru sebagai brand/action dan ungu hanya aksen sekunder. Ini keputusan produk yang harus disetujui sebelum implementasi, bukan diselesaikan diam-diam di CSS.

## 4. Bahasa visual mockup

Bagian ini mencatat pola yang **berulang di sembilan layar**, sehingga layak dijadikan acuan bersama. Nilai px adalah perkiraan dari gambar 1536 × 1024 dan perlu diverifikasi saat implementasi.

### 4.1 Shell

| Bagian | Yang terlihat di mockup |
|---|---|
| Sidebar | Lebar tetap 256 px pada kanvas 1536 px (16,7% lebar; setara ±240 px bila diskalakan ke 1440 px). Latar navy gelap `#0B1C3B` dengan ilustrasi perbukitan di kaki sidebar. Logo desa + nama desa + subjudul "Admin Desa" di atas. |
| Menu | Dikelompokkan per modul (Dashboard, Data Penduduk, Administrasi Surat, Berita & Informasi, Pemerintahan Desa, Data & Statistik, Transparansi (APBDes), Pengaduan Masyarakat, Pengaturan Desa, Manajemen Pengguna). Grup aktif menampilkan sub-menu; grup lain memakai chevron. Item aktif memakai latar ungu bergradasi dengan sudut membulat. |
| Kaki sidebar | Kartu pengguna (avatar, nama, peran "Operator Desa") dan ikon keluar. |
| Topbar | Latar putih, tinggi ±50 px. Kiri: breadcrumb "Dashboard > halaman". Kanan: chip tanggal ("Selasa, 14 Januari 2025"), ikon lonceng dengan badge notifikasi, avatar pengguna. |
| Header halaman | Judul besar + satu baris subjudul, dan aksi di kanan (mis. Export PDF, Export Excel, Cetak Laporan) berupa tombol outline berikon. |

### 4.2 Pola konten

| Pola | Ciri |
|---|---|
| Kartu KPI | 4–6 kartu sejajar. Ikon persegi membulat bernuansa lembut, label kecil, angka besar, lalu chip tren/status (hijau untuk kenaikan, biru untuk status proses, merah untuk yang perlu ditindak). |
| Tab | Pil dengan ikon; tab aktif berlatar ungu penuh dan teks putih. |
| Toolbar tabel | Kolom pencarian, beberapa select filter, tombol "Filter" outline, dan tombol aksi utama ungu di sisi kanan. |
| Tabel | Checkbox baris, kolom aksi berupa ikon lihat/ubah/hapus, status berbentuk chip, dan paginasi bernomor dengan elipsis. Sekitar 10 baris terlihat per layar. |
| Rail kanan | Panel bantuan konteks: pratinjau item terpilih, donut status, daftar peringkat, atau CTA. Lebar sekitar 30% area konten. |
| Kartu sorotan | Gradien ungu dengan ilustrasi desa dan tombol putih (mis. "Lihat Profil Desa"), dipakai di beranda. |
| Form pengaturan | Tab horizontal, kartu form dua kolom, peta dengan kontrol zoom, editor teks ringkas, panel status sistem dengan switch, dan daftar dokumen dengan aksi unduh/hapus. Tombol "Batal" outline + "Simpan Perubahan" ungu. |

### 4.3 Warna hasil sampling

| Peran | Nilai sampel | Catatan |
|---|---|---|
| Sidebar | `#0B1C3B` | Dominan 34% area sidebar; ilustrasi kaki sidebar menambah variasi biru tua. |
| Kanvas konten | `#F3F4FB` | Latar halaman; kartu lebih terang. |
| Kartu/panel | `#FBFBFD`–`#FCFCFE` | Hampir putih dengan border sangat halus. |
| Aksi/tab aktif | `#7A20F0`–`#8020F0` | Ungu jenuh pada tab aktif dan tombol utama. |
| Tombol gelap | `#4800E0` | Terlihat pada tombol "Buat Surat Baru". |
| Status sukses | hijau | Chip "Dipublikasikan"/"Disetujui"/"Aktif". |
| Status menunggu | kuning/amber | Chip "Menunggu"/"Draft". |
| Status proses | biru | Chip "Diproses". |
| Status ditolak | merah | Chip "Ditolak". |

Token yang ada sekarang: brand `#0B65F5`, aksen `#8A58F5`, kanvas `#F4F8FE`, kartu putih, sidebar putih. Artinya mockup menggeser **peran** ungu dari aksen menjadi aksi utama, dan menggeser sidebar dari putih ke navy. Ini perubahan arah visual, bukan sekadar penyesuaian.

### 4.4 Tipografi dan kerapatan

- Huruf sans-serif geometris dengan heading tebal; nama font tidak bisa dipastikan dari raster. Implementasi sekarang memakai DM Sans (body) dan Plus Jakarta Sans (heading) sebagai padanan sementara.
- Skala judul halaman jauh lebih besar daripada isi tabel; metadata memakai ukuran kecil dengan warna muted.
- Kerapatan tinggi: tabel, filter, dan rail samping tampil bersamaan tanpa banyak ruang kosong. Ini cocok untuk operator, tetapi menuntut perilaku responsif yang tidak digambarkan mockup.

## 5. Matriks sembilan mockup

Definisi status:

- **Belum ada halaman** — tidak ada `page.tsx` Admin Desa untuk layar tersebut pada base commit.
- **Berbeda material** — halaman ada, tetapi komposisi dan komponen inti mockup tidak ada atau diganti pola lain.

| # | File | Layar | Komponen kunci mockup | Pasangan di repository | Status | Gap utama |
|---:|---|---|---|---|---|---|
| 1 | `Modern Village Admin Dashboard.png` | Beranda Admin Desa | 4 KPI (penduduk, KK, permohonan surat, pengaduan); donut statistik penduduk per gender; tren layanan surat 6 bulan; daftar permohonan surat terbaru; aktivitas terbaru; 6 akses cepat; kartu profil desa | `/beranda` dengan 3 KPI dan dua section statis | **Berbeda material** | Tidak ada donut, tren, tabel pekerjaan, aktivitas, akses cepat, maupun kartu desa. Sidebar/topbar belum mengikuti mockup. |
| 2 | `Desa Suka Maju Population Dashboard.png` | Data Penduduk | 5 KPI; tab Daftar/Kartu Keluarga/Mutasi/Statistik; pencarian NIK/nama; filter dusun, RT, status; import/export; tombol tambah; tabel 10 kolom; panel detail penduduk dengan tab Biodata/Keluarga/Mutasi/Dokumen | Use case `listPenduduk`, `getPendudukDetail`; route ekspor `penduduk/ekspor`; halaman `penduduk` belum ada | **Belum ada halaman** | Seluruh UI daftar, filter, panel detail, dan alur tambah/import belum ada. |
| 3 | `Data Statistik Penduduk Desa Suka Maju.png` | Statistik Penduduk | 6 KPI; tren jumlah penduduk; distribusi per dusun; donut usia, pendidikan, pekerjaan; statistik rumah tangga/air listrik; mutasi tahun berjalan | Halaman publik `/statistik` dan `/data/statistik`; `listPendudukStatistik`; rekap penduduk | **Belum ada halaman** | Halaman admin belum ada; agregasi usia/pendidikan/pekerjaan dan tren waktu belum tersedia. |
| 4 | `Village Letter Administration Dashboard.png` | Administrasi Surat | 5 KPI status surat; tab Permohonan/Buat/Daftar/Arsip/Template; pencarian + filter jenis/status; tabel permohonan; rail surat populer + donut status layanan | Use case permohonan surat dan layanan mandiri; route ekspor `permohonan-surat/ekspor`; halaman admin belum ada | **Belum ada halaman** | Halaman, aksi buat/arsip/template, dan hitungan "surat populer" belum ada. |
| 5 | `Desa Suka Maju Berita Dashboard.png` | Berita & Informasi | 5 KPI (berita, pengumuman, agenda, galeri, video); 6 tab; pencarian + kategori + status; tabel berita dengan pratinjau; rail pratinjau berita, statistik publikasi 30 hari, kategori | Use case publik `daftarBerita`, `daftarKategoriBerita`; halaman publik `/berita`; halaman admin belum ada | **Belum ada halaman** | CRUD berita, tab pengumuman/agenda/galeri/video, dan statistik publikasi belum ada di admin. |
| 6 | `Modern Village Administration Dashboard.png` | Pemerintahan Desa | 5 KPI (perangkat, lembaga, BPD, dusun, RT/RW); 6 tab; kartu kepala desa; tabel perangkat; ringkasan struktur; daftar lembaga; data wilayah; dokumen pemerintahan | Halaman publik `/pemerintahan`; schema perangkat/lembaga/wilayah sebagian; halaman admin belum ada | **Belum ada halaman** | Halaman admin, editor struktur/lembaga, dan unggah dokumen pemerintahan belum ada. |
| 7 | `Transparansi APBDes Desa Suka Maju.png` | Transparansi APBDes | Tahun anggaran; 4 KPI; 4 tab; grafik realisasi bulanan + garis kumulatif; donut komposisi bidang; rincian pendapatan dan belanja; kegiatan prioritas; dokumen APBDes | Use case `getLaporanKeuangan`, `getLaporanTriwulan`, dokumen laporan; halaman publik `/transparansi/apbdes`; halaman admin belum ada | **Belum ada halaman** | Halaman admin, input realisasi bulanan, komposisi bidang dalam grafik, dan status kegiatan belum ada. |
| 8 | `Village Complaints Dashboard Overview.png` | Pengaduan Masyarakat | 5 KPI status; tab Daftar/Buat/Kategori/Statistik/Laporan; tabel pengaduan; rail donut status, pengaduan per kategori, pengaduan terbaru | Use case `listPengaduanData`, `tanggapiPengaduanData`, `listPengaduanPublikData`; halaman publik `/pengaduan`; halaman admin belum ada | **Belum ada halaman** | Halaman admin, form pengaduan petugas, kategori terkelola, dan laporan belum ada. |
| 9 | `Pengaturan Desa Suka Maju Dashboard.png` | Pengaturan Desa | 7 tab; form profil desa; peta + koordinat + luas/dusun/RT/RW; editor profil singkat/visi-misi/media sosial; status situs dengan switch; dokumen identitas desa; simpan/batal | Sebagian use case desa/profil; halaman admin belum ada | **Belum ada halaman** | Halaman pengaturan, unggah logo/dokumen, editor konten, dan switch status situs belum ada. |

Catatan: halaman publik yang disebut di kolom "Pasangan" **bukan** pengganti layar admin. Halaman itu hanya menunjukkan data dan modul terkait sudah ada.

## 6. Shell saat ini dibandingkan mockup

| Area | Mockup | Implementasi (`204b91a`) | Konsekuensi |
|---|---|---|---|
| Sidebar | Navy `#0B1C3B`, identitas desa, menu bergrup dengan sub-menu, kartu pengguna di kaki | Putih, 264 px, brand `FlexiDesa.id`, label grup datar, catatan kecil di kaki | Perubahan material; perlu keputusan produk dan penyesuaian kontras/aksen. |
| Item aktif | Ungu bergradasi, sudut membulat | Biru muda dengan garis kiri biru | Perlu keputusan warna aksi (biru vs ungu). |
| Topbar | Breadcrumb, chip tanggal, notifikasi, avatar | Label "Ruang kerja administrasi" + nama desa, chip pengguna, tombol Keluar | Belum ada breadcrumb, tanggal, dan notifikasi. |
| Navigasi desa | 10 grup menu lengkap | Hanya Beranda yang benar-benar punya halaman; modul lain berlabel "Segera" lewat `RUTE_ADMIN_TERSEDIA` | Menu mockup tidak boleh ditautkan sebelum halamannya ada. |
| Konten beranda | KPI + grafik + daftar pekerjaan + akses cepat + kartu desa | 3 KPI + dua section teks | Beranda perlu dibangun ulang bila mengikuti mockup. |
| Kepadatan | Tinggi, rail kanan, tabel 10 baris | Rendah, satu kolom | Perlu komponen tabel, tab, filter, dan rail yang belum ada. |

## 7. Kecukupan data

### 7.1 Sudah cukup untuk mulai

| Kebutuhan | Bukti |
|---|---|
| Tiga KPI beranda (penduduk, KK, surat) | `getDashboardStats` di `src/features/dashboard/infrastructure/dashboard-repository.ts`, seluruh query dibatasi `villageId`. |
| Daftar dan detail penduduk | `listPenduduk`, `getPendudukDetail`, `listPendudukOptions` di `src/features/penduduk`. |
| Nama desa dan konteks tenant | `getNamaDesaUseCase`; `villageId` berasal dari sesi di `layout.tsx`. |
| Laporan keuangan dan dokumen APBDes | `getLaporanKeuangan`, `getLaporanTriwulan`, `listLaporanKeuanganDokumen`. |
| Pengaduan dan tanggapan | `listPengaduanData`, `getPengaduanDetailData`, `tanggapiPengaduanData`, `hitungStatistikPengaduan`. |
| Berita dan kategori | `daftarBerita`, `daftarKategoriBerita` di `src/features/publik`. |
| Permohonan surat | Use case layanan mandiri dan status permohonan. |

### 7.2 Parsial

| Kebutuhan mockup | Kondisi |
|---|---|
| Tren penduduk dan tren surat 6 bulan | Tidak ada query deret waktu; tabel menyimpan `createdAt`, jadi agregasi bulanan masih harus dibuat. |
| Donut usia, pendidikan, pekerjaan | Data mentah ada di `residents`; agregasi belum ada di `StatistikDesa`. |
| Distribusi per dusun dengan persentase | Statistik per dusun sudah dihitung, tetapi bentuk grafik dan persentase belum disiapkan. |
| Mutasi penduduk tahun berjalan | Riwayat penduduk tersedia; rekap lahir/mati/masuk/keluar per tahun belum ada. |
| Aktivitas terbaru lintas modul | `audit_logs` ada untuk platform; feed aktivitas desa belum disusun. |
| Surat populer dan donut status layanan | Status permohonan tersedia; hitungan frekuensi jenis surat belum ada. |
| Dokumen identitas desa dan unggah logo | Sebagian field desa ada; pengelolaan berkas dan metadata dokumen belum. |
| Peta wilayah dan luas desa | `regions` menyimpan dusun/RT/RW; luas, batas, dan geometri belum lengkap. |
| Notifikasi admin | Belum ada model notifikasi untuk Admin Desa. |

### 7.3 Belum ada

- Editor template surat dan arsip surat pada layar Administrasi Surat.
- Tab Video dan statistik publikasi 30 hari pada modul Berita.
- Pengelolaan BPD, lembaga, dan struktur organisasi dari sisi admin.
- Input realisasi anggaran bulanan dan status kegiatan prioritas.
- Kategori pengaduan yang bisa dikelola admin dan laporan pengaduan.
- Switch status situs desa dan editor media sosial.

## 8. Keamanan dan tenant

- **Data pribadi pada mockup adalah contoh.** Nama, NIK, nomor KK, nomor HP, dan foto pada gambar tidak boleh dipakai sebagai fixture, disalin ke test, atau dimasukkan ke laporan. Fixture wajib sintetis.
- Setiap halaman baru (penduduk, surat, berita, pemerintahan, APBDes, pengaduan, pengaturan) harus memanggil `verifySession`, memeriksa permission server-side, dan mengambil `villageId` dari sesi. Parameter `dusun`, `rt`, `status`, atau `tahun` hanya untuk filter, bukan bukti kepemilikan data.
- Panel detail penduduk dan ekspor wajib dibatasi tenant; ID penduduk dari tenant lain harus ditolak, bukan hanya tidak ditampilkan.
- Export PDF/Excel dan cetak laporan mengikuti kontrol yang sudah ada; jangan menambah endpoint baru tanpa pemeriksaan permission dan batas jumlah baris.
- Badge notifikasi dan angka KPI harus dihitung dari data tenant sendiri. Jangan menampilkan agregat lintas desa pada shell Admin Desa.
- Aksi berisiko pada Pengaturan Desa (mengaktifkan/menonaktifkan situs, menghapus dokumen) memerlukan konfirmasi dan jejak audit sebelum diimplementasikan.

## 9. Rekomendasi urutan kerja

**P0 — keputusan sebelum coding**

1. Tetapkan arah visual Admin Desa: mengikuti sidebar navy + aksi ungu seperti mockup, atau mempertahankan biru/putih sekarang. Tanpa keputusan ini, pekerjaan shell akan dikerjakan dua kali.
2. Tetapkan satu referensi utama untuk shell. Sembilan mockup konsisten, tetapi tidak ada varian mobile; perilaku responsif harus diputuskan terpisah.
3. Setujui bahwa mockup adalah target bertahap, bukan satu rilis: delapan halaman belum ada.

**P1 — fondasi shell dan beranda**

4. Sesuaikan shell (sidebar, topbar, breadcrumb, kartu pengguna) dan tambahkan komponen bersama: kartu KPI, chip status, tab pil, toolbar filter, tabel dengan paginasi, rail panel.
5. Bangun ulang `/beranda` mengikuti mockup dengan data yang sudah ada: KPI penduduk/KK/surat ditambah permohonan surat dan pengaduan; tren dan aktivitas ditunda sampai query tersedia.
6. Tambahkan agregasi yang dibutuhkan beranda: tren 6 bulan, hitungan permohonan per status, feed aktivitas.

**P2 — halaman modul, satu per satu**

7. Data Penduduk (daftar, filter, detail) karena backend-nya paling siap.
8. Pengaduan Masyarakat, karena daftar, detail, tanggapan, dan statistik sudah tersedia.
9. Administrasi Surat.
10. Transparansi APBDes.
11. Statistik Penduduk setelah agregasi usia/pendidikan/pekerjaan dibuat.
12. Berita & Informasi.
13. Pemerintahan Desa.
14. Pengaturan Desa, terakhir karena menyentuh unggahan berkas dan status situs.

Setiap halaman sebaiknya menjadi task terpisah dengan laporan sendiri, sesuai aturan satu task satu perubahan terfokus.

## 10. Batasan review

- Tidak ada tangkapan layar runtime atau perbandingan browser; status "berbeda material" hanya berlaku untuk `/beranda`, dan delapan layar lain dinilai dari ketiadaan halaman.
- Tidak ada mockup mobile, tablet, dark mode, atau state kosong/error/loading. Perilaku responsif dan state harus diputuskan saat implementasi.
- Nama font tidak dapat dipastikan dari PNG; angka px, radius, dan bayangan adalah perkiraan visual.
- Warna diambil dari area gambar, sehingga bisa tercampur gradien, ilustrasi, dan anti-aliasing. Verifikasi ulang dengan sampel titik tunggal sebelum dijadikan token.
- Tidak ada data tenant yang dipakai pada review ini, sehingga kepadatan tabel, pemotongan teks, dan perilaku dengan konten nyata belum diuji.
- Tidak ada perubahan kode, migration, atau data pada review ini.

## 11. Status pekerjaan

- **File berubah:** laporan ini (baru), katalog `docs/mockups/README.md`, indeks `docs/README.md`, serta catatan status di `docs/design/DESIGN-SYSTEM.md` dan `docs/design/ADMIN-PLATFORM-DESIGN.md` agar tidak lagi menyatakan Admin Desa tanpa referensi.
- **Source code:** tidak berubah.
- **Mockup:** sembilan PNG di `docs/mockups/village/` masih berstatus untracked pada saat laporan ditulis.
- **Validasi:** pembacaan sembilan PNG, sampling warna, penelusuran route `src/app`, `RUTE_ADMIN_TERSEDIA`, shell admin, dan use case terkait. Tidak ada typecheck/lint/test karena tidak ada perubahan kode.
- **Git:** belum di-commit dan belum di-push; menunggu instruksi pemilik task.
- **Status:** siap review sebagai dokumen acuan desain dan rencana kerja.
