# Desa & Domain — Daftar Domain dengan DNS dan SSL Nyata

- **Task:** menyesuaikan halaman **Desa & Domain → Daftar domain** dengan mockup, menghapus menu Daftar tenant, serta menambahkan pemeriksaan DNS dan SSL yang benar-benar dijalankan.
- **Tanggal:** 20 November 2026
- **Branch:** `task/super-admin-daftar-domain-ssl`
- **Base commit:** `d28e9df` (`feat(super-admin): tambah submenu dan ringkasan daftar tenant`)
- **Commit implementasi:** `26bebf1`, `40b98db`, `85de3da`, dan `cf721b2` (revisi kartu/filter).
- **Laporan lama:** `DAFTAR-TENANT-SUBMENU-2026-11-20.md` dipindahkan ke `archive/` karena submenu **Daftar tenant** sudah digantikan oleh **Desa & Domain → Daftar domain**.

## 1. Tujuan

1. Menjadikan **Desa & Domain → Daftar domain** satu-satunya menu daftar tenant/domain di sidebar platform.
2. Menyesuaikan header, KPI, toolbar, dan kolom tabel dengan mockup `FlexiDesa Domain Management Dashboard.png`.
3. Menyediakan tombol **Cek SSL massal**, **Cek DNS massal**, dan **Tambah Domain**.
4. Menampilkan status DNS, status SSL, masa berlaku SSL, jenis domain, domain utama, dan status desa dari data nyata — bukan angka contoh.

## 2. Kondisi awal dan analisis

- Sidebar masih memiliki **Manajemen tenant → Daftar tenant**, sedangkan mockup menggunakan **Desa & Domain → Daftar domain**.
- Halaman `/super-admin/domain` sudah menampilkan domain, tetapi belum memiliki status DNS/SSL, masa berlaku sertifikat, tombol pemeriksaan, atau dialog tambah domain.
- Halaman tenant tetap diperlukan sebagai konsol pengelolaan (status, kuota, domain, ekspor, purge), tetapi tidak boleh menjadi menu **Daftar tenant** tersendiri. Route-nya dipertahankan sebagai halaman pengelolaan yang ditautkan dari kolom **Aksi**.
- Belum ada tabel cache untuk hasil TLS/DNS. Agar status tidak dikarang, pemeriksaan harus dijalankan server-side lalu disimpan; halaman hanya membaca cache tersebut.
- Mockup menampilkan enam KPI: **Total Domain**, **Subdomain Aktif**, **Custom Domain**, **SSL Aktif**, **SSL Segera Expired**, dan **SSL Bermasalah**. Revisi terakhir mengembalikan KPI ke susunan mockup tersebut karena kartu DNS dianggap belum sesuai.
- Mockup juga memakai empat filter (**Semua Kecamatan**, **Semua Jenis Domain**, **Semua Status**, **Semua SSL**) dan tombol **Filter**. Sebelumnya toolbar hanya memiliki tiga filter yang langsung diterapkan tanpa tombol.

## 3. File yang diperiksa

