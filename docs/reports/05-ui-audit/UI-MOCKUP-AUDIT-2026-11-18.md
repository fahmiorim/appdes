# Audit Kesesuaian Desain: Mockup vs UI Appdes SID

> **Status: draft, digantikan oleh [`UI-MOCKUP-AUDIT-FINAL-2026-11-18.md`](./UI-MOCKUP-AUDIT-FINAL-2026-11-18.md).** Draft ini memuat klaim detail pengumuman dan beberapa status visual yang belum terverifikasi; gunakan laporan final sebagai acuan.

- **Tanggal:** 18 November 2026
- **Branch:** `main` @ `12fbc25` (laporan belum di-commit)
- **Jenis task:** audit desain — tidak ada perubahan source code
- **Pertanyaan audit:** seberapa cocok tampilan UI yang ada dengan mockup desain di `docs/`?
- **Bahan:** 42 mockup (`docs/public` 21, `docs/account` 12, `docs/pendukung` 7, `docs/superadmin` 1, `docs/landing page` 1) dan tangkapan layar 1440×1000 dari seluruh halaman publik yang dapat dirender tanpa sesi.

## 1. Ringkasan

Secara umum: **struktur informasi mockup sudah dikenali di UI, tetapi bahasa visualnya belum diikuti.** Mockup dibangun dari foto asli (kantor desa, wajah perangkat, kegiatan warga), ilustrasi 3D, kartu putih padat di atas latar lavender, dan aksen indigo/ungu. UI sekarang dibangun dari **gradien biru-ungu tanpa foto**, kartu putih berjarak longgar, serta tipografi font sistem.

Hasil per surface:

| Surface | Mockup | Cocok | Sebagian | Berbeda material | Belum ada / tanpa padanan |
| --- | --- | --- | --- | --- | --- |
| Website desa publik | 21 | 1 (agenda) | 5 (wilayah, statistik, APBDes ×2, pengumuman list) | 9 | 6 (detail perangkat, detail berita, detail pengumuman, galeri detail, dokumen, lainnya) |
| Landing platform | 1 | 0 | 1 | 0 | 0 |
| Halaman akun | 12 | 0 | 2 (login, super admin login) | 0 | 10 |
| Halaman pendukung | 7 | 0 | 0 | 1 (404) | 6 (403 belum diverifikasi + 5 tidak ada) |
| Dashboard Super Admin | 1 | — | — | — | 1 (tidak terverifikasi) |

**Lima penyimpangan desain yang paling menentukan:**

1. **Hero:** mockup memakai foto desa/perkantoran dengan ilustrasi 3D; UI memakai gradien biru-ungu abstrak di hampir semua halaman. Ini mengubah karakter produk dari "portal desa" menjadi "landing page SaaS".
2. **Kepadatan & komposisi:** mockup memuat 8–12 blok per halaman (statistik ringkas, kartu foto, sidebar, CTA, tautan terkait); UI sering hanya 2–3 blok dengan empty state besar. Halaman profil, sejarah, visi-misi, potensi, pemerintahan, galeri, kontak, dan surat kehilangan hampir seluruh komponen visualnya.
3. **Tipografi:** Plus Jakarta Sans/DM Sans pada mockup tidak dimuat; seluruh UI memakai font sistem dengan H1 jauh lebih besar (≈64–72px vs ≈40–44px) dan letter-spacing lebih rapat.
4. **Sistem kartu & warna:** mockup konsisten memakai kartu putih radius ~14px, border halus, latar section lavender, aksen indigo/ungu, ikon berwarna dalam tile; UI memakai 378 warna hex berbeda, 823 nilai hardcoded, dan hanya 6 pemakaian token warna.
5. **Header/footer:** mockup satu header dengan dropdown + pencarian dan satu footer 4 kolom (kontak, sosial, legal); UI memiliki 12 header dan 14 footer berbeda — beranda 5 item menu, halaman shell 8 item, berita/agenda/pengumuman 3–4 item.

## 2. Koreksi pemetaan mockup

Audit pertama memetakan beberapa mockup ke halaman yang salah. Yang benar:

| Mockup | Isi sebenarnya | Halaman yang sepadan |
| --- | --- | --- |
| `public-Village-Official-Profile-Dashboard` | **Detail perangkat desa** (tab Profil/Struktur/Perangkat/Lembaga/Demografi) | Tidak ada route detail perangkat → mockup tanpa padanan |
| `public-Profil-Desa-Suka-Maju_-Informasi-dan-Potensi-Desa` | Halaman profil desa dengan sidebar | `/profil` |
| `public-Desa-Sukamaju-Online-Services` & `public-Suka-Maju-Online-Letter-Services-Dashboard` | **Daftar layanan surat** + alur + FAQ | `/layanan` dan `/layanan/surat` |
| `public-Pengumuman-Musdes-Desa-Suka-Maju` | **Detail** satu pengumuman | Tidak ada route detail pengumuman |
| `public-Suka-Maju-Village-Information-Dashboard` | **Pengumuman & Agenda** (bukan dokumen) | `/pengumuman`, `/agenda` |
| `public-Indonesian-Village-Finance-Dashboard` | Varian APBDes | `/transparansi/apbdes` |
| `public-Desa-Suka-Maju-Photo-Gallery` | Halaman album/detail galeri | `/galeri` (detail belum ada data) |

Dokumen publik (`/dokumen`) **tidak memiliki mockup**; desainnya perlu dinilai terhadap design system, bukan terhadap gambar acuan.

## 3. Perbandingan per halaman

### 3.1 Beranda — `public-Sistem-Informasi-Desa-Suka-Maju` → `/`

**Mockup:** hero foto sawah + potret kepala desa + bendera, badge "Portal Resmi", 2 CTA, bar identitas kepala desa; baris 6 aksi cepat; kartu Statistik Desa 2×2 berwarna + kartu sambutan bertanda tangan; Berita Terbaru 2 kolom (kartu besar + 2 thumbnail) dan Pengumuman; Profil Desa dengan foto kantor + 3 tautan cepat; Galeri 5 foto; banner alur administrasi 4 langkah; tautan instansi; footer 4 kolom.

**UI:** topbar navy; header 5 menu tanpa dropdown/pencarian; hero gradien tanpa foto; band "Data Desa" berisi tiga angka nol; blok pencarian 4 kartu; berita satu kolom dengan placeholder; panel profil bergambar artwork gradien teal; footer 3 kolom tanpa sosial/legal.

**Delta desain utama:** tidak ada fotografi sama sekali; 6 aksi cepat, sambutan kepala desa, kartu statistik berwarna, pengumuman, galeri, banner alur, dan tautan instansi belum ada; H1 terlalu besar; aksen hero biru muda pada baris kedua judul tidak ada di mockup.

**Verdict: berbeda material.**

### 3.2 Profil Desa — `public-Profil-Desa-Suka-Maju_-Informasi-dan-Potensi-Desa` → `/profil`

**Mockup:** hero foto udara desa; sidebar navigasi 8 item (Profil, Tentang, Sejarah, Visi & Misi, Wilayah, Potensi, Data Umum, Sarana); kartu Tentang Desa dengan foto kantor + 4 tile statistik (tahun berdiri, penduduk, KK, luas); Sejarah singkat dengan foto; Letak & Wilayah dengan peta mini + tabel batas; kartu Visi & Misi ungu; 4 kartu foto Potensi; 8 tile Sarana & Prasarana.

**UI:** hero gradien; kartu monogram + paragraf + tabel Desa/Kecamatan/Kabupaten; kartu Sejarah kosong; kartu Visi navy + Misi putih; daftar perangkat kosong; kartu "Kunjungi kantor desa".

**Delta:** sidebar, foto, tile statistik, peta, batas wilayah, potensi, dan sarana belum ada; seluruh halaman bergantung pada satu kolom.

**Verdict: berbeda material.**

### 3.3 Pemerintahan — `public-Pemerintahan-Desa-Suka-Maju-Dashboard` → `/pemerintahan`

**Mockup:** hero foto; sidebar submenu; bagan organisasi dengan potret; grid 8 perangkat dengan badge jabatan; blok BPD dengan foto dan pimpinan; 5 kartu Tugas & Fungsi.

**UI:** hero gradien; judul + badge "0 perangkat"; empty state besar; footer minimal. Kode memang memiliki `orgChart`, `card`, `leaderCard`, dan `photo`, tetapi tidak dapat dinilai karena data perangkat kosong.

