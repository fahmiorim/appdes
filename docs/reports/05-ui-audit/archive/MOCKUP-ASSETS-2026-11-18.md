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
| `docs/mockups/account/FlexiDesa Super Admin Login Interface.png` | 1.864.705 byte | PNG, 1536 × 1024 |
| `docs/mockups/platform/landing/FlexiDesa.id Modern Village Dashboard.png` | 1.859.966 byte | PNG, 1199 × 1312 |
| `docs/mockups/platform/super-admin/FlexiDesa Super Admin Dashboard.png` | 1.597.491 byte | PNG, 1672 × 941 |
| `docs/reports/05-ui-audit/archive/MOCKUP-ASSETS-2026-11-18.md` | — | Laporan task |

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
| 1 | `docs/mockups/account/Edit Profil Pengguna SID Desa Sukamaju.png` | Profil akun |
| 2 | `docs/mockups/account/Modern Indonesian Village Login Portal.png` | Login portal desa |
| 3 | `docs/mockups/account/Pengaturan Keamanan Akun Desa Sukamaju.png` | Keamanan akun |
| 4 | `docs/mockups/account/Reset Kata Sandi SID Desa Sukamaju.png` | Reset kata sandi |
| 5 | `docs/mockups/account/Riwayat Pengajuan Layanan Desa Sukamaju.png` | Riwayat layanan warga |
| 6 | `docs/mockups/account/SID Desa Sukamaju Notification Settings Dashboard.png` | Preferensi notifikasi |
| 7 | `docs/mockups/account/SID Desa Sukamaju OTP Verification.png` | Verifikasi OTP |
| 8 | `docs/mockups/account/SID Desa Sukamaju Registration Page.png` | Registrasi |
| 9 | `docs/mockups/account/SID Desa Sukamaju Reset Kata Sandi.png` | Reset kata sandi |
| 10 | `docs/mockups/account/SID Desa Sukamaju_ Akun Terverifikasi.png` | Status verifikasi akun |
| 11 | `docs/mockups/account/Sukamaju Village Profile Dashboard.png` | Profil pengguna/warga |

### B. Halaman pendukung — 7 mockup

| No. | File | Area yang perlu dipetakan |
|---:|---|---|
| 12 | `docs/mockups/support/Akses Ditolak di Desa Sukamaju.png` | Akses ditolak/403 |
| 13 | `docs/mockups/support/Kebijakan Privasi SID Sukamaju.png` | Kebijakan privasi |
| 14 | `docs/mockups/support/SID Desa Sukamaju 404 Page.png` | Halaman 404 |
| 15 | `docs/mockups/support/SID Desa Sukamaju Maintenance Page.png` | Maintenance |
| 16 | `docs/mockups/support/SID Desa Sukamaju Search Results.png` | Hasil pencarian |
| 17 | `docs/mockups/support/Sitemap Desa Sukamaju Website.png` | Sitemap |
| 18 | `docs/mockups/support/Syarat dan Ketentuan SID Desa Sukamaju.png` | Syarat dan ketentuan |

### C. Website publik desa — 21 mockup

| No. | File | Area yang perlu dipetakan |
|---:|---|---|
| 19 | `docs/mockups/public/Agenda Kegiatan Desa Suka Maju.png` | Agenda |
| 20 | `docs/mockups/public/Berita Gotong Royong Desa Suka Maju.png` | Detail berita |
| 21 | `docs/mockups/public/Data Statistik Desa Suka Maju Dashboard.png` | Statistik |
| 22 | `docs/mockups/public/Desa Suka Maju APBDes Dashboard.png` | Transparansi APBDes |
| 23 | `docs/mockups/public/Desa Suka Maju Photo Gallery.png` | Galeri |
| 24 | `docs/mockups/public/Desa Sukamaju Online Services.png` | Layanan publik |
| 25 | `docs/mockups/public/Indonesian Village Finance Dashboard.png` | Keuangan desa |
| 26 | `docs/mockups/public/Kontak & Pengaduan Desa Suka Maju.png` | Kontak/pengaduan |
| 27 | `docs/mockups/public/Pemerintahan Desa Suka Maju Dashboard.png` | Pemerintahan |
| 28 | `docs/mockups/public/Pengumuman Musdes Desa Suka Maju.png` | Pengumuman |
| 29 | `docs/mockups/public/Potensi Desa Suka Maju Dashboard.png` | Potensi desa |
| 30 | `docs/mockups/public/Profil Desa Suka Maju_ Informasi dan Potensi Desa.png` | Profil desa |
| 31 | `docs/mockups/public/Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png` | Sejarah |
| 32 | `docs/mockups/public/Sistem Informasi Desa Suka Maju.png` | Beranda publik |
| 33 | `docs/mockups/public/Suka Maju Online Letter Services Dashboard.png` | Layanan surat |
| 34 | `docs/mockups/public/Suka Maju Village Gallery Dashboard.png` | Galeri desa |
| 35 | `docs/mockups/public/Suka Maju Village Information Dashboard.png` | Informasi desa |
| 36 | `docs/mockups/public/Village News Dashboard – Desa Suka Maju.png` | Daftar berita |
| 37 | `docs/mockups/public/Village Official Profile Dashboard.png` | Profil perangkat desa |
| 38 | `docs/mockups/public/Visi & Misi Desa Suka Maju.png` | Visi dan misi |
| 39 | `docs/mockups/public/Wilayah Desa Suka Maju.png` | Wilayah desa |

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
**Sumber audit visual terdahulu:** `docs/reports/05-ui-audit/archive/PUBLIC-VISUAL-AUDIT-2026-11-15.md`, yang mendokumentasikan screenshot CI dan perbandingan visual setelah PR #49.
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


---

## Audit visual dan backend — 7 mockup halaman pendukung

**Tanggal pemeriksaan:** 18 November 2026  
**Sumber visual:** tujuh PNG yang diunggah langsung pada sesi audit ini.  
**Basis kode/backend:** branch `main` yang diperiksa melalui recursive Git tree dan pembacaan file sumber.  
**Batas:** audit ini memeriksa desain referensi dan bukti implementasi source code/schema. Ini bukan screenshot runtime atau uji browser terhadap deployment.

### 1. Hasil inspeksi visual mockup