- `docs/mockups/platform/super-admin/Desa & Domain/FlexiDesa Domain Management Dashboard.png`
- `src/app/(admin)/super-admin/domain/page.tsx`
- `src/app/(admin)/super-admin/tenant/page.tsx`
- `src/app/(admin)/super-admin/actions.ts`
- `src/features/multi-desa/presentation/domain-console.tsx`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/village-domain` terkait di schema `village.ts`
- `src/features/navigation/domain/menu-platform.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/components/shell/platform-topbar-head.tsx`
- `src/app/globals.css`
- `AGENTS.md` dan `docs/reports/README.md`

## 4. File yang diubah

### Navigasi dan konsol tenant

| File | Alasan |
|---|---|
| `src/features/navigation/domain/menu-platform.ts` | Mengganti **Manajemen tenant** dengan **Desa & Domain** dan submenu **Daftar domain**; menghapus menu **Daftar tenant**. |
| `src/features/navigation/domain/menu-platform.test.ts` | Menguji menu baru dan memastikan tidak ada menu Daftar tenant. |
| `src/features/navigation/domain/header-platform.ts` | Header domain menjadi **Desa & Domain / Daftar domain**; route tenant menjadi **Konsol tenant**. |
| `src/features/navigation/domain/header-platform.test.ts` | Menyesuaikan judul, remah, dan ketiadaan aksi lama. |
| `src/components/shell/platform-topbar-head.tsx` | Pencarian top bar diarahkan ke daftar domain. |
| `src/app/(admin)/super-admin/tenant/page.tsx` | Judul menjadi **Konsol Tenant** dan mendapat tautan kembali. |
| `src/app/(admin)/super-admin/tenant/page.test.ts` | Menyesuaikan ekspektasi header. |
| `src/features/multi-desa/presentation/platform-ui.tsx` | Menambah `backHref` dan `judul` pada header platform. |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Penyesuaian visual konsol tenant: nomor baris, pencarian berikon, status/retensi, aksi ikon, pagination. |
| `src/features/multi-desa/presentation/dialog-daftar-desa.tsx` | Label tombol menjadi **Tambah tenant**. |

### Domain, DNS, dan SSL

| File | Alasan |
|---|---|
| `src/app/(admin)/super-admin/domain/page.tsx` | Menggabungkan domain, desa, cache DNS/SSL; menghitung enam KPI mockup; merender tombol pemeriksaan dan dialog tambah domain. |
| `src/app/(admin)/super-admin/domain/page.test.ts` | Test untuk guard, enam KPI, filter mockup, tombol, kolom, cache kosong, pencarian, dan pagination. |
| `src/app/(admin)/super-admin/actions.ts` | Server Action `periksaSslMassalAction` dan `periksaDnsMassalAction`; revalidasi `/super-admin/domain`. |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.ts` | Use case baca cache dan pemeriksaan massal dengan konkurensi 4. |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts` | Test penolakan non-super-admin, pemeriksaan SSL, dan pemeriksaan DNS. |
| `src/features/multi-desa/domain/status-ssl.ts` + test | Aturan status SSL dan batas **segera expired** 30 hari. |
| `src/features/multi-desa/domain/status-dns.ts` + test | Aturan status DNS; hanya alamat publik dianggap normal. |
| `src/features/multi-desa/domain/jenis-domain.ts` + test | Klasifikasi **Subdomain** hanya untuk `<slug>.<DESA_BASE_DOMAIN>`; sisanya **Custom**. |
| `src/features/multi-desa/infrastructure/pemeriksa-host.ts` | Validasi hostname dan resolusi A/AAAA; menolak alamat privat/loopback/link-local sebelum koneksi. |
| `src/features/multi-desa/infrastructure/pemeriksa-dns.ts` | Pemeriksaan DNS nyata dan pemetaan hasil. |
| `src/features/multi-desa/infrastructure/pemeriksa-ssl.ts` | Handshake TLS nyata dengan verifikasi sertifikat tetap aktif, SNI hostname, timeout 8 detik, maksimal 3 alamat. |
| `src/features/multi-desa/infrastructure/domain-ssl-repository.ts` | Cache hasil TLS per domain. |
| `src/features/multi-desa/infrastructure/domain-dns-repository.ts` | Cache hasil DNS per domain. |
| `src/db/schema/domain-ssl.ts` | Tabel `domain_ssl_checks`, unik per `domain_id`, cascade saat domain dihapus. |
| `src/db/schema/domain-dns.ts` | Tabel `domain_dns_checks`, unik per `domain_id`, cascade saat domain dihapus. |
| `src/db/schema/index.ts` | Ekspor schema baru. |
| `src/db/migrations/0024_domain_ssl_checks.sql` | Migration aditif tabel SSL. |
| `src/db/migrations/0025_domain_dns_checks.sql` | Migration aditif tabel DNS. |
| `src/features/multi-desa/presentation/domain-console.tsx` | Tabel 10 kolom, filter kecamatan/jenis/status/SSL dengan tombol **Filter**, badge status, masa berlaku, domain utama, pagination. |
| `src/features/multi-desa/presentation/tombol-pemeriksaan.tsx` | Tombol massal dengan status pending dan hasil Server Action. |
| `src/features/multi-desa/presentation/dialog-tambah-domain.tsx` | Dialog tambah domain dengan pilihan desa dari server. |
| `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` | Menyertakan `createdAt` pada baris domain. |
| `src/app/globals.css` | Gaya kartu KPI horizontal, toolbar empat filter dan tombol **Filter**, badge DNS/SSL, jenis domain, tombol aksi, dialog, dan ringkasan domain. |

## 5. Perubahan

### Navigasi

- Sidebar platform sekarang memuat **Desa & Domain** dengan submenu **Daftar domain**.
- Menu **Manajemen tenant** dan **Daftar tenant** dihapus dari sidebar.
- Judul halaman domain adalah **Desa & Domain — Daftar Domain** dengan breadcrumb **Dashboard Super Admin → Desa & Domain → Daftar domain**.
- Route `/super-admin/tenant` tetap ada sebagai **Konsol tenant** untuk pengelolaan yang ditautkan dari kolom **Aksi**, bukan sebagai menu daftar tersendiri.
- Pencarian top bar mengirim `q` ke `/super-admin/domain`.

### Halaman daftar domain

Enam KPI dihitung dari data server dan disusun mengikuti mockup:

1. **Total Domain** — jumlah seluruh domain, catatan `(Desa/Tenant)`.
2. **Subdomain Aktif** — jumlah domain berjenis subdomain, catatan persentase dari total.
3. **Custom Domain** — jumlah domain berjenis custom, catatan persentase dari total.
4. **SSL Aktif** — jumlah status SSL `aktif`, catatan persentase dari total.
5. **SSL Segera Expired** — jumlah status `segera-expired`, catatan `(< 30 hari)`.
6. **SSL Bermasalah** — jumlah status `bermasalah`, catatan persentase dalam tanda kurung.

Kartu memakai layout horizontal seperti mockup: ikon kotak di kiri, lalu label, angka besar, dan catatan bertumpuk di kanan. Enam kartu tetap satu baris pada layar lebar dan turun menjadi 3/2/1 kolom pada layar lebih kecil.

Header memiliki tombol **Cek SSL massal**, **Cek DNS massal**, dan **Tambah Domain**. Tabel memakai kolom:

`#`, **Nama Desa / Tenant**, **Alamat Domain**, **Jenis**, **Status DNS**, **Status SSL**, **Masa Berlaku SSL**, **Domain Utama**, **Status**, **Aksi**.

