# Audit Mockup, UI, dan Dokumen — 39 Super Admin dan 46 Admin Desa

- **Task:** mengaudit seluruh perubahan mockup yang sengaja ditambahkan, membandingkannya dengan route, menu, permission, schema, use case, dan test aktual, lalu menyelaraskan dokumen aktif yang masih memakai angka atau status lama.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/docs-implementation-audit`.
- **Base commit:** `36c595e` (`main`, merge PR #161).
- **Jenis task:** audit dan dokumentasi. Tidak mengubah source code, schema, migration, data, atau satu pun aset mockup.
- **Status saat laporan disusun:** siap review; pada saat itu belum di-commit, di-push, atau di-merge.

## 1. Ringkasan eksekutif

- Katalog aktual berisi **126 PNG**: 21 website publik, 11 akun, 7 pendukung, 41 platform (2 landing/login + **39 Super Admin**), dan **46 Admin Desa**.
- Perubahan mockup adalah perubahan yang disengaja: **46 layar Admin Desa baru** menggantikan 10 layar lama, dan **1 layar Super Admin baru** (`FlexiDesa Report Analytics Dashboard.png`) ditambahkan. Tidak ada aset yang diubah atau dihapus oleh audit ini.
- Seluruh **46 layar Admin Desa** dan **39 layar Super Admin** berukuran 1536 × 1024. Katalog 126 aset secara keseluruhan memakai tiga ukuran: 89 berkas 1536 × 1024, 17 berkas 1199 × 1312, dan 20 berkas 1024 × 1536.
- Kode aktual memiliki **48 `page.tsx`**, **82 `route.ts`**, **19 halaman admin** (12 Admin Desa + 7 Super Admin), **52 direktori fitur**, **16 migration**, dan **50 berkas `*.integration.test.ts`** (53 test terpetakan).
- **Temuan utama:** 12 halaman Admin Desa sudah ada sebagai route, tetapi **hanya 5 modul yang disemai template tenant** (`beranda`, `penduduk`, `pengaturan`, `pengguna`, `grup-akses`). Halaman baca-saja `keuangan`, `konten/berita`, `konten/galeri`, `persuratan/surat`, dan `pengaduan-admin` memanggil `requirePermission` untuk resource yang tidak diberikan template. Pada tenant baru, halaman itu tidak muncul di sidebar dan dapat ditolak **403**.
- Dari 46 layar Admin Desa, hanya **pengguna** dan **grup akses** yang tersambung penuh; **penduduk** memiliki daftar/detail/tambah/ubah tetapi belum punya aksi hapus; **beranda** adalah dashboard; lima halaman lain baca-saja dan belum tersambung ke menu/grant.
- Super Admin memiliki **7 route**. Dari 38 layar yang dipetakan sebelumnya, **15 sebagian** dan **23 belum** memiliki fitur/model data; layar Laporan & Analitik ke-39 juga **belum** memiliki model data.
- Backend desa tetap lebih matang daripada UI: kehadiran, inventaris, keluarga/KK, rumah tangga, mutasi penduduk, bumindes, pembangunan, statistik, kesehatan, bantuan, survei, dan persuratan memiliki use case/schema, tetapi sebagian besar belum memiliki halaman.
- Sebelas dokumen aktif memuat angka atau status lama (89 aset, 38 layar, 10 layar desa, 17 berkas admin, 13 migration, dan klaim “UI desa belum”). Semuanya dikoreksi di task ini; laporan snapshot historis hanya diberi catatan delta, bukan ditulis ulang.

## 2. Ruang lingkup dan metode

Yang dilakukan:

1. Menghitung ulang seluruh PNG per folder, ukuran gambar, dan nama file duplikat.
2. Meninjau 46 layar Admin Desa melalui contact sheet per area serta 39 layar Super Admin, termasuk layar Report Analytics yang baru.
3. Menelusuri `src/app`, `RUTE_ADMIN_TERSEDIA`, template tenant, schema, use case, route handler, permission resource, dan test.
4. Memverifikasi klaim dokumen aktif terhadap kode dan katalog aset.
5. Menjalankan validator peta integration test dan pemeriksaan format/tautan internal pada dokumen yang diubah.

Yang **tidak** dilakukan:

- Tidak menjalankan aplikasi atau browser, sehingga tidak ada klaim pixel fidelity, responsive acceptance, atau hasil visual runtime.
- Tidak menghubungkan database atau memakai data tenant nyata.
- Tidak mengubah, memindahkan, atau menghapus PNG mockup.
- Tidak menjalankan typecheck, unit test, integration test, atau build karena tidak ada perubahan source code.
- Tidak membuat migration atau menambah dependency.
- Tidak meng-commit, push, merge, atau deploy.

## 3. Perubahan aset mockup

### 3.1 Status aset

| Kelompok | Jumlah | Ukuran | Keterangan |
|---|---:|---|---|
| Website publik | 21 | 20 × 1024×1536, 1 × 1199×1312 | Tetap |
| Akun dan autentikasi | 11 | 1199×1312 | Tetap |
| Halaman pendukung | 7 | 3 × 1536×1024, 4 × 1199×1312 | Tetap |
| Platform | 41 | 40 × 1536×1024, 1 × 1199×1312 | 1 landing + 1 login + 39 konsol |
| Admin Desa | 46 | 1536×1024 | 46 layar baru di 10 subfolder + 1 di akar |
| **Total** | **126** | campuran | 89 berkas 1536×1024, 17 berkas 1199×1312, 20 berkas 1024×1536 |

Perubahan yang terlihat di working tree:

- **10 PNG lama dihapus** dari `docs/mockups/village/` dan digantikan 46 layar baru.
- **46 PNG baru** berada di `docs/mockups/village/`: Website Desa (5), Data Kependudukan (5), Administrasi Surat (5), Pelayanan Publik (4), Pemerintahan Desa (4), Absensi & Kepegawaian (4), Keuangan & Pembangunan (5), Inventaris & Aset Desa (4), Laporan & Statistik (4), Manajemen Pengguna & Hak Akses (5), dan 1 pengaturan desa di akar folder.
- **1 PNG baru** di `docs/mockups/platform/super-admin/Laporan & Analitik/`: `FlexiDesa Report Analytics Dashboard.png`.
- Nama file `FlexiDesa Template Dashboard.png` dipakai di dua folder berbeda: `village/Administrasi Surat/` (template surat) dan `platform/super-admin/Manajemen Template/` (template tenant). Path folder wajib dipakai saat merujuk aset.

Catatan data: angka dan nama di mockup adalah ilustrasi dan saling bertentangan (misalnya jumlah penduduk, surat, laporan, dan tenant berbeda antar layar). Jangan memakainya sebagai fixture, target, atau acceptance data.

## 4. Kondisi kode aktual

### 4.1 Hitungan dan route

| Bukti | Aktual |
|---|---|
| `page.tsx` total | 48 |
| Halaman admin | 19 (12 Admin Desa + 7 Super Admin) |
| `route.ts` | 82 |
| Direktori fitur | 52 |
| Berkas `"use server"` | 7 |
| Migration | 16 (`0000`–`0015`) |
| Berkas `*.integration.test.ts` | 50 |
| Test pada peta integrasi | 53, 20 modul, 21 lintas modul |
| `RUTE_ADMIN_TERSEDIA` | 16 entri: 9 route desa + 7 route platform |

12 halaman Admin Desa:

`/beranda`, `/penduduk`, `/penduduk/[id]`, `/penduduk/baru`, `/penduduk/[id]/ubah`, `/keuangan`, `/konten/berita`, `/konten/galeri`, `/persuratan/surat`, `/pengaduan-admin`, `/pengaturan/pengguna`, `/pengaturan/grup-akses`.

7 halaman Super Admin:

`/super-admin`, `/super-admin/tenant`, `/super-admin/domain`, `/super-admin/pengguna`, `/super-admin/audit`, `/super-admin/template`, `/super-admin/pengaturan`.

### 4.2 Temuan menu dan permission

Ini temuan yang paling memengaruhi pembacaan mockup:

1. Sidebar Admin Desa dibangun dari tabel `modules` per tenant, bukan dari `RUTE_ADMIN_TERSEDIA`. Template tenant menyemai 5 modul: `beranda`, `penduduk`, grup `pengaturan`, `pengguna`, dan `grup-akses` (4 role, 5 modul, 11 grant).
2. Halaman `keuangan` memanggil `requirePermission("keuangan", "read")`; `persuratan/surat` memanggil `surat`; `pengaduan-admin` memanggil `pengaduan`; `konten/berita` dan `konten/galeri` memanggil `berita` dan `galeri`.
3. Template tidak memberikan grant untuk resource tersebut dan tidak menyemai baris modulnya. Tenant baru karena itu tidak melihat menu dan dapat menerima 403 saat membuka URL langsung.
4. `administrator` desa **bukan** Super Admin platform. Pengecualian `isSuperadmin` hanya berlaku untuk role `administrator` dengan `villageId === null`; role administrator tenant tetap tunduk pada `role_permissions`.
5. Akibatnya, kalimat “12 halaman tersedia” harus dibaca sebagai **12 berkas route**, bukan “12 halaman siap dipakai setiap tenant”. Perbaikan kode yang diperlukan: seed modul + grant untuk halaman baca-saja, atau ubah halaman menjadi bagian modul yang sudah ada, setelah keputusan produk dan permission dibuat.

### 4.3 Bukti test per area

Integration test isolasi/konkurensi tersedia untuk `penduduk`, `keluarga`, `rumah-tangga`, `kehadiran`, `inventaris`, `statistik`, `kelompok`, `kontak`, `rbac`, `bantuan`, `konten`, `surat` (penomoran/arsip), `keuangan` (konkurensi), `publik` (media/pengumuman), `layanan-mandiri` (relasi permohonan), serta template/multi-desa. Untuk delapan modul yang disebut di ringkasan risiko: **`bantuan` dan `konten` sudah memiliki integration test lintas tenant** — `bantuan/integrasi-warga.test.ts` menguji baca/ubah/hapus dua desa, dan `konten/dokumen-publik.integration.test.ts` menguji kategori berita serta dokumen lintas tenant. **`bumindes` dan `pengaduan` hanya tercakup uji schema/composite FK di `src/db`**, bukan uji operasi modul. **`pembangunan`, `kesehatan`, `survey`, dan `pengaturan` belum memiliki integration test modul**; keempatnya baru memiliki unit/domain test. Modul lain juga tidak otomatis memiliki test isolasi khusus: `agenda` dan `gis` baru memiliki repository test, `surat` baru penomoran/arsip, dan `keuangan` baru konkurensi serta SiLPA lewat `isolasi-village`. Unit test dan test domain tidak dihitung sebagai bukti isolasi tenant.

## 5. Matriks 46 layar Admin Desa

Keterangan status:

- **Route:** halaman benar-benar ada.
- **Baca-saja:** halaman ada, hanya menampilkan data.
- **Menu/grant:** halaman membutuhkan resource yang tidak disemai template; untuk tenant baru belum dapat diakses.
- **Belum:** belum ada halaman.

| No. | Layar mockup | Kondisi route | Backend/data | Gap utama |
|---:|---|---|---|---|
| 1 | `FlexiDesa Village Settings Dashboard` | Belum ada `/pengaturan`; hanya submenu pengguna/grup akses | `pengaturan_desa`, `bacaPengaturan`/`simpanPengaturanAdmin`, identitas desa | Halaman, modul, dan grant pengaturan desa belum ada |
| 2 | `FlexiDesa Website Dashboard` | Belum | 13 tabel konten; `pengunjung_log` tanpa agregasi sumber/perangkat | Dashboard kunjungan, preview, status SSL/tema belum ada |
| 3 | `FlexiDesa Website Settings Dashboard` | Belum | Tabel identitas/tema; belum ada use case pengaturan situs | Pengaturan situs dan pemilihan tema belum dimodelkan sebagai UI |
| 4 | `FlexiDesa Halaman dan Navigasi` | Belum | `menu_publik`, `halaman_statis`; pembacaan publik ada | Belum ada use case/repository tulis menu dan halaman |
| 5 | `FlexiDesa Konten dan Publikasi Dashboard` | `/konten/berita` dan `/konten/galeri` baca-saja; **menu/grant belum** | `konten-admin` hanya membaca; tabel berita, agenda, galeri, pengumuman | Tidak ada form tulis; grant `berita`/`galeri` tidak ada di template |
| 6 | `FlexiDesa Public Documents Dashboard` | Belum | `dokumen_publik`; pembacaan publik | Belum ada UI dan use case tulis dokumen |
| 7 | `FlexiDesa Population Dashboard` | `/penduduk`: KPI, filter, pencarian, paginasi | `listPenduduk`, ringkasan, opsi filter, ekspor CSV | Aksi massal, hapus, dan analitik demografi belum ada di UI |
| 8 | `FlexiDesa Population Dashboard (1)` | Route yang sama; varian visual belum dibedakan | Sama dengan nomor 7 | Tidak ada varian dashboard terpisah |
| 9 | `FlexiDesa Population Statistics Dashboard` | Belum ada `/statistik` admin | Agregasi penduduk, rentang umur, bantuan; route publik terpisah | Halaman admin statistik belum ada |
| 10 | `FlexiDesa Family Card Dashboard` | Belum ada `/keluarga` | CRUD keluarga, anggota, PDF, test isolasi tenant | Halaman KK dan anggota belum ada |
| 11 | `FlexiDesa Mutasi Penduduk Dashboard` | Belum | `riwayat-penduduk-use-cases`: kelahiran, kematian, pindah, datang, perubahan | Halaman mutasi dan validasi alur belum ada |
| 12 | `FlexiDesa Surat Administration Dashboard` | `/persuratan/surat` baca-saja; **menu/grant belum** | Daftar surat, status, rekap | Tidak ada tren/komposisi; grant `surat` tidak ada di template |
| 13 | `FlexiDesa Letter Request Dashboard` | Belum ada `/permohonan-surat` | `permohonan_surat` dan use case permohonan | Halaman permohonan dan aksi verifikasi belum ada |
| 14 | `FlexiDesa Surat Management Dashboard` | Belum ada halaman pembuatan/verifikasi | Draft, ubah, ajukan, verifikasi, tolak, PDF, TTE | Seluruh alur tulis ada di server tetapi belum terhubung ke UI |
| 15 | `FlexiDesa Template Dashboard` (Administrasi Surat) | Belum | `letter_types`, syarat, klasifikasi, use case | Halaman template/jenis surat belum ada |
| 16 | `FlexiDesa Arsip Surat Dashboard` | Belum | Arsip nomor, surat masuk/keluar, agenda, ekspor | Halaman arsip dan riwayat belum ada |
| 17 | `Dashboard Pelayanan Publik Desa FlexiDesa` | Belum | Pengaduan, permohonan surat, survei | Tidak ada dashboard layanan terpadu |
| 18 | `FlexiDesa Public Services Dashboard` | Belum | Tidak ada katalog layanan generik; jenis surat dipakai sebagai proksi | Model katalog layanan, kategori, dan detail belum ada |
| 19 | `Purple Village Services Dashboard` | Belum | Alur permohonan surat dan pengaduan | Halaman pengajuan warga/admin belum ada |
| 20 | `FlexiDesa Survey Satisfaction Dashboard` | Belum | Survey, soal, responden, jawaban, CSV, skor | Halaman survei dan analisis belum ada |
| 21 | `FlexiDesa Village Government Dashboard` | Belum | `perangkat_desa`, `jabatan_perangkat`, `regions`, `kelompok` | Struktur organisasi dan komposisi personel belum dapat disusun |
| 22 | `FlexiDesa Perangkat Desa Dashboard` | Belum | Schema dan domain perangkat; pembacaan publik | Belum ada use case CRUD perangkat/jabatan |
| 23 | `FlexiDesa Lembaga Desa Dashboard` | Belum | CRUD `kelompok`; BPD tidak punya model khusus | Pemetaan BPD/lembaga masih asumsi dan belum ada halaman |
| 24 | `FlexiDesa Wilayah & Organisasi Dashboard` | Belum | `regions` dan repository wilayah | Hierarki wilayah/organisasi dan UI belum lengkap |
| 25 | `FlexiDesa Kepegawaian Dashboard` | Belum | Kehadiran, rekap, status perangkat hari ini | Data pegawai/kepegawaian belum punya CRUD |
| 26 | `FlexiDesa Employee Management Dashboard` | Belum | Hanya pembacaan perangkat dari modul kehadiran | Model pegawai, jabatan, dan riwayat belum ada |
| 27 | `FlexiDesa Attendance Dashboard` | Belum ada `/kehadiran` | CRUD kehadiran, rekap, pengaturan, test isolasi | Halaman absensi belum ada |
| 28 | `FlexiDesa Leave & Permission Dashboard` | Belum | Schema `kehadiran_izin` dan use case kehadiran | Alur izin/cuti dan UI persetujuan belum ada |
| 29 | `FlexiDesa Financial Dashboard` | `/keuangan` baca-saja; **menu/grant belum** | APBDes, realisasi, laporan, delapan tabel keuangan | Tidak ada KPI/realisasi; grant `keuangan` tidak ada di template |
| 30 | `FlexiDesa APBDes Dashboard` | `/keuangan` baca-saja | Impor APBDes, simpan, template, laporan | Form impor/ubah belum terhubung ke UI |
| 31 | `FlexiDesa Budget Realization Dashboard` | Belum | Triwulan, realisasi, jurnal, saldo, ekspor | Halaman realisasi dan kontrol anggaran belum ada |
| 32 | `FlexiDesa Construction Dashboard` | Belum | CRUD pembangunan, dokumentasi, buku pembangunan | Halaman proyek dan dokumentasi belum ada |
| 33 | `FlexiDesa Financial Report Dashboard` | Belum | Laporan realisasi, dokumen, ekspor Excel/CSV/PDF | Pusat laporan keuangan belum ada |
| 34 | `FlexiDesa Asset Dashboard Overview` | Belum | Use case inventaris, laporan, neraca | Dashboard aset dan KPI belum ada |
| 35 | `FlexiDesa Asset Management Dashboard` | Belum | CRUD aset, kategori, persetujuan mutasi, test isolasi | Halaman pengelolaan aset belum ada |
| 36 | `FlexiDesa Inventaris Dashboard` | Belum ada `/inventaris` | Daftar inventaris, kategori, mutasi, CSV | Halaman daftar dan filter belum ada |
| 37 | `FlexiDesa Vehicle Asset Dashboard` | Belum | Schema inventaris mencakup aset; tidak ada UI khusus kendaraan | Model/daftar kendaraan dan perawatan belum ada |
| 38 | `FlexiDesa Village Statistics Dashboard` | Belum ada `/statistik` admin | Agregasi statistik penduduk dan bantuan; ekspor per modul | Halaman statistik desa belum ada |
| 39 | `FlexiDesa Reports Dashboard` | Belum | Tidak ada entitas laporan terpusat; hanya ekspor per modul | Status laporan, periode, pembuat, dan unduhan belum dimodelkan |
| 40 | `FlexiDesa Village Reports Dashboard` | Belum | Route ekspor CSV/PDF per modul | Katalog laporan dan riwayat unduhan belum ada |
| 41 | `FlexiDesa Rekapitulasi dan Analisis Kinerja` | Belum | Tidak ada model kinerja; hanya agregasi modul | Indikator, periode, dan pembanding belum ada |
| 42 | `FlexiDesa User Access Management Dashboard` | `/pengaturan/pengguna`; penuh | CRUD pengguna, role, server action, audit | Tidak ada gap fungsi inti; aktivitas/keamanan terpisah |
| 43 | `FlexiDesa Role Access Dashboard` | `/pengaturan/grup-akses`; penuh | CRUD role/permission, server action, test RBAC | Tidak ada gap fungsi inti |
| 44 | `FlexiDesa User Activity Dashboard` | `/pengaturan/pengguna#log-aktivitas`; bukan halaman mandiri | `audit_logs` dan pembacaan audit bila berizin | Filter/ekspor aktivitas desa dan halaman mandiri belum ada |
| 45 | `FlexiDesa Security Settings Dashboard` | Belum | Keamanan akun self-service; tidak ada pengaturan keamanan desa | Sesi, MFA, kebijakan sandi, dan audit keamanan desa belum ada |
| 46 | `FlexiDesa Village Administration Dashboard` | `/beranda` | KPI penduduk/KK/surat/pengaduan/APBDes, aktivitas, pekerjaan | Sebagian panel mockup belum punya sumber data; layout belum identik |