| Mockup | Struktur dan elemen yang terbaca | Catatan UI/UX |
|---|---|---|
| Sitemap | Hero dengan breadcrumb/judul/deskripsi; kelompok tautan dalam kartu tiga kolom; kategori beranda, profil, pemerintahan, layanan, informasi, data/transparansi, galeri, pengaduan, dan tautan lain; footer global. | Hierarki kategori mudah dipindai. Pastikan semua tautan benar-benar menuju route aktif; jangan tampilkan item yang belum tersedia. Pada layar kecil, tiga kolom harus berubah menjadi satu kolom dengan urutan yang logis. |
| Syarat dan Ketentuan | Hero; kartu dokumen utama; tanggal pembaruan; enam bagian bernomor; daftar isi di sidebar; kartu komitmen dan bantuan; footer. | Layout dua kolom cocok untuk dokumen panjang. Daftar isi idealnya memakai anchor yang dapat difokuskan keyboard dan sidebar berubah menjadi blok di atas/bawah konten pada mobile. Tanggal dan isi harus berasal dari dokumen resmi, bukan teks contoh. |
| Akses Ditolak (403) | Ilustrasi kode 403; judul dan penjelasan; panel kemungkinan penyebab; tombol kembali dan masuk; catatan menghubungi administrator; footer. | Pesan jelas dan memberi jalan keluar. Teks mockup menyebut pengguna mungkin belum login, sedangkan implementasi 403 saat ini secara eksplisit untuk pengguna yang sudah login tetapi tidak berhak; kondisi belum login harus tetap ditangani sebagai 401/redirect login, bukan disatukan ke 403. |
| Kebijakan Privasi | Hero; dokumen utama dengan tanggal; enam bagian (data dikumpulkan, penggunaan, penyimpanan/keamanan, berbagi, hak pengguna, perubahan); panel informasi terkait dan komitmen; footer. | Struktur mudah dibaca, tetapi pernyataan seperti data yang dikumpulkan, retensi, pembagian, dan hak pengguna wajib mencerminkan praktik aktual aplikasi dan kebijakan pemerintah desa. Jangan memublikasikan klaim keamanan/privasi yang belum didukung prosedur nyata. |
| 404 | Ilustrasi 404; judul; keterangan; tombol beranda dan cari halaman; tautan populer; footer. | Desain memberi lebih banyak jalan keluar daripada implementasi saat ini. Link pencarian dan tautan populer belum ada pada komponen 404 yang diperiksa. |
| Maintenance | Ilustrasi pemeliharaan; pesan; estimasi selesai berupa tanggal dan jam; pesan terima kasih; tombol beranda dan kontak; footer. | Estimasi selesai harus opsional dan bersumber dari konfigurasi/status operasional. Jangan menampilkan tanggal statis yang sudah kedaluwarsa. Halaman maintenance harus bisa diaktifkan tanpa membuat aplikasi gagal boot atau mengunci akses operator. |
| Hasil Pencarian | Hero dan query; input pencarian; sidebar filter kategori dan rentang waktu; pengurutan relevansi; kartu hasil dengan gambar, kategori, tanggal, jumlah dibaca; pagination. | Ini mockup dengan kebutuhan interaksi/data paling tinggi. Filter kategori/tanggal, sorting, jumlah hasil, pagination, metadata tanggal/hit, dan empty state perlu benar-benar berfungsi. Input dan filter harus mempertahankan query ketika berpindah halaman. |

**Konsistensi visual:** ketujuh mockup memakai identitas yang sama: header navigasi putih, biru–ungu pada hero/aksen, latar konten terang, kartu putih dengan border/shadow lembut, serta footer navy. 403/404/maintenance memakai layout khusus yang lebih terpusat. Ada perbedaan ukuran sumber: empat mockup konten menggunakan 1199×1312 dan tiga mockup state menggunakan 1536×1024; ini tidak boleh dianggap sebagai ukuran viewport final tanpa spesifikasi desain responsif.

### 2. Pemetaan route dan kesiapan UI

| Mockup | Bukti pada `main` | Status |
|---|---|---|
| Sitemap | Tidak ditemukan page route atau file sitemap pada recursive tree yang diperiksa. | **Belum tersedia / perlu implementasi** |
| Syarat dan Ketentuan | Tidak ditemukan route/page atau sumber konten khusus syarat dan ketentuan pada tree yang diperiksa. | **Belum tersedia / perlu keputusan konten** |
| 403 | `src/app/forbidden.tsx` tersedia. Menggunakan judul, pesan akses khusus pengelola platform, link `/beranda` dan `/masuk`. | **Fondasi tersedia; UI belum setara mockup** |
| Kebijakan Privasi | Tidak ditemukan route/page atau sumber konten kebijakan privasi pada tree yang diperiksa. | **Belum tersedia / perlu keputusan konten** |
| 404 | `src/app/not-found.tsx` dan `src/app/not-found.module.css` tersedia. Ada judul, deskripsi, link beranda dan masuk. | **Fondasi tersedia; UI belum setara mockup** |
| Maintenance | Tidak ditemukan route/page atau mekanisme maintenance page pada recursive tree yang diperiksa. | **Belum ditemukan** |
| Hasil Pencarian | Tidak ditemukan halaman pencarian global. `src/app/berita/page.tsx` menerima query `q` dan `kategori` untuk pencarian/penyaringan berita saja. | **Pencarian parsial; bukan halaman hasil pencarian global seperti mockup** |

### 3. Temuan backend, schema, dan database

#### A. Komponen yang sudah punya fondasi

