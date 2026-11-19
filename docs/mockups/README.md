# Mockup dan Referensi UI

Katalog aset desain Appdes SID. Seluruh gambar di folder ini adalah **referensi visual**, bukan bukti bahwa halaman sudah diimplementasikan atau lulus visual acceptance.

Diperbarui: 19 November 2026. Status implementasi mengikuti cakupan masing-masing: 38 layar **Super Admin** dipetakan di [audit mockup Super Admin](../reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md), 10 layar **Admin Desa** ditinjau di [review mockup Admin Desa](../reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md), dan [audit final 42 mockup](../reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md) tetap menjadi snapshot historis untuk publik, akun, dan pendukung. Audit final tidak mencakup 37 layar Super Admin yang ditambahkan kemudian.

## Ringkasan

| Kelompok | Jumlah | Folder |
|---|---:|---|
| Website publik desa | 21 | [`public/`](./public/) |
| Akun dan autentikasi | 11 | [`account/`](./account/) |
| Halaman pendukung | 7 | [`support/`](./support/) |
| Platform | 40 | [`platform/`](./platform/) |
| Dashboard Admin Desa | 10 | [`village/`](./village/) |
| **Total** | **89** | |

Folder `account/` memuat 11 referensi akun warga. Folder `platform/` memuat landing platform, login Super Admin, dan 38 layar konsol Super Admin. Folder `village/` memuat sepuluh layar kerja Admin Desa untuk satu tenant contoh (Desa Suka Maju). Angka dan nama di dalamnya adalah data contoh; perlakukan sebagai data sensitif dan jangan dipakai sebagai fixture.

## A. Website publik desa — 21

| No. | File | Area |
|---:|---|---|
| 1 | [`Sistem Informasi Desa Suka Maju.png`](./public/Sistem%20Informasi%20Desa%20Suka%20Maju.png) | Beranda |
| 2 | [`Profil Desa Suka Maju_ Informasi dan Potensi Desa.png`](./public/Profil%20Desa%20Suka%20Maju_%20Informasi%20dan%20Potensi%20Desa.png) | Profil desa |
| 3 | [`Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png`](./public/Sejarah%20Desa%20Suka%20Maju_%20Jejak%20Perjalanan%20Desa.png) | Sejarah |
| 4 | [`Visi & Misi Desa Suka Maju.png`](./public/Visi%20%26%20Misi%20Desa%20Suka%20Maju.png) | Visi dan misi |
| 5 | [`Pemerintahan Desa Suka Maju Dashboard.png`](./public/Pemerintahan%20Desa%20Suka%20Maju%20Dashboard.png) | Pemerintahan |
| 6 | [`Village Official Profile Dashboard.png`](./public/Village%20Official%20Profile%20Dashboard.png) | Detail perangkat |
| 7 | [`Wilayah Desa Suka Maju.png`](./public/Wilayah%20Desa%20Suka%20Maju.png) | Wilayah |
| 8 | [`Village News Dashboard – Desa Suka Maju.png`](./public/Village%20News%20Dashboard%20%E2%80%93%20Desa%20Suka%20Maju.png) | Daftar berita |
| 9 | [`Berita Gotong Royong Desa Suka Maju.png`](./public/Berita%20Gotong%20Royong%20Desa%20Suka%20Maju.png) | Detail berita |
| 10 | [`Pengumuman Musdes Desa Suka Maju.png`](./public/Pengumuman%20Musdes%20Desa%20Suka%20Maju.png) | Pengumuman |
| 11 | [`Agenda Kegiatan Desa Suka Maju.png`](./public/Agenda%20Kegiatan%20Desa%20Suka%20Maju.png) | Agenda |
| 12 | [`Suka Maju Village Gallery Dashboard.png`](./public/Suka%20Maju%20Village%20Gallery%20Dashboard.png) | Galeri |
| 13 | [`Desa Suka Maju Photo Gallery.png`](./public/Desa%20Suka%20Maju%20Photo%20Gallery.png) | Foto galeri |
| 14 | [`Potensi Desa Suka Maju Dashboard.png`](./public/Potensi%20Desa%20Suka%20Maju%20Dashboard.png) | Potensi |
| 15 | [`Data Statistik Desa Suka Maju Dashboard.png`](./public/Data%20Statistik%20Desa%20Suka%20Maju%20Dashboard.png) | Statistik |
| 16 | [`Desa Suka Maju APBDes Dashboard.png`](./public/Desa%20Suka%20Maju%20APBDes%20Dashboard.png) | APBDes |
| 17 | [`Indonesian Village Finance Dashboard.png`](./public/Indonesian%20Village%20Finance%20Dashboard.png) | Informasi keuangan |
| 18 | [`Desa Sukamaju Online Services.png`](./public/Desa%20Sukamaju%20Online%20Services.png) | Katalog layanan |
| 19 | [`Suka Maju Online Letter Services Dashboard.png`](./public/Suka%20Maju%20Online%20Letter%20Services%20Dashboard.png) | Layanan surat |
| 20 | [`Kontak & Pengaduan Desa Suka Maju.png`](./public/Kontak%20%26%20Pengaduan%20Desa%20Suka%20Maju.png) | Kontak dan pengaduan |
| 21 | [`Suka Maju Village Information Dashboard.png`](./public/Suka%20Maju%20Village%20Information%20Dashboard.png) | Informasi desa |

