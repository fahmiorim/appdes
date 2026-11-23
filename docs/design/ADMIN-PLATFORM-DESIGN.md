# Spesifikasi Visual Admin Desa dan Super Admin

> Status: **Product design v0.1 untuk Super Admin; Admin Desa dan Super Admin kini memiliki acuan screenshot.** Empat puluh enam layar Admin Desa tersedia di `docs/mockups/village/` dan dipetakan di [audit kesiapan backend mockup baru](../reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md). Tiga puluh sembilan layar Super Admin berada di `docs/mockups/platform/super-admin/` dan dipetakan di [audit mockup Super Admin](../reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md).
>
> Catatan: §2 memakai mockup Admin Desa sebagai acuan. §3 sudah diselaraskan dengan 39 mockup Super Admin dan diimplementasikan pada 19 November 2026 (shell, header halaman, KPI bertone, tab tenant, dan dashboard). Angka contoh pada mockup tidak dipakai sebagai fixture; KPI dan tabel selalu membaca data tenant nyata.

## 1. Prinsip bersama

Kedua surface memakai Design System FlexiDesa:
- Background aplikasi sangat muda (`--color-background`); konsol platform memakai `#F7F5FC`.
- Topbar putih dan kartu putih dengan border halus serta shadow ringan.
- Sidebar mengikuti persona: navy untuk Admin Desa, indigo-ungu gelap untuk Super Admin.
- Brand blue tetap dipakai untuk tautan dan status informasi; aksi utama memakai ungu persona.
- Ungu bukan warna status; status tetap hijau/amber/merah.
- Tipografi body DM Sans dan heading Plus Jakarta Sans sebagai padanan visual sementara.

## 2. Admin Desa

**Tujuan:** membantu perangkat desa menyelesaikan pekerjaan operasional tanpa membuat dashboard terasa seperti portal statistik semata.

### Referensi visual

Empat puluh enam mockup di `docs/mockups/village/` (11 area) menjadi acuan tampilan Admin Desa. Ringkasan pola, pemetaan route, dan gap ada di [audit mockup dan dokumen](../reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md); backend per area ada di [audit kesiapan backend](../reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md). Jangan menyalin data pribadi dari gambar ke fixture.

### Shell
- Sidebar tetap di desktop, lebar target 264 px.
- Brand dan nama tenant terlihat di bagian atas.
- Navigasi dikelompokkan berdasarkan pekerjaan: Beranda, Data Desa, Penduduk, Persuratan, Keuangan, Layanan, dan Pengaturan.
- Item hanya tampil bila modul aktif dan pengguna memiliki permission.
- Topbar menampilkan breadcrumb dan identitas pengguna; nama desa tampil di sidebar.

### Beranda
- Judul halaman dan nama desa.
- KPI yang membantu operasional: penduduk, keluarga, surat.
- Panel pekerjaan terbaru dan status proses.
- Quick action hanya untuk tugas yang tersedia dan diizinkan.
- Empty state informatif bila tenant belum memiliki data.

### Responsive
- Sidebar menjadi drawer dengan backdrop.
- Drawer dapat ditutup melalui tombol, Escape, klik backdrop, dan navigasi.
- Fokus keyboard tetap berada dalam alur drawer dan dikembalikan ke tombol pemicu saat ditutup.
- Tabel memakai scroll container atau layout card; tidak memaksa seluruh halaman melebar.

## 3. Super Admin Platform

**Tujuan:** mengelola lifecycle tenant dan memantau platform, bukan menjalankan administrasi data penduduk desa.

### Shell
- Sidebar indigo-ungu gelap (±276 px) dengan brand `FlexiDesa.id`, subjudul **Konsol Super Admin**, dan grup menu berlabel.
- Item aktif berupa pil gradien ungu; footer sidebar memuat ilustrasi, `FlexiDesa.id`, **Platform Desa Terpadu**, dan pil **Super Admin**.
- Tidak menampilkan nama desa aktif karena akun platform tidak terikat ke satu tenant.
- Topbar putih berisi breadcrumb `Dashboard Super Admin › <halaman>`, pencarian tenant (`Ctrl/Cmd+K`), tautan audit trail, dan menu akun berisi aksi keluar.
- Judul dan deskripsi halaman tampil di header konten bersama aksi utama, bukan di topbar.