**Delta:** sidebar, bagan bergaris penghubung, blok BPD, dan Tugas & Fungsi belum ada di kode; desain kartu perangkat belum terverifikasi.

**Verdict: berbeda material (sebagian tidak terverifikasi karena data kosong).**

### 3.4 Sejarah — `public-Sejarah-Desa-Suka-Maju_-Jejak-Perjalanan-Desa` → `/sejarah`

**Mockup:** hero foto + tumpukan foto lama; tab Sejarah/Visi/Wilayah/Potensi; artikel sejarah dengan foto arsip dan badge tahun; timeline "Tonggak Sejarah" 6 entri dengan pil tahun dan ikon; galeri dokumentasi 4 foto; sidebar navigasi profil + kartu kutipan; CTA; footer penuh.

**UI:** hero gradien; satu kartu "Perjalanan dan asal-usul" dengan teks "belum dipublikasikan"; footer minimal.

**Verdict: berbeda material.**

### 3.5 Visi & Misi — `public-Visi-&-Misi-Desa-Suka-Maju` → `/visi-misi`

**Mockup:** hero foto + ilustrasi target 3D; tab; kartu Visi dengan latar foto dan kutipan; 5 langkah Misi bernomor dengan ikon berwarna; sidebar Makna Visi, Tujuan Pembangunan (checklist), dan 4 tile Nilai Dasar; Arah Kebijakan dengan foto; CTA.

**UI:** hero gradien; dua kartu putih Visi/Misi berisi teks "belum dipublikasikan"; footer minimal.

**Verdict: berbeda material.**

### 3.6 Wilayah — `public-Wilayah-Desa-Suka-Maju` → `/wilayah`

**Mockup:** hero foto + pin peta 3D; tab; peta interaktif dengan 4 poligon dusun berwarna, zoom, dan tombol layer (Peta/Satelit/Batas/Unduh PDF); sidebar Informasi Wilayah (7 baris ikon) dan Batas Wilayah 4 arah; tabel Pembagian Wilayah dengan titik warna dan total; Kondisi Geografis dengan foto; 3 tombol unduh.

**UI:** hero gradien; tab 4 item (aktif ungu); kartu peta dengan placeholder; sidebar Jumlah Dusun/RW/RT/Area GIS; tabel pembagian wilayah kosong.

**Delta:** poligon peta, layer, batas wilayah, kondisi geografis, dan unduhan belum ada. Tab sudah sesuai.

**Verdict: setara sebagian (struktur terdekat kedua).**

### 3.7 Berita — `public-Village-News-Dashboard` → `/berita`

**Mockup:** hero foto + stiker "BERITA DESA"; kartu Berita Terbaru besar dengan badge kategori, tanggal, jumlah baca, dan carousel; grid Semua Berita 2 kolom dengan thumbnail, badge kategori berwarna, ringkasan; sidebar Cari Berita, Kategori Berita dengan hitungan, Berita Populer, Agenda Kegiatan; pagination.

**UI:** tema **teal penuh** (header, tombol, hero) yang tidak ada di halaman lain; filter kategori satu chip + kolom cari; empty state; footer satu baris.

**Delta:** palet berbeda dari brand; carousel, grid kartu, badge kategori, sidebar, dan pagination belum ada.

**Verdict: berbeda material.**

### 3.8 Agenda — `public-Agenda-Kegiatan-Desa-Suka-Maju` → `/agenda`

**Mockup:** hero foto + ilustrasi kalender 3D; tab dengan ikon; kalender + panel "Kegiatan pada tanggal" berisi 3 agenda berjam dan badge; filter 4 kontrol sejajar; daftar agenda berbentuk kartu horizontal (blok tanggal ungu, foto, judul, waktu/lokasi, badge, tombol detail); pagination; sidebar statistik (28/12/8/8 berwarna), kegiatan mendatang, kartu notifikasi, unduh jadwal PDF.

**UI:** hero gradien; 4 tab (aktif ungu) — **paling sesuai mockup**; kalender bulanan + panel tanggal (placeholder); sidebar Statistik kegiatan 0/0, Kegiatan mendatang kosong, kartu "Ikuti kegiatan desa"; filter pencarian/bulan/tahun + tombol ungu; daftar agenda kosong dengan reset filter.

