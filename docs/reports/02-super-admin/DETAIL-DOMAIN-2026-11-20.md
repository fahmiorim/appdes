# Detail Domain Super Admin

- **Tanggal:** 20 November 2026
- **Task:** Halaman Detail Domain (`/super-admin/domain/[domainId]`)
- **Branch:** `task/super-admin-detail-domain`
- **Base commit:** `f2eb438`
- **Commit implementasi:** `dfe1712`
- **Status:** siap review

## Tujuan

Membangun halaman detail satu domain tenant sesuai mockup **Detail Domain — Desa Tanjung Gading**, memakai data nyata dari database dan cache pemeriksaan DNS/TLS yang sudah ada. Tidak menampilkan paket, web server, response time, TTL, propagasi, auto-renew, atau status verifikasi yang tidak memiliki sumber data.

## Kondisi awal dan analisis

Sebelum perubahan, daftar domain hanya memiliki aksi menuju Konsol Tenant. Data yang tersedia untuk satu domain:

- `village_domains`: host, status domain utama, waktu dibuat.
- `villages`: nama, kode, slug, logo, kecamatan, kabupaten, provinsi, status tenant, waktu dibuat/diperbarui.
- Cache DNS: status, alamat A/AAAA, error, waktu pemeriksaan.
- Cache TLS: status, valid dari/sampai, penerbit, error, waktu pemeriksaan.
- Audit tenant melalui `listAuditLogsLintasDesa`.

Tidak tersedia sumber untuk record CNAME/TXT/MX, TTL, web server, response time, propagasi, paket, auto-renew, atau challenge kepemilikan domain. Bagian tersebut ditandai **Belum tersedia**, **Tidak diukur**, atau **Belum diperiksa**; tidak ada data contoh.

## File yang diperiksa

- `src/features/multi-desa/presentation/domain-console.tsx`
- `src/app/(admin)/super-admin/domain/page.tsx`
- `src/app/(admin)/super-admin/domain/tambah/page.tsx`
- `src/features/multi-desa/presentation/tambah-domain-wizard.tsx`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/multi-desa/application/pemantauan-domain-use-cases.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/domain-dns-repository.ts`
- `src/features/multi-desa/infrastructure/domain-ssl-repository.ts`
- `src/features/audit/infrastructure/audit-repository.ts`
- `src/features/audit/domain/audit.ts`
- `src/db/schema/village.ts`
- `src/db/schema/domain-dns.ts`
- `src/db/schema/domain-ssl.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/features/navigation/domain/menu-platform.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/app/globals.css`

## File yang diubah

| File | Alasan |
|---|---|
| `src/app/(admin)/super-admin/domain/[domainId]/page.tsx` | Route detail, guard, validasi id, pemuatan data dan audit |
| `src/app/(admin)/super-admin/domain/[domainId]/page.test.ts` | Test guard, data nyata, tab, 404 |
| `src/features/multi-desa/presentation/detail-domain-view.tsx` | Hero, overview, lima tab, tabel DNS/alias/riwayat |
| `src/features/multi-desa/presentation/detail-domain-network-actions.tsx` | Tombol Cek DNS/Cek SSL dan refresh setelah aksi |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.ts` | Use case detail ber-guard dan fallback cache kosong |
| `src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts` | Test detail, fallback belum diperiksa, akses ditolak |
| `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` | Query domain + desa dengan inner join |
| `src/features/multi-desa/infrastructure/domain-dns-repository.ts` | Baca cache DNS satu domain |
| `src/features/multi-desa/infrastructure/domain-ssl-repository.ts` | Baca cache TLS satu domain |
| `src/features/multi-desa/presentation/domain-console.tsx` | Aksi baris menuju detail domain |
| `src/features/navigation/domain/header-platform.ts` | Breadcrumb Detail Domain untuk id dinamis |
| `src/features/navigation/domain/menu-platform.ts` | Submenu paling spesifik untuk rute domain |
| `src/components/shell/admin-sidebar.tsx` | Menandai Daftar Domain aktif di halaman detail |
| `src/app/(admin)/super-admin/actions.ts` | Revalidasi path detail setelah cek DNS/SSL |
| `src/app/globals.css` | Layout hero, grid, tab, tabel, dan responsif |
| Test navigasi dan daftar domain | Menyesuaikan tautan detail dan submenu |

## Perubahan

