# Penyerahan mockup desain FlexiDesa

- **Task:** menerbitkan tiga mockup PNG lokal melalui branch dan pull request.
- **Tanggal:** 18 November 2026
- **Branch:** `task/design-mockup-assets`
- **Base commit:** `7a119d168a9a8d4b9059f8aa2117be55ac34c71a` (`main`)
- **Commit hasil:** `9524178` (aset), diikuti commit laporan pada branch yang sama.

## Kondisi awal

Tiga mockup desain berada sebagai file untracked pada working tree lokal. Task ini membatasi perubahan pada tiga file tersebut dan laporan ini; tidak ada source code atau perubahan lain yang disertakan.

## File yang diperiksa dan diubah

| File | Ukuran | Format / dimensi |
|---|---:|---|
| `docs/account/FlexiDesa Super Admin Login Interface.png` | 1.864.705 byte | PNG, 1536 × 1024 |
| `docs/landing page/FlexiDesa.id Modern Village Dashboard.png` | 1.859.966 byte | PNG, 1199 × 1312 |
| `docs/superadmin/FlexiDesa Super Admin Dashboard.png` | 1.597.491 byte | PNG, 1672 × 941 |
| `docs/reports/02-super-admin/MOCKUP-ASSETS-2026-11-18.md` | — | Laporan task |

## Hasil

Mockup dicakup dalam branch khusus berbasis `main` agar reviewer dapat melihat aset sebelum integrasi. Tidak ada perubahan aplikasi, skema database, migration, autentikasi, otorisasi, maupun data.

## Security dan tenant

Aset statis; tidak mengubah kode runtime, kontrol akses, tenant ownership, atau data. Pemeriksaan file mengidentifikasi ketiga file sebagai PNG. Isi visual tidak dianalisis atau diubah dalam task ini.

## Validasi

| Perintah / pemeriksaan | Hasil |
|---|---|
| `file` pada tiga mockup | **PASS** — seluruh file teridentifikasi sebagai PNG |
| `wc -c` pada tiga mockup | **PASS** — total 5.322.162 byte |
| `git diff --cached --check` | **PASS** — tidak ada whitespace error pada perubahan staged |
| Test aplikasi / build | **SKIPPED** — tidak ada kode aplikasi yang berubah |
| CI pull request | Belum dijalankan ketika laporan ini ditulis |

## Risiko dan batasan

Visual QA tidak dilakukan pada task ini; file diterbitkan sebagai aset desain untuk ditinjau reviewer. PR tidak akan di-merge oleh agent.

## Kesimpulan

Ketiga mockup tersedia sebagai perubahan terpisah di branch task dengan bukti pemeriksaan tipe file, ukuran, dan staged diff. Commit aset: `9524178`; commit laporan dicatat pada riwayat branch.


---

## Audit lanjutan — kesiapan implementasi tiga mockup

- **Tanggal:** 18 November 2026
- **Basis pemeriksaan kode:** `main` pada commit `12fbc25f9d3f557a53ae461265aa31250fa0e4da`
- **Branch laporan:** `task/audit-mockup-backend-readiness`
- **Cakupan:** pemetaan kebutuhan landing page, login Super Admin, dashboard Super Admin terhadap implementasi frontend dan backend yang ditemukan di repository.
- **Batas pemeriksaan visual:** PNG mockup tercatat di repository, tetapi belum dilakukan inspeksi visual/pixel comparison langsung pada task audit ini. Karena itu, temuan berikut adalah audit kesiapan aset, struktur aplikasi, dan kemampuan backend; bukan sertifikasi kesamaan visual dengan mockup.

### 1. Landing page FlexiDesa