**Delta:** ilustrasi header, panel agenda per tanggal, kartu agenda berfoto, badge status berwarna, pagination, PDF, dan tombol notifikasi belum ada. Tata letak dan kontrol sudah mendekati.

**Verdict: cocok dengan catatan (paling dekat dari seluruh surface).**

### 3.9 Galeri — `public-Suka-Maju-Village-Gallery-Dashboard` → `/galeri`

**Mockup:** hero foto + ilustrasi kamera 3D; tab Semua/Foto/Video/Album; 4 kartu album dengan badge jumlah foto; masonry 9 foto; sidebar Cari, Kategori dengan hitungan, dan Video Kegiatan (1 player + 3 item dengan durasi/views); CTA.

**UI:** hero gradien; satu kartu pencarian + empty state; sidebar Ringkasan galeri (2 tile nol) dan kartu ajakan ungu.

**Delta:** tab, grid foto, album berbadge, kategori, dan video belum ada.

**Verdict: berbeda material.**

### 3.10 Potensi — `public-Potensi-Desa-Suka-Maju-Dashboard` → `/potensi`

**Mockup:** hero 3 foto; tab; 6 kartu sektor berfoto dengan tile ikon (Pertanian, Perkebunan, Peternakan, Perikanan, UMKM, Wisata); Potensi Unggulan dengan tab kategori, foto besar, metrik (luas lahan, produktivitas, jumlah petani); sidebar Data Potensi 6 baris; Galeri Potensi; CTA.

**UI:** hero gradien; tab; satu kartu "Informasi potensi belum tersedia"; sidebar Informasi publik + kartu ajakan ungu.

**Verdict: berbeda material.**

### 3.11 Statistik — `public-Data-Statistik-Desa-Suka-Maju-Dashboard` → `/statistik`

**Mockup:** hero foto + grafik 3D; tab berikon; 6 tile KPI berwarna + pemilih periode; donut komposisi gender; grafik batang kelompok usia; grafik pendidikan dan pekerjaan; tabel per dusun + peta wilayah berwarna; tombol unduh PDF.

**UI:** hero gradien; tab polos (aktif ungu); 6 kartu KPI putih tanpa ikon/warna; donut gender sudah diimplementasikan (`conic-gradient` di `src/app/statistik/page.tsx:135`) tetapi kosong karena 0 penduduk; panel distribusi dusun + tabel per dusun; ringkasan APBDes; CTA.

**Delta:** warna/ikon KPI, pemilih periode, grafik usia/pendidikan/pekerjaan, peta, dan unduh PDF belum ada. Donut dan tabel sudah ada — berbeda dari kesimpulan audit pertama yang menyebut "tanpa grafik".

**Verdict: setara sebagian.**

### 3.12 APBDes — `public-Desa-Suka-Maju-APBDes-Dashboard` → `/transparansi/apbdes`

**Mockup:** hero foto + ilustrasi kalkulator 3D; tab berikon; pemilih tahun + tombol "Unduh APBDes (PDF)"; kartu Pendapatan/Belanja/Pembiayaan berwarna; donut komposisi belanja dengan legenda persentase; tabel rincian pendapatan dan belanja; blok realisasi dengan progress bar dan grafik; sidebar Informasi APBDes (dasar hukum, peraturan, tanggal, status) dan Dokumen Terkait 4 unduhan; CTA.

**UI:** hero gradien; tab polos; pemilih tahun + tombol "Tampilkan"; empty state; bagian dokumen kosong. Kode memiliki kartu ringkasan (pendapatan, belanja, % realisasi), aside informasi, dan baris per bidang dengan anggaran/realisasi.

**Delta:** ilustrasi, donut komposisi, progress visual, unduh PDF, dokumen terkait, dan grafik belum ada; kartu ringkasan belum berwarna.

**Verdict: setara sebagian.**

### 3.13 Layanan & Layanan Surat — `public-Desa-Sukamaju-Online-Services`, `public-Suka-Maju-Online-Letter-Services-Dashboard` → `/layanan`, `/layanan/surat`