## B. Akun dan autentikasi — 11

| No. | File | Area |
|---:|---|---|
| 1 | [`Modern Indonesian Village Login Portal.png`](./account/Modern%20Indonesian%20Village%20Login%20Portal.png) | Login warga |
| 2 | [`SID Desa Sukamaju Registration Page.png`](./account/SID%20Desa%20Sukamaju%20Registration%20Page.png) | Registrasi |
| 3 | [`SID Desa Sukamaju OTP Verification.png`](./account/SID%20Desa%20Sukamaju%20OTP%20Verification.png) | Verifikasi OTP |
| 4 | [`SID Desa Sukamaju_ Akun Terverifikasi.png`](./account/SID%20Desa%20Sukamaju_%20Akun%20Terverifikasi.png) | Akun terverifikasi |
| 5 | [`SID Desa Sukamaju Reset Kata Sandi.png`](./account/SID%20Desa%20Sukamaju%20Reset%20Kata%20Sandi.png) | Reset kata sandi |
| 6 | [`Reset Kata Sandi SID Desa Sukamaju.png`](./account/Reset%20Kata%20Sandi%20SID%20Desa%20Sukamaju.png) | Alur reset kata sandi |
| 7 | [`Sukamaju Village Profile Dashboard.png`](./account/Sukamaju%20Village%20Profile%20Dashboard.png) | Profil pengguna |
| 8 | [`Edit Profil Pengguna SID Desa Sukamaju.png`](./account/Edit%20Profil%20Pengguna%20SID%20Desa%20Sukamaju.png) | Edit profil |
| 9 | [`Pengaturan Keamanan Akun Desa Sukamaju.png`](./account/Pengaturan%20Keamanan%20Akun%20Desa%20Sukamaju.png) | Keamanan akun |
| 10 | [`SID Desa Sukamaju Notification Settings Dashboard.png`](./account/SID%20Desa%20Sukamaju%20Notification%20Settings%20Dashboard.png) | Preferensi notifikasi |
| 11 | [`Riwayat Pengajuan Layanan Desa Sukamaju.png`](./account/Riwayat%20Pengajuan%20Layanan%20Desa%20Sukamaju.png) | Riwayat layanan |

## C. Halaman pendukung — 7

| No. | File | Area |
|---:|---|---|
| 1 | [`SID Desa Sukamaju 404 Page.png`](./support/SID%20Desa%20Sukamaju%20404%20Page.png) | 404 |
| 2 | [`SID Desa Sukamaju Maintenance Page.png`](./support/SID%20Desa%20Sukamaju%20Maintenance%20Page.png) | Maintenance |
| 3 | [`Akses Ditolak di Desa Sukamaju.png`](./support/Akses%20Ditolak%20di%20Desa%20Sukamaju.png) | 403 |
| 4 | [`SID Desa Sukamaju Search Results.png`](./support/SID%20Desa%20Sukamaju%20Search%20Results.png) | Hasil pencarian |
| 5 | [`Sitemap Desa Sukamaju Website.png`](./support/Sitemap%20Desa%20Sukamaju%20Website.png) | Sitemap |
| 6 | [`Kebijakan Privasi SID Sukamaju.png`](./support/Kebijakan%20Privasi%20SID%20Sukamaju.png) | Kebijakan privasi |
| 7 | [`Syarat dan Ketentuan SID Desa Sukamaju.png`](./support/Syarat%20dan%20Ketentuan%20SID%20Desa%20Sukamaju.png) | Syarat dan ketentuan |

