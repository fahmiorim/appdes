# Audit Final Kesesuaian Mockup ↔ UI ↔ Backend

- **Task:** audit desain 42 mockup terhadap UI aktual, sekaligus menilai kecukupan backend untuk menyuplai data yang digambar mockup.
- **Tanggal:** 18 November 2026.
- **Branch:** `main`, base commit `12fbc25`.
- **Status:** laporan selesai; **belum ada perubahan source code** dan belum di-commit.
- **Menggantikan:** `docs/reports/05-ui-audit/archive/UI-MOCKUP-AUDIT-2026-11-18-draft.md`. Draft lama memuat setidaknya dua klaim yang dikoreksi di sini (lihat §7).

## 1. Tujuan dan batas

Audit ini menjawab dua pertanyaan:

1. Apakah setiap mockup sudah punya halaman pasangan, dan seberapa jauh UI aktual mengikuti mockup?
2. Apakah backend (schema, use case, query) mampu menghasilkan data yang tampil di mockup?

Audit **tidak** menilai kesiapan produksi, keamanan menyeluruh, atau kelengkapan modul SID. Temuan keamanan hanya dicatat bila berkaitan langsung dengan data yang dibutuhkan mockup.

## 2. Metode dan aturan bukti

- Seluruh **42 file mockup** di `docs/public` (21), `docs/account` (12), `docs/pendukung` (7), `docs/superadmin` (1), dan `docs/landing page` (1) dibuka dan diperiksa langsung.
- Status visual memakai tangkapan layar yang sudah ada di `artifacts/ui-audit/desktop-1440/` (21 halaman) dan `artifacts/ui-audit/mobile-390/` (4 halaman). **Tidak ada tangkapan baru** pada audit ini.
- Setiap route diperiksa keberadaannya di `src/app`; setiap kebutuhan data ditelusuri ke `src/db/schema` dan `src/features` dengan bukti file.
- Tidak ada status "sesuai" yang diberikan hanya karena nama file, nama modul, atau route mirip.
- Artefak tangkapan layar berada di folder yang di-ignore Git, sehingga reviewer tidak dapat membukanya dari repository. Mockup asli di `docs/` tetap tersedia.

### Definisi status visual

| Status | Arti |
|---|---|
| **Mendekati** | Struktur utama mockup sudah terwujud; perbedaan terbatas pada aset, warna, atau kepadatan. |
| **Berbeda material** | Halaman ada, tetapi komposisi/komponen inti mockup tidak ada atau diganti pola lain. |
| **Belum ada halaman** | Tidak ada `page.tsx` untuk route yang dibutuhkan. |
| **Belum diverifikasi visual** | Route ada, tetapi tidak ada tangkapan layar; penilaian hanya dari struktur kode. |

### Definisi status backend

| Status | Arti |
|---|---|
| **Cukup** | Field dan use case/query sudah ada untuk seluruh data utama komponen mockup. |
| **Parsial** | Sebagian data tersimpan; agregasi, field, atau use case yang dibutuhkan belum ada. |
| **Belum ada** | Tidak ada schema/field/use case yang dapat menghasilkan data tersebut. |

## 3. Ringkasan hasil

| Kategori | Jumlah |
|---|---|
| Mockup diperiksa | **42** |
| Mendekati struktur | 2 |
| Berbeda material (halaman ada) | 17 |
| Belum diverifikasi visual (route ada) | 5 |
| Belum ada halaman | 18 |

Dari 24 mockup yang sudah punya route, hanya **halaman login warga dan login Super Admin** yang strukturnya mendekati mockup. Halaman publik lainnya memakai shell dan pola visual sendiri: hero gradien, kartu generik, dan banyak empty state.

Backend lebih siap daripada UI. Untuk data inti (identitas desa, berita, agenda, galeri, statistik dasar, APBDes, surat, dokumen, login) schema dan sebagian besar use case sudah ada. Kekurangan backend terkonsentrasi pada **agregasi statistik lanjutan, metadata APBDes, atribut waktu/kategori agenda, video galeri, wilayah geografis, potensi desa, alur pengaduan publik, pendaftaran akun warga, dan pencarian global**.

