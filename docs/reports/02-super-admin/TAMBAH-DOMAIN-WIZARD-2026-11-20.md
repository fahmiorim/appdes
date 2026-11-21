# Desa & Domain — Wizard Tambah Domain

- **Task:** mengimplementasikan halaman **Desa & Domain → Tambah Domain** sesuai mockup `FlexiDesa Domain Setup Dashboard.png`, dengan wizard lima langkah dan pemeriksaan DNS/TLS nyata.
- **Tanggal:** 20 November 2026
- **Branch:** `task/super-admin-tambah-domain`
- **Base commit:** `a7719ed` (`docs(super-admin): catat commit revisi kartu dan filter domain`)
- **Commit implementasi:** `8c2b694` (`feat(super-admin): tambah wizard pendaftaran domain`).

## 1. Tujuan

1. Menyediakan route `/super-admin/domain/tambah` yang hanya dapat dibuka pengelola platform.
2. Menyesuaikan alur dan tampilan dengan mockup: stepper lima langkah, pemilihan tenant, dua jenis domain, pratinjau domain, alur pendaftaran, dan footer **Batal/Sebelumnya/Selanjutnya**.
3. Menyimpan domain melalui use case yang sudah ada, lalu memeriksa DNS dan sertifikat TLS yang benar-benar terpasang.
4. Tidak mengarang status DNS/SSL, tidak menerbitkan sertifikat palsu, dan tidak menonaktifkan verifikasi TLS.
5. Menghubungkan tombol **Tambah Domain** pada Daftar Domain serta submenu sidebar ke route baru.

## 2. Kondisi awal dan analisis

- Tombol **Tambah Domain** di halaman `/super-admin/domain` masih membuka dialog satu langkah. Dialog tersebut hanya mengirim `villageId` dan host, lalu langsung menyimpan.
- Belum ada halaman yang menampilkan pratinjau alamat, membedakan subdomain platform dari custom domain, atau memandu pemeriksaan DNS/TLS setelah domain tersimpan.
- Use case massal `periksaDnsSemuaDomain` dan `periksaSslSemuaDomain` sudah ada, tetapi belum ada pemeriksaan satu domain berdasarkan id.
- Pemeriksa DNS/TLS yang ada sudah menolak alamat internal, tetap memverifikasi sertifikat, dan menyimpan hasil ke cache. Karena itu wizard harus memakai pemeriksa tersebut, bukan membuat jalur jaringan baru.
- Aplikasi tidak memiliki kewenangan menerbitkan atau memasang sertifikat SSL. Langkah **Aktivasi SSL** karena itu dirancang sebagai pemeriksaan handshake TLS nyata, dengan penjelasan eksplisit bahwa pemasangan sertifikat dilakukan di reverse proxy/server.
- `DesaSuperAdminRow` belum membawa `regency`, padahal mockup menampilkan kecamatan dan kabupaten tenant.

## 3. File yang diperiksa