## 6. Super Admin dan layar baru

### 6.1 Status ringkas

- 39 layar berada di `platform/super-admin/`, ditambah landing dan login di `platform/`.
- Hanya **7 route** yang tersedia. Template dan Pengaturan masih baca-saja; domain belum memverifikasi DNS/TLS; pengguna platform belum mendukung MFA/undangan.
- Pemetaan 38 layar sebelumnya: **15 sebagian** dan **23 belum**. Layar baru `FlexiDesa Report Analytics Dashboard.png` menambah satu layar **Belum**, sehingga total menjadi **15 sebagian dan 24 belum**.
- Area yang belum punya model data: langganan/paket/invoice (5), monitoring/backup (5), keamanan/firewall/vulnerability (5), laporan & analitik (4), dan sebagian konfigurasi platform (3). Katalog template, pengguna/peran, tenant, domain, dan audit sudah memiliki route tetapi kedalamannya berbeda dari mockup.

### 6.2 Layar `FlexiDesa Report Analytics Dashboard`

Mockup menampilkan lima KPI (total laporan, unduhan, laporan tenant, jenis laporan, laporan terjadwal), lima tab (buat, riwayat, terjadwal, template, pengaturan), form pembuatan, distribusi, tren 30 hari, jadwal, format, dan riwayat.