## 4. Matriks 42 mockup

Keterangan route: `—` berarti belum ada halaman.

### A. Website publik (21)

| # | Mockup | Route aktual | Status | Selisih utama |
|---|---|---|---|---|
| 1 | Sistem Informasi Desa Suka Maju | `/` | Berbeda material | Mockup: hero foto + potret kades, 6 aksi cepat, 4 statistik berwarna, sambutan, berita + pengumuman berdampingan, profil desa berfoto, galeri, alur layanan, tautan instansi, footer sosial/legal. UI: hero gradien, 4 kartu layanan, 3 statistik, berita/agenda, footer ringkas. |
| 2 | Profil Desa Suka Maju | `/profil` | Berbeda material | Mockup: banner foto desa, tab profil, kartu identitas + peta + statistik, sejarah ringkas, visi-misi, perangkat, potensi. UI: hero gradien, narasi profil, kartu visi/misi, daftar perangkat. |
| 3 | Sejarah Desa Suka Maju | `/profil/sejarah` | Berbeda material | Mockup: timeline bertahun, foto arsip, tonggak sejarah. UI: satu kartu teks; tampil empty state pada data dev. |
| 4 | Visi & Misi Desa Suka Maju | `/profil/visi-misi` | Berbeda material | Mockup: kartu visi besar, misi bernomor/ikon, nilai desa. UI: dua kartu teks; tanpa ikon/daftar misi terstruktur. |
| 5 | Pemerintahan Desa Suka Maju | `/pemerintahan` | Berbeda material | Mockup: bagan organisasi, kartu pejabat berfoto, BPD, tugas/fungsi. UI: daftar perangkat; tanpa bagan, BPD, atau uraian tugas. |
| 6 | Village Official Profile Dashboard | — | Belum ada halaman | Mockup adalah **detail perangkat desa**, bukan profil desa. Route `/pemerintahan/perangkat/[slug]` belum ada. |
| 7 | Wilayah Desa Suka Maju | `/wilayah` | Berbeda material | Mockup: peta wilayah, kartu batas/geografis, tabel dusun-RT/RW, luas. UI: peta kosong, ringkasan angka, daftar wilayah; tanpa batas/geografis/luas. |
| 8 | Village News Dashboard | `/berita` | Berbeda material | Mockup: artikel unggulan, sidebar kategori/populer, grid berita, paginasi. UI: pencarian + chip kategori + daftar kartu; tanpa unggulan, sidebar, paginasi. |
| 9 | Berita Gotong Royong | `/berita/[slug]` | Belum diverifikasi visual | Route ada. Kode menampilkan judul, meta, isi, hit. Mockup menambah galeri 4 foto, kutipan kades, tag, berita terkait, komentar, penulis, kategori, agenda. |
| 10 | Pengumuman Musdes | `/pengumuman` | Berbeda material | Mockup: pengumuman utama berfoto, daftar, sidebar. UI: kartu utama + daftar, empty state pada data dev. Detail memakai `/berita/[slug]`. |
| 11 | Agenda Kegiatan Desa | `/agenda` | Berbeda material | Mockup: kalender + statistik kegiatan + agenda mendatang + unduh jadwal. UI: kalender, filter, daftar agenda; tanpa statistik/unduhan/status kegiatan. |
| 12 | Suka Maju Village Gallery Dashboard | `/galeri` | Berbeda material | Mockup: tab Semua/Foto/Video, album unggulan, grid album. UI: pencarian album + grid + ringkasan; tanpa tab, album unggulan, video. |
| 13 | Desa Suka Maju Photo Gallery | `/galeri/[slug]` | Belum diverifikasi visual | Route ada. Mockup: hero album, info album, grid 32 foto, lightbox, unduh ZIP, bagikan, album lain. Belum ada bukti visual. |
| 14 | Potensi Desa Suka Maju | `/potensi` | Berbeda material | Mockup: kategori potensi, kartu unggulan, tabel potensi, foto. UI: satu kartu teks dan empty state; tanpa kategori/tabel/angka. |
| 15 | Data Statistik Desa Suka Maju | `/data/statistik` | Berbeda material | Mockup: KPI, donut usia, bar pendidikan, bar pekerjaan, tabel dusun, catatan sumber. UI: tab + 6 KPI + ringkasan; tanpa tiga grafik tersebut. |
| 16 | Desa Suka Maju APBDes | `/transparansi/apbdes` | Berbeda material | Mockup: status Perdes, 4 KPI, tabel realisasi per bidang, donut, dokumen. UI: tab, tahun, ringkasan/dokumen; tampil empty state. |
| 17 | Indonesian Village Finance Dashboard | — | Belum ada halaman | `/transparansi/keuangan` tidak ada. Sebagian kebutuhan ditutup halaman APBDes. |
| 18 | Desa Sukamaju Online Services | `/layanan` | Berbeda material | Mockup: grid layanan berikon, persyaratan, alur, FAQ, kontak. UI: daftar layanan + CTA; tanpa alur/FAQ/kategori. |
| 19 | Online Letter Services | `/layanan/surat` | Berbeda material | Mockup: katalog kartu, persyaratan, estimasi, alur, FAQ. UI: daftar jenis surat; empty state; tanpa estimasi/FAQ. |
| 20 | Kontak & Pengaduan Desa Suka Maju | `/kontak` | Berbeda material | Mockup: kontak, form pengaduan, peta, FAQ. UI: 4 kartu kontak; halaman menyatakan form pengaduan belum dihubungkan. |
| 21 | Village Information Dashboard | — | Belum ada halaman | `/informasi` tidak ada. Isinya saat ini tersebar di berita, pengumuman, dan dokumen. |