**Mockup:** hero foto + ilustrasi laptop; 4 badge manfaat; grid 9 kartu jenis surat dengan tile ikon berwarna, label kategori, deskripsi, tombol "Ajukan Surat"; sidebar Masuk/Daftar, Syarat Umum, dan callout Informasi; alur 5 langkah; tabel Pengajuan Terbaru dengan badge status; FAQ akordeon.

**UI:** `/layanan`: hero gradien, daftar "Layanan surat" kosong, kartu ajakan masuk. `/layanan/surat`: hero gradien + satu empty state + footer minimal. Tidak ada grid kartu, sidebar, alur, tabel, atau FAQ.

**Verdict: belum setara.**

### 3.14 Kontak & Pengaduan — `public-Kontak-&-Pengaduan-Desa-Suka-Maju` → `/kontak`, `/pengaduan`

**Mockup:** hero foto + ilustrasi; tab Pengaduan/Hubungi/Lokasi/FAQ; banner layanan pengaduan; formulir lengkap (nama, WhatsApp, kategori, judul, uraian 0/1000, lampiran, kirim); sidebar Informasi Kontak dengan ikon dan chevron, Jam Pelayanan, Cek Status; peta + foto kantor + tombol Google Maps; FAQ; CTA.

**UI:** hero gradien; 4 kartu info (alamat, telepon, email, website); catatan kecil bahwa formulir pengaduan belum dihubungkan; tanpa tab, peta, jam layanan, atau FAQ. `/pengaduan` hanya menampilkan informasi tindak lanjut.

**Verdict: berbeda material.**

### 3.15 Pengumuman — `public-Pengumuman-Musdes` (detail) & `public-Village-Information` (pengumuman+agenda)

**Mockup detail:** breadcrumb, badge kategori, judul, meta (tanggal/baca/sumber/status), foto, isi, blok jadwal (hari, waktu, tempat, peserta), tanda tangan, lampiran PDF, tombol bagikan; sidebar Informasi Pengumuman, Pengumuman Lainnya, Kalender, ajakan notifikasi.

**UI:** halaman daftar dengan hero bergambar lingkaran "INFO DESA RESMI", pencarian, empty state yang menampilkan teks internal ("Kategori berita dengan slug "pengumuman" belum tersedia…"), tautan ke berita/agenda, footer 2 kolom. Tidak ada route detail pengumuman.

**Delta:** layout detail, meta, lampiran, dan tombol bagikan belum ada; copy empty state memakai istilah teknis yang tidak layak tampil ke publik.

**Verdict: berbeda material / padanan detail tidak ada.**

### 3.16 Dokumen — tanpa mockup → `/dokumen`

Tidak ada gambar acuan (mockup "Village Information" ternyata pengumuman+agenda). UI: hero gradien, kolom cari + filter kategori + tombol, empty state, "0 dokumen · Halaman 1". Tidak dapat dinilai kesesuaiannya; yang bisa dinilai: pola hero dan footer sama dengan halaman shell lain.

### 3.17 Login warga — `account-Modern-Indonesian-Village-Login-Portal` → `/masuk`

**Mockup:** split-screen; kiri foto kantor desa penuh dengan overlay biru dan judul; kanan kartu putih berisi ilustrasi, "Masuk ke Akun", field **Email atau NIK**, kata sandi dengan toggle mata, "Ingat saya", "Lupa kata sandi?", tombol Masuk berikon, pembatas "atau masuk dengan", tombol Google, dan "Belum punya akun? Daftar Sekarang"; strip 4 keunggulan; footer 4 kolom dengan sosial dan legal.

**UI:** kiri panel gradien biru + judul + foto kantor dengan potongan gelombang; kanan kartu putih dengan ilustrasi berbeda, field **Nama pengguna**, toggle "Lihat" berbentuk teks, tombol Masuk, catatan "Hubungi administrator desa". Tidak ada "Ingat saya", lupa sandi, Google, atau daftar. Header memakai brand platform **FlexiDesa.id** dengan menu halaman publik, bukan brand desa. Footer platform 4 kolom tanpa sosial/legal.

**Delta:** komposisi split-screen sudah menyerupai, tetapi isi form, ilustrasi, brand header, dan tautan akun berbeda; fitur akun yang digambarkan mockup belum ada di UI.