Tidak ada tabel laporan platform, template, jadwal, unduhan, status, worker penjadwalan, atau penyimpanan berkas. Yang tersedia hanya `audit_logs`, data tenant, pengguna, dan ekspor audit CSV. **Status: Belum.** Jangan menambahkan menu `/super-admin/laporan` sebelum model data, worker, otorisasi unduhan, retensi, dan audit dibuat.

## 7. Klaim dokumen yang dikoreksi

| Dokumen | Klaim lama | Kondisi aktual | Tindakan |
|---|---|---|---|
| `docs/README.md` | 89 gambar referensi | 126 PNG | Angka diperbarui |
| `docs/SID_FEATURE_MAP.md` | 38 Super Admin dan 10 Admin Desa; 15 sebagian/23 belum | 39/46; 15 sebagian/24 belum; 12 route desa dengan 5 baca-saja belum terhubung menu/grant | Angka, status, dan pranala diperbarui |
| `docs/MASTER_ROADMAP.md` | Perluasan 38; 23 belum; “UI desa belum” | 39; 24 belum; 12 halaman desa ada, UI belum merata | Angka dan status diperbarui; template 4 role/5 modul/11 grant |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | “Sepuluh mockup”; topbar memuat nama desa; sidebar hanya 3 area | 46 mockup; nama desa di sidebar; 12 route desa, 5 di antaranya belum masuk menu/grant | Acuan, topbar, dan batasan diperbarui |
| `docs/design/DESIGN-SYSTEM.md` | Aksi mengikuti 38 mockup; baseline hanya 7 halaman platform | 39 mockup; 48 halaman, 19 admin (12 desa + 7 platform) | Angka dan inventaris diperbarui |
| `docs/design/TENANT-TEMPLATE.md` | 17 berkas admin (10 desa + 7 platform); 4 halaman tersedia | 19 berkas (12 desa + 7 platform); 5 modul template; 5 halaman baca-saja belum bergrant | Fakta dan penjelasan gap diperbarui |
| `docs/design/README.md` | 38 layar Super Admin sebagai acuan status | 39 layar; audit 38 adalah snapshot per layar | Daftar acuan diperbarui |
| `docs/reports/README.md` | Kesiapan backend disebut “acuan terkini”; 38 layar | Kesiapan backend snapshot `0ffeda6` (11 halaman); 39 layar saat ini | Status acuan dan pranala diperbarui |
| `docs/mockups/README.md` | 39 layar dipetakan ke audit 38; tidak ada catatan nama duplikat | 39 layar; satu nama file dipakai di dua folder | Pranala dan peringatan path diperbarui |
| `docs/TECHNICAL_AUDIT.md` | 13 migration; 274 test; 36 halaman | 16 migration; 284 test; 48 halaman (19 admin) | Catatan status 19 November ditambahkan |
| `docs/deployment/README.md` | Template “masih minimal” | 4 role, 5 modul, 11 grant | Kalimat prosedur diperjelas |
| `docs/deployment/STAGING.md` | Hanya `/masuk` dan `/` | Ada `/masuk-admin` dan `/super-admin-login` | Daftar halaman login diperbarui |
| `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` | Daftar route tanpa status menu | 12 halaman desa, 5 belum bergrant | Catatan status ditambahkan |
| `MOCKUP-BACKEND-READINESS-2026-11-19.md` | 11 halaman; penduduk belum punya form | Snapshot `0ffeda6`; PR #159 menambah form, total 12 | Catatan delta ditambahkan tanpa menulis ulang isi |
| `REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md` | 38 layar | 39 layar; layar baru belum punya model | Catatan delta ditambahkan |
| `REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md` | 10 layar lama | 46 layar baru; path lama tidak aktif | Catatan delta ditambahkan |
| `ADMIN-DESA-UI-VS-DOKUMEN-2026-11-19.md` | Snapshot `92e1a90` | PR #159 sudah di `main`; 12 halaman | Catatan delta ditambahkan |