### B. Akun dan autentikasi (12)

| # | Mockup | Route aktual | Status | Selisih utama |
|---|---|---|---|---|
| 22 | Modern Indonesian Village Login Portal | `/masuk` | Mendekati | Struktur split hero + foto kantor + kartu login + benefit strip + footer navy sudah ada. Branding memakai FlexiDesa, bukan identitas desa; tanpa header navigasi desa. |
| 23 | FlexiDesa Super Admin Login Interface | `/super-admin-login` | Mendekati | Struktur dua kolom + 4 kartu fitur + kartu login sesuai. Mockup memakai foto lanskap; UI memakai ilustrasi gradien. |
| 24 | Registration Page | — | Belum ada halaman | `/daftar` tidak ada; tidak ada use case registrasi warga. |
| 25 | OTP Verification | — | Belum ada halaman | `/verifikasi` tidak ada. Backend hanya punya OTP untuk login, bukan verifikasi pendaftaran. |
| 26 | Akun Terverifikasi | — | Belum ada halaman | `/akun/terverifikasi` tidak ada. |
| 27 | Reset Kata Sandi (baru) | — | Belum ada halaman | `/reset-password` tidak ada. |
| 28 | Lupa Kata Sandi | — | Belum ada halaman | `/lupa-password` tidak ada. |
| 29 | Profil Pengguna | — | Belum ada halaman | `/akun/profil` tidak ada. |
| 30 | Edit Profil | — | Belum ada halaman | `/akun/profil/edit` tidak ada. |
| 31 | Pengaturan Keamanan | — | Belum ada halaman | `/akun/keamanan` tidak ada. |
| 32 | Notification Settings | — | Belum ada halaman | `/akun/notifikasi` tidak ada. |
| 33 | Riwayat Pengajuan Layanan | — | Belum ada halaman | `/akun/layanan` tidak ada. Area warga yang ada hanya kios `layanan-mandiri`, bukan akun pribadi. |

### C. Halaman pendukung (7)

| # | Mockup | Route aktual | Status | Selisih utama |
|---|---|---|---|---|
| 34 | 404 Page | `not-found.tsx` | Berbeda material | UI hanya angka 404 + dua tombol, tanpa header/footer, ilustrasi, pencarian, dan tautan populer. |
| 35 | Maintenance Page | — | Belum ada halaman | Tidak ada route maupun flag maintenance. |
| 36 | Akses Ditolak | `forbidden.tsx` | Belum diverifikasi visual | Route ada; tidak ada tangkapan layar. |
| 37 | Search Results | — | Belum ada halaman | `/pencarian` dan API pencarian global tidak ada. |
| 38 | Sitemap | — | Belum ada halaman | Tidak ada `sitemap.ts` maupun halaman peta situs. |
| 39 | Kebijakan Privasi | — | Belum ada halaman | Konten tersedia lewat `halamanStatis`, tetapi route belum ada. |
| 40 | Syarat dan Ketentuan | — | Belum ada halaman | Sama seperti kebijakan privasi. |

