# Audit Ulang Mockup Super Admin

- **Tanggal:** 19 November 2026
- **Branch:** `task/super-admin-mockup-audit`
- **Base commit:** `a715cc1`
- **Jenis task:** audit UI dan dokumentasi; tidak mengubah source code, schema, migration, atau data
- **Status:** siap review

> **Catatan delta (19 November 2026, setelah laporan ini dibuat):** laporan ini memetakan 38 layar pada base `a715cc1`. Satu layar baru, `Laporan & Analitik/FlexiDesa Report Analytics Dashboard.png`, menambah total menjadi 39 dan belum memiliki model data. Status terkini ada di [audit mockup dan dokumen](./MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md); matriks 38 layar di bawah tetap acuan rinci per area.

## 1. Tujuan

Audit ulang dilakukan setelah folder `docs/mockups/` berubah cukup besar:

- Login Super Admin dipindahkan dari `account/` ke `platform/`.
- Dashboard Super Admin diganti.
- Muncul 36 gambar baru dalam sembilan folder area Super Admin.
- Muncul satu Audit Trail di akar folder Super Admin.

Tujuan audit ini adalah menjawab tiga hal:

1. Berapa aset yang sebenarnya ada dan apa yang berubah?
2. Area mana yang sudah punya route, use case, dan model data; mana yang baru berupa arah desain?
3. Pekerjaan berikutnya mana yang aman dan masuk akal untuk dikerjakan lebih dulu?

## 2. Ringkasan eksekutif

- Repository sekarang memiliki **89 PNG**: 21 website publik, 11 akun, 7 halaman pendukung, 40 platform, dan 10 Admin Desa.
- Folder Super Admin berisi **38 PNG**. Sebelumnya hanya satu dashboard.
- Ada **sembilan folder area baru** berisi 36 gambar, ditambah Dashboard dan Audit Trail di akar folder.
- Aplikasi baru memiliki **tujuh route** `/super-admin/*`: Ringkasan, Tenant, Domain, Pengguna platform, Audit trail, Template, dan Pengaturan.
- Tidak ada satu pun mockup baru yang sepenuhnya sudah diimplementasikan. **15 layar terpetakan sebagian** dan **23 layar belum memiliki fitur/model data**.
- Tujuh route yang ada tetap berguna, tetapi kedalaman fiturnya berbeda dari mockup baru. Mockup menampilkan katalog template, langganan, invoice, analitik, monitoring, keamanan, dan konfigurasi operasional yang belum ada di aplikasi.
- Prioritas terbesar bukan mengejar 38 layar. Prioritasnya adalah:
  1. merapikan katalog dan memilih acuan kanonis;
  2. memperdalam konsol tenant dan dashboard dengan data nyata yang sudah tersedia;
  3. memisahkan istilah “template fondasi tenant” dan “tema website”;
  4. menunda langganan, telemetri, firewall, dan editor template sampai keputusan model data serta integrasi dibuat.
- Mockup memuat angka yang saling bertentangan (312 tenant, 128 tenant, 48 tenant; 1.842 pengguna, 1.248 pengguna). Karena itu mockup tidak boleh dipakai sebagai acceptance data atau fixture.

## 3. Metode dan batas audit

Yang dilakukan:

- Menghitung aset aktual dan membandingkannya dengan katalog dokumentasi.
- Melihat seluruh 38 mockup Super Admin melalui contact sheet.
- Membaca layar utama pada resolusi 1.400 px: dashboard, tenant, tambah tenant, import, domain, pengguna, role, audit, langganan, keamanan, monitoring, template, konfigurasi, dan analitik.
- Menelusuri route, menu platform, use case, repository, schema, dan test yang relevan.
- Memeriksa status Git untuk membedakan aset pengguna dari perubahan task.

Yang **tidak** dilakukan:

- Tidak menjalankan aplikasi atau browser untuk membandingkan implementasi dengan gambar.
- Tidak membuka koneksi database atau mengambil data tenant nyata.
- Tidak mengukur warna, spacing, atau tipografi secara pixel-perfect.
- Tidak mengubah satu pun file PNG mockup.
- Tidak membuat migration atau menambah dependency.