1. Route baru `/super-admin/domain/[domainId]` dengan `pastikanSuperAdmin`, validasi id angka positif, `notFound()` untuk id tidak valid/domain tidak ada.
2. Query detail memakai inner join `village_domains` → `villages`; status DNS/TLS dibaca per domain, bukan seluruh cache.
3. Hero menampilkan logo/inisial, nama desa, wilayah, tenant id, kode desa, host aktif, peran domain, klasifikasi subdomain/custom dari `DESA_BASE_DOMAIN`, status tenant, dan status SSL.
4. Tab: **Informasi & Overview**, **DNS Records**, **SSL & Keamanan**, **Redirect & Alias**, **Verifikasi Domain**, **Riwayat Perubahan**.
5. Overview memuat status domain, status SSL, pratinjau identitas situs, DNS A/AAAA, ringkasan teknis, pengaturan yang tersedia/belum tersedia, dan lima audit terbaru.
6. Tombol **Cek DNS** dan **Cek SSL** memanggil Server Action lama dengan `domainId`; host tetap dibaca ulang dari database. Setelah selesai, halaman detail direvalidasi dan di-refresh.
7. Daftar domain sekarang membuka detail domain, bukan Konsol Tenant.
8. Submenu **Daftar Domain** tetap aktif pada `/super-admin/domain/<id>`, sedangkan **Tambah Domain** tetap aktif pada rute tambah.

## Security dan tenant

- Halaman dan use case memanggil `requireSuperAdmin`; test negatif memastikan data tidak dibaca saat akses ditolak.
- Parameter klien hanya `domainId`; host, tenant, DNS, TLS, alias, dan audit dibaca dari database.
- Tidak ada `villageId` dari body/query yang dijadikan bukti otorisasi.
- Relasi domain–desa memakai inner join pada `village_id`; domain tanpa desa tidak ditampilkan.
- Domain yang tidak ada menghasilkan 404, bukan pesan yang membocorkan tenant lain.
- Tidak ada perubahan pada pemeriksaan TLS; verifikasi sertifikat tidak dimatikan.
- Link website hanya dibentuk dari host yang tersimpan dan divalidasi saat pendaftaran domain.
- Tidak ada secret, kredensial, NIK, atau data pribadi dalam kode/test/laporan.

## Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** |
| Unit test fokus | `npm run test:unit -- "src/app/(admin)/super-admin/domain/[domainId]/page.test.ts" "src/app/(admin)/super-admin/domain/page.test.ts" "src/features/multi-desa/application/pemantauan-domain-use-cases.test.ts" "src/features/navigation/domain/header-platform.test.ts" "src/features/navigation/domain/menu-platform.test.ts"` | **PASS** — 40 test |
| Unit test penuh | `npm run test:unit` | **PASS** — 239 file, 2.050 test |
| Lint | `npm run lint` | **PASS** — 0 error; 2 warning lama `no-console` di `scripts/wilayah/generate-wilayah.mjs` |
| Format | `npm run format:check` | **PASS** |
| Whitespace diff | `git diff --check` | **PASS** |
| Build produksi | `npm run build` | **SKIPPED** — tidak dijalankan pada task ini |
| Visual QA ber-login | — | **SKIPPED** — sesi login Super Admin belum tersedia |
| Pemeriksaan DNS/TLS nyata | — | **SKIPPED** — aksi hanya diuji lewat unit test; tidak memindai jaringan |
| Integration test | — | **SKIPPED** — tidak ada perubahan schema/migration/database |

## Diff

Commit `dfe1712`: 18 file, 2.408 baris ditambah, 10 baris dihapus. Empat file baru: route detail, test route, komponen tampilan, dan komponen aksi jaringan.

## Risiko dan batasan

- Tampilan belum diverifikasi di browser dengan sesi login; validasi visual hanya berdasarkan struktur markup dan test render.
- Record CNAME/TXT/MX dan TTL tetap tidak tersedia; tab DNS secara eksplisit menjelaskan keterbatasan ini.
- Web server, response time, dan propagasi DNS tidak diukur; nilainya bukan data contoh.
- Verifikasi kepemilikan domain belum ada; halaman menampilkan status belum tersedia dan tidak mengklaim domain terverifikasi.
- Pengaturan redirect HTTPS, WWW, dan maintenance belum dapat diubah dari konsol ini.
- Perubahan domain utama/alias masih dilakukan dari Konsol Tenant; halaman detail saat ini bersifat baca dan pemeriksaan.
- `Pemeriksaan terakhir` memakai waktu cache DNS/TLS terbaru, bukan waktu perubahan konfigurasi domain.

## Kesimpulan

Halaman Detail Domain sudah tersedia dengan data nyata, guard platform, isolasi tenant, aksi pemeriksaan DNS/TLS, dan penandaan jujur untuk data yang belum tersedia. Implementasi siap review; belum di-merge dan belum di-deploy.