**Kebutuhan yang perlu disiapkan**
- Finalisasi logo/wordmark, palet warna, tipografi, ikon, ilustrasi desa, dan preview dashboard.
- Finalisasi konten produk: manfaat, fitur/modul, solusi, alur demo, kontak, dan CTA.
- Pastikan tautan login dan demo mengarah ke alur yang benar.
- Integrasikan aset brand baru secara konsisten; pemeriksaan source menemukan beberapa bagian masih menggunakan `/images/logo.png`.
- Tinjau aset ilustrasi: `platform-village-landscape.svg` dan `super-admin-login-landscape.svg` teridentifikasi memiliki konten yang sama; tentukan apakah perlu satu aset bersama atau dua ilustrasi yang benar-benar berbeda.

**Kesiapan backend**
- Landing page bersifat dominan informatif; konten statis dapat disajikan tanpa API khusus.
- Fondasi tenant, autentikasi, dan modul aplikasi sudah tersedia.
- Tidak ada bukti bahwa halaman pemasaran memerlukan backend baru untuk seluruh kontennya. Integrasi demo/pendaftaran perlu disesuaikan dengan alur produk yang dipilih.

### 2. Login Super Admin

**Kebutuhan yang perlu disiapkan**
- Samakan brand, logo, ilustrasi, tata letak, dan responsivitas dengan mockup.
- Validasi loading, pesan kesalahan, sesi, redirect, dan akses akun yang tidak berhak.
- Putuskan apakah mockup mensyaratkan fitur tambahan seperti lupa kata sandi; jangan tampilkan kontrol yang belum memiliki alur backend.

**Kesiapan backend**
- Route `/super-admin-login` tersedia.
- Form menggunakan autentikasi username/password melalui Better Auth client.
- `isSuperAdminUser()` memeriksa bahwa akun tidak terikat tenant dan memiliki role platform `super-admin`.
- `requireSuperAdmin()` digunakan sebagai gerbang otorisasi pada use case pengelolaan platform.
- Redirect tujuan dibatasi melalui `safeNextPath` dan halaman konsol memeriksa role sebelum menampilkan konten.

**Kesimpulan:** fondasi autentikasi dan otorisasi sudah ada. Pekerjaan utama adalah penyelarasan UI serta pengujian alur negatif/positif; fitur tambahan seperti lupa sandi hanya dikerjakan bila memang masuk spesifikasi.

### 3. Dashboard Super Admin

**Data dan operasi yang sudah ditemukan**
- Daftar tenant desa dan status aktif/nonaktif.
- Agregat jumlah penduduk dan pengguna dari daftar tenant.
- Daftar domain serta jumlah desa yang sudah/belum memiliki domain.
- Daftar akun pengguna platform dan status aktif.
- Tenant terbaru berdasarkan tanggal pendaftaran.
- Kondisi tenant yang perlu perhatian: belum memiliki domain, nonaktif, dan siap purge.
- Aktivitas audit lintas desa.
- Pengelolaan tenant: provisioning, perubahan status, kuota media, reset akses admin desa, pengelolaan domain, ekspor data, dan purge dengan prasyarat retensi.
- Pengelolaan akun platform: pembuatan akun, aktivasi/nonaktivasi, reset sandi, dan pencabutan sesi.
- Ringkasan konfigurasi platform: URL aplikasi, base domain, trust proxy, status email, status TTE, allowlist host TTE, serta kebijakan retensi.

**Kebutuhan backend tambahan atau verifikasi sebelum elemen dashboard dibuat**
- Grafik pertumbuhan tenant per bulan: perlu query/agregasi historis berdasarkan tanggal pembuatan tenant.
- Grafik penggunaan platform: tentukan definisi metrik dan sumber datanya (misalnya aktivitas login, penggunaan modul, atau volume transaksi).
- Peta persebaran tenant: perlu pemetaan tenant ke data wilayah/koordinat dan agregasi yang aman.
- Pendapatan/langganan: belum ditemukan bukti modul paket, invoice, pembayaran, dan riwayat tagihan dalam cakupan kode yang diperiksa. Dibutuhkan hanya jika mockup/produk memang menampilkan informasi komersial.
- Kesehatan server/platform: belum ditemukan sumber metrik runtime untuk CPU, RAM, disk, database, antrean, dan status layanan. Perlu integrasi monitoring/health check bila indikator ini ditampilkan.