Karena audit ini berbasis kode dan pratinjau visual, status “Ada/Sebagian/Belum” menunjukkan ketersediaan fitur di repository, bukan hasil visual acceptance.

## 4. Perubahan aset

### 4.1 Status Git aset

Working tree memuat perubahan mockup milik pengguna yang tidak boleh diubah atau di-stage:

| Status | Path | Keterangan |
|---|---|---|
| Dihapus | `docs/mockups/account/FlexiDesa Super Admin Login Interface.png` | Login dipindahkan ke folder platform |
| Baru | `docs/mockups/platform/FlexiDesa Super Admin Login Interface.png` | Lokasi baru login Super Admin |
| Dimodifikasi | `docs/mockups/platform/super-admin/FlexiDesa Super Admin Dashboard.png` | Dashboard diganti |
| Baru | 36 PNG dalam sembilan subfolder Super Admin | Area konsol baru |
| Baru | `docs/mockups/platform/super-admin/FlexiDesa Audit Trail Dashboard.png` | Audit Trail di akar folder |

Total aset saat ini adalah **90 file** (89 PNG + README), sedangkan Git baru melacak **53 file**. Selisih 37 gambar berasal dari 37 tambahan Super Admin: 38 sekarang versus 1 sebelumnya.

### 4.2 Sebaran 38 mockup Super Admin

| Area | Jumlah | Folder |
|---|---:|---|
| Dashboard Super Admin | 1 | akar |
| Audit Trail | 1 | akar |
| Manajemen Tenant | 4 | `Manajemen Tenant/` |
| Desa & Domain | 3 | `Desa & Domain/` |
| Manajemen Template | 4 | `Manajemen Template/` |
| Pengguna & Peran | 4 | `Pengguna & Peran/` |
| Paket & Langganan | 5 | `Langganan & Paket/` |
| Monitoring | 5 | `Monitoring/` |
| Keamanan | 5 | `Keamanan/` |
| Laporan & Analitik | 3 | `Laporan & Analitik/` |
| Konfigurasi Platform | 3 | `Konfigurasi Platform/` |
| **Total** | **38** | |

Semua PNG baru berukuran 1536 × 1024 dan hanya menyediakan satu varian desktop. Tidak ada state kosong, loading, error, atau mobile.

### 4.3 Inkonsistensi data contoh

Angka pada mockup tidak berasal dari satu dataset:

- Dashboard dan Daftar Tenant: **312 tenant**, 1.842 pengguna.
- Pengguna & Peran: **1.248 pengguna**, 8 role.
- Konfigurasi Platform dan Analytics: **128 tenant**.
- Langganan dan Monitoring: **48 tenant**.
- Katalog template: 18 template, 298 desa pengguna.

Nama desa, pengguna, domain, invoice, dan IP juga merupakan data sintetis. Jangan menyalinnya ke fixture, test, atau database pengembangan. Angka yang bertentangan harus dianggap ilustrasi, bukan target bisnis.

## 5. Matriks mockup terhadap implementasi

Keterangan status:

- **Ada:** route dan use case sudah mencakup inti layar.
- **Sebagian:** sudah ada route/fungsi terkait, tetapi cakupan layar berbeda atau banyak aksi belum didukung.
- **Belum:** belum ada model data, route, atau use case yang dapat mendukung layar tanpa mengarang data.