### D. Platform (2)

| # | Mockup | Route aktual | Status | Selisih utama |
|---|---|---|---|---|
| 41 | FlexiDesa.id Landing | landing platform (`platform-landing.tsx`) | Belum diverifikasi visual | Route ada; tanpa tangkapan layar. Angka sosial (100+ desa, 50.000 surat, 99,9% uptime) tidak dihitung dari data. |
| 42 | FlexiDesa Super Admin Dashboard | `/super-admin` | Belum diverifikasi visual | Kode menampilkan KPI ringkasan (desa, pengguna, domain), daftar tenant, dan aktivitas audit. Mockup menambah grafik pertumbuhan, peta sebaran, status layanan, dan 10 menu sidebar (aktual 7 halaman). |

## 5. Kecukupan backend per kebutuhan mockup

### 5.1 Yang sudah cukup

| Kebutuhan data | Bukti backend |
|---|---|
| Identitas desa: nama, alamat kantor, telepon, email, website, logo, nama kades | `src/db/schema/village.ts` (`villages`) |
| Narasi profil: visi, misi, sejarah, sambutan, koordinat | `src/db/schema/content.ts` (`profil_desa`) |
| Perangkat desa: nama, gelar, NIP, foto, jabatan, urutan, periode, status | `perangkat_desa`, `jabatan_perangkat` |
| Berita: kategori, penulis, ringkasan, isi, gambar, status, tanggal terbit, headline, hit | `berita`, `berita_kategori`; `src/features/publik/application/konten-publik.ts` |
| Album dan foto galeri | `galeri_album`, `galeri_foto` |
| Agenda: judul, tanggal mulai/selesai, lokasi, deskripsi, tayang | `agenda_kegiatan`; `agenda-use-cases.ts` |
| Statistik dasar: total, laki-laki, perempuan, KK, per dusun | `statistik-desa.ts`, `statistik-publik.ts` |
| APBDes: pagu, realisasi, rincian bidang, triwulan, dokumen laporan + ukuran file | `keuangan`, `keuangan_triwulan`, `keuangan_laporan`; `laporan-publik-use-cases.ts` |
| Katalog surat: jenis, syarat, form dinamis, status permohonan, berkas | `letter_types`, `letter_requirements`, `permohonan_surat`; `ajukan-surat.ts` |
| Dokumen publik: kategori, jenis, nomor, tahun, berkas | `dokumen_publik`; `dokumen-publik.ts` |
| Halaman statis (privasi, syarat) | `halaman_statis`; `halamanStatisPublik` |
| Login dan OTP login | `users`, `sessions`, `login_otp`; `login-otp-use-cases.ts` |
| Konsol platform: jumlah desa, domain, pengguna platform, audit | `src/app/(admin)/super-admin/page.tsx` |

### 5.2 Parsial — data ada, agregasi/field/use case belum