## D. Platform — 40

Landing dan login berada langsung di `platform/`; 38 layar konsol berada di `platform/super-admin/`. Sebelum implementasi, baca [audit mockup Super Admin](../reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md) untuk status dan risiko per area.

### D.1 Landing dan login — 2

| No. | File | Area |
|---:|---|---|
| 1 | [`FlexiDesa.id Modern Village Dashboard.png`](./platform/landing/FlexiDesa.id%20Modern%20Village%20Dashboard.png) | Landing platform |
| 2 | [`FlexiDesa Super Admin Login Interface.png`](./platform/FlexiDesa%20Super%20Admin%20Login%20Interface.png) | Login Super Admin |

### D.2 Konsol Super Admin — 38

| No. | File | Area | Folder |
|---:|---|---|---|
| 1 | `FlexiDesa Super Admin Dashboard.png` | Dashboard | akar |
| 2 | `FlexiDesa Audit Trail Dashboard.png` | Audit trail | akar |
| 3 | `FlexiDesa.id Tenant Management Dashboard.png` | Daftar tenant | Manajemen Tenant |
| 4 | `Tambah Tenant_ Template & Tampilan.png` | Tambah tenant | Manajemen Tenant |
| 5 | `FlexiDesa Template & Tampilan Dashboard.png` | Template dan tampilan | Manajemen Tenant |
| 6 | `FlexiDesa Import Data Dashboard.png` | Import data desa | Manajemen Tenant |
| 7 | `FlexiDesa Domain Overview Dashboard.png` | Ringkasan domain | Desa & Domain |
| 8 | `FlexiDesa Domain Management Dashboard.png` | Daftar domain | Desa & Domain |
| 9 | `FlexiDesa Domain Setup Dashboard.png` | Tambah domain | Desa & Domain |
| 10 | `FlexiDesa Template Dashboard.png` | Detail template | Manajemen Template |
| 11 | `FlexiDesa Template Management Dashboard.png` | Penggunaan dan pembaruan | Manajemen Template |
| 12 | `FlexiDesa Template Wizard Dashboard.png` | Tambah template | Manajemen Template |
| 13 | `Purple Template Catalog Dashboard.png` | Katalog template | Manajemen Template |
| 14 | `FlexiDesa User Management Dashboard.png` | Daftar pengguna | Pengguna & Peran |
| 15 | `FlexiDesa User Detail Dashboard.png` | Detail pengguna | Pengguna & Peran |
| 16 | `Tambah Pengguna Admin Desa.png` | Tambah admin desa | Pengguna & Peran |
| 17 | `FlexiDesa Role Permissions Dashboard.png` | Peran dan hak akses | Pengguna & Peran |
| 18 | `FlexiDesa Paket & Langganan Dashboard.png` | Manajemen paket | Langganan & Paket |
| 19 | `FlexiDesa Subscription Dashboard.png` | Dashboard langganan | Langganan & Paket |
| 20 | `FlexiDesa Subscription Management Dashboard.png` | Daftar dan detail langganan | Langganan & Paket |
| 21 | `FlexiDesa Invoice Dashboard.png` | Invoice | Langganan & Paket |
| 22 | `FlexiDesa Transaction History Dashboard.png` | Riwayat transaksi | Langganan & Paket |
| 23 | `FlexiDesa Monitoring Dashboard.png` | Dashboard monitoring | Monitoring |
| 24 | `FlexiDesa Monitoring Dashboard (1).png` | Varian dashboard monitoring | Monitoring |
| 25 | `Server & Storage Monitoring Dashboard.png` | Server dan storage | Monitoring |
| 26 | `FlexiDesa Database Monitoring Dashboard.png` | Database | Monitoring |
| 27 | `Monitoring Backup & Recovery Dashboard.png` | Backup dan recovery | Monitoring |
| 28 | `FlexiDesa Security Dashboard.png` | Dashboard keamanan | Keamanan |
| 29 | `FlexiDesa Security Events Dashboard.png` | Security events | Keamanan |
| 30 | `Keamanan Firewall & IP Management Dashboard.png` | Firewall dan IP | Keamanan |
| 31 | `FlexiDesa Vulnerability Management Dashboard.png` | Vulnerability | Keamanan |
| 32 | `FlexiDesa Security Policy Dashboard.png` | Security policy | Keamanan |
| 33 | `FlexiDesa Analytics Dashboard.png` | Analytics | Laporan & Analitik |
| 34 | `FlexiDesa Analitik Dashboard.png` | Analitik penggunaan | Laporan & Analitik |
| 35 | `FlexiDesa Tenant Analytics Dashboard.png` | Analitik tenant | Laporan & Analitik |
| 36 | `FlexiDesa Platform Configuration Dashboard.png` | Pengaturan umum | Konfigurasi Platform |
| 37 | `FlexiDesa Infrastructure Dashboard.png` | Infrastruktur | Konfigurasi Platform |
| 38 | `Konfigurasi Sistem FlexiDesa.id.png` | Konfigurasi sistem | Konfigurasi Platform |