## 8. File yang diubah

Dokumen aktif:

- `docs/README.md`
- `docs/SID_FEATURE_MAP.md`
- `docs/MASTER_ROADMAP.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/design/ADMIN-PLATFORM-DESIGN.md`
- `docs/design/DESIGN-SYSTEM.md`
- `docs/design/TENANT-TEMPLATE.md`
- `docs/design/README.md`
- `docs/mockups/README.md`
- `docs/reports/README.md`
- `docs/deployment/README.md`
- `docs/deployment/STAGING.md`
- `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`

Laporan:

- `docs/reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md` (laporan ini)
- Catatan delta pada `docs/reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md`
- Catatan delta pada `docs/reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md`
- Catatan delta pada `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md`
- Catatan delta pada `docs/reports/05-ui-audit/ADMIN-DESA-UI-VS-DOKUMEN-2026-11-19.md`

Tidak ada perubahan pada source code, schema, migration, data, atau aset PNG.

## 9. Security dan tenant

- Audit tidak mengubah jalur autentikasi/otorisasi dan tidak menambah akses baru.
- Temuan menu/grant adalah masalah **otorisasi dan kegunaan**, bukan sekadar kosmetik: halaman yang memanggil `requirePermission` tidak boleh dianggap tersedia hanya karena file route ada. Jangan “memperbaikinya” dengan melewati permission atau memberi grant `manage` massal tanpa keputusan produk.
- `administrator` desa tetap berbeda dari `administrator` platform (`villageId === null`). Jangan menyatukan keduanya untuk membuat halaman desa dapat dibuka.
- Tidak ada data warga, NIK, nomor KK, atau kredensial yang disalin ke laporan. Angka pada mockup tidak dipakai sebagai fixture.
- Semua rekomendasi UI baru tetap harus memakai tenant context dari sesi, permission server-side, dan test negatif lintas tenant.