| No. | Layar mockup | Cakupan yang terlihat | Kondisi aktual | Status |
|---:|---|---|---|---|
| 1 | Dashboard Super Admin | KPI tenant, pertumbuhan, adopsi tema, kesehatan infrastruktur, wilayah, notifikasi | `/super-admin` punya KPI tenant/pengguna/domain, tenant terbaru, perhatian, audit. Tidak ada tren, tema, infrastruktur, wilayah, atau notifikasi | Sebagian |
| 2 | Audit Trail & Log Aktivitas | Kategori aktivitas, tren, filter, detail before/after, tingkat risiko, ekspor | `/super-admin/audit` punya daftar, filter desa/peristiwa, detail, dan ekspor CSV. Tidak ada kategori/severity terstruktur maupun tren | Sebagian |
| 3 | Daftar Tenant | Paket, tema, kuota/pemakaian storage, wilayah, filter, paginasi | `/super-admin/tenant` punya daftar, cari, dan filter status; belum ada paket, versi template, pemakaian storage, filter wilayah, atau paginasi server-side | Sebagian |
| 4 | Tambah Tenant | Wizard 5 langkah: identitas, domain, template, admin, review | Provisioning sudah membuat desa, domain, admin, dan fondasi template, tetapi belum berupa wizard dengan pilihan template/tampilan | Sebagian |
| 5 | Template & Tampilan | Galeri tema, warna, logo, pratinjau situs | Ada registry tema dan tabel `theme` per desa, tetapi belum ada pemilihan tema lintas tenant di konsol platform | Sebagian |
| 6 | Import Data Desa | Excel/CSV, pemetaan kolom, validasi, laporan hasil | Belum ada bulk import tenant. `exceljs` sudah tersedia sebagai dependency | Belum |
| 7 | Domain Overview | Ringkasan domain, SSL, DNS, tenant bermasalah | `/super-admin/domain` menampilkan domain lintas tenant | Sebagian |
| 8 | Domain Management | Tabel domain, status DNS/SSL, masa berlaku, aksi massal | Daftar dan pengelolaan alias ada; status DNS/SSL dan masa berlaku belum disimpan | Sebagian |
| 9 | Tambah Domain | Wizard 5 langkah dengan verifikasi DNS dan aktivasi SSL | Provisioning menerima domain; belum ada wizard verifikasi DNS/SSL | Sebagian |
| 10 | Daftar Pengguna | Seluruh pengguna platform dan tenant, role, status, login terakhir | `/super-admin/pengguna` sengaja hanya membaca akun `village_id IS NULL` | Sebagian |
| 11 | Detail Pengguna | Profil, role, tenant, sesi, aktivitas | Aksi status/reset/cabut sesi ada di daftar; belum ada halaman detail gabungan | Sebagian |
| 12 | Tambah Pengguna Admin Desa | Form akun admin untuk tenant | Pembuatan admin desa terjadi saat provisioning; belum ada layar mandiri | Sebagian |
| 13 | Manajemen Peran & Hak Akses | CRUD role, 156 permission, matriks modul | Template platform menampilkan role dan matriks baca-saja; role tenant tetap dikelola per tenant | Belum |
| 14 | Katalog Template | 18 template, versi, adopsi, kategori, pratinjau | `/super-admin/template` hanya menampilkan fondasi template tenant, bukan katalog tema website | Sebagian |
| 15 | Detail Template | Pratinjau tema, metadata, status publikasi | Belum ada katalog tema platform | Belum |
| 16 | Penggunaan & Pembaruan Template | Tenant pengguna, versi, distribusi update | Belum ada assignment template/version per tenant | Belum |
| 17 | Tambah Template | Upload paket, metadata, pratinjau, konfigurasi fitur | Runtime upload tema tidak didukung; tema dikompilasi saat build | Belum |
| 18 | Paket & Langganan | Paket, harga, fitur, kuota, perbandingan | Belum ada model plan, subscription, atau entitlement | Belum |
| 19 | Dashboard Langganan | KPI langganan, pendapatan, tenant, status | Belum ada model komersial | Belum |
| 20 | Daftar Langganan & Detail | Masa aktif, auto-renew, metode pembayaran, fitur aktif | Belum ada model komersial | Belum |
| 21 | Invoice | Daftar/tagihan, status, unduhan | Belum ada model invoice | Belum |
| 22 | Riwayat Transaksi | Pembayaran, metode, status, referensi | Belum ada model transaksi | Belum |
| 23 | Dashboard Keamanan | Skor keamanan, ancaman, insiden, status proteksi | Belum ada telemetri keamanan, WAF, atau firewall | Belum |
| 24 | Security Events | Daftar event keamanan dan tingkat risiko | Audit log dapat merekam event, tetapi bukan event keamanan terstruktur | Belum |
| 25 | Firewall & IP Management | Blokir IP, aturan firewall, daftar insiden | Tidak ada model firewall maupun integrasi edge/proxy | Belum |
| 26 | Vulnerability Management | Temuan CVE, severity, status remediasi | Tidak ada scanner atau model temuan | Belum |
| 27 | Security Policy | Kebijakan sesi, sandi, MFA, akses | Sebagian kebijakan ada di autentikasi, tetapi tidak ada konsol kebijakan platform | Belum |
| 28 | Dashboard Monitoring | Kesehatan server, database, aplikasi, storage, uptime | Tidak ada sumber metrik atau model monitoring | Belum |
| 29 | Server & Storage Monitoring | CPU/RAM/disk, kapasitas, status server | Tidak ada integrasi infrastruktur | Belum |
| 30 | Database Monitoring | Koneksi, replika, query, ukuran database | Tidak ada metrik database di aplikasi | Belum |
| 31 | Monitoring (1) | Varian dashboard aplikasi/API dan alert | Tidak ada telemetri aplikasi/API | Belum |
| 32 | Backup & Recovery | Jadwal, riwayat, verifikasi, restore | Endpoint backup/restore sudah ada, memakai super admin, konfirmasi, dan audit; belum ada UI jadwal/riwayat | Sebagian |
| 33 | Analytics Dashboard | Penggunaan modul, traffic, API, layanan | Belum ada event analitik produk atau traffic | Belum |
| 34 | Analitik Penggunaan & Layanan | Modul terpopuler, storage, insight | Belum ada agregasi penggunaan lintas tenant | Belum |
| 35 | Tenant Analytics | Perbandingan penggunaan per tenant | Belum ada agregasi per tenant | Belum |
| 36 | Pengaturan Umum | Identitas, branding, domain, bahasa, zona waktu, feature toggle | `/super-admin/pengaturan` membaca sebagian konfigurasi environment secara baca-saja | Sebagian |
| 37 | Infrastructure | Status layanan, cache, queue, storage, API | Belum ada integrasi atau model status infrastruktur | Belum |
| 38 | Konfigurasi Sistem | Edit env, cache, queue, scheduler, maintenance, log | Beberapa nilai dibaca baca-saja; tidak ada Redis/queue/scheduler store di aplikasi | Sebagian |