- **403:** laporan implementasi `docs/reports/02-super-admin/B-03c-forbidden-page.md` mendokumentasikan penggunaan Next `forbidden()`, `src/app/forbidden.tsx`, guard server-side, dan test regresi. Pengguna yang sudah login tetapi tidak berhak menerima 403; pengguna tanpa sesi tetap diarahkan ke login. Task tersebut tidak mengubah schema atau migration.
- **404:** `src/app/not-found.tsx` adalah global not-found page, metadata `noindex`, dan tidak memuat data tenant. CSS responsif tersedia pada `src/app/not-found.module.css`. Implementasi saat ini tidak memuat tombol pencarian, tautan populer, header, atau footer seperti mockup.
- **Pencarian berita:** `src/app/berita/page.tsx` membaca `q` dan `kategori`, membatasi query ke 100 karakter, lalu memanggil `daftarBerita(desa.id, ...)` dan `daftarKategoriBerita(desa.id)`. Hasilnya berupa listing berita dengan kategori dan form pencarian berita. Ini belum membuktikan adanya pencarian lintas berita, pengumuman, dokumen, dan halaman.
- **Normalisasi pencarian:** `src/features/publik/domain/pencarian.ts` menyediakan `normalisasiKataKunci` (merapikan spasi dan batas panjang 100 karakter) serta `polaLike` (escape karakter `%`, `_`, dan backslash). Unit test domain tersedia di `pencarian.test.ts`. Keberadaan helper dan test tidak dengan sendirinya membuktikan seluruh UI mockup pencarian telah terhubung.
- **Konten publik:** `src/db/schema/content.ts` memuat tabel tenant-scoped untuk profil desa, jabatan/perangkat, kategori berita, dan berita. Kunci tenant menggunakan `village_id`; slug berita unik per desa. Ini mendukung konten berita/profil yang sudah ada, bukan otomatis seluruh jenis hasil pencarian pada mockup.
- **API informasi:** `src/app/api/publik/informasi/route.ts` menyediakan profil desa, berita, dan dokumen publik dengan paginasi dokumen. API ini bukan endpoint pencarian umum; parameter yang didokumentasikan adalah `page` dan `pageSize`.
- **Pengaduan:** schema `src/db/schema/pengaduan.ts` sudah ada. Tabel `pengaduan` menyimpan `village_id`, nomor tiket unik per desa, kategori, judul/isi, identitas kontak pelapor, lampiran, status, tanggapan, petugas, dan flag publik. Ini bukan dependensi langsung untuk tujuh mockup ini kecuali tautan kontak/pengaduan pada footer/CTA diarahkan ke fitur pengaduan.

#### B. Kebutuhan yang belum ditemukan atau belum terbukti

| Kebutuhan mockup | Hasil pemeriksaan |
|---|---|
| Tabel/schema sitemap | Tidak diperlukan bila sitemap dibangun dari daftar route statis; belum ditemukan route/komponen sitemap. Jika tautan dikelola admin, barulah perlu model menu/tautan yang sesuai. |
| Penyimpanan syarat dan ketentuan | Tidak ditemukan model dokumen legal khusus. Bisa dimulai sebagai konten statis terversi; schema baru hanya diperlukan bila admin perlu mengelola versi/publikasi melalui aplikasi. |
| Penyimpanan kebijakan privasi | Tidak ditemukan model dokumen legal khusus. Kontennya harus disahkan dan diselaraskan dengan alur pemrosesan data yang nyata. |
| Mode maintenance | Tidak ditemukan flag/config dan middleware/guard maintenance yang mengalihkan halaman publik. Perlu desain kontrol operasional, bypass operator, dan perilaku API sebelum dibangun. |
| Pencarian global lintas konten | Belum ditemukan route UI atau API pencarian global dengan kategori, rentang tanggal, sorting relevansi, dan pagination seperti mockup. Helper normalisasi/LIKE dan pencarian berita adalah fondasi parsial saja. |
| Metadata pencarian | Tabel berita memiliki tanggal publikasi dan hit; dokumen/berita dapat dicari dari use case yang tersedia. Belum terbukti satu kontrak hasil pencarian yang menormalisasi tipe, thumbnail, tanggal, hit, kategori, dan URL untuk semua sumber. |
| Daftar isi legal | Bisa dibuat dari heading konten tanpa tabel tambahan. Anchor dan navigasi keyboard merupakan pekerjaan UI. |

**Keputusan database:** jangan membuat tabel baru hanya untuk meniru bentuk mockup. Sitemap, 403, 404, dan maintenance pada dasarnya adalah halaman/state sistem; syarat dan ketentuan serta kebijakan privasi bisa berupa dokumen statis berversi. Schema baru baru dibutuhkan bila produk menghendaki pengelolaan konten legal, jadwal maintenance, atau indeks pencarian persisten dari dashboard.

### 4. Gap dan prioritas implementasi

| Prioritas | Pekerjaan | Kriteria selesai |
|---|---|---|
| P0 | Selaraskan 403 dengan aturan autentikasi | 401/tanpa sesi tetap menuju login; 403 hanya untuk sesi valid yang tidak berhak; tidak membocorkan role/tenant. |
| P0 | Bangun pencarian global | Route dan API tenant-scoped; pencarian minimal berita, pengumuman, dokumen/halaman yang memang dapat dicari; validasi query, escaping LIKE, filter, sorting, pagination, empty state, dan test isolasi tenant. |
| P1 | Implementasi Sitemap | Route publik; tautan hanya ke route yang tersedia; kelompok kategori sesuai mockup; responsif dan aksesibel. |
| P1 | Halaman Kebijakan Privasi dan Syarat & Ketentuan | Konten disetujui pemilik layanan; tanggal versi; heading/anchor; metadata; tautan silang. |
| P1 | Upgrade UI 404 dan 403 | Samakan shell, ilustrasi, footer, CTA, dan responsive layout dengan mockup; 404 punya pencarian/tautan populer hanya setelah targetnya valid. |
| P2 | Maintenance mode | Konfigurasi yang aman, pesan/estimasi opsional, bypass operator, logging, health/API policy, serta uji agar operator tetap dapat memulihkan layanan. |

### 5. Status audit batch pendukung

- [x] Membaca dan menginspeksi visual 7 PNG yang diunggah.
- [x] Mengidentifikasi struktur konten, komponen, dan interaksi yang digambarkan.
- [x] Memeriksa route/page terkait pada recursive source tree `main`.
- [x] Membaca implementasi 403, 404, listing berita, API informasi, helper pencarian, dan schema konten/pengaduan.
- [ ] Membandingkan screenshot runtime aplikasi dengan ketujuh PNG pada desktop/mobile.
- [ ] Menjalankan test/build/CI khusus perubahan implementasi (tidak ada perubahan kode dalam audit dokumentasi ini).
- [ ] Memverifikasi isi legal dengan pemilik kebijakan dan praktik pemrosesan data aktual.
- [ ] Implementasi gap yang tercatat.