## 10. Validasi

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Hitung ulang 126 PNG dan ukuran | **PASS** | 21 publik, 11 akun, 7 pendukung, 41 platform, 46 desa; 89/17/20 per ukuran |
| Verifikasi 46 PNG Admin Desa | **PASS** | 46 berkas, semuanya 1536×1024, 10 subfolder + 1 akar |
| Verifikasi 39 PNG Super Admin | **PASS** | 39 berkas, semuanya 1536×1024 |
| Hitungan kode | **PASS** | 48 page, 19 admin, 82 route, 52 fitur, 7 server action, 16 migration, 50 integration test |
| `node scripts/integration-test-map.mjs --check` | **PASS** | `53 test, 20 modul, 21 test lintas modul` |
| `npx prettier --check` pada dokumen berubah | **PASS** | Tidak ada file yang perlu diformat ulang |
| `git diff --check` | **PASS** | Tidak ada whitespace error |
| Pemeriksaan tautan relatif dokumen | **PASS** | Seluruh tautan `docs/**/*.md` yang dirujuk laporan baru menunjuk file yang ada |
| Typecheck / unit / integration / build | **SKIPPED** | Tidak ada perubahan source code; tidak dijalankan dan tidak diklaim lulus |
| Browser / visual acceptance | **SKIPPED** | Audit statis dan contact sheet; tidak ada runtime browser |

