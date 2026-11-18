# Spesifikasi Visual Admin Desa dan Super Admin

> Status: **Product design v0.1 untuk Super Admin; Admin Desa kini memiliki acuan screenshot.** Sepuluh layar Admin Desa ditambahkan 19 November 2026 di `docs/mockups/village/` dan ditinjau di [review mockup Admin Desa](../reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md). Dashboard Super Admin masih berupa keputusan produk tanpa screenshot acuan.
>
> Catatan: spesifikasi §2 di bawah belum diperbarui mengikuti mockup. Mockup memakai sidebar navy dan aksi utama ungu, sedangkan §1 dan implementasi saat ini memakai sidebar putih dan aksi biru. Perbedaan ini adalah keputusan produk yang belum diambil.

## 1. Prinsip bersama

Kedua surface memakai Design System FlexiDesa:
- Background aplikasi biru sangat muda (`--color-background`).
- Sidebar dan topbar putih.
- Brand/action blue untuk aksi utama dan navigasi aktif.
- Ungu hanya sebagai aksen sekunder; bukan warna status.
- Kartu putih dengan border halus dan shadow ringan.
- Tipografi body DM Sans dan heading Plus Jakarta Sans sebagai padanan visual sementara.

## 2. Admin Desa

**Tujuan:** membantu perangkat desa menyelesaikan pekerjaan operasional tanpa membuat dashboard terasa seperti portal statistik semata.

### Referensi visual

Sepuluh mockup di `docs/mockups/village/` menjadi acuan tampilan Admin Desa: beranda, data penduduk, statistik penduduk, administrasi surat, berita dan informasi, pemerintahan desa, transparansi APBDes, pengaduan masyarakat, pengaturan desa, serta manajemen pengguna dan hak akses. Ringkasan pola, warna hasil sampling, serta pemetaan route dan gap ada di laporan review; jangan menyalin data pribadi dari gambar ke fixture.

### Shell
- Sidebar tetap di desktop, lebar target 264 px.
- Brand dan nama tenant terlihat di bagian atas.
- Navigasi dikelompokkan berdasarkan pekerjaan: Beranda, Data Desa, Penduduk, Persuratan, Keuangan, Layanan, dan Pengaturan.
- Item hanya tampil bila modul aktif dan pengguna memiliki permission.
- Topbar menampilkan konteks nama desa dan identitas pengguna.

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
- Shell visual sama agar produk konsisten.
- Label konteks jelas: **Super Admin Platform**.
- Navigasi platform terpisah dari menu operasional desa.
- Tidak menampilkan nama desa aktif karena akun platform tidak terikat ke satu tenant.

### Dashboard
- KPI: total desa, desa aktif, pengguna, penduduk agregat.
- Daftar tenant sebagai fokus utama.
- Toolbar pencarian dan filter status.
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
| Domain | Domain utama dan alias per tenant, status verifikasi DNS, status sertifikat | Sebagian — daftar lintas desa di `/super-admin/domain` dan kelola alias di panel tenant; verifikasi DNS/SSL belum ada |
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

1. Memisahkan konsol tenant yang sudah ada menjadi halaman: Ringkasan, Tenant, Domain.
2. Menambah pembacaan audit trail platform (lintas tenant).
3. Menambah pengguna platform dan pengaturan platform.
4. Menyusul: monitor dan backup, feature flag per tenant, integrasi/API key, broadcast.

#### Catatan implementasi menu

Menu admin desa dibangun dari tabel `modules` yang dibatasi tenant, sedangkan akun platform memakai `villageId === null` dan tidak memiliki baris modul. Karena itu menu platform ditulis eksplisit di `src/features/navigation/domain/menu-platform.ts` dan dirender oleh `AdminSidebar` bila pengguna adalah pengelola platform. Menu tersebut tidak diulang di dalam halaman agar tidak ada dua navigasi yang menampilkan pilihan sama. Rute yang sudah ada dicatat pada `RUTE_ADMIN_TERSEDIA` agar menu berbasis modul tidak pernah menautkan halaman yang belum dibuat.

## 4. Batasan saat ini

- Admin sidebar desa saat ini baru menampilkan Beranda; kelompok menu desa di §2 adalah target, bukan fitur yang sudah diimplementasikan.
- Konsol Super Admin sudah memiliki tujuh halaman (Ringkasan, Tenant, Domain, Pengguna platform, Audit trail, Template, Pengaturan) dengan menu sidebar dan kerangka visual yang sama. Halaman Template dan Pengaturan masih baca-saja karena sumbernya artefak kode dan environment; MFA, undangan anggota tim, monitor, backup, feature flag per tenant, dan langganan belum ada.
- Audit trail platform dapat dicari, difilter per desa dan jenis peristiwa, menampilkan detail perubahan, serta diekspor ke CSV (maksimal 5.000 baris per unduhan). Retensi dan arsip audit terpusat belum ada.
- Pengelolaan pengguna platform hanya menjangkau akun `village_id IS NULL`; akun administrator desa tetap dikelola dari konsol tenant masing-masing.
- Admin Desa memiliki sepuluh screenshot acuan di `docs/mockups/village/`, tetapi belum ada varian mobile maupun state kosong/error. Super Admin belum memiliki screenshot acuan. Setiap penyimpangan/keputusan produk harus direview dan dicatat sebelum acceptance.

## 5. Acceptance criteria

- Persona Admin Desa dan Super Admin dapat dibedakan tanpa hanya mengandalkan warna.
- Navigasi selalu mengikuti permission server-side.
- Tidak ada data lintas tenant pada Admin Desa.
- Semua aksi Super Admin tercatat dan memerlukan otorisasi server-side.
- Responsive behavior, focus management, empty/loading/error state diuji pada browser.