**Kesimpulan:** dari tujuh mockup pendukung, fondasi UI/route yang jelas sudah ada untuk 403 dan 404, serta pencarian berita parsial. Sitemap, halaman syarat dan ketentuan, kebijakan privasi, halaman maintenance, dan pencarian global belum ditemukan sebagai implementasi pada source tree yang diperiksa. Schema konten desa dan pengaduan sudah ada, tetapi tidak ada dasar untuk menyimpulkan bahwa seluruh kebutuhan mockup pendukung memerlukan tabel baru. Audit ini tidak menyatakan tampilan runtime sudah cocok; screenshot pembanding aplikasi masih diperlukan.


---

## Audit visual dan backend — 11 mockup kategori Account

**Tanggal pemeriksaan:** 18 November 2026  
**Sumber visual:** 11 PNG kategori account yang diunggah pada sesi audit; PNG Login Super Admin yang ikut terunggah merupakan duplikat mockup utama dan tidak dihitung sebagai mockup account tambahan.  
**Basis kode:** recursive Git tree `main` (tree SHA `12fbc25f9d3f557a53ae461265aa31250fa0e4da`) dan pembacaan implementasi/schema pada branch `main`.  
**Batas:** audit visual mengacu pada PNG referensi dan inspeksi source code/schema. Belum dilakukan screenshot runtime/browser atau perbandingan pixel terhadap aplikasi yang berjalan.

### 1. Inventaris visual yang diperiksa

| No. | Mockup | Isi utama yang terbaca | Catatan UI/UX |
|---:|---|---|---|
| 1 | Login Warga | Hero kantor desa, form email/NIK dan password, remember me, forgot password, Google sign-in, registrasi, benefit strip. | Source login saat ini meminta username/password, bukan email/NIK; belum ada tombol Google, remember me, forgot password, atau CTA registrasi pada form. |
| 2 | Pengaturan Keamanan Akun | Ubah password, toggle 2FA, email/WhatsApp terverifikasi, riwayat login, perangkat terhubung, notifikasi keamanan. | Ini adalah halaman sensitif; data sesi/perangkat harus berasal dari session store, bukan data contoh. Toggle 2FA harus mencerminkan faktor yang benar-benar aktif. |
| 3 | Reset Kata Sandi (permintaan) | Email/NIK, kirim tautan/kode reset, panduan keamanan dan alur reset. | Hindari membocorkan apakah akun terdaftar; respons harus generik, diberi rate limit, dan token harus sekali pakai/berumur pendek. |
| 4 | Riwayat Pengajuan Layanan | Ringkasan status, filter, tabel riwayat, detail permohonan, lampiran, timeline proses. | Schema permohonan mendukung data dasar dan status, tetapi timeline peristiwa dan daftar lampiran yang terlihat perlu dibuktikan terpisah. |
| 5 | Pengaturan Notifikasi | Kanal email/WhatsApp/in-app, jenis notifikasi, ringkasan berkala, jam kirim, preferensi. | Log pengiriman bukan preferensi pengguna. Jangan tampilkan kontrol yang tidak tersimpan atau tidak dihormati worker pengiriman. |
| 6 | Verifikasi OTP Akun | OTP enam digit, tujuan email/WhatsApp tersamarkan, countdown, resend, ubah kontak, tahap aktivasi. | Schema verifikasi kontak dan OTP login tersedia, tetapi keduanya memiliki tujuan berbeda; jangan menyamakan OTP login dengan aktivasi akun. |
| 7 | Registrasi Akun Warga | NIK, nama, email opsional, WhatsApp, password, konfirmasi, persetujuan legal, alur aktivasi. | Schema registrasi warga saat ini hanya menyimpan desa, NIK, nama, nomor HP, status, dan waktu; belum mencakup seluruh field/alur form ini. |
| 8 | Reset Kata Sandi (atur sandi baru) | Password baru, konfirmasi, indikator kekuatan, simpan, kembali ke login. | Better Auth memiliki mekanisme reset token dan callback, tetapi route UI reset khusus belum ditemukan di tree yang diperiksa. |
| 9 | Akun Terverifikasi | Konfirmasi berhasil, tanggal/waktu verifikasi, CTA login dan lengkapi profil. | Tidak ditemukan halaman hasil aktivasi khusus pada route tree. State verifikasi harus berasal dari hasil proses server, bukan timestamp hard-coded. |
| 10 | Profil Akun Warga | Identitas, NIK, domisili, kontak terverifikasi, status akun, dokumen terkait. | Data penduduk dan akun tersedia di schema; halaman profil warga khusus belum ditemukan pada tree. |
| 11 | Edit Profil Warga | Foto, data pribadi, domisili, kontak, unggah/hapus dokumen pendukung. | Schema penduduk memuat banyak field profil, tetapi belum ditemukan route/form edit profil warga yang sesuai mockup. Perubahan NIK harus dibatasi dan diaudit. |

### 2. Pemetaan route/UI pada source tree

| Mockup | Bukti implementasi yang ditemukan | Status |
|---|---|---|
| Login Warga | `src/app/(auth)/masuk/page.tsx`, `login-form.tsx` | **Ada, tetapi gap UI/kontrak login** |
| Pengaturan Keamanan | Tidak ditemukan page route account-security | **Belum ditemukan** |
| Reset password — request | Konfigurasi Better Auth `sendResetPassword` tersedia di `src/lib/auth.ts`; route UI request reset tidak ditemukan | **Backend sebagian; UI belum ditemukan** |
| Riwayat Pengajuan | Halaman dashboard `src/app/(warga)/layanan-mandiri/page.tsx` menampilkan daftar permohonan dasar; route riwayat/detail khusus seperti mockup tidak ditemukan | **Fitur dasar ada; UI belum setara** |
| Pengaturan Notifikasi | Tidak ditemukan page route preferensi notifikasi warga | **Belum ditemukan** |
| Verifikasi OTP Akun | Use case OTP login dan verifikasi kontak tersedia; route UI aktivasi akun/OTP tidak ditemukan | **Backend parsial; UI belum ditemukan** |
| Registrasi Warga | Schema `registrasi_warga` tersedia; route/page registrasi warga tidak ditemukan | **Schema parsial; alur UI belum ditemukan** |
| Reset password — new password | Better Auth reset callback/token tersedia; route UI `/reset-sandi` tidak ditemukan dalam tree | **Backend sebagian; UI belum ditemukan** |
| Akun Terverifikasi | Tidak ditemukan route hasil aktivasi | **Belum ditemukan** |
| Profil Akun | Dashboard layanan mandiri membaca profil dasar; halaman profil terpisah tidak ditemukan | **Data dasar ada; UI belum setara** |
| Edit Profil | Tidak ditemukan route/form edit profil warga | **Belum ditemukan** |