### Dashboard
- KPI bertone mengikuti mockup: total desa (ungu), desa aktif (hijau), desa nonaktif (merah), domain terdaftar (biru), pengguna desa (oranye).
- Grafik pertumbuhan tenant kumulatif enam bulan dihitung dari `createdAt` tenant; tidak memakai deret contoh.
- Daftar tenant terbaru, panel "perlu perhatian", dan aktivitas audit sebagai panel pendukung.
- Konsol tenant memakai tab status berjumlah nyata (Semua, Aktif, Nonaktif, Siap purge) dan pencarian dari kolom topbar.
- Toolbar pencarian dan filter status tetap berada di halaman, bukan hanya di topbar.
- Aksi provisioning, detail, suspend/reactivate, domain, kuota, dan reset akses ditempatkan di halaman/detail tenant setelah use case dan permission tersedia.
- Aksi berisiko memerlukan konfirmasi dan audit event.

### Responsive
- KPI menjadi satu kolom pada layar kecil.
- Tenant table memakai horizontal scroll atau card list.
- Aksi tenant tidak boleh terpotong di viewport mobile.

### Katalog fitur dan menu konsol platform

Bagian ini mencatat fitur yang lazim dimiliki konsol Super Admin pada produk SaaS multi-tenant, sebagai acuan ruang lingkup. **Katalog ini bukan komitmen rilis** dan tidak menambah otorisasi baru: setiap item tetap memerlukan use case server-side, permission platform, dan audit trail sebelum diimplementasikan.

#### Menu inti

| Menu | Isi umum | Status di `main` |
|---|---|---|
| Ringkasan / Dashboard | KPI jumlah tenant, tenant aktif, pengguna, penduduk agregat, aktivitas terbaru | Ada — KPI, tenant terbaru, feed audit terbaru, dan daftar "perlu perhatian" pada `/super-admin` |
| Tenant / Desa | Daftar tenant, cari dan filter, provisioning, detail, aktif/nonaktif, kuota media, reset akses admin, ekspor, purge | Ada — seluruh aksi pada `/super-admin/tenant` |
| Domain | Domain utama dan alias per tenant, status pemantauan DNS, status sertifikat | Sebagian — daftar lintas desa, kelola alias, dan pemantauan DNS/SSL di `/super-admin/domain`; lifecycle verifikasi kepemilikan (challenge DNS/HTTP) belum ada |
| Pengguna platform | Akun super admin dan staf platform, role, MFA, sesi aktif, undangan anggota tim | Ada — `/super-admin/pengguna` menampilkan daftar, membuat akun platform, aktif/nonaktif, reset sandi sementara, dan cabut sesi; MFA dan undangan email belum ada |
| Langganan / paket | Paket, kuota, masa aktif, tagihan, invoice, riwayat pembayaran | Belum — belum ada model komersial |
| Audit trail | Log aksi sensitif lintas tenant: aktor, waktu, IP, perubahan | Ada — `/super-admin/audit` dengan pencarian, filter desa/peristiwa, paginasi, detail perubahan, dan ekspor CSV hingga 5.000 baris |
| Monitor dan kesehatan | Status basis data dan penyimpanan, antrean job, backup terakhir, error rate | Belum |
| Template dan konten | Template tenant baru (role, modul, tema, menu publik), tema, katalog surat | Sebagian — `/super-admin/template` menampilkan isi template baca-saja; editor template belum ada |
| Pengaturan platform | Identitas platform, SMTP, kuota default, kebijakan retensi | Sebagian — `/super-admin/pengaturan` menampilkan konfigurasi aktif baca-saja (tanpa rahasia); pengubahan tetap lewat environment |
| Dukungan | Tiket, impersonasi dengan audit, catatan kontak tenant | Belum — impersonasi memerlukan keputusan keamanan tersendiri |

#### Menu lanjutan

Muncul ketika produk dan jumlah tenant bertambah; bukan prasyarat Fase 2.

| Menu | Isi umum | Status di `main` |
|---|---|---|
| Fitur per tenant (feature flag) | Menyalakan atau mematikan modul untuk tenant tertentu | Belum |
| Integrasi dan API key | Kunci API per tenant, webhook, kuota panggilan, riwayat pencabutan | Belum — endpoint yang ada belum memiliki konsol |
| Backup dan restore | Jadwal backup, unduh arsip, uji restore, retensi | Sebagian — prosedur operasional, belum ada UI |
| Notifikasi dan broadcast | Pengumuman ke Admin Desa atau seluruh pengguna | Belum |
| Ekspor dan retensi data | Daftar ekspor yang masih berlaku, jadwal purge, tombstone domain | Sebagian — ekspor dan purge per tenant; belum ada daftar ekspor terpusat |
| Statistik penggunaan | Modul paling dipakai, penyimpanan per desa, pengguna aktif harian | Belum |
| Manajemen insiden | Mode pemeliharaan, pembatasan tenant, catatan gangguan | Belum |

#### Pola tata letak