## E. Dashboard Admin Desa — 10

Ditambahkan 19 November 2026. Seluruh file berukuran 1536 × 1024 dan hanya tersedia dalam satu varian desktop.

| No. | File | Area |
|---:|---|---|
| 1 | [`Modern Village Admin Dashboard.png`](./village/Modern%20Village%20Admin%20Dashboard.png) | Beranda Admin Desa |
| 2 | [`Desa Suka Maju Population Dashboard.png`](./village/Desa%20Suka%20Maju%20Population%20Dashboard.png) | Data penduduk |
| 3 | [`Data Statistik Penduduk Desa Suka Maju.png`](./village/Data%20Statistik%20Penduduk%20Desa%20Suka%20Maju.png) | Statistik penduduk |
| 4 | [`Village Letter Administration Dashboard.png`](./village/Village%20Letter%20Administration%20Dashboard.png) | Administrasi surat |
| 5 | [`Desa Suka Maju Berita Dashboard.png`](./village/Desa%20Suka%20Maju%20Berita%20Dashboard.png) | Berita dan informasi |
| 6 | [`Modern Village Administration Dashboard.png`](./village/Modern%20Village%20Administration%20Dashboard.png) | Pemerintahan desa |
| 7 | [`Transparansi APBDes Desa Suka Maju.png`](./village/Transparansi%20APBDes%20Desa%20Suka%20Maju.png) | Transparansi APBDes |
| 8 | [`Village Complaints Dashboard Overview.png`](./village/Village%20Complaints%20Dashboard%20Overview.png) | Pengaduan masyarakat |
| 9 | [`Pengaturan Desa Suka Maju Dashboard.png`](./village/Pengaturan%20Desa%20Suka%20Maju%20Dashboard.png) | Pengaturan desa |
| 10 | [`User Management & Access Dashboard.png`](./village/User%20Management%20%26%20Access%20Dashboard.png) | Manajemen pengguna dan hak akses (ditambahkan 19 November 2026) |

## Aturan penggunaan

1. Buka PNG asli sebelum implementasi; nama file bukan spesifikasi interaksi.
2. Catat layout, hierarchy, warna, tipografi, ukuran, state, dan perilaku responsif.
3. Bila dua referensi mirip, tetapkan satu sebagai acuan utama; jangan menggabungkan elemen yang bertentangan.
4. Gunakan data sintetis. Jangan menambahkan NIK, nomor KK, atau data warga nyata ke mockup, fixture, atau laporan.
5. Perbedaan implementasi dari referensi dicatat di laporan audit, bukan dengan mengubah gambar referensi.
6. Referensi visual bukan pengganti pengujian browser; status implementasi mengikuti laporan audit sesuai cakupannya (lihat [Referensi](#referensi)), bukan gambar referensi.
7. Untuk layar Admin Desa, folder `village/` menjadi acuan visual utama. Folder `public/` adalah versi publik desa dan tidak boleh dijadikan pengganti dashboard admin.

## Referensi

- [Audit final mockup ↔ UI ↔ backend](../reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md)
- [Design system](../design/DESIGN-SYSTEM.md)
- [Review mockup Admin Desa](../reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md)
- [Audit mockup Super Admin](../reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md)
- [Spesifikasi visual admin dan Super Admin](../design/ADMIN-PLATFORM-DESIGN.md)
- [Peta dokumentasi](../README.md)