### 3. Temuan schema/database dan backend

#### A. Fondasi yang sudah tersedia

- **Identitas dan sesi:** `src/db/schema/auth.ts` mendefinisikan `users`, `sessions`, `accounts`, dan `verifications`. Sesi menyimpan token, masa berlaku, IP address, user-agent, user ID, serta waktu pembuatan/perubahan. User memiliki `villageId`, `residentId`, status aktif, dan `lastLoginAt`.
- **Autentikasi:** `src/lib/auth.ts` mengaktifkan email/password Better Auth, username plugin, rate limit, masa sesi 7 hari, dan pencabutan sesi saat reset password. Email reset dikirim melalui Resend bila konfigurasi tersedia; tanpa konfigurasi production, kode hanya mencatat error dan email tidak terkirim.
- **Login warga:** halaman `/masuk` memanggil `authClient.signIn.username`. Form menerima username dan password. Tidak ada implementasi pada form ini untuk login Google, login dengan NIK/email, remember me, atau link lupa password/registrasi seperti referensi.
- **OTP login:** `src/db/schema/login-otp.ts` menyimpan hash OTP, kanal, target, kedaluwarsa, jumlah percobaan, dan waktu pemakaian. Use case `src/features/auth/application/login-otp-use-cases.ts` menerapkan pesan generik, rate limit 3 permintaan per 5 menit per akun, masa berlaku 10 menit, hash OTP, batas percobaan, serta penandaan sekali pakai yang diklaim secara atomik. Ini adalah OTP faktor kedua login, bukan otomatis OTP registrasi.
- **Verifikasi kontak:** `src/db/schema/verifikasi-kontak.ts` menyimpan village/resident, target, kanal email/WhatsApp, hash kode, kedaluwarsa, dan waktu verifikasi. Schema ini mendukung verifikasi kontak penduduk; route aktivasi akun dan UI OTP belum ditemukan.
- **Registrasi:** `src/db/schema/registrasi-warga.ts` hanya memuat villageId, NIK, nama, nomor HP, status, dan createdAt. Ini belum menyimpan seluruh data form mockup (email, password, persetujuan legal, state token/OTP, dan metadata proses).
- **Data profil:** `src/db/schema/resident.ts` memuat NIK, nama, gender, tempat/tanggal lahir, keluarga, domisili/region, alamat, telepon, pekerjaan, pendidikan, status hidup/domisili, dan referensi terkait. NIK unik per desa dan tenant relation memakai composite foreign key.
- **Dokumen warga:** schema `dokumen-warga` tersedia dalam source tree. Dashboard layanan mandiri menampilkan dokumen pribadi dari penyimpanan privat dengan tautan unduh berdasarkan ID.
- **Riwayat permohonan:** `src/db/schema/permohonan-surat.ts` menyimpan residentId, jenis surat, nomor antrean, status, isian form, syarat, nomor HP, keterangan, alasan, serta timestamp. Ada index tenant/status dan tenant/createdAt serta composite FK tenant untuk penduduk dan jenis surat. Status yang didokumentasikan: belum lengkap, diperiksa, menunggu tanda tangan, siap diambil, diambil, dibatalkan.
- **Notifikasi:** schema `notifikasi-terkirim` dan `bukti-pengiriman-notifikasi` tersedia sebagai bukti/log pengiriman. Belum ditemukan schema preferensi kanal/jenis notifikasi per user, ringkasan berkala, atau rentang jam pengiriman.
- **Audit:** schema audit tersedia untuk jejak aktivitas, tetapi tidak dengan sendirinya membuktikan UI riwayat login/perangkat yang dapat dikelola warga.

#### B. Gap penting dan risiko

1. **Jangan klaim Google sign-in tersedia:** pada login form yang diperiksa hanya ada username/password. Integrasi provider Google belum dibuktikan.
2. **Reset password backend belum end-to-end siap produksi hanya dari callback:** email membutuhkan `RESEND_API_KEY` dan `RESEND_FROM`; route request/reset UI belum ditemukan. Perlu uji token kedaluwarsa, penggunaan ulang token, enumeration, rate limit, serta pencabutan sesi.
3. **2FA mockup lebih luas daripada bukti implementasi:** yang ditemukan adalah OTP login berbasis kanal email/WhatsApp dan flag `otpLoginAktif`; belum ditemukan TOTP authenticator, recovery codes, pengelolaan faktor, atau UI pengaturan 2FA.
4. **Perangkat terhubung/riwayat login:** tabel sessions menyediakan IP dan user-agent, tetapi halaman warga untuk melihat/mencabut sesi tidak ditemukan. Jangan tampilkan perangkat dan lokasi yang direka.
5. **Preferensi notifikasi belum memiliki bukti persistence:** log notifikasi terkirim bukan pengganti tabel preferensi pengguna. Toggle dan jadwal pada mockup belum dapat dianggap berfungsi.
6. **Registrasi dan verifikasi aktivasi belum lengkap:** tabel registrasi yang ada hanya menyimpan data minimum dan status. Perlu tetapkan apakah warga mendaftar mandiri atau melalui verifikasi operator, bagaimana pencocokan NIK per tenant dilakukan, dan kapan akun Better Auth ditautkan ke resident.
7. **Edit profil perlu aturan field:** NIK dan village ownership tidak boleh dapat diubah bebas oleh pengguna; perubahan identitas/domisili perlu validasi, otorisasi, audit, dan tenant scoping. Upload dokumen wajib memakai validasi MIME/magic bytes dan penyimpanan privat.
8. **Riwayat status belum sama dengan timeline:** permohonan menyimpan status saat ini dan alasan, tetapi schema yang diperiksa belum membuktikan tabel event timeline lengkap seperti panel riwayat proses pada mockup. Lampiran permohonan juga perlu diverifikasi dari schema syarat/berkas dan route terkait.

