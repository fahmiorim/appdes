# Super Admin — dashboard dan konsol tenant dari data nyata

- **Task:** membangun fase pertama konsol Super Admin sesuai mockup `docs/mockups/platform/super-admin/`.
- **Tanggal:** 20 November 2026
- **Branch:** `task/super-admin-mockup-phase-1`
- **Base commit:** `0b18f43` (merge PR #174)
- **Commit implementasi:** `61f562a`

## 1. Tujuan

Mendekatkan dashboard dan konsol tenant Super Admin ke mockup tanpa memakai
angka, paket, atau status contoh. Fokus fase ini adalah data yang sudah dimiliki
platform: tenant, domain, pengguna, penduduk, kecamatan, tema publik aktif, dan
kuota media.

## 2. Kondisi awal dan analisis

- Dashboard hanya menampilkan lima KPI, tren pertumbuhan, tenant terbaru,
  perhatian, dan audit. Ringkasan tema dan sebaran kecamatan belum ada.
- `DesaSuperAdminRow` sudah membawa slug tema, tetapi belum membawa nama/versi
  tema maupun kecamatan.
- Konsol tenant sudah memiliki pencarian, filter status, kolom pengguna,
  penduduk, jenis surat, dan retensi. Belum ada filter kecamatan/tema, kolom
  tema/kuota, atau pagination.
- Mockup menampilkan total Storage, paket, status ditangguhkan, dan monitoring
  infrastruktur. Field tersebut belum memiliki model data; tidak dibuat atau
  dikarang pada fase ini.
- Mockup memakai angka contoh (312 tenant, 1.842 pengguna, dan seterusnya).
  Semua angka pada implementasi dihitung dari query yang sudah dibatasi peran
  platform.

## 3. File yang diperiksa

- `docs/mockups/platform/super-admin/FlexiDesa Super Admin Dashboard.png`
- `docs/mockups/platform/super-admin/Manajemen Tenant/FlexiDesa.id Tenant Management Dashboard.png`
- `docs/mockups/platform/super-admin/Pengguna & Peran/FlexiDesa User Management Dashboard.png`
- `src/app/(admin)/super-admin/page.tsx`
- `src/app/(admin)/super-admin/tenant/page.tsx`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/domain/tren-tenant.ts`
- `src/db/schema/village.ts`, `src/db/schema/theme.ts`
- `src/app/(admin)/super-admin/page.test.ts`,
  `src/app/(admin)/super-admin/tenant/page.test.ts`
- `docs/reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md`,
  `docs/reports/05-ui-audit/MOCKUP-SCHEMA-DELTA-2026-11-20.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/domain/ringkasan-platform.ts` | Agregasi murni distribusi tema dan kecamatan |
| `src/features/multi-desa/domain/ringkasan-platform.test.ts` | Test pengelompokan, persentase, data kosong, dan batas tampilan |
| `src/features/multi-desa/infrastructure/provisioning-repository.ts` | Menambah `district`, `temaNama`, dan `temaVersi` pada query tenant platform |
| `src/app/(admin)/super-admin/page.tsx` | KPI total pengguna, ringkasan/popularitas tema, dan distribusi kecamatan |
| `src/features/multi-desa/presentation/platform-ui.tsx` | Komponen donat distribusi dan daftar bilah horizontal |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Filter kecamatan/tema, kolom kecamatan/tema/kuota, dan pagination |
| `src/app/globals.css` | Gaya panel distribusi, donat, bilah, filter, dan pagination |
| `src/app/(admin)/super-admin/page.test.ts` | Fixture field baru dan assertion KPI/panel |
| `src/app/(admin)/super-admin/tenant/page.test.ts` | Fixture field baru, assertion kolom, dan pagination |

Tidak ada perubahan schema, migration, dependency, konfigurasi deployment, atau
data database.

## 5. Perubahan

### Dashboard

- KPI **Total pengguna** menjumlahkan pengguna desa dan akun platform; catatan
  KPI memisahkan kedua asal angka.
- Panel **Ringkasan tema publik** menampilkan jumlah slug tema yang dipakai,
  jumlah desa bertema, persentase cakupan, dan desa yang belum memilih tema.
- Panel **Tema paling populer** menampilkan donat lima tema teratas, jumlah desa,
  persentase, serta segmen abu-abu untuk desa tanpa tema.
- Panel **Distribusi tenant per kecamatan** menampilkan lima kecamatan teratas,
  persentase, kelompok “Kecamatan lain”, dan jumlah desa yang belum mengisi
  kecamatan.
- Seluruh panel tetap menyediakan keadaan kosong yang jelas, bukan angka palsu.

### Konsol tenant

- Kolom baru: kecamatan, tema (nama, slug, versi), dan kuota media.
- Pencarian mencakup nama, kode, domain, slug, kecamatan, dan tema.
- Filter kecamatan dan tema, termasuk pilihan “Belum diisi”/“Belum memilih tema”.
- Pagination sisi klien 10/25/50 baris, nomor halaman ringkas, dan informasi
  rentang baris. Filter atau pencarian baru mengembalikan tampilan ke halaman 1.
- Kolom “Jenis surat” diganti kolom yang diminta mockup; data jenis surat tetap
  tersedia pada dashboard dan tidak dihapus dari query.

## 6. Security dan tenant

- Halaman tetap memanggil `pastikanSuperAdmin()` sebelum memuat data.
- `listDesaSuperAdmin()` tidak menerima `villageId` dari klien; daftar tenant
  adalah operasi platform yang sudah dijaga use case Super Admin.
- Filter dan pagination tenant hanya mempersempit data yang sudah dimuat server;
  tidak ada query baru yang menerima ID tenant dari body/query.
- Nama tema, versi, dan kecamatan adalah metadata profil tenant yang memang
  ditampilkan pada konsol platform; tidak ada NIK, dokumen, atau data pribadi
  penduduk yang ditambahkan.
- Tidak ada secret, token, atau kredensial pada kode, fixture, maupun laporan.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts" "src/app/(admin)/super-admin/tenant/page.test.ts" src/features/multi-desa/domain/ringkasan-platform.test.ts` | PASS — 3 file, 17 test |
| `npm test` | PASS — 232 file, 2.005 test |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 error, 2 warning lama di `scripts/wilayah/generate-wilayah.mjs` |
| `npm run format:check` | PASS — seluruh file sesuai Prettier |
| `npx prettier --check src/features/multi-desa/presentation/tenant-console.tsx` | PASS setelah perubahan terakhir |
| `git diff --check` | PASS — tidak ada whitespace error |

Pemeriksaan visual di browser: **SKIPPED**. Tidak ada sesi Super Admin dengan
data tenant yang disiapkan pada task ini, sehingga kecocokan visual belum
diverifikasi lewat tangkapan layar.

## 8. Risiko dan batasan

- Pagination dan filter tenant berjalan di klien; seluruh baris tenant tetap
  dimuat dari server. Untuk ratusan tenant, langkah berikutnya adalah pagination
  dan filter server-side.
- Query nama/versi tema memakai subquery scalar dengan asumsi satu tema aktif per
  desa, sesuai kontrak aplikasi. Bila ada data lama dengan beberapa baris aktif,
  kolom tema dapat berasal dari baris yang berbeda.
- Belum ada model data untuk paket langganan, status ditangguhkan, pemakaian
  storage, billing, dan monitoring infrastruktur. Panel mockup untuk area itu
  sengaja belum dibuat.
- Filter kecamatan/tema belum disimpan pada URL, berbeda dari filter status.
- Dashboard belum menampilkan aktivitas perubahan tema karena audit event tema
  tidak termasuk dalam cakupan task ini.

## 9. Kesimpulan

Fase pertama dashboard dan konsol tenant sudah memakai data nyata dan mengikuti
struktur informasi utama mockup tanpa melanggar model data yang ada. Langkah
berikutnya: visual QA dengan data seed tenant, lalu pindahkan filter/pagination
tenant ke server bila jumlah tenant bertambah besar.
