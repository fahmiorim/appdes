# Audit Visual Website Publik — 15 November 2026

## Ringkasan eksekutif

**Hasil: visual acceptance belum lulus.** Halaman publik yang ditangkap browser dapat dirender, tetapi tampilan aktual masih berbeda secara material dari screenshot desain yang menjadi sumber kebenaran. Perbedaan utama ada pada public shell, hero, kepadatan konten, komponen halaman, dan data fixture.

Audit ini menggunakan screenshot aktual dari GitHub Actions, bukan inspeksi source code saja.

- Repository: `fahmiorim/appdes`
- Main setelah merge PR #49: `7b09691c853a968ffddd8eb3a715f9443a1c3683`
- Screenshot diambil dari workflow CI PR #49 pada head `1df0db6be3549875a68e8494e14a9d79afca49df`, yang kemudian di-squash merge menjadi commit main di atas.
- Workflow run: `43695580622`
- Artifact: `flexidesa-public-visual-qa` (artifact ID `14154346377`)
- Hasil CI: quality, integration MySQL 8, dan visual QA semuanya success.
- Cakupan artifact: 16 route publik, masing-masing desktop dan mobile; 14 file screenshot referensi publik disertakan.

> CI success hanya membuktikan build, render, dan screenshot berhasil. Itu bukan bukti desain sudah cocok.

## Metode dan batasan

1. Mengunduh artifact resmi workflow CI.
2. Memeriksa 16 screenshot desktop dan 16 screenshot mobile.
3. Membandingkan 14 screenshot aktual dengan 14 referensi yang dicopy ke artifact.
4. Memeriksa struktur route untuk mengetahui referensi yang belum memiliki UI atau belum masuk screenshot automation.

Viewport capture saat ini:
- Desktop: 1440 × 1000, full-page.
- Mobile: 390 × 844, full-page.
- Referensi desain publik yang disertakan: mayoritas 1024 × 1536.

Karena lebar viewport desktop berbeda, penilaian ini merupakan **structural visual audit**, bukan pixel-diff acceptance. Capture desktop harus ditambah pada lebar 1024 px agar lebih sebanding dengan referensi. Screenshot mobile juga belum memiliki referensi mobile khusus.

## Temuan lintas halaman

### P0 — Public shell tidak mengikuti desain referensi

- Referensi memakai identitas visual desa dengan crest/logo, navigasi lebih lengkap, ikon pencarian, dan susunan menu yang lebih kaya.
- Implementasi aktual memakai mark generik berhuruf awal desa, strip informasi kecil di atas header, navigasi yang lebih pendek, dan CTA masuk.
- Footer aktual hanya memuat identitas singkat dan tautan terbatas; referensi memuat beberapa kolom navigasi/informasi, kontak, dan kanal sosial.
- Header/footer yang sama dipakai lintas halaman sehingga perbedaan ini memengaruhi hampir semua screenshot.

### P0 — Hero terlalu generik

- Referensi memakai hero/banner per halaman dengan fotografi atau ilustrasi tematik, gelombang/shape, dan komposisi teks yang berbeda.
- Implementasi aktual memakai satu pola gradient biru-ungu dengan ornamen lingkaran yang sama pada hampir semua halaman.
- Tidak ada hero image/illustration yang setara dengan aset pada referensi untuk agenda, galeri, profil, statistik, APBDes, layanan, pemerintahan, wilayah, dan potensi.

### P0 — Konten dan hierarchy terlalu tipis dibanding referensi

- Referensi memakai layout multi-kolom, sidebar, KPI, kategori, kartu, ikon, grafik, foto, dan CTA.
- Implementasi aktual pada beberapa route hanya menampilkan satu panel teks atau beberapa row/card.
- Banyak halaman belum memiliki komponen visual utama yang disebutkan pada screenshot desain.

### P1 — Fixture belum cukup representatif