Rekap: **0 Ada, 15 Sebagian, 23 Belum**.

## 6. Temuan per area

### 6.1 Dashboard dan konsol tenant

Dashboard saat ini sudah memakai data nyata: jumlah desa, pengguna desa, domain, pengguna platform, tenant terbaru, kondisi yang perlu perhatian, dan aktivitas audit (`src/app/(admin)/super-admin/page.tsx`). Ini fondasi yang baik dan tidak perlu dibuang.

Mockup menambahkan lapisan yang tidak semuanya dapat dihitung sekarang:

| Elemen mockup | Bisa dari data sekarang? | Catatan |
|---|---|---|
| Total/aktif/nonaktif tenant | Sebagian | `villages.active` tersedia; status “ditangguhkan” belum ada |
| Tren pertumbuhan tenant | Ya | `villages.createdAt` dapat diagregasi |
| Distribusi per kecamatan | Ya | `villages.district` tersedia |
| Adopsi tema | Ya, terbatas | Tabel `theme` per desa; belum ada katalog/versi tema |
| Pengguna aktif/login terakhir | Sebagian | Sesi platform tersedia; agregat login semua tenant belum disiapkan |
| Pemakaian storage | Belum di query konsol | Kuota ada, pemakaian media belum diagregasi pada `listDesaSuperAdmin` |
| Status infrastruktur/uptime | Tidak | Tidak ada sumber metrik |
| Notifikasi platform | Tidak | Belum ada model broadcast/notifikasi platform |