**Verdict: setara sebagian (komposisi cocok, isi belum).**

### 3.18 Login Super Admin — `account-FlexiDesa-Super-Admin-Login-Interface` → `/super-admin-login`

**Mockup:** kartu split-screen di atas foto desa, panel kiri ungu dengan 4 poin fitur, panel kanan form (Email/Username, kata sandi, "Ingat saya", "Lupa password?").

**UI:** halaman gradien penuh dengan hero di atas dan kartu form di bawah; field username + kata sandi + kotak info; tanpa "Ingat saya"/lupa password.

**Verdict: berbeda material.**

### 3.19 Halaman 404 — `pendukung-SID-Desa-Sukamaju-404-Page` → `not-found.tsx`

**Mockup:** header + footer desa lengkap, ilustrasi besar, judul, deskripsi, dua tombol, strip "Anda mungkin mencari" berisi tautan halaman populer.

**UI:** halaman gradien penuh dengan angka 404 + ikon kaca pembesar, dua tombol; tanpa header/footer desa dan tanpa tautan populer. Halaman ini juga **tidak terjangkau pengunjung anonim** karena proxy mengalihkan path tak dikenal ke `/masuk` (hanya path publik tanpa halaman, mis. `/lupa-sandi`, yang menampilkannya).

**Verdict: berbeda material (dan sulit ditemukan pengguna).**

### 3.20 Landing platform — `landing-page-FlexiDesa.id-Modern-Village-Dashboard` → host apex `/`

**Mockup:** header dengan menu (Beranda, Fitur, Harga, Demo, Dokumentasi, Kontak) + dua tombol, hero dengan mockup perangkat, strip statistik kepercayaan, 8 kartu fitur berikon, CTA bergambar, footer.

**UI:** hero dengan mockup perangkat + checklist + 3 poin, 8 kartu fitur, bagian peran, CTA, footer. Menu header hanya "Login/Coba Demo" (tanpa item navigasi), strip statistik tidak ada.

**Verdict: setara sebagian** — paling dekat di antara halaman non-agenda, tetapi masih kehilangan navigasi dan bukti angka.

### 3.21 Halaman akun lain (10 mockup)

Registrasi, OTP, akun terverifikasi, lupa sandi, reset sandi (2 variasi), profil pengguna, edit profil, keamanan akun, notifikasi, riwayat layanan: **belum ada UI**. `/reset-sandi` bahkan tidak ada sebagai route, padahal `src/lib/auth.ts:82` menautkannya di email reset — temuan fungsional di luar desain, tetapi berdampak pada alur akun yang digambarkan mockup.

### 3.22 Halaman pendukung lain (6 mockup)

Maintenance, hasil pencarian, sitemap, kebijakan privasi, syarat & ketentuan: **belum ada UI**. Halaman 403 tersedia sebagai `src/app/forbidden.tsx` tetapi tidak dapat dirender tanpa sesi.

### 3.23 Dashboard Super Admin — `superadmin-FlexiDesa-Super-Admin-Dashboard`

Tidak dapat diverifikasi visual (tanpa kredensial). Yang bisa dikatakan: `docs/design/ADMIN-PLATFORM-DESIGN.md` menetapkan sidebar putih 264px, topbar putih, kartu putih, dan aksen ungu sekunder; kesesuaian implementasi belum diuji.

## 4. Pola desain lintas halaman