### 4. Keputusan implementasi yang direkomendasikan

| Prioritas | Pekerjaan | Kriteria selesai |
|---|---|---|
| P0 | Selaraskan login warga | Putuskan username vs email/NIK; UI tidak menawarkan Google/remember me/forgot/register sebelum backend dan policy siap. |
| P0 | Lengkapi alur reset sandi | Request + token reset + form sandi baru, email production, respons anti-enumeration, rate limit, audit, dan session revocation teruji. |
| P0 | Rancang registrasi dan verifikasi warga | Validasi NIK tenant-scoped, persetujuan legal, tautkan user-resident secara aman, OTP kontak sekali pakai, expiry dan retry limit. |
| P1 | Profil dan edit profil | Read/update data resident dengan tenant scope, field allowlist, verifikasi kontak, audit perubahan, upload dokumen privat. |
| P1 | Riwayat pengajuan | Daftar terfilter dan detail permohonan; timeline hanya bila event log tersedia/dibangun; lampiran memakai route privat dan authorization pemilik. |
| P1 | Preferensi notifikasi | Model preferensi per user/tenant dan kanal/jenis; worker menghormati opt-in dan jadwal; notifikasi keamanan kritis memiliki policy terpisah. |
| P1 | Keamanan akun | UI sesi/perangkat dari tabel sessions; revoke sesi per perangkat; jelaskan OTP login berbeda dari TOTP; implementasikan faktor tambahan hanya setelah threat model dan recovery flow disepakati. |
| P2 | Halaman hasil aktivasi | Hanya menampilkan sukses setelah transaksi verifikasi benar-benar committed; jangan gunakan data tanggal statis. |

**Keputusan database:** beberapa kebutuhan dapat memakai schema yang sudah ada (profil penduduk, sesi, OTP login, verifikasi kontak, permohonan, dokumen, log notifikasi). Namun preferensi notifikasi dan timeline status permohonan belum terbukti tersedia. Registrasi mandiri penuh mungkin membutuhkan perluasan model/workflow; jangan menambah tabel sebelum alur bisnis dan kepemilikan data disepakati.

### 5. Status batch account

- [x] 11 mockup account diperiksa secara visual dari unggahan.
- [x] Satu mockup Login Super Admin yang ikut terunggah dikenali sebagai duplikat mockup utama dan tidak dihitung ulang.
- [x] Recursive route tree `main` diperiksa untuk halaman autentikasi dan warga.
- [x] Schema auth, sesi, OTP login, verifikasi kontak, registrasi warga, penduduk, permohonan surat, dan notifikasi dibaca.
- [x] Login form warga, konfigurasi Better Auth, use case/repository OTP login, dan dashboard layanan mandiri diperiksa.
- [ ] Screenshot runtime aplikasi dibandingkan dengan 11 PNG pada desktop/mobile.
- [ ] Uji end-to-end browser untuk registrasi, OTP, reset password, profil, notifikasi, perangkat, dan riwayat.
- [ ] Implementasi gap yang dicatat di atas.

**Kesimpulan:** dari 11 mockup account, route login warga dan dashboard layanan mandiri tersedia tetapi belum setara referensi. Fondasi backend untuk identitas, sesi, OTP login, verifikasi kontak, profil penduduk, dokumen, permohonan surat, dan log notifikasi sudah ada. Halaman registrasi, aktivasi, reset password UI, profil/edit profil, pengaturan keamanan, pengaturan preferensi notifikasi, serta riwayat/detail pengajuan sesuai mockup belum ditemukan pada route tree yang diperiksa. Tidak semua kebutuhan memerlukan tabel baru; gap utama adalah route/UI, alur use case, preferensi notifikasi, dan bukti timeline. Audit ini bukan klaim bahwa screenshot runtime telah lulus visual QA.

---
## Audit visual dan pemetaan implementasi — 21 dari 21 mockup publik

**Tanggal:** 18 November 2026  
**Sumber visual:** 21 PNG yang diunggah pada sesi ini; seluruh file berhasil dibuka. Sebanyak 20 file berukuran 1024 × 1536 dan satu file Desa Sukamaju Online Services berukuran 1199 × 1312.  
**Basis kode:** recursive Git tree main SHA 12fbc25f9d3f557a53ae461265aa31250fa0e4da dan pembacaan 20 file route/page terkait.  
**Batas:** inspeksi ini mencakup PNG referensi dan source code, bukan screenshot runtime. Belum ada halaman yang dapat dinyatakan visual implementation PASS.

### 1. Temuan visual lintas mockup

- Mayoritas desain konsisten: latar putih/biru muda, panel rounded, heading navy, aksen ungu/violet, ikon berwarna, hero biru berilustrasi desa, dan footer navy.
- Pola navigasi, breadcrumb, hero, CTA, dan footer berulang cukup konsisten. Namun semua mockup utama berbentuk screenshot desktop panjang; breakpoint, menu mobile, urutan kolom, tabel/chart mobile, dan ukuran target sentuh belum dispesifikasikan.
- **Inkonsistensi brand:** Desa Sukamaju Online Services memakai identitas “Desa Sukamaju”, lokasi “Kec. Maju Jaya, Kab. Sejahtera”, dan aksen biru. Mayoritas mockup memakai “Desa Suka Maju”, “Kec. Sei Balai, Kab. Batu Bara”, dan sistem biru-ungu. Putuskan apakah ini variasi desain lama/tenant contoh atau perlu diselaraskan. Jangan mencampur identitas contoh dengan data tenant Batu Bara.
- **Data keuangan tidak konsisten:** mockup APBDes menampilkan pendapatan/belanja Rp1.865.000.000, sedangkan mockup laporan keuangan menampilkan pendapatan Rp1.500.000.000 dan belanja/realisasi Rp1.420.000.000. Tandai sebagai data demo dan rekonsiliasi sebelum dijadikan fixture atau screenshot acceptance.
- Dua mockup galeri adalah overview dan detail album, bukan duplikat. Dua mockup layanan surat menunjukkan katalog layanan dan halaman pengajuan online; hubungan route/varian perlu ditentukan.