Konsol tenant saat ini memuat seluruh desa lalu memfilter di browser (`tenant-console.tsx:488-532`). Ini cukup untuk data kecil, tetapi tidak akan bertahan pada ratusan tenant seperti di mockup. Paginasi, filter wilayah, dan kolom tema dapat ditambahkan tanpa migration; paket dan versi template memerlukan model baru.

### 6.2 Provisioning dan import

Backend provisioning sudah menangani pembuatan tenant, domain, admin desa, role, modul, tema, dan menu dari template platform. Yang belum ada adalah pengalaman wizard lima langkah dan pilihan template/tampilan.

Bulk import desa belum ada. Fitur ini bukan sekadar upload: perlu validasi header, batas ukuran, signature/tipe file, pemetaan kolom, deteksi duplikat kode/domain, transaksi per baris, laporan gagal, dan idempotensi. `exceljs` sudah tersedia, jadi tidak perlu dependency baru. Import ini tidak boleh membuat admin dengan sandi yang dicetak ke log.

Mockup “Tambah Template” menunjukkan upload paket. Implementasi itu **tidak boleh** disalin mentah-mentah. Registry tema saat ini sengaja hanya menerima tema yang dikompilasi saat build dan menolak tema runtime; komentar schema menyatakan upload ZIP tidak didukung (`src/db/schema/theme.ts:16-23`). Membuka upload kode/HTML arbitrer akan menjadi risiko eksekusi kode dan harus ditolak atau dirancang sebagai pipeline build terpisah.

### 6.3 Domain, DNS, dan SSL

Route domain sudah ada dan pengelolaan alias per tenant juga sudah didukung. Mockup menambahkan status DNS, status SSL, masa berlaku, dan aksi massal. Data itu tidak ada di schema saat ini.

Menampilkan “SSL aktif”, “DNS normal”, atau “auto-renew” tanpa pengecekan nyata akan menyesatkan operator. Bila fitur ini dikerjakan, perlu:

- job pengecekan dengan timestamp dan hasil terakhir;
- integrasi DNS/ACME atau reverse proxy yang jelas;
- timeout, retry, rate limit, dan audit;
- validasi TLS yang tetap aktif;
- pembatasan akses ke informasi infrastruktur.

### 6.4 Pengguna dan peran

Ini area dengan risiko multi-tenant paling tinggi.

Mockup “Daftar Pengguna” menampilkan seluruh pengguna desa. Implementasi saat ini hanya membaca akun platform (`village_id IS NULL`) dan setiap operasi tulis dibatasi pada akun platform (`pengguna-platform-repository.ts:11-17,68`). Memperluasnya ke seluruh tenant berarti platform dapat melihat dan mungkin mengubah identitas staf desa. Bila memang dibutuhkan, harus ada keputusan produk, filter tenant wajib, data pribadi diminimalkan, dan negative test lintas tenant.

Mockup “Manajemen Peran” mencampur role platform dengan role tenant seperti Admin Desa, Operator Desa, dan Operator Surat. Role tenant saat ini dimiliki per desa. Jangan membuat satu role global yang bisa mengubah role tenant lain. Pilihan yang aman:

1. Kelola role platform hanya untuk akun `villageId === null`.
2. Kelola role tenant dari konsol tenant masing-masing.
3. Bila butuh template role, gunakan definisi template berversi yang disalin ke tenant, bukan referensi role lintas tenant.

### 6.5 Langganan, invoice, dan pembayaran

Lima mockup di area ini seluruhnya baru. Tidak ada tabel plan, subscription, invoice, payment, entitlement, atau transaksi di `src/db/schema/`.

Sebelum UI dibuat, perlu keputusan produk dan arsitektur:

- daftar paket dan batas fitur/kuota;
- siklus tagihan, prorasi, pajak, diskon, dan refund;
- provider pembayaran, metode pembayaran, dan halaman checkout;
- webhook idempotensi, signature, retry, dan rekonsiliasi;
- status gagal bayar, dunning, dan penangguhan tenant;
- siapa yang boleh melihat data finansial.