**Catatan akurasi:** kemampuan menampilkan kartu statistik yang sudah ada tidak berarti semua grafik atau indikator tambahan sudah memiliki sumber data. Jangan menggunakan angka dummy atau menyimpulkan kesehatan server dari status konfigurasi email/TTE.

### 4. Matriks kesiapan backend

| Area | Status audit | Bukti/pekerjaan |
|---|---|---|
| Autentikasi Super Admin | **Tersedia** | Route login dan Better Auth username/password |
| Otorisasi Super Admin | **Tersedia** | Pemeriksaan role platform dan `requireSuperAdmin()` |
| Data tenant | **Tersedia** | Use case daftar tenant dan repository provisioning |
| Domain tenant | **Tersedia** | Use case daftar/tambah/hapus/pilih domain utama |
| Pengguna platform | **Tersedia** | Use case dan repository pengguna platform |
| Audit lintas tenant | **Tersedia** | Use case audit platform dan repository audit |
| Konfigurasi platform | **Tersedia sebagian** | Ringkasan konfigurasi aman; bukan monitoring runtime |
| Pertumbuhan tenant historis | **Belum terverifikasi** | Perlu agregasi per periode |
| Penggunaan platform historis | **Belum terverifikasi** | Definisi metrik dan sumber data belum ditetapkan |
| Peta persebaran tenant | **Belum terverifikasi** | Perlu pemetaan wilayah/koordinat lintas tenant |
| Pendapatan/langganan | **Belum ditemukan** | Perlu modul komersial jika menjadi kebutuhan |
| Kesehatan server/runtime | **Belum ditemukan** | Perlu integrasi monitoring |

### 5. Rencana tindak lanjut yang direkomendasikan

1. **Landing page:** finalisasi aset dan implementasikan desain; backend baru tidak menjadi prasyarat untuk konten informatif.
2. **Login Super Admin:** pertahankan autentikasi/otorisasi yang ada, lalu selaraskan tampilan dan uji skenario akses.
3. **Dashboard Super Admin:** buat spesifikasi data per kartu, grafik, tabel, dan indikator; tandai setiap item sebagai data tersedia, perlu agregasi, atau perlu integrasi eksternal.
4. Implementasikan query/use case tambahan hanya untuk kebutuhan mockup yang benar-benar disepakati.
5. Lakukan visual QA desktop, tablet, dan mobile serta perbandingan screenshot dengan PNG mockup setelah inspeksi visual mockup dapat dilakukan.
6. Jalankan test, typecheck, lint, build, dan CI setelah perubahan implementasi.

### Kesimpulan audit lanjutan

Backend FlexiDesa **sudah mendukung fondasi operasional inti** untuk login Super Admin dan dashboard pengelolaan tenant: autentikasi, otorisasi, tenant, domain, pengguna platform, audit, konfigurasi ringkas, dan lifecycle tenant. Landing page juga tidak membutuhkan backend baru untuk konten informatifnya.

Namun backend **belum dapat dinyatakan mendukung seluruh elemen dashboard mockup**. Grafik historis, peta agregat tenant, data langganan/pendapatan, dan monitoring kesehatan server memerlukan verifikasi atau pengembangan tambahan sesuai elemen yang benar-benar ada pada mockup final.

Ketiga mockup adalah acuan desain, bukan bukti bahwa seluruh data dan integrasi telah tersedia. Visual comparison langsung masih menjadi pekerjaan QA yang belum dilakukan.


---

## Inventarisasi 39 mockup tambahan

Pemeriksaan ulang recursive repository tree pada 18 November 2026 menemukan **42 file gambar** di bawah `docs/`. Tiga file adalah mockup utama yang dibahas pada bagian awal laporan; **39 file lainnya** diinventarisasi di bawah ini.