Perintah yang dijalankan:

```text
python (PIL) hitung ukuran seluruh PNG
find src/app -name 'page.tsx' | wc -l
find 'src/app/(admin)' -name 'page.tsx' | wc -l
find src/app -name 'route.ts' | wc -l
find src/features -mindepth 1 -maxdepth 1 -type d | wc -l
find src -name '*.test.ts' -o -name '*.test.tsx' | wc -l
find src -name '*.integration.test.ts' | wc -l
ls src/db/migrations/*.sql | wc -l
node scripts/integration-test-map.mjs --check
npx prettier --check <dokumen yang diubah>
git diff --check
```

## 11. Risiko dan keterbatasan

- Status “route ada” bukan bukti end-to-end. Belum ada walkthrough tenant baru untuk membuktikan 403 pada lima halaman baca-saja; temuan berasal dari kombinasi route, `requirePermission`, dan isi template/grant.
- Pemetaan visual berasal dari contact sheet; tidak ada pengukuran warna, kontras, spacing, atau perilaku responsive.
- Mockup tidak menyediakan state kosong, loading, error, atau mobile.
- Pemetaan BPD ke `kelompok` masih asumsi; tidak ada model BPD eksplisit.
- Integration test isolasi tenant belum merata. `bantuan` dan `konten` sudah memilikinya; `bumindes` dan `pengaduan` hanya tercakup uji schema/composite FK; `pembangunan`, `kesehatan`, `survey`, dan `pengaturan` belum memiliki integration test modul. Modul lain yang punya integration test belum tentu menguji isolasi tenant secara khusus (`agenda`/`gis` repository, `surat` penomoran/arsip, `keuangan` konkurensi/SiLPA). Klaim kesiapan backend harus diverifikasi ulang saat UI dibuat.
- Pada saat audit dilakukan, working tree mockup berisi 10 penghapusan dan 47 penambahan yang belum di-stage. Audit tidak mengubah gambar; angka 126 dapat berubah bila aset ditambah/dihapus lagi.
- Pada saat audit ini disusun, laporan belum di-commit atau di-push; status penyimpanan setelahnya tercatat dalam riwayat Git branch task.