| Kebutuhan mockup | Kondisi backend |
|---|---|
| Statistik usia, pendidikan, pekerjaan, agama, status perkawinan | Data mentah ada di `residents` (`birth_date`, `education_id`, `occupation_id`, `religion_id`), tetapi `StatistikDesa` hanya menghitung total, gender, KK, dan per dusun. Belum ada agregasi. |
| Wilayah: luas, batas utara/selatan, ketinggian, topografi, curah hujan | `regions` hanya menyimpan dusun/RW/RT. Tidak ada field luas/batas/kondisi geografis di schema mana pun. Peta hanya bisa dari `gis` (`polygons`, `areas`, `points`). |
| Detail berita: tag, galeri foto, kutipan, berita terkait, komentar, bio penulis | `berita` punya satu `gambar` + `dokumen`; `komentar` ada tetapi tidak dipakai halaman berita; tidak ada tabel tag atau relasi galeri-berita. |
| Galeri: kategori, video, jumlah dilihat, unduh ZIP, album lain | Hanya album + foto. Tidak ada tabel video, kolom hit, atau endpoint ZIP. |
| Agenda: jam, kategori, status (rencana/berlangsung/selesai), poster, jumlah kegiatan | Schema hanya `date` untuk mulai/selesai, plus lokasi dan deskripsi. Tidak ada waktu, kategori, status, atau gambar. |
| APBDes: nomor Perdes, tanggal penetapan, status "Ditetapkan", dasar hukum | Tidak ada field metadata APBDes. `keuangan_laporan` menyimpan file laporan, bukan status penetapan. |
| Layanan: FAQ, estimasi waktu, biaya, kategori/ikon layanan | `letter_types` punya nama, syarat, form, aktif. FAQ/estimasi/biaya/kategori tidak ada. |
| Kontak: jam layanan, media sosial, peta, FAQ | `villages` punya telepon/email/alamat; media sosial dan jam layanan tidak ada. Koordinat profil bisa dipakai untuk peta. |
| Pengaduan: nomor tiket, kategori, identitas pelapor, lampiran, status, tanggapan, publik | Schema `pengaduan` lengkap dan repository punya `insertPengaduan` serta `getPengaduanByTiket`. Namun tidak ada use case/route pengiriman dari publik; use case yang ada hanya untuk admin. |
| Akun warga: registrasi, KTP/KK terverifikasi, 2FA, riwayat login, preferensi notifikasi | `users.residentId`, `dokumen_warga`, `sessions` tersedia. `registrasi_warga` ada tetapi tidak dipakai use case. Tidak ada flag verifikasi dokumen, tabel preferensi notifikasi, atau 2FA selain OTP login. |
| Super Admin: pertumbuhan tenant, sebaran provinsi, paket aktif, status sistem | `villages.createdAt/province` dan `audit_logs` tersedia; belum ada agregasi grafik/peta, tabel paket, atau monitoring uptime. |
| Pencarian global | Pencarian hanya untuk dokumen (`cariDokumenPublik`) dan berita. Tidak ada endpoint lintas konten. |
| Sitemap | Slug berita dan halaman bisa diambil (`listSlugBerita`, `listSlugHalaman`), tetapi route sitemap belum ada. |
| Statistik landing platform | Halaman statis; angka tidak dihitung dari database. |

### 5.3 Belum ada

| Kebutuhan mockup | Keterangan |
|---|---|
| Potensi desa (kategori, luas, hasil produksi, jumlah pelaku) | Tidak ada tabel potensi pertanian/wisata. `lapak`/`lapak_produk` hanya katalog usaha dan produk (pemilik, kategori, harga, stok), bukan potensi dengan luas/hasil produksi. |
| Uraian tugas/fungsi jabatan dan BPD | `jabatan_perangkat` hanya nama/slug/urut. BPD bisa dipetakan sebagai `kelompok` bertipe `lembaga`, tetapi tidak ada label/jabatan khusus. |
| Halaman maintenance | Tidak ada flag atau route. |
| Form pengaduan di halaman kontak | Hanya ada repository insert; belum ada use case/route pengiriman publik. Halaman kontak menyatakan form belum dihubungkan. |
| Tindak lanjut pengaduan oleh warga (cek status) | Repository punya `getPengaduanByTiket`, tetapi tidak ada use case/route publik untuk pengecekan tiket. |
| Registrasi dan verifikasi akun warga | Tabel `registrasi_warga` tidak dipakai; tidak ada API/use case/OTP pendaftaran. |

## 6. Perbedaan yang berasal dari data, bukan desain

Tenant dev (`Kwala Gunung`) tidak memiliki isi. Karena itu beberapa halaman tampak kosong dan **tidak boleh** disimpulkan sebagai salah desain:

- Foto hero beranda: kode memakai `slider[0].gambar` (`src/app/page.tsx:68,144`). Tanpa slider, tampil gradien.
- Berita, pengumuman, agenda, galeri, dokumen, APBDes, perangkat, wilayah, layanan surat, dan potensi: semuanya menampilkan empty state karena data tenant kosong.
- Angka `0` pada statistik adalah data kosong, bukan angka desain.

Sebaliknya, perbedaan berikut **tetap desain** meskipun data diisi: komposisi hero, jumlah dan gaya kartu, sidebar, tab, grafik yang tidak ada, footer, serta halaman yang route-nya memang belum dibuat.

## 7. Koreksi terhadap draft sebelumnya

1. **Detail pengumuman sudah ada.** Pengumuman adalah berita dengan kategori `pengumuman`; tautan detail memakai `/berita/[slug]` (`src/app/pengumuman/page.tsx:60-69,190`). Klaim "belum ada route detail pengumuman" tidak benar.
2. **`Village Official Profile Dashboard` adalah detail perangkat desa**, bukan profil desa. Ini sudah dikoreksi, tetapi draft lama masih mencantumkannya di kelompok profil.
3. **Beberapa mockup belum diverifikasi visual pada draft lama**, yaitu detail berita, detail galeri, `forbidden`, landing platform, dan konsol Super Admin. Statusnya sekarang dinyatakan terbuka, bukan "berbeda".
4. **Halaman kontak secara eksplisit belum menghubungkan form pengaduan.** Draft lama tidak mencatat ini.

## 8. Temuan prioritas

### P0 — klaim desain yang tidak didukung backend/route

1. **Registrasi akun warga** digambar lengkap (NIK, email opsional, WhatsApp, kata sandi, syarat), tetapi tidak ada route, use case, atau API. Tabel `registrasi_warga` tidak terpakai.
2. **Pencarian global** menjadi komponen utama mockup pendukung, tetapi tidak ada endpoint gabungan berita/pengumuman/halaman/layanan.
3. **Form pengaduan** di halaman kontak belum terhubung. Schema dan repository insert tersedia, tetapi belum ada use case/route pengiriman publik.

### P1 — data yang harus ditambah sebelum UI mockup bisa dibangun

4. Agregasi statistik usia/pendidikan/pekerjaan.
5. Metadata APBDes (Perdes, tanggal/status penetapan, dasar hukum).
6. Waktu, kategori, dan status agenda.
7. Kategori dan video galeri, jumlah dilihat, ZIP.
8. Data wilayah geografis (luas, batas, ketinggian, iklim).
9. Schema potensi desa.
10. Profil akun warga: verifikasi dokumen, preferensi notifikasi, riwayat login, 2FA.

### P2 — halaman yang belum ada

11. Detail perangkat, transparansi keuangan, informasi, maintenance, pencarian, sitemap, privasi, syarat, dan seluruh area akun warga.

## 9. Rekomendasi urutan kerja

1. Putuskan apakah halaman publik mengikuti mockup sebagai **satu sistem visual** (hero foto, kartu berikon, sidebar) atau tetap gaya sekarang. Tanpa keputusan ini, pekerjaan halaman akan berulang.
2. Mulai dari halaman yang backend-nya sudah cukup: beranda, profil, berita, agenda, galeri, APBDes, layanan, kontak, 404.
3. Tambahkan backend yang hilang per kelompok kecil (agenda waktu → statistik lanjutan → APBDes metadata → potensi → akun warga).
4. Bangun area akun warga setelah alur registrasi/verifikasi disetujui, karena alur ini menyentuh data pribadi dan sesi.
5. Baru kerjakan halaman pendukung dan konsol platform.

## 10. Batasan audit

- Tidak ada tangkapan layar baru. Penilaian visual memakai 21 tangkapan desktop dan 4 tangkapan mobile yang sudah ada; lima route berstatus belum diverifikasi visual.
- Tangkapan berada di `artifacts/` yang di-ignore Git, sehingga bukti visual tidak ikut ter-review di repository.
- Data tenant dev kosong, sehingga kepadatan, pemotongan teks, dan perilaku komponen dengan konten nyata belum diuji.
- Tidak ada pengujian browser, aksesibilitas, atau viewport tambahan pada audit ini.
- Penilaian backend berbasis pembacaan schema/use case, bukan eksekusi query terhadap database berisi data.