Jangan menampilkan “Total Pendapatan” atau “Auto Renew” sebagai data nyata sebelum model dan provider ditentukan. Untuk integrasi pembayaran, pilih layanan setelah kebutuhan dan batasan proyek jelas; jangan mengarang endpoint.

### 6.6 Template dan tema

Ada dua konsep berbeda yang tercampur di mockup:

1. **Template fondasi tenant** — role, modul, menu, dan akses awal yang dibuat saat provisioning. Ini yang ditampilkan `/super-admin/template`.
2. **Tema website desa** — tampilan situs publik dengan warna, logo, hero, dan komponen. Ini disimpan di tabel `theme` per desa.

Mockup katalog, versi, adopsi, dan distribusi update berbicara tentang tema website. Sebelum implementasi, istilah harus dipisahkan agar route dan model tidak ambigu.

Tahap aman:

- katalog metadata tema yang sudah ada di registry build;
- statistik adopsi dari tabel `theme`;
- pemilihan tema saat provisioning dari allowlist;
- versi tema sebagai metadata, bukan upload kode.

Jangan mengizinkan unggah ZIP/HTML/JS tema pada runtime.

### 6.7 Audit, keamanan, dan monitoring

Audit trail sudah memiliki inti yang benar: aktor, desa, event, resource, IP, user agent, detail JSON, dan export. Schema audit tidak memiliki kolom kategori, severity, atau before/after terstruktur (`src/db/schema/audit.ts:16-27`). Mockup menampilkan kategori dan tingkat risiko; keduanya perlu dipetakan secara eksplisit, bukan disimpulkan dari teks event lalu ditampilkan seolah-olah fakta.

Security dashboard, firewall, vulnerability, dan WAF bukan fitur aplikasi biasa. Semuanya membutuhkan sumber data dari edge, proxy, scanner, atau infrastruktur. Jangan membuat dashboard yang terlihat seperti sistem sedang terlindungi padahal tidak ada kontrol di belakangnya. Untuk tahap awal, yang realistis adalah:

- event keamanan dari audit dan rate limit yang sudah ada;
- halaman status dengan label “belum dipantau” bila tidak ada sumber data;
- kebijakan sesi/autentikasi yang memang ditegakkan server-side.

Monitoring server, database, dan uptime juga membutuhkan telemetri. Backup/restore adalah pengecualian: endpoint sudah ada, memakai `requireSuperAdmin`, konfirmasi restore, dan audit (`database-use-cases.ts:22-64`). Namun restore bersifat destruktif. UI tidak boleh menaruh tombol restore di dashboard tanpa konfirmasi kuat, otorisasi ulang, dan prosedur pemeliharaan.

### 6.8 Analitik

Tiga mockup analitik membutuhkan data yang belum dikumpulkan:

- traffic website dan API;
- penggunaan modul per tenant;
- performa layanan;
- kapasitas storage;
- retensi dan tren per periode.

Audit log bukan pengganti product analytics. Bila fitur ini diprioritaskan, perlu definisi event, retensi, agregasi, dan privasi. Jangan mengaktifkan pelacakan pengguna mentah tanpa tujuan dan kebijakan retensi.

### 6.9 Konfigurasi platform

Halaman pengaturan sekarang hanya membaca sebagian environment dan menyembunyikan rahasia. Mockup ingin mengubah identitas, branding, bahasa, zona waktu, cache, queue, scheduler, maintenance, dan log dari UI.

Mengubah environment dari UI tidak otomatis aman: nilai bisa hilang saat deploy, tidak konsisten antar-instance, dan berisiko membocorkan secret. Untuk fitur edit, perlu config store tervalidasi, audit perubahan, otorisasi ulang, dan pemisahan secret. Jangan pernah menampilkan `BETTER_AUTH_SECRET`, encryption key, atau passphrase TTE.

Aplikasi juga belum memiliki Redis, queue worker, atau scheduler store sebagai bagian dari stack. Mockup “Cache Redis”, “Queue”, dan “Scheduler” tidak dapat dianggap fitur yang sudah ada hanya karena form-nya terlihat lengkap.

