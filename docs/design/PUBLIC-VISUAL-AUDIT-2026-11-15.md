# Audit Visual Website Publik — 15 November 2026

## Cakupan dan bukti

- Repository: `fahmiorim/appdes`
- Baseline: `main` pada `7b09691c853a968ffddd8eb3a715f9443a1c3683`
- Browser: Chromium melalui Playwright
- Viewport: desktop `1440×1000`, mobile `390×844`
- Tenant fixture: `sukamaju.localhost` dengan data sintetis
- Workflow run: [#43708502875](https://github.com/fahmiorim/appdes/actions/runs/43708502875)
- Artifact: `flexidesa-public-visual-qa` (32 screenshot halaman publik + 2 screenshot login + referensi; tersedia sampai 22 November 2026)

Screenshot berhasil dibuat untuk 16 URL publik pada desktop dan mobile. Ini membuktikan route dapat dirender pada fixture tersebut, bukan berarti visualnya sudah diterima.

## Temuan visual berdasarkan screenshot aktual

| Halaman | Temuan | Prioritas |
|---|---|---|
| Agenda | Kalender dasar sudah tampil. Referensi memiliki hero visual, tab kategori, 4 ringkasan metrik, daftar agenda dengan gambar/waktu/status, panel notifikasi dan unduhan PDF. Implementasi masih jauh lebih sederhana. PR #51 menambah navigasi bulan dan panel tanggal, tetapi belum menutup gap tersebut. | Tinggi |
| Galeri | Implementasi hanya menampilkan satu album; cover album pada screenshot desktop tampak kosong/placeholder. Referensi memiliki tab Semua/Foto/Video/Album, pencarian, kategori, banyak kartu album/foto, video dan CTA. | Tinggi |
| Detail galeri | Fixture hanya memiliki satu foto; referensi menampilkan grid foto yang lebih kaya. Perlu fixture beberapa foto sebelum menilai grid secara adil. | Sedang |
| Potensi | Halaman saat ini hanya menampilkan satu paragraf dalam satu kartu. Referensi memiliki kartu kategori potensi, detail unggulan, metrik, galeri dan CTA. Data terstruktur potensi belum tersedia; jangan mengisi dengan data rekaan. | Kritis |
| Wilayah | Hanya menampilkan jumlah dusun/RW/RT dan satu daftar wilayah. Referensi memiliki peta, informasi geografis, batas administratif, tabel pembagian dusun, kondisi geografis dan unduhan. Tidak ada koordinat/poligon dalam kontrak data saat ini; peta tidak boleh direkayasa. | Kritis |
| Kontak | Menampilkan empat kartu alamat/telepon/email/website. Referensi juga memuat form pengaduan, saluran sosial, jam pelayanan, peta/lokasi kantor dan FAQ. Endpoint pengaduan publik dan data pendukung perlu dipastikan sebelum form aktif. | Tinggi |
| Pengaduan | Hanya menampilkan daftar/status pengaduan publik; belum ada form kirim pengaduan, pelacakan tiket, atau FAQ seperti referensi. Perlu validasi alur publik, rate limit dan proteksi spam. | Tinggi |
| APBDes | Ringkasan dan progress anggaran tersedia. Referensi juga memiliki komposisi belanja berbentuk chart, rincian pendapatan/belanja, laporan realisasi, grafik dan dokumen terkait. Beberapa bagian visual/data belum ada. | Tinggi |
| Statistik | Sudah memiliki KPI, komposisi gender, sebaran dusun, bantuan sosial, ringkasan APBDes dan tabel wilayah. Masih lebih ringkas daripada referensi dan perlu cek kelengkapan kategori/visualisasi. | Sedang |
| Pemerintahan | Struktur organisasi dan kartu perangkat tampil, tetapi sederhana dibanding referensi; perlu foto/profil perangkat dan detail jabatan bila datanya tersedia. | Sedang |
| Dokumen | Daftar dokumen berfungsi tetapi sangat ringkas; perlu evaluasi filter kategori/tahun, metadata, ikon/ukuran file dan pola unduh sesuai referensi. | Sedang |
| Layanan | Katalog surat dan CTA tampil, tetapi referensi lebih kaya kategori/jenis layanan dan informasi persyaratan. | Sedang |
| Layanan surat | Jenis surat tampil sebagai daftar; perlu periksa detail persyaratan, alur pengajuan dan status agar tidak sekadar katalog. | Sedang |
| Profil | Halaman berisi beberapa bagian profil dan perangkat, tetapi masih perlu perbandingan detail terhadap hierarki, navigasi sekunder dan konten referensi. | Sedang |
| Sejarah | Konten sejarah tampil dalam satu bagian utama; referensi lebih kaya dan perlu struktur/timeline bila sumber data mendukung. | Sedang |
| Visi-Misi | Dua kartu visi dan misi tampil; perlu peningkatan hierarki dan detail visual sesuai referensi. | Rendah–Sedang |

## Cakupan screenshot yang belum lengkap

Workflow saat ini mengambil 16 URL, tetapi belum mengambil:
- Beranda publik `/`
- Daftar berita `/berita`
- Detail berita `/berita/[slug]`
- Alias statistik `/statistik`

Tujuh referensi publik belum memiliki pasangan screenshot pada workflow saat ini: daftar berita, detail berita, pengumuman, profil perangkat, informasi keuangan, halaman informasi desa, dan satu referensi halaman informasi/konten publik yang belum dipetakan ke route final. Route yang belum dibuat atau belum memiliki data tidak boleh dianggap lulus. Route yang belum dibuat atau belum memiliki data tidak boleh dianggap lulus.

## Temuan lintas halaman

1. Header/navigasi tidak konsisten: label navigasi dan identitas kecil di bawah nama desa berubah mengikuti halaman; beberapa screenshot memakai mark generik atau huruf inisial alih-alih identitas visual desa.
2. Banyak halaman menggunakan hero gradient generik tanpa ilustrasi/foto/ornamen utama yang ada di referensi.
3. Footer saat ini sangat minimal dibanding footer referensi multi-kolom.
4. Sebagian halaman tampak terlalu kosong pada desktop karena data fixture sedikit dan komponen yang belum ada. Pisahkan kekurangan fixture dari kekurangan layout sebelum mengubah UI.
5. Screenshot mobile berhasil dirender, tetapi acceptance responsif tetap perlu pemeriksaan ukuran teks, overflow, target sentuh, dan urutan konten per halaman.

## Gerbang penerimaan berikutnya

- [ ] Tambahkan screenshot desktop/mobile untuk beranda, daftar berita, detail berita, dan alias statistik.
- [ ] Perkaya fixture sintetis (beberapa album/foto, berita, perangkat, dan data lain) agar tampilan padat dapat diuji tanpa data warga nyata.
- [ ] Selesaikan kontrak backend untuk potensi terstruktur, koordinat/poligon wilayah, pengaduan publik, media agenda, dan dokumen/laporan.
- [ ] Perbaiki halaman prioritas: Potensi, Wilayah, Galeri, Kontak/Pengaduan, APBDes, Agenda.
- [ ] Konsolidasikan public shell setelah semua screenshot dibandingkan; hindari refactor buta.
- [ ] Jalankan kembali seluruh CI dan bandingkan screenshot baru dengan referensi pada kedua viewport.

## Status

**Belum visual acceptance.** Semua screenshot pada workflow ini merupakan bukti baseline aktual. Halaman dinyatakan `accepted` hanya setelah gap yang dapat ditutup telah diperbaiki, batasan data didokumentasikan, dan screenshot terbaru diperiksa.