- **Jenis** dihitung dari `DESA_BASE_DOMAIN` dan slug desa, bukan dari pola nama domain.
- **Domain Utama** menampilkan **Utama** atau **Alias** dari `village_domains.isPrimary`.
- Domain yang belum pernah diperiksa ditampilkan **Belum diperiksa**; tidak pernah dianggap aktif.
- Toolbar memakai pencarian lebar dan empat select: **Semua Kecamatan** (dari kecamatan desa pada baris), **Semua Jenis Domain**, **Semua Status** (aktif/nonaktif desa), dan **Semua SSL**. Perubahan select baru diterapkan setelah tombol **Filter** ditekan; tombol berubah warna bila ada draft yang belum diterapkan.
- Pencarian mencakup nama desa, slug, domain, dan alamat hasil resolusi.
- Pagination 10/25/50 baris berjalan di klien.

### Pemeriksaan DNS dan SSL

- **DNS:** resolver `node:dns` mengambil A/AAAA, seluruh alamat harus publik. Hostname dengan akhiran internal seperti `.localhost`, `.local`, `.internal`, `.lan`, `.home.arpa`, alamat loopback, privat, link-local, CGNAT, multicast, dan rentang reserved ditolak sebelum koneksi.
- **SSL:** `node:tls` melakukan handshake ke alamat hasil resolusi dengan `servername` hostname asli. Verifikasi sertifikat tidak dimatikan; tidak ada `rejectUnauthorized: false`. Timeout 8 detik per alamat, maksimal 3 alamat, dan minimal TLS 1.2.
- Hasil disimpan sebagai cache di `domain_ssl_checks` dan `domain_dns_checks`; halaman tidak melakukan koneksi jaringan saat dirender.
- Pemeriksaan massal dibatasi empat domain bersamaan agar resolver dan server tujuan tidak dibanjiri.
- Server Action hanya dapat dipanggil pengelola platform karena use case memanggil `requireSuperAdmin()`.