## 7. Temuan katalog dan dokumentasi

| Dokumen | Masalah | Dampak |
|---|---|---|
| `docs/mockups/README.md` | Masih mencatat 52 gambar, akun 12, platform 2 | Katalog tidak cocok dengan 89 PNG aktual |
| `docs/README.md` | Menyebut 52 gambar referensi | Indeks dokumentasi usang |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Menyatakan Super Admin belum punya screenshot acuan | Klaim tidak lagi benar |
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Arah visual §1 (sidebar putih, aksi biru) berbeda dari mockup baru (sidebar navy, aksi ungu) | Keputusan produk belum dicatat sebagai keputusan, baru sebagai catatan |
| `docs/architecture/MODULE-INVENTORY.md` | Snapshot `f5a6f42`, belum memuat perubahan mockup | Tetap historis; jangan dijadikan status terbaru |

Ambiguasi nama file yang perlu diselesaikan saat memilih acuan:

- `Monitoring/FlexiDesa Monitoring Dashboard.png` dan `Monitoring/FlexiDesa Monitoring Dashboard (1).png` memakai judul sama.
- Tiga layar analitik memiliki area yang saling tumpang tindih: `Analitik Dashboard`, `Analytics Dashboard`, dan `Tenant Analytics Dashboard`.
- `Template Dashboard` dan `Template Management` berpotensi tertukar; satu tampak seperti detail template, satu seperti adopsi/pembaruan.
- Area langganan memiliki dashboard, daftar langganan, manajemen paket, invoice, dan transaksi; urutan acuan harus ditetapkan sebelum implementasi.
- Nama folder memakai `&`, spasi, dan campuran prefix (`FlexiDesa`, `Keamanan`, `Purple`). Ini tidak salah, tetapi menyulitkan rujukan otomatis dan perlu konvensi untuk aset berikutnya.

## 8. Risiko keamanan dan multi-tenant

| Risiko | Mengapa penting | Kontrol yang harus dipertahankan |
|---|---|---|
| Daftar pengguna lintas tenant | Membuka identitas staf desa ke platform dan memperbesar dampak salah filter | Query tenant-scoped, filter wajib, least privilege, audit akses, negative test |
| Role global untuk tenant | Role tenant tidak boleh saling mengubah akses | Pisahkan role platform dan role tenant; salin definisi, jangan referensi role lintas tenant |
| Domain/SSL otomatis | Verifikasi DNS dan TLS menyentuh jaringan | Allowlist tujuan, TLS verification, timeout, retry, kontrol redirect |
| Firewall/WAF | Tampilan proteksi tanpa kontrol nyata menyesatkan | Integrasi edge tepercaya atau tandai belum tersedia |
| Upload template | Kode/HTML arbitrer dapat mengeksekusi atau merusak isolasi | Tolak runtime upload; gunakan tema build-time dan allowlist |
| Backup/restore | Restore dapat menimpa seluruh database | Super admin, konfirmasi eksplisit, audit, maintenance window, backup sebelum restore |
| Edit konfigurasi/secret | Dapat membocorkan atau merusak deployment | Read-only sampai ada config store, audit, dan secret manager |
| Import massal | Duplikat, data pribadi, dan kegagalan parsial | Validasi Zod, batas ukuran/tipe, transaksi, laporan baris gagal, idempotensi |
| Data contoh di mockup | Nama/email/IP terlihat nyata | Jangan dipakai sebagai fixture atau log; gunakan data sintetis baru |

## 9. Rekomendasi prioritas

### P0 — selesai dalam task ini

- Perbarui katalog mockup dan jumlah aset.
- Perbarui klaim dokumen desain tentang screenshot Super Admin.
- Tautkan audit ini dari katalog.

### P1 — nilai operasional tinggi, tanpa model komersial baru

1. **Konsol tenant v2**
   - Paginasi dan filter server-side.
   - Filter kecamatan/status.
   - Kolom tema dan kuota media.
   - Detail tenant yang menautkan domain, pengguna, audit, ekspor, dan retensi.
   - Jangan tambahkan paket/versi template sebelum modelnya ada.