### 2. Matriks 20 mockup

| Mockup | Route pada main | Hasil pemeriksaan source |
|---|---|---|
| Sistem Informasi Desa Suka Maju | / — ada | Beranda memakai identitas desa, statistik, agenda, dan konten publik. Screenshot runtime belum dibandingkan dengan seluruh section mockup. |
| Profil Desa — Informasi dan Potensi | /profil — ada | Menggunakan profilDesaPublik dan daftarPerangkatPublik; foto utama, peta, potensi, sarana perlu dicocokkan dengan runtime. |
| Sejarah Desa | /sejarah dan /profil/sejarah — ada | Page memakai profil desa; timeline, foto arsip, dan kutipan perlu diverifikasi pada runtime. |
| Visi & Misi | /visi-misi dan /profil/visi-misi — ada | Route tersedia; section tujuan, nilai dasar, dan arah kebijakan perlu dibandingkan dengan runtime. |
| Wilayah Desa | /wilayah — ada | Menggunakan use case GIS/wilayah; PNG kini telah diperiksa. Peta, batas dusun, legenda, geometri, dan luas tetap perlu diverifikasi terhadap runtime dan sumber data. |
| Potensi Desa | /potensi — ada | Menggunakan konten statis publik; data sektor, angka potensi, galeri dan CTA perlu audit sumber data. |
| Pemerintahan Desa | /pemerintahan — ada | Mengambil daftar perangkat publik; struktur organisasi, BPD, lembaga, tugas/fungsi, dan foto perlu dicocokkan. |
| Village Official Profile Dashboard | /pemerintahan/perangkat/[slug] — tidak ditemukan | Mockup detail perangkat berisi biodata, kontak, masa jabatan, tugas, dokumen; daftar perangkat bukan pengganti route detail. |
| Desa Sukamaju Online Services | /layanan — ada | Katalog layanan tersedia, tetapi brand/lokasi dan sistem visual berbeda dari mayoritas mockup. |
| Suka Maju Online Letter Services Dashboard | /layanan/surat — ada | Memanggil listJenisSuratPublik. Akun, syarat, alur, FAQ, dan riwayat pada mockup belum otomatis terbukti berfungsi. |
| Village News Dashboard | /berita — ada | Menggunakan daftar berita dan kategori; hero, pencarian, filter, populer, agenda perlu screenshot runtime. |
| Berita Gotong Royong (detail) | /berita/[slug] — ada | Memakai detailBerita dan catatKunjunganBerita; galeri foto, penulis, berita terkait, komentar dan share perlu verifikasi terpisah. |
| Pengumuman Musdes (detail) | /pengumuman — listing ada | Page menggunakan daftar berita/kategori; route detail pengumuman berbasis slug belum ditemukan. |
| Agenda Kegiatan | /agenda — ada | Memakai use case agenda dan kalender; filter, statistik, agenda mendatang, unduh, notifikasi dan pagination perlu uji interaksi. |
| Suka Maju Village Gallery Dashboard | /galeri — ada | Memakai daftarAlbumGaleri; kategori, pencarian, album, grid, video perlu screenshot runtime. |
| Desa Suka Maju Photo Gallery (detail album) | /galeri/[slug] — ada | Memakai detailAlbumGaleri dan daftarFotoAlbum; ZIP, share, sorting dan pagination perlu verifikasi. |
| Data Statistik Desa | /data/statistik dan alias /statistik — ada | Route alias ke page statistik; KPI, chart demografi/pendidikan/pekerjaan, rekap dusun dan peta belum dapat dianggap tersedia penuh tanpa audit data dan runtime. |
| APBDes Dashboard | /transparansi/apbdes — ada | Memakai getLaporanApbdesPublik dan listLaporanDokumenApbdesPublik; chart, tab, komposisi dan angka perlu validasi data. |
| Indonesian Village Finance Dashboard | /transparansi/keuangan — tidak ditemukan | Detail laporan keuangan dengan realisasi, triwulan, dokumen dan tahun anggaran. Route APBDes yang ada belum tentu menggantikan halaman ini. |
| Kontak & Pengaduan | /kontak dan /pengaduan — ada | Dua route tersedia; mockup menggabungkan form, kanal kontak, jam layanan, peta, status tiket dan FAQ. Komposisi/pemisahan route perlu diputuskan. |

### 3. Gap route yang terkonfirmasi

1. Detail perangkat desa belum memiliki route dinamis tersendiri.
2. Detail laporan keuangan belum memiliki route /transparansi/keuangan.
3. Mockup pengumuman adalah detail, sedangkan /pengumuman yang ditemukan merupakan listing; route detail belum ditemukan.
4. Route yang tersedia hanya membuktikan page file ada, bukan bahwa tampilan dan semua interaksi mockup selesai.

### 4. Dukungan backend yang teridentifikasi dari source

- Beranda: identitas desa, statistik, agenda mendatang.
- Profil/pemerintahan/berita/pengumuman/galeri/potensi: use case konten publik; detail berita mencatat kunjungan.
- Layanan surat: daftar jenis surat publik.
- Agenda: agenda mendatang dan kalender/bulan agenda.
- Wilayah: use case GIS dan daftar wilayah publik.
- APBDes: use case laporan publik dan dokumen APBDes.
- Pengaduan: use case pengaduan publik.
- Untuk chart statistik rinci, agregasi keuangan per periode, komentar berita, unduh ZIP, notifikasi agenda, dan pencarian lintas-modul, pembacaan route saja belum cukup untuk menyatakan backend PASS. Perlu audit use case/schema/API dan uji runtime.

### 5. Prioritas tindak lanjut

| Prioritas | Pekerjaan |
|---|---|
| P0 | Selaraskan brand/identitas contoh dan rekonsiliasi angka demo keuangan. |
| P0 | Putuskan route detail perangkat, laporan keuangan, dan pengumuman. |
| P1 | Ambil screenshot runtime seluruh route pada desktop dan mobile, lalu bandingkan per section dengan PNG. |
| P1 | Audit kontrak data/interaksi statistik, agenda, layanan, galeri, APBDes, pengaduan, komentar, share dan unduhan. |
| P2 | Implementasikan gap terukur dan tambahkan visual regression serta interaction tests. |