## 11. Keamanan dan tenant

- Seluruh use case publik yang diperiksa mengambil `villageId` dari host/identitas desa, bukan dari input klien.
- Area akun warga belum ada. Saat dibangun, `residentId` wajib berasal dari sesi, bukan dari parameter form, mengikuti pola yang sudah dipakai `permohonanSuratFormSchema`.
- Form pengaduan publik menerima NIK dan lampiran; sebelum dihubungkan, perlu pembatasan ukuran/tipe berkas, rate limit, dan kebijakan retensi.
- Tidak ada secret atau data pribadi yang dimasukkan ke laporan ini.

## 12. Status pekerjaan

- **File berubah:** hanya laporan ini (file baru).
- **Source code:** tidak berubah.
- **Validasi:** pembacaan 42 mockup, 25 tangkapan layar, route `src/app`, schema, dan use case terkait. Tidak ada typecheck/test karena tidak ada perubahan kode.
- **Risiko tersisa:** lima route belum dinilai visual; data tenant kosong; bukti tangkapan tidak masuk repository.
- **Status:** siap review sebagai audit. Belum di-commit; branch masih `main`, sehingga sebelum commit pekerjaan ini harus dipindahkan ke branch task sesuai `AGENTS.md`.


---

## Konsolidasi lintas-audit — 18 November 2026

Bagian ini menyatukan laporan kesiapan tiga mockup utama dan inventaris awal di [arsip MOCKUP-ASSETS](./archive/MOCKUP-ASSETS-2026-11-18.md) dengan audit final 42 mockup. Matriks audit final menjadi acuan utama untuk status seluruh mockup; laporan arsip tersebut tetap menjadi catatan khusus kesiapan landing platform, login Super Admin, dan dashboard Super Admin.

### 1. Cakupan gabungan dan bukti

| Kelompok | Cakupan | Status bukti |
|---|---:|---|
| Website publik | 21 | Seluruh PNG diperiksa langsung; route dan source terkait dipetakan. |
| Account/autentikasi | 12 dalam matriks final | Termasuk login warga dan login Super Admin; satu aset login Super Admin yang muncul kembali ditandai sebagai duplikasi, bukan kebutuhan halaman baru. |
| Pendukung | 7 | Termasuk dalam inspeksi 42 mockup. |
| Landing platform | 1 | Kebutuhan frontend/backend ditinjau; screenshot runtime belum diverifikasi. |
| Dashboard Super Admin | 1 | Kebutuhan frontend/backend ditinjau; screenshot runtime belum diverifikasi. |

Inventaris awal membagi tiga mockup utama dan 39 aset tambahan. Matriks final mengelompokkan 42 mockup berdasarkan area. Angka 42 adalah jumlah aset dalam cakupan audit, bukan jumlah route yang selesai.

### 2. Kesimpulan gabungan

- Hanya dua halaman yang dinilai mendekati struktur referensi: login warga dan login Super Admin.
- 17 halaman berbeda material, 5 route ada tetapi belum diverifikasi visual, dan 18 kebutuhan halaman belum memiliki halaman pasangan.
- Audit menggunakan PNG referensi dan screenshot aplikasi terdahulu (21 desktop, 4 mobile), bukan 42 screenshot runtime baru.
- Belum ada halaman yang dinyatakan lulus visual acceptance menyeluruh. Perbandingan screenshot runtime terbaru pada viewport sepadan masih terbuka.
- Backend memiliki fondasi data/use case yang relatif lebih siap daripada UI, tetapi masih ada gap agregasi, field, alur publik, dan halaman/fitur.

### 3. Rekonsiliasi perbedaan laporan