**Status audit 39 file:** baru terverifikasi keberadaan, nama, dan lokasi di repository. Isi PNG belum diperiksa satu per satu, belum dipetakan secara definitif ke route, dan belum dibandingkan dengan implementasi. Karena itu, status kesesuaian visual maupun dukungan backend untuk masing-masing mockup masih **belum dinilai**.

### A. Account dan autentikasi — 11 mockup tambahan

| No. | File | Area yang perlu dipetakan |
|---:|---|---|
| 1 | `docs/account/Edit Profil Pengguna SID Desa Sukamaju.png` | Profil akun |
| 2 | `docs/account/Modern Indonesian Village Login Portal.png` | Login portal desa |
| 3 | `docs/account/Pengaturan Keamanan Akun Desa Sukamaju.png` | Keamanan akun |
| 4 | `docs/account/Reset Kata Sandi SID Desa Sukamaju.png` | Reset kata sandi |
| 5 | `docs/account/Riwayat Pengajuan Layanan Desa Sukamaju.png` | Riwayat layanan warga |
| 6 | `docs/account/SID Desa Sukamaju Notification Settings Dashboard.png` | Preferensi notifikasi |
| 7 | `docs/account/SID Desa Sukamaju OTP Verification.png` | Verifikasi OTP |
| 8 | `docs/account/SID Desa Sukamaju Registration Page.png` | Registrasi |
| 9 | `docs/account/SID Desa Sukamaju Reset Kata Sandi.png` | Reset kata sandi |
| 10 | `docs/account/SID Desa Sukamaju_ Akun Terverifikasi.png` | Status verifikasi akun |
| 11 | `docs/account/Sukamaju Village Profile Dashboard.png` | Profil pengguna/warga |

### B. Halaman pendukung — 7 mockup

| No. | File | Area yang perlu dipetakan |
|---:|---|---|
| 12 | `docs/pendukung/Akses Ditolak di Desa Sukamaju.png` | Akses ditolak/403 |
| 13 | `docs/pendukung/Kebijakan Privasi SID Sukamaju.png` | Kebijakan privasi |
| 14 | `docs/pendukung/SID Desa Sukamaju 404 Page.png` | Halaman 404 |
| 15 | `docs/pendukung/SID Desa Sukamaju Maintenance Page.png` | Maintenance |
| 16 | `docs/pendukung/SID Desa Sukamaju Search Results.png` | Hasil pencarian |
| 17 | `docs/pendukung/Sitemap Desa Sukamaju Website.png` | Sitemap |
| 18 | `docs/pendukung/Syarat dan Ketentuan SID Desa Sukamaju.png` | Syarat dan ketentuan |

### C. Website publik desa — 21 mockup

| No. | File | Area yang perlu dipetakan |
|---:|---|---|
| 19 | `docs/public/Agenda Kegiatan Desa Suka Maju.png` | Agenda |
| 20 | `docs/public/Berita Gotong Royong Desa Suka Maju.png` | Detail berita |
| 21 | `docs/public/Data Statistik Desa Suka Maju Dashboard.png` | Statistik |
| 22 | `docs/public/Desa Suka Maju APBDes Dashboard.png` | Transparansi APBDes |
| 23 | `docs/public/Desa Suka Maju Photo Gallery.png` | Galeri |
| 24 | `docs/public/Desa Sukamaju Online Services.png` | Layanan publik |
| 25 | `docs/public/Indonesian Village Finance Dashboard.png` | Keuangan desa |
| 26 | `docs/public/Kontak & Pengaduan Desa Suka Maju.png` | Kontak/pengaduan |
| 27 | `docs/public/Pemerintahan Desa Suka Maju Dashboard.png` | Pemerintahan |
| 28 | `docs/public/Pengumuman Musdes Desa Suka Maju.png` | Pengumuman |
| 29 | `docs/public/Potensi Desa Suka Maju Dashboard.png` | Potensi desa |
| 30 | `docs/public/Profil Desa Suka Maju_ Informasi dan Potensi Desa.png` | Profil desa |
| 31 | `docs/public/Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png` | Sejarah |
| 32 | `docs/public/Sistem Informasi Desa Suka Maju.png` | Beranda publik |
| 33 | `docs/public/Suka Maju Online Letter Services Dashboard.png` | Layanan surat |
| 34 | `docs/public/Suka Maju Village Gallery Dashboard.png` | Galeri desa |
| 35 | `docs/public/Suka Maju Village Information Dashboard.png` | Informasi desa |
| 36 | `docs/public/Village News Dashboard – Desa Suka Maju.png` | Daftar berita |
| 37 | `docs/public/Village Official Profile Dashboard.png` | Profil perangkat desa |
| 38 | `docs/public/Visi & Misi Desa Suka Maju.png` | Visi dan misi |
| 39 | `docs/public/Wilayah Desa Suka Maju.png` | Wilayah desa |