## 12. Rekomendasi urutan kerja

1. **Putuskan kontrak halaman baca-saja:** tambahkan modul + grant minimum (read-only) untuk `keuangan`, `konten`, `persuratan`, dan `pengaduan`, atau gabungkan halaman ke modul yang ada. Uji dengan tenant baru dan role non-administrator.
2. **Hubungkan UI ke backend yang sudah siap:** kehadiran, inventaris, keluarga/KK, rumah tangga, mutasi penduduk, bumindes, pembangunan, statistik, kesehatan, bantuan, dan survei — satu modul per perubahan, dengan test negatif lintas tenant.
3. **Lengkapi alur surat:** pembuatan, verifikasi, penomoran, TTE, dan arsip; backend sudah tersedia.
4. **Aktifkan aksi pada halaman baca-saja:** penduduk (hapus), keuangan (impor/realisasi), pengaduan (tanggapi), berita/galeri (tulis).
5. **Bangun model yang belum ada:** pengelolaan website, perangkat/BPD, pusat laporan, analitik platform, monitoring, keamanan, dan langganan. Jangan memulai dari UI sebelum model data, permission, audit, dan sumber metrik ada.

## 13. Kesimpulan

Perubahan mockup memang disengaja dan sudah tercatat: 46 layar Admin Desa menggantikan 10 layar lama, dan satu layar Super Admin baru menambah area laporan/analitik yang belum punya backend. Mockup tersebut memperjelas arah produk, tetapi tidak menciptakan modul siap pakai.

Kode saat ini memiliki 12 route Admin Desa dan 7 route Super Admin. Yang benar-benar berfungsi penuh baru pengguna dan grup akses; penduduk sudah memiliki daftar/detail/form; lima halaman desa lain baca-saja dan belum tersambung ke menu/grant template. Dokumen aktif sudah dikoreksi agar tidak lagi menyebut 89 aset, 38 layar, 10 layar desa, atau 17 berkas admin. Laporan snapshot lama dipertahankan dengan catatan delta.

**Status saat audit disusun: siap review sebagai audit dokumentasi. Tidak ada perubahan kode atau aset mockup pada saat audit; belum di-commit, di-push, di-merge, atau di-deploy.**