Tenant sintetis CI saat ini mengisi beberapa record dasar, tetapi belum cukup untuk membuktikan layout dalam kondisi konten yang realistis. Contoh: agenda hanya satu record; galeri hanya satu album/foto; layanan surat hanya dua jenis; dokumen dan pengaduan hanya satu record. Hal ini membuat area list, grid, pagination, sidebar, dan variasi kategori tidak teruji.

### P1 — Viewport desktop perlu disamakan

Tambahkan screenshot desktop pada 1024 × 1536 selain 1440 × 1000. Pertahankan 390 × 844 untuk mobile. Simpan seluruh screenshot aktual dan referensi dalam artifact agar reviewer dapat membandingkan langsung.

## Hasil per halaman yang memiliki referensi

Status **FAIL — major visual gap** berarti route berhasil dirender tetapi hierarchy/komponen utama tidak cocok dengan referensi; ini bukan klaim bahwa route rusak secara fungsional.

| Referensi | Route yang dibandingkan | Status | Temuan utama |
|---|---|---|---|
| Agenda Kegiatan | `/agenda` | FAIL — major | Kalender ada, tetapi hero ilustratif, panel agenda terpilih, kartu event berfoto, sidebar event, unduh jadwal, dan pagination tidak setara referensi. Fixture hanya satu agenda. |
| Galeri Desa | `/galeri` | FAIL — major | Hanya satu kartu album yang tampak; referensi memiliki kategori, beberapa album/foto, sidebar, dan CTA. |
| Galeri Foto | `/galeri/kegiatan-desa` | FAIL — major | Hanya satu foto besar; referensi memiliki kumpulan foto/grid, metadata album, dan panel pendukung. |
| Data Statistik | `/data/statistik` | FAIL — major | Ada ringkasan/data, tetapi komposisi KPI, chart, breakdown, map, dan sidebar referensi belum setara. |
| Pemerintahan Desa | `/pemerintahan` | FAIL — major | Struktur organisasi dasar tampil, tetapi profil perangkat, daftar pejabat, foto, dan panel pendukung belum mengikuti referensi. |
| Wilayah Desa | `/wilayah` | FAIL — major | Hierarki dusun/RW/RT tampil, tetapi peta wilayah berwarna, legenda, ringkasan, dan panel geografis tidak ada. Data koordinat wilayah belum tersedia sehingga peta tidak boleh direkayasa. |
| Sejarah Desa | `/profil/sejarah` | FAIL — major | Satu panel teks; referensi memiliki timeline/section sejarah, foto arsip, dan panel pendukung. |
| Visi & Misi | `/profil/visi-misi` | FAIL — major | Dua panel teks dasar; referensi memiliki hero, ikon, beberapa section, nilai/tujuan, dan CTA visual. |
| Potensi Desa | `/potensi` | FAIL — major | Konten statis satu panel; referensi memiliki kartu kategori, foto potensi, bagian unggulan, dan sidebar. Data potensi terstruktur belum tersedia. |
| APBDes | `/transparansi/apbdes` | FAIL — major | Ringkasan dan progress bar ada, tetapi donut/chart, komposisi anggaran, kategori, dokumen, dan sidebar referensi belum sebanding. |
| Layanan Desa | `/layanan` | FAIL — major | Katalog layanan terlalu ringkas; referensi menampilkan banyak kartu layanan, kategori, alur, syarat, dan CTA. |
| Layanan Surat | `/layanan/surat` | FAIL — major | Hanya dua row jenis surat; referensi menampilkan kartu layanan, kategori, langkah pengajuan, syarat, dan panel pendukung. |
| Kontak & Pengaduan | `/kontak` + `/pengaduan` | FAIL — major | Kontak hanya berupa kartu informasi dan pengaduan berupa daftar; referensi menggabungkan form pengaduan, peta lokasi, kanal kontak, FAQ/panel pendukung. Form publik memerlukan endpoint aman sebelum dibangun. |
| Profil Desa | `/profil` | FAIL — major | Ada beberapa section, tetapi susunan profil, foto utama, peta, highlight potensi, dan panel visual referensi belum terwakili. |