## 6. Security dan tenant

- Halaman domain memanggil `pastikanSuperAdmin()` sebelum membaca data; use case cache/pemeriksaan juga memanggil `requireSuperAdmin()`.
- Daftar domain berasal dari `village_domains` di server, bukan dari host/domain yang dikirim klien. Tidak ada pemeriksaan terhadap host arbitrer dari body/query.
- `villageId` dari form **Tambah Domain** tidak dianggap bukti otorisasi; use case `tambahDomain` tetap memvalidasi desa dan pemanggil super admin.
- Cache DNS/SSL hanya berisi metadata host dan sertifikat; tidak ada NIK, data penduduk, token, atau kredensial.
- Query cache dibatasi untuk konsol platform dan tidak diekspos ke route desa.
- Foreign key cache memakai `ON DELETE CASCADE` ke `village_domains.id`; satu baris per domain dijaga unique constraint.
- Alamat internal ditolak sebelum TLS, sehingga fitur ini tidak menjadi jalur SSRF baru.
- Keterbatasan: tabel cache belum memakai composite foreign key `(village_id, domain_id)` karena hanya diakses super admin dan tidak menjadi jalur data tenant. Bila tabel ini kelak dibaca oleh aplikasi desa, keputusan tersebut perlu ditinjau.

## 7. Migration dan deployment

Migration yang dibuat:

- `0024_domain_ssl_checks.sql` — `domain_ssl_checks`.
- `0025_domain_dns_checks.sql` — `domain_dns_checks`.

Keduanya aditif: membuat tabel baru, unique index pada `domain_id`, index status, dan foreign key cascade. Tidak ada perubahan kolom lama, tidak ada backfill, dan tidak ada downtime yang direncanakan.

Saat dijalankan pertama kali, Drizzle melaporkan sukses tetapi tidak membuat kedua tabel. Penyebabnya: nilai `when` pada `_journal.json` untuk 0019/0020 lebih kecil daripada 0018, sehingga Drizzle menganggap kedua migration sudah lewat. Nilai `when` pernah dikoreksi menjadi `1795451764000` dan `1795451765000`.

Ketika branch disinkronkan dengan `main`, nomor `0019` dan `0020` sudah dipakai migration komentar dan galeri. Migration diganti nama menjadi `0024_domain_ssl_checks` dan `0025_domain_dns_checks`, dengan `when` `1795452000003` dan `1795452000004` agar berada setelah migration terakhir `main`. Snapshot `0024`/`0025` disusun dari snapshot `0022` milik `main` plus masing-masing tabel baru. Jangan mengubah migration yang sudah diterapkan; penyesuaian ini hanya pada migration baru yang belum pernah diterapkan.

Urutan deploy yang disarankan:

1. Backup database.
2. Jalankan migration pada database target.
3. Deploy kode yang membaca tabel cache.
4. Buka halaman domain; status awal seluruh domain adalah **Belum diperiksa**.
5. Tekan **Cek DNS massal** dan **Cek SSL massal** untuk mengisi cache.

Rollback kode dapat dilakukan tanpa menghapus tabel. Menghapus tabel cache bersifat destruktif dan memerlukan persetujuan terpisah.

**Migration sudah dijalankan hanya pada database pengembangan lokal** `127.0.0.1/desa_dev` setelah error runtime `domain_ssl_checks` dilaporkan. Tidak ada migration yang dijalankan ke production. Verifikasi setelah migrate: `domain_ssl_checks` dan `domain_dns_checks` ada, dan `__drizzle_migrations` berisi 21 baris.

## 8. Validasi

Perintah yang benar-benar dijalankan:

| Perintah | Hasil |
|---|---|
| `npm run db:generate` | **PASS** — menghasilkan migration `domain_dns_checks` (kini `0025_domain_dns_checks.sql`). |
| `npm run typecheck` | **PASS** — `next typegen && tsc --noEmit`. |
| `npx vitest run "src/app/(admin)/super-admin/domain/page.test.ts" src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts src/features/multi-desa/domain/status-ssl.test.ts src/features/multi-desa/domain/status-dns.test.ts src/features/multi-desa/domain/jenis-domain.test.ts src/features/navigation/domain/menu-platform.test.ts` | **PASS** — 6 file, 27 test, dijalankan ulang setelah revisi kartu dan filter. |
| `npx vitest run "src/app/(admin)/super-admin/tenant/page.test.ts" src/features/navigation/domain/header-platform.test.ts src/features/navigation/domain/menu-platform.test.ts src/features/multi-desa/presentation/dialog-form-tenant.test.ts` | **PASS** — 4 file, 20 test. |
| `npm run lint` | **PASS** — 0 error; 2 warning lama `no-console` di `scripts/wilayah/generate-wilayah.mjs`. |
| `npm run format:check` | **PASS** — seluruh file sesuai Prettier setelah perbaikan. |
| `git diff --check` | **PASS** — tidak ada whitespace error. |
| `npm run db:migrate` | **PASS (LOKAL)** — dijalankan ke `127.0.0.1/desa_dev`, bukan production; setelah koreksi urutan timestamp, kedua tabel cache dibuat. |
| Verifikasi tabel via `mysql2` | **PASS** — `domain_ssl_checks` dan `domain_dns_checks` terdaftar; `__drizzle_migrations` berisi 21 baris. |
| Visual QA browser | **SKIPPED** — belum ada sesi Super Admin dengan data seed untuk memeriksa tampilan setelah migration. |

Test fokus yang dijalankan mencakup guard non-super-admin, penolakan use case, pemetaan cache, kolom/tombol halaman, status belum diperiksa, pencarian, pagination, navigasi, dan header.

## 9. Risiko dan batasan

- **Migration baru diterapkan di database lokal.** Setiap environment lain, termasuk production, tetap harus menjalankan `0024_domain_ssl_checks` dan `0025_domain_dns_checks` sebelum kode ini dipakai. Tanpa itu halaman akan gagal membaca cache.
- **Belum ada visual QA ber-login.** Layout kartu dan toolbar sudah disesuaikan berdasarkan mockup dan markup yang dirender, tetapi halaman belum dibuka di browser dengan sesi Super Admin.
- **Pemeriksaan jaringan belum diuji end-to-end.** Test memakai mock untuk pemeriksa; handshake TLS dan resolver nyata belum dijalankan pada domain publik dari lingkungan ini.
- Domain pengembangan seperti `*.localhost` memang ditolak oleh guard host publik, sehingga akan tampil **Bermasalah** setelah pemeriksaan. Itu perilaku keamanan yang disengaja, bukan bug status.
- Pemeriksaan massal dapat berjalan lama untuk ratusan domain karena timeout per alamat. Belum ada background job, progres per domain, atau batas waktu total.
- Cache belum memiliki masa kedaluwarsa otomatis; status adalah hasil pemeriksaan terakhir sampai tombol dijalankan lagi. Waktu `checkedAt` belum ditampilkan di tabel.
- Checkbox baris pada mockup tidak dibuat karena belum ada aksi massal per baris. Aksi yang tersedia baru **Kelola**.
- Kolom **Domain Utama** menampilkan **Utama/Alias**; mockup menampilkan label jenis yang sama dengan kolom **Jenis**, sehingga interpretasi ini dipilih agar tidak menduplikasi kolom.
- Filter **Semua Kecamatan** hanya berisi kecamatan yang muncul pada baris domain; desa tanpa domain tidak menjadi pilihan karena tidak ada baris untuk difilter.
- Route `/super-admin/tenant` masih ada sebagai konsol pengelolaan tersembunyi. Menghapus route sepenuhnya akan memutus aksi **Kelola** dan kemampuan mengelola tenant.
- Test penuh seluruh repository tidak dijalankan ulang; validasi difokuskan pada file yang berubah.

## 10. Kesimpulan

Halaman **Desa & Domain → Daftar domain** sekarang mengikuti struktur mockup, termasuk enam kartu KPI dan toolbar empat filter dengan tombol **Filter**, serta menampilkan status DNS/SSL dari pemeriksaan server-side nyata dengan cache database. Menu **Daftar tenant** sudah dihapus dari navigasi. Database pengembangan lokal sudah dimigrasikan dan error tabel cache sudah teratasi; production tetap memerlukan migration 0024/0025. Tampilan final belum diverifikasi lewat browser dengan sesi Super Admin.