1. Sidebar tetap dengan grup: **Platform** (Ringkasan), **Tenant** (Desa, Domain, Langganan), **Operasional** (Audit, Monitor, Backup), **Pengaturan**.
2. Ringkasan tidak memuat semua hal: halaman depan berisi KPI, tabel tenant terbaru, dan tautan ke halaman lain. Aksi berat pindah ke halaman atau detail tersendiri. Navigasi antarhalaman cukup lewat sidebar platform; menu tidak diulang sebagai sub-navigasi di dalam halaman agar tidak menduplikasi pilihan yang sama.
3. Halaman detail per tenant memuat tab: Profil, Domain, Pengguna, Kuota, Ekspor/Retensi, Audit.
4. Aksi destruktif dipisah ke panel *danger zone* dengan konfirmasi mengetik nama atau slug tenant.
5. Setiap aksi platform tercatat di audit trail dan dapat dibaca kembali dari konsol, bukan hanya disimpan.

#### Urutan prioritas yang disarankan

Penempatan area ke fase dan keputusan apakah suatu menu masuk backlog ada di [Master Roadmap §2B](../MASTER_ROADMAP.md#2b-relevansi-fase-terhadap-perluasan-mockup-super-admin-19-november-2026). Katalog ini tidak mengubah prioritas fase.

1. Memisahkan konsol tenant yang sudah ada menjadi halaman: Ringkasan, Tenant, Domain.
2. Menambah pembacaan audit trail platform (lintas tenant).
3. Menambah pengguna platform dan pengaturan platform.
4. Menyusul: monitor dan backup, feature flag per tenant, integrasi/API key, broadcast.

#### Catatan implementasi menu

Menu admin desa dibangun dari tabel `modules` yang dibatasi tenant, sedangkan akun platform memakai `villageId === null` dan tidak memiliki baris modul. Karena itu menu platform ditulis eksplisit di `src/features/navigation/domain/menu-platform.ts` dan dirender oleh `AdminSidebar` bila pengguna adalah pengelola platform. Menu tersebut tidak diulang di dalam halaman agar tidak ada dua navigasi yang menampilkan pilihan sama. Rute yang sudah ada dicatat pada `RUTE_ADMIN_TERSEDIA` agar menu berbasis modul tidak pernah menautkan halaman yang belum dibuat.

## 4. Batasan saat ini

- Sidebar desa yang disemai template menampilkan Beranda, Data Penduduk, dan grup Pengaturan (Pengguna & Hak Akses serta Grup Akses). Halaman `/keuangan`, `/konten/berita`, `/konten/galeri`, `/persuratan/surat`, dan `/pengaduan-admin` sudah ada sebagai route baca-saja, tetapi belum mendapat baris modul dan grant di template; untuk tenant baru halaman itu tidak otomatis muncul dan dapat ditolak 403. Kelompok menu lain di §2 masih target.
- Konsol Super Admin sudah memiliki tujuh halaman (Ringkasan, Tenant, Domain, Pengguna platform, Audit trail, Template, Pengaturan) dengan menu sidebar bergrup, breadcrumb, header halaman, dan KPI bertone yang sama. Mockup lain (paket, monitoring, keamanan, laporan, peta sebaran, ekspor) belum memiliki model data/halaman. Halaman Template dan Pengaturan masih baca-saja karena sumbernya artefak kode dan environment; MFA, undangan anggota tim, monitor, backup, feature flag per tenant, dan langganan belum ada.
- Audit trail platform dapat dicari, difilter per desa dan jenis peristiwa, menampilkan detail perubahan, serta diekspor ke CSV (maksimal 5.000 baris per unduhan). Retensi dan arsip audit terpusat belum ada.
- Pengelolaan pengguna platform hanya menjangkau akun `village_id IS NULL`; akun administrator desa tetap dikelola dari konsol tenant masing-masing.
- Admin Desa memiliki 46 screenshot acuan dalam 11 area di `docs/mockups/village/`, dan Super Admin memiliki 39 screenshot di `docs/mockups/platform/super-admin/`. Semua masih satu varian desktop 1536 × 1024; belum ada varian mobile maupun state kosong/loading/error. Setiap penyimpangan/keputusan produk harus direview dan dicatat sebelum acceptance.

## 5. Acceptance criteria

- Persona Admin Desa dan Super Admin dapat dibedakan tanpa hanya mengandalkan warna.
- Navigasi selalu mengikuti permission server-side.
- Tidak ada data lintas tenant pada Admin Desa.
- Semua aksi Super Admin tercatat dan memerlukan otorisasi server-side.
- Responsive behavior, focus management, empty/loading/error state diuji pada browser.