2. **Dashboard berbasis data nyata**
   - Tren pertumbuhan tenant dari `createdAt`.
   - Distribusi tenant per kecamatan.
   - Adopsi tema dari tabel `theme`.
   - Pertahankan panel “perlu perhatian” dan audit terbaru.
   - Jangan tampilkan uptime, storage, atau notifikasi palsu.

### P2 — membutuhkan desain fitur, tetapi belum perlu integrasi eksternal

3. **Wizard provisioning + bulk import**
   - Mulai dari wizard 5 langkah dengan review.
   - Import Excel/CSV memakai `exceljs` yang sudah ada.
   - Validasi duplikat dan laporan hasil.

4. **Katalog tema tahap 1**
   - Pisahkan istilah template fondasi dan tema website.
   - Metadata katalog dan statistik adopsi.
   - Pemilihan tema saat provisioning dari allowlist.
   - Tanpa upload kode runtime.

### P3 — tertahan pada keputusan produk atau integrasi

5. **Langganan dan pembayaran** — perlu model plan/subscription/invoice dan provider pembayaran.
6. **Monitoring, keamanan, dan analitik** — perlu sumber telemetri, edge/WAF, dan kebijakan retensi.
7. **Edit konfigurasi platform** — perlu config store, secret management, dan audit perubahan.
8. **Role management lintas tenant** — perlu keputusan tegas tentang batas role platform versus tenant.

Urutan ini sengaja tidak mengejar jumlah layar. Mockup dengan angka besar tidak otomatis menjadi prioritas; fitur yang tidak punya sumber data hanya akan menjadi dashboard dekoratif.

## 10. Validasi

Perintah yang dijalankan:

```text
git status --short
git switch -c task/super-admin-mockup-audit
git rev-parse --short HEAD
find docs/mockups -name '*.png' | wc -l
find docs/mockups/platform/super-admin -name '*.png' | wc -l
```

Hasil:

- **PASS** — branch task dibuat dari `a715cc1`.
- **PASS** — 89 PNG aktual; 38 PNG Super Admin.
- **PASS** — 36 PNG area baru + Audit Trail + login baru teridentifikasi.
- **PASS** — tidak ada file mockup yang diubah atau dihapus oleh audit ini.
- **SKIPPED** — typecheck/build/test tidak relevan karena tidak ada perubahan source code.
- **SKIPPED** — browser visual acceptance tidak dijalankan karena task hanya audit aset dan pemetaan.

Pemeriksaan dokumentasi:

```text
npx prettier --check docs/mockups/README.md docs/README.md docs/design/ADMIN-PLATFORM-DESIGN.md docs/reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md
git diff --check
```

Hasil:

- **PASS** — Prettier: seluruh file yang diperiksa sesuai format.
- **PASS** — `git diff --check`: tidak ada whitespace error.
- **PASS** — tabel katalog D.2 memiliki 38 baris unik dan seluruhnya cocok dengan 38 PNG di disk.
- **PASS** — tabel matriks audit memiliki 38 baris: 15 `Sebagian` dan 23 `Belum`.
- **PASS** — folder preview sementara sudah dihapus; tidak ada aset mockup yang diubah.

## 11. Kesimpulan

Perubahan folder mockup bukan sekadar penambahan gambar. Mockup baru memperlihatkan arah produk yang jauh lebih luas: konsol SaaS dengan langganan, katalog tema, telemetri, keamanan, dan konfigurasi operasional. Implementasi saat ini masih berupa konsol lifecycle tenant yang kecil dan terkontrol.

Langkah yang benar adalah memperdalam bagian yang sudah punya sumber data, sambil menolak tampilan yang membutuhkan data atau kontrol yang belum ada. Dokumentasi juga harus berhenti menyebut 52 mockup dan “Super Admin belum punya screenshot”.

**Status: siap review. Tidak ada commit ke `main`, tidak ada push, dan tidak ada perubahan source code.**