**Hasil: 0 dari 14 referensi dinyatakan visual PASS.** Semua 14 menunjukkan perbedaan material terhadap komposisi desain. Ini tidak menghapus fakta bahwa route dan CI berhasil; ini memisahkan keberhasilan teknis dari penerimaan desain.

## Cakupan referensi yang belum diverifikasi

Inventaris berisi 21 referensi publik, sedangkan artifact saat ini memuat 14 referensi dan 16 route screenshot. Item berikut belum memiliki screenshot aktual yang cocok dalam workflow:

| Referensi | Route target | Kondisi implementasi saat audit |
|---|---|---|
| Beranda utama | `/` | Page tersedia, belum masuk daftar capture publik |
| Profil perangkat desa | `/pemerintahan/perangkat/[slug]` | UI page belum ditemukan |
| Daftar berita | `/berita` | Page tersedia, belum masuk daftar capture |
| Detail berita | `/berita/[slug]` | Page tersedia, belum masuk daftar capture |
| Pengumuman Musdes | `/pengumuman` | UI page belum ditemukan |
| Informasi keuangan | `/transparansi/keuangan` | UI page belum ditemukan |
| Informasi desa | `/informasi` | UI page belum ditemukan |

Tiga halaman `/berita`, `/berita/[slug]`, dan `/` sudah memiliki file page, tetapi belum diuji dalam screenshot workflow ini. Empat route lain pada tabel belum memiliki UI page di path yang diperiksa.

## Route tambahan yang berhasil ditangkap

Selain halaman yang punya referensi satu-ke-satu, workflow juga menangkap:
- `/dokumen`
- `/pengaduan`

Keduanya perlu dinilai terhadap keputusan desain produk atau dipetakan ke screenshot gabungan yang sesuai.

## Rencana tindak lanjut berurutan

1. **Samakan alat ukur:** ubah workflow agar menangkap desktop 1024 × 1536 dan 1440 × 1000, tetap mobile 390 × 844; sertakan seluruh 21 referensi di artifact.
2. **Perbaiki public shell:** identitas logo/brand tenant, header, menu, active state, hero variants, footer multi-kolom, dan responsive navigation.
3. **Bangun ulang page composition per pola:** halaman listing (agenda/galeri/berita/layanan), halaman profil/informasi, halaman dashboard data (statistik/APBDes/wilayah), dan halaman kontak.
4. **Perkaya fixture sintetis:** beberapa event, album/foto, berita, jenis layanan, dokumen, kategori dan record yang aman. Jangan gunakan data pribadi nyata.
5. **Lengkapi route UI yang belum ada:** pengumuman, detail perangkat, keuangan, dan informasi desa setelah kebutuhan data/use case dipastikan.
6. **Tambahkan screenshot acceptance:** setiap route punya pasangan desktop/mobile, bukti visual disimpan, dan status matriks diperbarui hanya setelah review.
7. Jalankan typecheck, lint, format, unit, integration MySQL 8, dan seluruh visual capture setelah setiap batch perubahan.

## Bukti artifact

Artifact workflow `43695580622`:
- `public/agenda-desktop.png`, `public/agenda-mobile.png`
- `public/data-statistik-*.png`
- `public/dokumen-*.png`
- `public/galeri-*.png`
- `public/kontak-*.png`
- `public/layanan-*.png`
- `public/pemerintahan-*.png`
- `public/pengaduan-*.png`
- `public/potensi-*.png`
- `public/profil-*.png`
- `public/transparansi-apbdes-*.png`
- `public/wilayah-*.png`
- `reference/public/*.png`

Laporan ini mencatat kondisi awal setelah PR #49 merge. Jangan menandai halaman accepted sampai perbaikan dan screenshot comparison ulang selesai.