| Aspek | Mockup | UI | Selisih |
| --- | --- | --- | --- |
| Hero | foto/ilustrasi 3D, tinggi ~200–260px, judul 32–40px | gradien abstrak, tinggi ~260–360px, judul 60–72px | karakter & skala berbeda |
| Header | satu header: logo + nama + tagline, 6–8 menu dengan dropdown + ikon cari + tombol Masuk | 12 varian; 3–8 menu; tanpa dropdown/pencarian; sebagian memakai topbar tambahan | jumlah & isi menu tidak seragam |
| Footer | navy, 4 kolom (menu, informasi, kontak, sosial) + baris legal | 14 varian: 3 kolom, 1 baris, atau hanya brand | informasi kontak & legal hilang di banyak halaman |
| Section header | ikon + judul + tautan "Lihat Semua" di dalam kartu | eyebrow uppercase + judul besar, tanpa ikon/tautan | pola berbeda |
| Kartu | putih, radius 14px, border `#e6ebf5`, shadow tipis, padding 20–24px | campuran radius 12–20px, border tipis, padding longgar | perlu satu set token |
| Warna | indigo/ungu sebagai aksen, hijau/pink/oranye untuk status, latar lavender | biru `#0b65f5` dominan, ungu pada gradien, teal di berita | palet belum dipetakan ke token |
| Tipografi | Plus Jakarta Sans 600–800, body DM Sans 14–16px | font sistem, H1 60–72px, body 14–16px | font tidak dimuat |
| Ikon | tile berwarna + ikon garis tebal, ilustrasi 3D | ikon garis tipis, artwork gradien | tidak ada sistem ilustrasi |
| Foto | banyak (kegiatan, kantor, perangkat, produk) | hampir tidak ada | kesenjangan terbesar |
| Kepadatan | 8–12 blok/halaman | 2–4 blok/halaman | halaman terasa kosong |

Angka pendukung: 823 warna hex hardcoded, 378 nilai unik, 6 pemakaian `var(--color-*)`, dan token teks sekunder resmi (`#58688b`, rasio 5.23:1) jarang dipakai — beberapa halaman memakai `#8491a5` (3.19:1) dan `#8390a4` (3.24:1) sehingga teks kecil gagal kontras AA.

## 5. Prioritas perbaikan desain

1. **Muat font merek** (Plus Jakarta Sans + DM Sans) dan samakan skala H1 dengan mockup (≈40–44px di hero).
2. **Satu shell publik**: satu header (dropdown + pencarian), satu footer 4 kolom dengan kontak/sosial/legal, dan hapus tema teal `/berita` atau jadikan varian resmi.
3. **Sistem visual**: petakan 378 hex ke token (brand, surface, border, teks, status), lalu terapkan kartu radius 14px + latar section lavender.
4. **Fotografi & ilustrasi**: sediakan slot gambar desa (hero, profil, potensi, galeri) dan satu set ilustrasi 3D; tanpa ini mockup tidak akan pernah tercapai.
5. **Lengkapi komponen per halaman** dengan urutan dampak: beranda (aksi cepat, statistik berwarna, berita+pengumuman, galeri, banner alur), profil (sidebar + tile statistik + peta), berita (grid + sidebar + pagination), kontak/pengaduan (form + peta + FAQ), layanan surat (grid + alur + FAQ), galeri (tab + grid), APBDes/statistik (unduh PDF + warna KPI), sejarah/visi-misi/potensi (foto + timeline/nilai/CTA).
6. **Halaman akun & pendukung**: bangun sesuai mockup atau tandai eksplisit di luar scope agar tidak dinilai berulang.

## 6. Batasan

- Semua halaman publik (25 route) dirender dan dibandingkan. **Dashboard Admin Desa, Super Admin, dan aplikasi warga tidak diverifikasi visual** (tanpa kredensial; audit tidak menulis ke database).
- Data dev tenant kosong (0 penduduk, 0 berita, 0 perangkat, 0 APBDes), sehingga desain **state berisi konten** tidak dapat dibandingkan; yang dinilai adalah komponen yang terlihat. Beberapa komponen terbukti ada di kode tetapi kosong di layar (donut statistik, kartu perangkat, kartu ringkasan APBDes).
- Mockup tidak menyediakan acuan mobile; tangkapan 390px dipakai untuk memeriksa konsistensi responsif, bukan kesesuaian desain.
- Tangkapan disimpan lokal di `artifacts/ui-audit/` (di-ignore git) untuk verifikasi reviewer; tidak ada perubahan source code.

## 7. Kesimpulan

Kesesuaian desain saat ini berada pada tahap **"struktur informasi mirip, bahasa visual belum"**. Hanya agenda yang mendekati mockup; statistik, APBDes, dan wilayah sudah memiliki kerangka komponen yang benar tetapi kehilangan visualisasi dan aksen; sisanya masih berupa hero gradien + empty state. Tanpa font merek, fotografi, satu shell, dan sistem token, penambahan komponen baru akan terus menghasilkan halaman yang terasa berasal dari produk berbeda.