- `docs/mockups/platform/super-admin/Desa & Domain/FlexiDesa Domain Setup Dashboard.png`
- `src/app/(admin)/super-admin/domain/page.tsx`
- `src/app/(admin)/super-admin/actions.ts`
- `src/app/(admin)/super-admin/guard.ts`
- `src/features/multi-desa/presentation/dialog-tambah-domain.tsx`
- `src/features/multi-desa/presentation/domain-console.tsx`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/application/pemantauan-domain-use-cases.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/domain-dns-repository.ts`
- `src/features/multi-desa/infrastructure/domain-ssl-repository.ts`
- `src/features/multi-desa/infrastructure/pemeriksa-dns.ts`
- `src/features/multi-desa/infrastructure/pemeriksa-ssl.ts`
- `src/features/multi-desa/infrastructure/pemeriksa-host.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/domain/desa-baru.ts`
- `src/features/multi-desa/domain/jenis-domain.ts`
- `src/features/multi-desa/domain/kelola-desa.ts`
- `src/features/multi-desa/domain/status-dns.ts`
- `src/features/multi-desa/domain/status-ssl.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/features/navigation/domain/menu-platform.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/app/globals.css`
- `AGENTS.md` dan `docs/reports/README.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/app/(admin)/super-admin/domain/tambah/page.tsx` | Route baru dengan guard `pastikanSuperAdmin()`, daftar desa, `DESA_BASE_DOMAIN`, dan aksi server. |
| `src/app/(admin)/super-admin/domain/tambah/page.test.ts` | Test penolakan non-super-admin dan render wizard/pilihan tenant. |
| `src/features/multi-desa/presentation/tambah-domain-wizard.tsx` | Komponen client wizard lima langkah, pratinjau, validasi host, dan pemanggilan aksi pemeriksaan. |
| `src/app/(admin)/super-admin/domain/page.tsx` | Tombol **Tambah Domain** menjadi `Link` ke route baru; dialog tidak lagi dipakai di halaman ini. |
| `src/app/(admin)/super-admin/actions.ts` | Aksi `periksaDnsDomainAction` dan `periksaSslDomainAction`; revalidasi route tambah domain. |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.ts` | Use case `periksaDnsSatuDomain` dan `periksaSslSatuDomain`; host dibaca dari database berdasarkan id. |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts` | Test guard, id tidak ditemukan, pemeriksaan DNS satu domain, dan pemeriksaan SSL satu domain. |
| `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` | Query `getDomainPlatform(domainId)` untuk mengambil domain terdaftar. |
| `src/features/multi-desa/infrastructure/provisioning-repository.ts` | Menambahkan `regency` ke baris desa konsol platform. |
| `src/features/multi-desa/domain/jenis-domain.ts` | Helper murni `susunSubdomainPlatform(slug, baseDomain)`. |
| `src/features/multi-desa/domain/jenis-domain.test.ts` | Test penyusunan subdomain, normalisasi base domain, dan input kosong. |
| `src/features/navigation/domain/menu-platform.ts` | Submenu **Tambah Domain** di bawah **Desa & Domain**; label **Daftar Domain** diselaraskan. |
| `src/features/navigation/domain/menu-platform.test.ts` | Menyesuaikan ekspektasi dua submenu. |
| `src/features/navigation/domain/header-platform.ts` | Header dan breadcrumb route `/super-admin/domain/tambah`. |
| `src/features/navigation/domain/header-platform.test.ts` | Test judul, deskripsi, dan remah Tambah Domain. |
| `src/components/shell/admin-sidebar.tsx` | Submenu aktif hanya pada tautan yang tepat agar **Daftar Domain** tidak ikut aktif di halaman tambah. |
| `src/features/multi-desa/presentation/platform-ui.tsx` | Properti opsional `backLabel` agar label tautan kembali akurat. |
| `src/app/globals.css` | Gaya stepper, kartu tenant/jenis, pratinjau browser, alur, status, dan layout responsif. |

## 5. Perubahan

### Route dan wizard

- Route baru `/super-admin/domain/tambah`, dilindungi `pastikanSuperAdmin()` sebelum data desa dibaca.
- Wizard memiliki lima langkah:
  1. **Pilih Tenant & Jenis** — tenant dari server, lokasi kecamatan/kabupaten, pilihan **Subdomain Platform** atau **Custom Domain**.
  2. **Konfigurasi Domain** — subdomain disusun dari slug dan `DESA_BASE_DOMAIN`; custom domain memakai input hostname. Domain disimpan lewat `tambahDomainAction`.
  3. **Verifikasi & DNS** — memeriksa resolusi DNS nyata melalui `periksaDnsDomainAction`.
  4. **Aktivasi SSL** — memeriksa handshake TLS nyata melalui `periksaSslDomainAction`. Halaman menjelaskan bahwa penerbitan/pemasangan sertifikat bukan bagian aplikasi.
  5. **Selesai** — ringkasan tenant, domain, jenis, status DNS, dan status SSL, dengan peringatan bila SSL belum aktif.
- Tombol **Selanjutnya** pada langkah DNS/SSL baru aktif setelah pemeriksaan mengembalikan hasil. Hasil bermasalah tetap dapat dilanjutkan dengan peringatan; status tidak diubah menjadi aktif.
- Pratinjau menampilkan alamat, identitas desa, kecamatan, dan kabupaten. Bila tenant belum dipilih, pratinjau memakai placeholder, bukan data contoh.
- Setelah domain tersimpan, langkah 1 dan input domain dikunci untuk mencegah perubahan tenant/host di tengah alur. Tombol **Batal** kembali ke Daftar Domain; domain yang sudah tersimpan tetap ada dengan status **Belum diperiksa** sampai pemeriksaan dijalankan.
- Tombol **Tambah Domain Lain** mereset wizard tanpa membuat domain tambahan.

### Data dan navigasi

- `getDomainPlatform(domainId)` membaca satu baris `village_domains`; use case hanya menerima id dari klien dan selalu membaca ulang host dari database.
- `periksaDnsSatuDomain` dan `periksaSslSatuDomain` memanggil `requireSuperAdmin()`, memvalidasi id bilangan bulat positif, memastikan domain ada, lalu memakai pemeriksa dan cache yang sudah ada.
- `regency` sekarang tersedia pada data konsol desa sehingga lokasi tenant dapat ditampilkan.
- Sidebar menampilkan **Desa & Domain → Daftar Domain / Tambah Domain**; breadcrumb halaman adalah **Desa & Domain → Daftar Domain → Tambah Domain**.

## 6. Security dan tenant

- Guard halaman dan use case memakai mekanisme super-admin yang sudah ada; administrator desa tidak dapat membuka route atau memanggil aksi.
- Server Action hanya mengirim `domainId`/data form. Host untuk pemeriksaan jaringan **tidak** diterima dari klien; host dibaca dari `village_domains`.
- `villageId` dari form tidak dianggap bukti otorisasi. Use case `tambahDomain` memvalidasi pemanggil dan keberadaan desa; kepemilikan/foreign reference tetap diperiksa di server.
- Pemeriksaan DNS/TLS memakai `resolusiHostPublik`, sehingga host internal, loopback, link-local, dan alamat privat ditolak sebelum koneksi. Tidak ada jalur SSRF baru.
- Verifikasi TLS tidak dinonaktifkan. `periksaSslDomain` memakai SNI hostname asli, minimal TLS 1.2, timeout, dan batas jumlah alamat yang sudah ada.
- Tidak ada NIK, data penduduk, token, atau kredensial yang ditambahkan ke UI, cache, test, atau laporan.
- Domain yang belum diperiksa tidak pernah ditampilkan sebagai aktif. Langkah SSL tidak mengklaim sertifikat berhasil diterbitkan.

## 7. Validasi

Perintah yang benar-benar dijalankan pada working tree ini:

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | **PASS** — `next typegen && tsc --noEmit`. |
| `npx vitest run --config vitest.config.mts 'src/app/(admin)/super-admin/domain/tambah/page.test.ts' 'src/app/(admin)/super-admin/domain/page.test.ts' src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts src/features/multi-desa/domain/jenis-domain.test.ts src/features/navigation/domain/menu-platform.test.ts src/features/navigation/domain/header-platform.test.ts` | **PASS** — 6 file, 33 test. |
| `npm run lint` | **PASS** — 0 error; 2 warning lama `no-console` di `scripts/wilayah/generate-wilayah.mjs`. |
| `npm run format:check` | **PASS** — seluruh file sesuai Prettier. |
| `git diff --check` | **PASS** — tidak ada whitespace error. |
| Visual QA browser ber-login | **SKIPPED** — belum ada sesi Super Admin dengan data seed untuk membuka halaman dan membandingkan hasil render secara visual. |
| Integration test | **SKIPPED** — perubahan tidak menyentuh schema/migration; test yang dijalankan adalah unit/page test dengan mock. |
| Pemeriksaan DNS/TLS ke domain publik nyata | **SKIPPED** — test memakai mock pemeriksa; handshake/resolusi nyata belum dijalankan dari lingkungan ini. |

Test fokus mencakup guard non-super-admin, penolakan id domain yang tidak terdaftar, pembacaan host dari database, penyimpanan hasil pemeriksaan, penyusunan subdomain, submenu/header, dan render halaman. Test tidak menghapus assertion atau menonaktifkan pemeriksaan.

## 8. Risiko dan batasan

- **Belum ada visual QA ber-login.** Layout mengikuti mockup dan markup yang dirender, tetapi halaman belum dibuka di browser dengan sesi Super Admin.
- **Pemeriksaan jaringan belum diuji end-to-end.** Handshake TLS dan resolver nyata tidak dijalankan pada test; hasil aktual bergantung pada DNS dan sertifikat domain tenant.
- **Langkah SSL bukan aktivasi sertifikat.** Aplikasi hanya memeriksa sertifikat yang sudah terpasang. Penerbitan/pemasangan tetap menjadi tugas reverse proxy/server dan belum diotomatiskan.
- **Tidak ada verifikasi kepemilikan domain (TXT/HTTP challenge).** Langkah DNS hanya memeriksa resolusi host; kepemilikan domain tidak dibuktikan secara kriptografis.
- Domain custom tetap dapat disimpan ketika DNS/TLS bermasalah; statusnya ditampilkan sebagai peringatan, bukan sukses palsu. Ini disengaja agar operator dapat menyelesaikan konfigurasi infrastruktur setelah pendaftaran.
- Pemeriksaan satu domain dapat memakan waktu hingga batas timeout pemeriksa TLS yang sudah ada (beberapa alamat × 8 detik). Belum ada background job atau progres streaming.
- Dialog tambah domain lama tidak dihapus pada task ini. Setelah tombol Daftar Domain dialihkan ke wizard, komponen tersebut tidak lagi dipakai; penghapusan atau penggunaannya kembali menunggu task terpisah agar scope tetap fokus.
- Route ini belum memiliki audit event khusus untuk pemeriksaan DNS/SSL per domain; pencatatan audit yang ada baru untuk perubahan domain/tenant.
- Test penuh seluruh repository tidak dijalankan ulang; validasi difokuskan pada file yang berubah.

## 9. Kesimpulan dan langkah berikutnya

Halaman Tambah Domain sekarang tersedia sebagai wizard lima langkah yang mengikuti struktur mockup, memakai tenant dan domain nyata, menyimpan domain melalui use case yang sudah ada, dan memeriksa DNS/TLS melalui pemeriksa server-side yang tetap menjaga verifikasi TLS serta menolak alamat internal. Status SSL tidak dikarang: aplikasi hanya menampilkan hasil handshake dan menjelaskan bahwa pemasangan sertifikat dilakukan di infrastruktur.

Langkah berikutnya yang disarankan:

1. Jalankan visual QA dengan sesi Super Admin dan data tenant untuk memeriksa layout pada lebar desktop/mobile.
2. Tambahkan audit event untuk pemeriksaan DNS/SSL per domain bila dibutuhkan jejak operasional.
3. Bila penerbitan sertifikat akan diotomatiskan, rancang integrasi ACME/reverse proxy sebagai task terpisah dengan kontrol keamanan dan approval deployment tersendiri.

**Status:** siap review — belum merge dan belum deploy.