### Tahapan audit lanjutan untuk 39 mockup

1. Buka dan inspeksi visual seluruh 39 PNG; catat resolusi, layout, komponen, warna, tipografi, dan variasi desktop/mobile yang terlihat.
2. Kelompokkan tiap mockup ke route aplikasi yang sudah ada. Tandai route yang belum ada atau mockup yang ternyata menggambarkan state/komponen, bukan halaman mandiri.
3. Bandingkan tiap mockup dengan implementasi aktual melalui screenshot pada viewport yang relevan.
4. Untuk tiap halaman, petakan kebutuhan data ke schema, repository, use case, dan route/API yang tersedia.
5. Beri status terpisah: **sesuai**, **perlu perbaikan UI**, **backend tersedia**, **perlu pengembangan backend**, atau **belum dapat dinilai**.
6. Catat gap dan prioritas perbaikan tanpa menganggap nama file sebagai bukti bahwa halaman atau fiturnya telah selesai.

**Kesimpulan inventaris:** jumlah aset gambar dalam `docs/` adalah 42: tiga mockup utama dan 39 mockup tambahan. Rincian 39 tambahan terdiri dari 11 account, 7 pendukung, dan 21 website publik (bukan 20). Audit visual dan pemetaan implementasi atas 39 mockup tambahan masih merupakan pekerjaan terbuka; laporan ini tidak mengklaim 39 mockup tersebut telah diperiksa secara visual.


---

## Addendum — pemetaan 21 mockup website publik ke route dan hasil audit yang tersedia

**Tanggal pembaruan:** 18 November 2026  
**Basis inventaris:** recursive tree repository `main` yang diperiksa pada pembaruan ini.  
**Sumber audit visual terdahulu:** `docs/design/PUBLIC-VISUAL-AUDIT-2026-11-15.md`, yang mendokumentasikan screenshot CI dan perbandingan visual setelah PR #49.  
**Catatan penting:** nama file dipakai untuk mengenali maksud halaman, bukan bukti bahwa isi gambarnya sudah diperiksa pada pembaruan ini. Connector GitHub yang tersedia mengembalikan file PNG sebagai data biner kosong, sehingga inspeksi ulang isi PNG satu per satu tidak dapat dilakukan dari sesi ini. Untuk itu, status visual di bawah hanya mengutip audit visual terdahulu jika ada; sisanya ditandai belum diverifikasi, bukan dianggap lulus.

### Koreksi jumlah

Daftar bernomor pada inventaris publik adalah **21 file**, yaitu nomor 19 sampai 39 secara inklusif. Dengan demikian total 39 mockup tambahan tetap benar: 11 account + 7 pendukung + 21 publik. Pernyataan sebelumnya yang menyebut folder publik berisi 20 mockup adalah salah hitung dan dikoreksi di addendum ini.

### Matriks route dan status bukti

