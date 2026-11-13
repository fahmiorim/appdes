# Inventaris Screenshot dan Referensi UI FlexiDesa

> Baseline: `main` pada commit `343ef35a7858303eb82afc69c8caca7848a1a8e7`.
> Tujuan: menjadikan aset desain yang sudah ada sebagai referensi implementasi, bukan membuat ulang desain tanpa alasan.

## Ringkasan

Ditemukan **39 file gambar PNG** di bawah `docs/`:

| Kelompok | Jumlah | Folder |
|---|---:|---|
| Halaman publik desa | 21 | `docs/public/` |
| Akun dan autentikasi | 11 | `docs/account/` |
| Halaman pendukung | 7 | `docs/pendukung/` |
| **Total** | **39** | |

File-file ini adalah aset referensi desain. Keberadaan screenshot tidak otomatis berarti halaman sudah diimplementasikan atau siap produksi.

## A. Website publik desa — 21 screenshot

| No. | File referensi | Area/halaman |
|---:|---|---|
| 1 | `docs/public/Sistem Informasi Desa Suka Maju.png` | Beranda utama |
| 2 | `docs/public/Profil Desa Suka Maju_ Informasi dan Potensi Desa.png` | Profil desa |
| 3 | `docs/public/Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png` | Sejarah desa |
| 4 | `docs/public/Visi & Misi Desa Suka Maju.png` | Visi dan misi |
| 5 | `docs/public/Pemerintahan Desa Suka Maju Dashboard.png` | Pemerintahan/struktur |
| 6 | `docs/public/Village Official Profile Dashboard.png` | Profil perangkat desa |
| 7 | `docs/public/Wilayah Desa Suka Maju.png` | Wilayah desa |
| 8 | `docs/public/Village News Dashboard – Desa Suka Maju.png` | Daftar berita |
| 9 | `docs/public/Berita Gotong Royong Desa Suka Maju.png` | Detail berita |
| 10 | `docs/public/Pengumuman Musdes Desa Suka Maju.png` | Pengumuman |
| 11 | `docs/public/Agenda Kegiatan Desa Suka Maju.png` | Agenda kegiatan |
| 12 | `docs/public/Suka Maju Village Gallery Dashboard.png` | Galeri |
| 13 | `docs/public/Desa Suka Maju Photo Gallery.png` | Tampilan foto/galeri |
| 14 | `docs/public/Potensi Desa Suka Maju Dashboard.png` | Potensi desa |
| 15 | `docs/public/Data Statistik Desa Suka Maju Dashboard.png` | Statistik |
| 16 | `docs/public/Desa Suka Maju APBDes Dashboard.png` | APBDes |
| 17 | `docs/public/Indonesian Village Finance Dashboard.png` | Informasi keuangan |
| 18 | `docs/public/Desa Sukamaju Online Services.png` | Layanan online |
| 19 | `docs/public/Suka Maju Online Letter Services Dashboard.png` | Layanan surat |
| 20 | `docs/public/Kontak & Pengaduan Desa Suka Maju.png` | Kontak/pengaduan |
| 21 | `docs/public/Suka Maju Village Information Dashboard.png` | Informasi desa |

## B. Akun dan autentikasi — 11 screenshot

| No. | File referensi | Area/halaman |
|---:|---|---|
| 1 | `docs/account/Modern Indonesian Village Login Portal.png` | Login |
| 2 | `docs/account/SID Desa Sukamaju Registration Page.png` | Registrasi |
| 3 | `docs/account/SID Desa Sukamaju OTP Verification.png` | Verifikasi OTP |
| 4 | `docs/account/SID Desa Sukamaju_ Akun Terverifikasi.png` | Status akun terverifikasi |
| 5 | `docs/account/SID Desa Sukamaju Reset Kata Sandi.png` | Reset kata sandi |
| 6 | `docs/account/Reset Kata Sandi SID Desa Sukamaju.png` | Alur reset kata sandi |
| 7 | `docs/account/Sukamaju Village Profile Dashboard.png` | Profil pengguna |
| 8 | `docs/account/Edit Profil Pengguna SID Desa Sukamaju.png` | Edit profil |
| 9 | `docs/account/Pengaturan Keamanan Akun Desa Sukamaju.png` | Keamanan akun |
| 10 | `docs/account/SID Desa Sukamaju Notification Settings Dashboard.png` | Preferensi notifikasi |
| 11 | `docs/account/Riwayat Pengajuan Layanan Desa Sukamaju.png` | Riwayat pengajuan warga |

## C. Halaman pendukung — 7 screenshot

| No. | File referensi | Area/halaman |
|---:|---|---|
| 1 | `docs/pendukung/SID Desa Sukamaju 404 Page.png` | Not found |
| 2 | `docs/pendukung/SID Desa Sukamaju Maintenance Page.png` | Maintenance |
| 3 | `docs/pendukung/Akses Ditolak di Desa Sukamaju.png` | Forbidden/akses ditolak |
| 4 | `docs/pendukung/SID Desa Sukamaju Search Results.png` | Hasil pencarian |
| 5 | `docs/pendukung/Sitemap Desa Sukamaju Website.png` | Sitemap |
| 6 | `docs/pendukung/Kebijakan Privasi SID Sukamaju.png` | Kebijakan privasi |
| 7 | `docs/pendukung/Syarat dan Ketentuan SID Desa Sukamaju.png` | Syarat dan ketentuan |

## D. Cara menggunakan aset

1. Screenshot di atas adalah referensi visual per halaman; jangan menganggap nama file sebagai spesifikasi lengkap interaksi.
2. Sebelum implementasi halaman, buka screenshot asli dari path repository dan catat layout, hierarchy, warna, typography, ukuran, states, dan responsive behavior.
3. Bila dua screenshot menggambarkan halaman serupa, bandingkan dan tetapkan satu sebagai referensi utama; jangan menggabungkan elemen yang bertentangan tanpa keputusan desain.
4. Gunakan data dummy yang jelas untuk demo. Jangan memasukkan NIK, nomor KK, atau data warga sungguhan ke screenshot/fixture.
5. Perubahan dari referensi harus dicatat di matriks implementasi beserta alasan.

## E. Catatan hasil pemeriksaan repository

Pada baseline commit di atas, folder screenshot tersedia. Namun pemeriksaan struktur `src/app` menemukan route handler/API (termasuk ekspor/PDF), bukan file halaman Next.js `page.tsx`/komponen UI yang dapat dipetakan satu per satu ke 39 screenshot. Karena itu, status implementasi visual pada matriks ditandai **belum terverifikasi / UI belum ditemukan pada baseline**, bukan dianggap selesai hanya karena backend feature atau route ekspor tersedia.

## F. Referensi terkait

- [Peta fitur SID](../SID_FEATURE_MAP.md)
- [Master roadmap](../MASTER_ROADMAP.md)
- [Design System](./DESIGN-SYSTEM.md)
- [Matriks screenshot ke implementasi](./SCREENSHOT-IMPLEMENTATION-MATRIX.md)