### 6. Status batch publik

- [x] 21 PNG yang diunggah berhasil dibuka dan diinspeksi secara visual.
- [x] Dimensi seluruh 20 PNG diperiksa.
- [x] Recursive tree main diperiksa dan 20 file route/page terkait dibaca.
- [x] Inkonsistensi brand dan angka contoh keuangan dicatat.
- [x] Tiga kebutuhan detail tanpa route tersendiri diidentifikasi: perangkat, laporan keuangan, pengumuman.
- [x] Mockup publik ke-21 (Wilayah Desa Suka Maju) diterima dan diperiksa pada 18 Nov 2026.
- [ ] Screenshot runtime dibandingkan dengan 20 PNG.
- [ ] Semua use case/schema/API pendukung diperiksa mendalam dan interaksi diuji.
- [ ] Gap implementasi diselesaikan.

**Kesimpulan:** 21 mockup publik sudah benar-benar diperiksa secara visual. Source tree memiliki fondasi route/use case yang cukup luas, tetapi tiga kebutuhan detail belum memiliki route terpisah dan beberapa interaksi/data belum dapat dinyatakan didukung hanya dari keberadaan page. Belum ada dasar menyatakan 20 halaman lulus visual acceptance; diperlukan screenshot runtime pada viewport yang sama.


---
## Addendum — inspeksi mockup Wilayah Desa (21/21)

**Tanggal:** 18 November 2026  
**Sumber:** PNG `Wilayah Desa Suka Maju(2).png`, unggahan terakhir pengguna, 1024 × 1536.  
**Route kandidat pada source tree yang sudah dipetakan:** `/wilayah`. Pada inventaris source sebelumnya route ini tercatat tersedia dan memakai use case GIS/wilayah publik. Pemeriksaan ini menutup inspeksi visual PNG ke-21; belum merupakan visual acceptance runtime.

### Elemen yang tampak pada mockup

- Hero halaman “Wilayah Desa” dengan breadcrumb dan navigasi profil desa.
- Peta utama berbasis citra satelit, batas desa berwarna, empat poligon dusun, label nama dusun, pin lokasi desa, kompas, skala, zoom, serta kontrol tampilan peta.
- Panel informasi wilayah: luas, jumlah dusun, RT/RW, ketinggian, suhu, curah hujan, dan topografi.
- Tabel pembagian dusun yang memuat luas wilayah, jumlah RT, KK, dan penduduk.
- Batas wilayah administratif untuk arah utara, selatan, timur, dan barat.
- Ringkasan kondisi geografis dengan foto lanskap.
- Tombol unduh peta, batas wilayah, dan data dusun dalam PDF.

### Temuan validasi data pada mockup

- Luas dusun 2,50 + 2,00 + 2,70 + 2,80 = **10,00 km²**, sesuai angka luas wilayah pada panel.
- Jumlah RT 3 + 3 + 3 + 3 = **12 RT**, sesuai panel informasi.
- Jumlah KK 420 + 398 + 445 + 487 = **1.750 KK**, sesuai total tabel.
- Jumlah penduduk pada empat baris adalah 1.312 + 1.249 + 1.398 + 1.486 = **5.445 jiwa**, sesuai total tabel.
- Panel informasi menampilkan **4 dusun**, sesuai tabel dan empat area peta.
- Batas administratif yang ditampilkan adalah Utara: Desa Tanjung Gading; Selatan: Desa Sumber Rejo; Timur: Desa Sei Balai; Barat: Desa Pematang Panjang.

### Kebutuhan backend/data yang perlu dibuktikan

1. Geometri batas desa dan batas dusun harus berasal dari data GIS yang benar, bukan polygon ilustratif atau koordinat contoh.
2. Layer peta satelit, label dusun, marker, skala, dan zoom perlu diuji pada runtime; keberadaan use case GIS saja belum membuktikan semua kontrol peta sudah diimplementasikan.
3. Statistik luas, RT/RW, KK, penduduk, kondisi geografis, dan batas administratif harus tenant-scoped serta konsisten dengan sumber data resmi.
4. Tiga unduhan PDF harus menghasilkan dokumen yang benar dan terotorisasi, bukan tombol dekoratif.
5. Verifikasi apakah data suhu, curah hujan, ketinggian, dan topografi tersedia sebagai data desa yang terkelola; jangan mengisi nilai contoh seolah-olah data resmi.

### Status mockup publik ke-21

- [x] PNG diterima, dapat dibuka, dan diperiksa secara visual.
- [x] Dimensi 1024 × 1536 dicatat.
- [x] Elemen peta, informasi, tabel dusun, kondisi geografis, dan unduhan diinventarisasi.
- [x] Konsistensi aritmetika angka luas, RT, KK, dan penduduk diperiksa.
- [x] Route kandidat `/wilayah` sudah tercatat tersedia pada source tree sebelumnya.
- [ ] Screenshot runtime `/wilayah` dibandingkan dengan PNG pada viewport yang sama.
- [ ] Geometri GIS, kontrak data, tenant scoping, dan keluaran PDF diverifikasi melalui use case/API serta pengujian.

**Kesimpulan:** seluruh **21/21 mockup publik** kini telah diperiksa secara visual dari PNG referensi. Belum ada klaim bahwa halaman runtime `/wilayah` atau keseluruhan website telah lulus visual QA; langkah berikutnya tetap screenshot comparison dan verifikasi data GIS/unduhan.


---

## Status dokumen setelah konsolidasi audit 42 mockup

Laporan ini dipertahankan sebagai riwayat inventaris aset dan audit kesiapan tiga mockup utama (landing platform, login Super Admin, dashboard Super Admin). Untuk status terkini seluruh 42 mockup, gunakan laporan konsolidasi: docs/reports/05-ui-audit/UI-MOCKUP-AUDIT-FINAL-2026-11-18.md.

Catatan inventaris awal bahwa 39 aset tambahan belum diperiksa merupakan status pada saat laporan ini dibuat. Audit lanjutan kemudian memeriksa PNG referensi 42 mockup, memetakan route/source, dan mendokumentasikan batas screenshot runtime. Jangan gunakan inventaris awal ini secara terpisah untuk menyimpulkan status visual semua mockup.