| No. | Mockup publik | Route kandidat pada source tree saat ini | Bukti visual terdahulu / status |
|---:|---|---|---|
| 19 | Agenda Kegiatan Desa Suka Maju | `/agenda` | **FAIL — major visual gap** pada audit 15 Nov: kalender dasar ada, tetapi hero, kartu event berfoto, panel agenda, sidebar, unduh jadwal, dan pagination belum setara referensi. |
| 20 | Berita Gotong Royong Desa Suka Maju | `/berita/[slug]` | Route detail berita ada di source tree; belum ada hasil screenshot/perbandingan khusus untuk mockup detail ini dalam audit terdahulu. |
| 21 | Data Statistik Desa Suka Maju Dashboard | `/data/statistik` | **FAIL — major visual gap** pada audit 15 Nov: KPI, chart, breakdown, map, dan sidebar belum setara referensi. |
| 22 | Desa Suka Maju APBDes Dashboard | `/transparansi/apbdes` | **FAIL — major visual gap** pada audit 15 Nov: ringkasan/progress ada, tetapi chart, komposisi anggaran, kategori, dokumen, dan sidebar belum setara. |
| 23 | Desa Suka Maju Photo Gallery | `/galeri` | **FAIL — major visual gap** pada audit 15 Nov: listing album masih terlalu tipis dibanding kategori, grid, sidebar, dan CTA referensi. |
| 24 | Desa Sukamaju Online Services | `/layanan` | **FAIL — major visual gap** pada audit 15 Nov untuk katalog layanan: kartu layanan, kategori, alur, syarat, dan CTA belum setara. |
| 25 | Indonesian Village Finance Dashboard | `/transparansi/keuangan` (target semantik; route page belum ditemukan pada tree) | **Belum terverifikasi / kandidat gap route**. Jangan disamakan otomatis dengan halaman APBDes; perlu keputusan apakah halaman keuangan umum berbeda dari transparansi APBDes. |
| 26 | Kontak & Pengaduan Desa Suka Maju | `/kontak` dan `/pengaduan` | **FAIL — major visual gap** pada audit 15 Nov: kontak/pengaduan belum menyatukan form, peta, kanal kontak, dan FAQ seperti referensi. |
| 27 | Pemerintahan Desa Suka Maju Dashboard | `/pemerintahan` | **FAIL — major visual gap** pada audit 15 Nov: struktur dasar ada, tetapi profil perangkat, foto, daftar pejabat, dan panel pendukung belum setara. |
| 28 | Pengumuman Musdes Desa Suka Maju | `/pengumuman` | Route UI belum ditemukan dalam audit visual terdahulu; source tree saat pembaruan menunjukkan route page tersedia. Screenshot acceptance untuk mockup ini belum terverifikasi. |
| 29 | Potensi Desa Suka Maju Dashboard | `/potensi` | **FAIL — major visual gap** pada audit 15 Nov: konten masih ringkas; kartu kategori, foto, bagian unggulan, dan sidebar belum setara. |
| 30 | Profil Desa Suka Maju — Informasi dan Potensi Desa | `/profil` | **FAIL — major visual gap** pada audit 15 Nov: section dasar ada, tetapi foto utama, peta, highlight potensi, dan komposisi referensi belum terwakili. |
| 31 | Sejarah Desa Suka Maju — Jejak Perjalanan Desa | `/profil/sejarah` | **FAIL — major visual gap** pada audit 15 Nov: halaman masih dominan teks; timeline, foto arsip, dan panel pendukung belum setara. |
| 32 | Sistem Informasi Desa Suka Maju | `/` | Route beranda tersedia di source tree; audit 15 Nov menyatakan belum masuk daftar capture. Visual acceptance belum terverifikasi. |
| 33 | Suka Maju Online Letter Services Dashboard | `/layanan/surat` | **FAIL — major visual gap** pada audit 15 Nov: hanya dua row jenis surat; kartu layanan, kategori, langkah, syarat, dan panel belum setara. |
| 34 | Suka Maju Village Gallery Dashboard | `/galeri` dan `/galeri/[slug]` | Audit 15 Nov: **FAIL — major visual gap** untuk listing galeri dan detail album/foto. Pastikan apakah file ini duplikat konsep dari mockup galeri lain atau state/halaman berbeda. |
| 35 | Suka Maju Village Information Dashboard | `/informasi` (target semantik; route page belum ditemukan pada tree) | **Belum terverifikasi / kandidat gap route**. Source tree memiliki `/profil` dan `/dokumen`, tetapi belum ada bukti keduanya setara dengan halaman informasi desa yang dimaksud. |
| 36 | Village News Dashboard — Desa Suka Maju | `/berita` | Route daftar berita tersedia di source tree; audit 15 Nov menyebut route belum masuk daftar capture. Visual acceptance belum terverifikasi. |
| 37 | Village Official Profile Dashboard | `/pemerintahan` atau `/pemerintahan/perangkat/[slug]` | Audit 15 Nov menyebut route profil perangkat khusus belum ditemukan. Source tree saat pembaruan menunjukkan halaman pemerintahan, tetapi route detail perangkat belum terkonfirmasi. |
| 38 | Visi & Misi Desa Suka Maju | `/visi-misi` atau `/profil/visi-misi` | **FAIL — major visual gap** pada audit 15 Nov: dua panel teks dasar belum setara dengan hero, ikon, section nilai/tujuan, dan CTA referensi. |
| 39 | Wilayah Desa Suka Maju | `/wilayah` | **FAIL — major visual gap** pada audit 15 Nov: hierarki wilayah ada, tetapi peta berwarna, legenda, ringkasan, dan panel geografis belum tersedia; data koordinat tidak boleh direkayasa. |

