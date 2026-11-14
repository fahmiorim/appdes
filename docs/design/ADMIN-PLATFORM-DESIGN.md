# Spesifikasi Visual Admin Desa dan Super Admin

> Status: **Product design v0.1 — keputusan desain awal, bukan turunan screenshot.** Inventaris 39 screenshot tidak memiliki referensi khusus untuk dashboard Admin Desa maupun Super Admin.

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

## 4. Batasan saat ini

- Admin sidebar saat ini baru menampilkan Beranda; kelompok menu di atas adalah target, bukan fitur yang sudah diimplementasikan.
- Dashboard Super Admin saat ini menampilkan KPI dan daftar tenant dengan pencarian/filter dasar; belum merupakan manajemen tenant lengkap.
- Tidak ada screenshot desain yang menjadi sumber visual langsung untuk dua dashboard ini. Setiap penyimpangan/keputusan produk harus direview dan dicatat sebelum acceptance.

## 5. Acceptance criteria

- Persona Admin Desa dan Super Admin dapat dibedakan tanpa hanya mengandalkan warna.
- Navigasi selalu mengikuti permission server-side.
- Tidak ada data lintas tenant pada Admin Desa.
- Semua aksi Super Admin tercatat dan memerlukan otorisasi server-side.
- Responsive behavior, focus management, empty/loading/error state diuji pada browser.