1. Pengumuman: gunakan koreksi audit final. /pengumuman adalah halaman daftar; detail konten pengumuman menggunakan route berita berbasis slug /berita/[slug].
2. Village Official Profile Dashboard adalah detail perangkat desa, bukan profil desa. Route dinamis /pemerintahan/perangkat/[slug] belum ditemukan.
3. Inventaris awal mencatat 11 file account tambahan. Matriks final menghitung halaman account beserta login warga dan login Super Admin; duplikasi login Super Admin harus ditandai dan tidak dihitung sebagai kebutuhan halaman baru.
4. Jumlah mockup publik yang benar adalah 21, bukan 20.
5. Inspeksi PNG referensi bukan screenshot acceptance UI runtime. Screenshot terdahulu hanya mendukung status route dan viewport yang memang tercakup.
6. Empty state dan angka nol pada tenant pengujian yang kosong bukan otomatis kesalahan desain. Namun section, komposisi, grafik, sidebar, dan komponen yang memang tidak ada tetap merupakan gap UI.

### 4. Perubahan backend setelah audit

Audit final mencatat jam, kategori, dan status agenda sebagai gap. PR #152 kemudian menambahkan kolom jam_mulai, jam_selesai, kategori, dan status secara aditif, beserta validasi waktu, pemetaan use case/repository, helper label jam, dan 21 unit test agenda. Typecheck, ESLint scoped, dan Prettier dilaporkan PASS. Integration test dilewati karena konfigurasi database uji tidak tersedia; migration belum dijalankan pada database. UI admin/publik belum merender field baru. Jalankan migration sebelum aplikasi memakai kolom baru. PR: https://github.com/fahmiorim/appdes/pull/152

### 5. Daftar gap gabungan

**P0 — alur/fitur kritis**
- Registrasi dan verifikasi akun warga end-to-end.
- Pencarian global lintas konten.
- Pengiriman pengaduan publik dan pengecekan status tiket.
- Putuskan kontrak visual publik dan konsistensi identitas/brand mockup.

**P1 — kecukupan data dan interaksi**
- Agregasi statistik usia, pendidikan, pekerjaan, agama, dan status perkawinan.
- Metadata APBDes (Perdes, tanggal/status penetapan, dasar hukum).
- Galeri video/kategori, hit, unduh ZIP dan relasi album.
- Wilayah geografis: luas, batas, ketinggian, topografi, iklim, geometri GIS dan unduhan PDF.
- Potensi desa terstruktur.
- Layanan: FAQ, estimasi, biaya, kategori dan ikon.
- Akun warga: preferensi notifikasi, pengelolaan sesi/perangkat, timeline permohonan dan aturan verifikasi dokumen.
- Dashboard Super Admin: agregasi pertumbuhan, peta tenant, paket/langganan bila dibutuhkan, serta monitoring runtime bila indikator kesehatan ditampilkan.

**P2 — halaman dan penyempurnaan**
- Detail perangkat desa dan halaman laporan keuangan terpisah.
- Halaman maintenance, pencarian, sitemap, privasi, syarat, serta halaman akun warga yang belum ada.
- Penyempurnaan 404, detail konten, dan komponen responsif.

### 6. Rencana validasi akhir

1. Ambil screenshot runtime baru untuk semua route tersedia pada desktop 1440 dan mobile 390, menggunakan tenant berisi fixture konsisten.
2. Simpan artefak screenshot di lokasi yang dapat diakses reviewer, bukan hanya folder yang di-ignore Git.
3. Bandingkan per section dengan PNG referensi; catat gap layout, tipografi, warna, aset, konten, dan interaksi.
4. Untuk halaman tanpa route, tetapkan keputusan produk: implementasi, gabungkan dengan halaman lain, atau keluarkan dari scope.
5. Verifikasi backend lewat schema, use case, route/API dan integration test; jangan menyimpulkan kesiapan dari keberadaan page atau tabel saja.
6. Jalankan migration agenda di environment tujuan sebelum UI memakai field baru, lalu uji create/update/list/filter.
7. Tutup gap satu per satu dengan acceptance criteria visual dan fungsional eksplisit.

**Status konsolidasi:** dokumen ini menjadi sumber utama hasil audit mockup 18 November 2026. Laporan awal di `archive/` dipertahankan sebagai riwayat inspeksi aset dan kesiapan tiga mockup utama; inventaris awalnya bukan lagi acuan tunggal untuk status 42 mockup. Tidak ada perubahan source aplikasi dalam konsolidasi dokumentasi ini.