### Temuan dan keputusan audit

1. **Bukti visual yang dapat dipakai:** audit visual 15 Nov mencatat 14 referensi halaman dengan hasil **0 visual PASS**. Status FAIL di matriks ini hanya dipakai pada halaman yang memang dibahas dalam laporan terdahulu; status tersebut adalah bukti historis dan perlu screenshot ulang terhadap `main` terbaru sebelum dianggap sebagai kondisi terkini.
2. **Route tersedia bukan berarti desain selesai:** keberadaan `page.tsx` hanya membuktikan ada route UI. Itu tidak membuktikan konten, data, interaksi, responsive behavior, maupun kesesuaian visual sudah memenuhi mockup.
3. **Route yang perlu keputusan produk:** `/transparansi/keuangan` dan `/informasi` belum ditemukan sebagai halaman tersendiri pada source tree yang diperiksa. Tentukan apakah keduanya halaman terpisah atau bagian dari halaman yang sudah ada sebelum implementasi.
4. **Potensi tumpang tindih mockup:** dua mockup galeri, dua mockup berita (list/detail), serta dua mockup profil/informasi perlu diklasifikasikan sebagai halaman berbeda atau variasi tampilan sebelum pekerjaan UI dimulai.
5. **Data yang berisiko direkayasa:** peta wilayah, statistik, APBDes/keuangan, dan profil perangkat harus memakai sumber data yang tersedia dan tervalidasi. Bila belum ada, tampilkan status kosong yang jujur atau buat kebutuhan backend terlebih dahulu; jangan mengisi angka/foto/koordinat fiktif.

### Status pembaruan

- [x] Inventaris file publik dan koreksi jumlah menjadi 21.
- [x] Pemetaan awal 21 mockup ke route kandidat berdasarkan source tree.
- [x] Mengaitkan halaman yang relevan dengan temuan audit visual terdahulu.
- [ ] Inspeksi visual ulang isi 21 PNG pada sesi ini — terhalang akses binary PNG dari konektor GitHub.
- [ ] Screenshot ulang current `main` pada desktop/mobile dan visual acceptance terhadap semua referensi.
- [ ] Pemetaan backend per mockup sampai schema, query/use case, API, serta fixture.

**Kesimpulan addendum:** laporan sekarang mencatat 21 mockup publik (bukan 20), route kandidat, bukti audit visual terdahulu, dan kandidat gap halaman. Ini adalah pembaruan dokumentasi berbasis source tree dan audit CI terdahulu; bukan klaim bahwa semua 21 PNG sudah diperiksa ulang secara visual atau bahwa semua halaman sudah sesuai.
