# Inventaris Modul Appdes SID

Dokumen ini adalah inventaris route, Server Action, repository, dan use case yang
digenerate ulang dari tree `origin/main` commit `58347a6` (19 November 2026).
Ini adalah inventaris faktual, bukan daftar fitur yang dijanjikan.

- 46 halaman (`page.tsx`), 2 layout, dan 82 route handler.
- 6 berkas berisi `"use server"` (Server Action).
- 52 direktori fitur di `src/features`; 72 berkas `*-repository.ts` dan 92 berkas application/use case non-test.
- 17 halaman admin (termasuk `/beranda` dan `/super-admin/*`).

> Metode: `git ls-tree -r --name-only origin/main`; hitungan `page.tsx`,
> `route.ts`, `layout.tsx`, `src/features/*/application/*.ts` non-test, dan
> `src/features/*/infrastructure/**/*-repository.ts` non-test. Route group
> Next.js (`(admin)`, `(auth)`, `(public)`, `(warga)`) dihapus dari path;
> dynamic segment ditulis apa adanya, misalnya `[id]`.

Layout: `src/app/(admin)/layout.tsx`, `src/app/layout.tsx`.

## 1. Ringkasan per modul

| Modul | Berkas application/use case | Repository |
|---|---:|---:|
| agenda | 1 | 1 |
| analisis | 0 | 1 |
| anjungan | 2 | 1 |
| api-eksternal | 1 | 1 |
| api-publik | 1 | 0 |
| arsip | 0 | 1 |
| audit | 1 | 1 |
| auth | 1 | 2 |
| bantuan | 1 | 1 |
| buku-tamu | 0 | 1 |
| bumindes | 1 | 4 |
| dashboard | 1 | 1 |
| database | 1 | 0 |
| desa | 6 | 2 |
| gis | 1 | 1 |
| idm | 1 | 1 |
| inventaris | 2 | 1 |
| kebijakan-berkas | 0 | 0 |
| kehadiran | 1 | 1 |
| kelompok | 1 | 1 |
| keluarga | 2 | 1 |
| kesehatan | 3 | 1 |
| keuangan | 5 | 3 |
| kontak | 3 | 3 |
| konten | 0 | 0 |
| lapak | 0 | 1 |
| layanan-mandiri | 6 | 2 |
| modul | 0 | 0 |
| multi-desa | 6 | 5 |
| navigation | 4 | 2 |
| notifikasi | 3 | 2 |
| pelanggan | 1 | 1 |
| pembangunan | 1 | 1 |
| pemilihan | 0 | 0 |
| pendapat | 1 | 1 |
| penduduk | 7 | 8 |
| pengaduan | 2 | 1 |
| pengaturan | 1 | 1 |
| pengguna | 2 | 1 |
| pesan-warga | 0 | 1 |
| plugin | 1 | 1 |
| publik | 6 | 1 |
| rate-limit | 1 | 1 |
| rbac | 2 | 1 |
| rumah-tangga | 1 | 1 |
| sinergi | 1 | 1 |
| statistik | 2 | 2 |
| surat | 4 | 3 |
| survey | 1 | 1 |
| umpan-balik | 0 | 0 |
| warga | 1 | 1 |
| wilayah | 2 | 2 |

## 2. Route dan route handler

Halaman adalah UI; route handler adalah endpoint ekspor, PDF, berkas, API, atau
webhook. Route handler Admin di bawah umumnya bukan UI pengelolaan.

| Path | Jenis | Area | Berkas |
|---|---|---|---|
| `/` | Halaman | Publik | `src/app/page.tsx` |
| `/agenda` | Halaman | Publik | `src/app/agenda/page.tsx` |
| `/analisis-survei/[id]/ekspor` | Route handler | Admin | `src/app/(admin)/analisis-survei/[id]/ekspor/route.ts` |
| `/analisis-survei/[id]/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/analisis-survei/[id]/laporan/ekspor/route.ts` |
| `/api/auth/[...all]` | Route handler | API | `src/app/api/auth/[...all]/route.ts` |
| `/api/database/backup` | Route handler | API | `src/app/api/database/backup/route.ts` |
| `/api/database/restore` | Route handler | API | `src/app/api/database/restore/route.ts` |
| `/api/eksternal/openapi` | Route handler | API | `src/app/api/eksternal/openapi/route.ts` |
| `/api/eksternal/surat` | Route handler | API | `src/app/api/eksternal/surat/route.ts` |
| `/api/eksternal/surat/[token]` | Route handler | API | `src/app/api/eksternal/surat/[token]/route.ts` |
| `/api/eksternal/surat/verifikasi` | Route handler | API | `src/app/api/eksternal/surat/verifikasi/route.ts` |
| `/api/eksternal/tte/tanda-tangan` | Route handler | API | `src/app/api/eksternal/tte/tanda-tangan/route.ts` |
| `/api/penduduk/nik` | Route handler | API | `src/app/api/penduduk/nik/route.ts` |
| `/api/pengaduan/lampiran/[...path]` | Route handler | API | `src/app/api/pengaduan/lampiran/[...path]/route.ts` |
| `/api/pengaturan/api-key` | Route handler | API | `src/app/api/pengaturan/api-key/route.ts` |
| `/api/peta` | Route handler | API | `src/app/api/peta/route.ts` |
| `/api/publik/dokumen` | Route handler | API | `src/app/api/publik/dokumen/route.ts` |
| `/api/publik/informasi` | Route handler | API | `src/app/api/publik/informasi/route.ts` |
| `/api/publik/inventaris` | Route handler | API | `src/app/api/publik/inventaris/route.ts` |
| `/api/publik/kontak/komentar` | Route handler | API | `src/app/api/publik/kontak/komentar/route.ts` |
| `/api/publik/kontak/statistik` | Route handler | API | `src/app/api/publik/kontak/statistik/route.ts` |
| `/api/publik/media/[...path]` | Route handler | API | `src/app/api/publik/media/[...path]/route.ts` |
| `/api/publik/openapi` | Route handler | API | `src/app/api/publik/openapi/route.ts` |
| `/api/publik/surat` | Route handler | API | `src/app/api/publik/surat/route.ts` |
| `/api/publik/survei/[id]/respons` | Route handler | API | `src/app/api/publik/survei/[id]/respons/route.ts` |
| `/api/webhooks/email` | Route handler | API | `src/app/api/webhooks/email/route.ts` |
| `/api/wilayah` | Route handler | API | `src/app/api/wilayah/route.ts` |
| `/bantuan/ekspor` | Route handler | Admin | `src/app/(admin)/bantuan/ekspor/route.ts` |
| `/beranda` | Halaman | Admin | `src/app/(admin)/beranda/page.tsx` |
| `/berita` | Halaman | Publik | `src/app/berita/page.tsx` |
| `/berita/[slug]` | Halaman | Publik | `src/app/berita/[slug]/page.tsx` |
| `/bumindes/buku-administrasi/[id]/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/buku-administrasi/[id]/ekspor/route.ts` |
| `/bumindes/pembangunan/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/pembangunan/ekspor/route.ts` |
| `/bumindes/pembangunan/kader/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/pembangunan/kader/ekspor/route.ts` |
| `/bumindes/sekretariat/agenda/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/sekretariat/agenda/ekspor/route.ts` |
| `/bumindes/sekretariat/aparat/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/sekretariat/aparat/ekspor/route.ts` |
| `/bumindes/sekretariat/peraturan/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/sekretariat/peraturan/ekspor/route.ts` |
| `/bumindes/tanah-kas/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/tanah-kas/ekspor/route.ts` |
| `/bumindes/tanah-kas/mutasi/ekspor` | Route handler | Admin | `src/app/(admin)/bumindes/tanah-kas/mutasi/ekspor/route.ts` |
| `/data/statistik` | Halaman | Publik | `src/app/data/statistik/page.tsx` |
| `/desa/apbdes/dokumen/[id]/berkas` | Route handler | Publik | `src/app/(public)/desa/apbdes/dokumen/[id]/berkas/route.ts` |
| `/desa/idm/ekspor` | Route handler | Admin | `src/app/(admin)/desa/idm/ekspor/route.ts` |
| `/desa/inventaris/ekspor` | Route handler | Publik | `src/app/(public)/desa/inventaris/ekspor/route.ts` |
| `/desa/kesehatan/ibu-hamil/ekspor` | Route handler | Publik | `src/app/(public)/desa/kesehatan/ibu-hamil/ekspor/route.ts` |
| `/desa/kesehatan/kia/ekspor` | Route handler | Publik | `src/app/(public)/desa/kesehatan/kia/ekspor/route.ts` |
| `/desa/kesehatan/pemantauan-anak/ekspor` | Route handler | Publik | `src/app/(public)/desa/kesehatan/pemantauan-anak/ekspor/route.ts` |
| `/desa/sinergi/ekspor` | Route handler | Admin | `src/app/(admin)/desa/sinergi/ekspor/route.ts` |
| `/desa/statistik/ekspor` | Route handler | Publik | `src/app/(public)/desa/statistik/ekspor/route.ts` |
| `/dokumen` | Halaman | Publik | `src/app/dokumen/page.tsx` |
| `/galeri` | Halaman | Publik | `src/app/galeri/page.tsx` |
| `/galeri/[slug]` | Halaman | Publik | `src/app/galeri/[slug]/page.tsx` |
| `/hubung-warga/daftar-kontak/ekspor` | Route handler | Admin | `src/app/(admin)/hubung-warga/daftar-kontak/ekspor/route.ts` |
| `/inventaris/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/inventaris/laporan/ekspor/route.ts` |
| `/kehadiran/rekap/ekspor` | Route handler | Admin | `src/app/(admin)/kehadiran/rekap/ekspor/route.ts` |
| `/kelompok/ekspor` | Route handler | Admin | `src/app/(admin)/kelompok/ekspor/route.ts` |
| `/keluarga/[id]/pdf` | Route handler | Admin | `src/app/(admin)/keluarga/[id]/pdf/route.ts` |
| `/kesehatan/ibu-hamil/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/ibu-hamil/ekspor/route.ts` |
| `/kesehatan/kia/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/kia/ekspor/route.ts` |
| `/kesehatan/pemantauan-anak/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/pemantauan-anak/ekspor/route.ts` |
| `/keuangan` | Halaman | Admin | `src/app/(admin)/keuangan/page.tsx` |
| `/keuangan/anggaran/template` | Route handler | Admin | `src/app/(admin)/keuangan/anggaran/template/route.ts` |
| `/keuangan/laporan-dokumen/[id]/berkas` | Route handler | Admin | `src/app/(admin)/keuangan/laporan-dokumen/[id]/berkas/route.ts` |
| `/keuangan/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/ekspor/route.ts` |
| `/keuangan/laporan/ekspor-excel` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/ekspor-excel/route.ts` |
| `/keuangan/laporan/realisasi/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/realisasi/ekspor/route.ts` |
| `/keuangan/triwulan/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/triwulan/ekspor/route.ts` |
| `/kontak` | Halaman | Publik | `src/app/kontak/page.tsx` |
| `/konten/berita` | Halaman | Admin | `src/app/(admin)/konten/berita/page.tsx` |
| `/konten/galeri` | Halaman | Admin | `src/app/(admin)/konten/galeri/page.tsx` |
| `/layanan` | Halaman | Publik | `src/app/layanan/page.tsx` |
| `/layanan-mandiri` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/page.tsx` |
| `/layanan-mandiri/beranda` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/beranda/page.tsx` |
| `/layanan-mandiri/dokumen/[id]/berkas` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/dokumen/[id]/berkas/route.ts` |
| `/layanan-mandiri/permohonan/[id]/syarat/[syaratId]` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/permohonan/[id]/syarat/[syaratId]/route.ts` |
| `/layanan-mandiri/surat/[id]/pdf` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/surat/[id]/pdf/route.ts` |
| `/layanan-mandiri/ubah-pin` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/ubah-pin/page.tsx` |
| `/layanan/surat` | Halaman | Publik | `src/app/layanan/surat/page.tsx` |
| `/masuk` | Halaman | Auth | `src/app/(auth)/masuk/page.tsx` |
| `/masuk-admin` | Halaman | Auth | `src/app/(auth)/masuk-admin/page.tsx` |
| `/pelanggan/[id]/dokumen` | Route handler | Admin | `src/app/(admin)/pelanggan/[id]/dokumen/route.ts` |
| `/pembangunan/buku/ekspor` | Route handler | Admin | `src/app/(admin)/pembangunan/buku/ekspor/route.ts` |
| `/pemerintahan` | Halaman | Publik | `src/app/pemerintahan/page.tsx` |
| `/pendapat/ekspor` | Route handler | Admin | `src/app/(admin)/pendapat/ekspor/route.ts` |
| `/penduduk` | Halaman | Admin | `src/app/(admin)/penduduk/page.tsx` |
| `/penduduk/[id]` | Halaman | Admin | `src/app/(admin)/penduduk/[id]/page.tsx` |
| `/penduduk/dpt/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/dpt/ekspor/route.ts` |
| `/penduduk/dpt/rekap/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/dpt/rekap/ekspor/route.ts` |
| `/penduduk/dtks/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/dtks/ekspor/route.ts` |
| `/penduduk/dtks/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/dtks/laporan/ekspor/route.ts` |
| `/penduduk/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/ekspor/route.ts` |
| `/penduduk/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/laporan/ekspor/route.ts` |
| `/penduduk/riwayat/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/riwayat/ekspor/route.ts` |
| `/penduduk/suplemen/[id]/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/suplemen/[id]/ekspor/route.ts` |
| `/penduduk/suplemen/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/penduduk/suplemen/laporan/ekspor/route.ts` |
| `/pengaduan` | Halaman | Publik | `src/app/pengaduan/page.tsx` |
| `/pengaduan-admin` | Halaman | Admin | `src/app/(admin)/pengaduan-admin/page.tsx` |
| `/pengaturan/grup-akses` | Halaman | Admin | `src/app/(admin)/pengaturan/grup-akses/page.tsx` |
| `/pengaturan/pengguna` | Halaman | Admin | `src/app/(admin)/pengaturan/pengguna/page.tsx` |
| `/pengumuman` | Halaman | Publik | `src/app/pengumuman/page.tsx` |
| `/permohonan-surat/[id]/syarat/[syaratId]` | Route handler | Admin | `src/app/(admin)/permohonan-surat/[id]/syarat/[syaratId]/route.ts` |
| `/permohonan-surat/ekspor` | Route handler | Admin | `src/app/(admin)/permohonan-surat/ekspor/route.ts` |
| `/persuratan/surat` | Halaman | Admin | `src/app/(admin)/persuratan/surat/page.tsx` |
| `/persuratan/surat/[id]/pdf` | Route handler | Admin | `src/app/(admin)/persuratan/surat/[id]/pdf/route.ts` |
| `/persuratan/surat/arsip/ekspor` | Route handler | Admin | `src/app/(admin)/persuratan/surat/arsip/ekspor/route.ts` |
| `/potensi` | Halaman | Publik | `src/app/potensi/page.tsx` |
| `/profil` | Halaman | Publik | `src/app/profil/page.tsx` |
| `/profil/sejarah` | Halaman | Publik | `src/app/profil/sejarah/page.tsx` |
| `/profil/visi-misi` | Halaman | Publik | `src/app/profil/visi-misi/page.tsx` |
| `/rumah-tangga/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/rumah-tangga/laporan/ekspor/route.ts` |
| `/sejarah` | Halaman | Publik | `src/app/sejarah/page.tsx` |
| `/statistik` | Halaman | Publik | `src/app/statistik/page.tsx` |
| `/statistik/bantuan/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/bantuan/ekspor/route.ts` |
| `/statistik/bantuan/ekspor/pdf` | Route handler | Admin | `src/app/(admin)/statistik/bantuan/ekspor/pdf/route.ts` |
| `/statistik/penduduk/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/penduduk/ekspor/route.ts` |
| `/statistik/penduduk/ekspor/pdf` | Route handler | Admin | `src/app/(admin)/statistik/penduduk/ekspor/pdf/route.ts` |
| `/statistik/rentang-umur/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/rentang-umur/ekspor/route.ts` |
| `/super-admin` | Halaman | Admin | `src/app/(admin)/super-admin/page.tsx` |
| `/super-admin-login` | Halaman | Auth | `src/app/(auth)/super-admin-login/page.tsx` |
| `/super-admin/audit` | Halaman | Admin | `src/app/(admin)/super-admin/audit/page.tsx` |
| `/super-admin/audit/ekspor` | Route handler | Admin | `src/app/(admin)/super-admin/audit/ekspor/route.ts` |
| `/super-admin/domain` | Halaman | Admin | `src/app/(admin)/super-admin/domain/page.tsx` |
| `/super-admin/pengaturan` | Halaman | Admin | `src/app/(admin)/super-admin/pengaturan/page.tsx` |
| `/super-admin/pengguna` | Halaman | Admin | `src/app/(admin)/super-admin/pengguna/page.tsx` |
| `/super-admin/template` | Halaman | Admin | `src/app/(admin)/super-admin/template/page.tsx` |
| `/super-admin/tenant` | Halaman | Admin | `src/app/(admin)/super-admin/tenant/page.tsx` |
| `/transparansi/apbdes` | Halaman | Publik | `src/app/transparansi/apbdes/page.tsx` |
| `/visi-misi` | Halaman | Publik | `src/app/visi-misi/page.tsx` |
| `/wilayah` | Halaman | Publik | `src/app/wilayah/page.tsx` |

## 3. Server Action

| Berkas |
|---|
| `src/app/(admin)/pengaturan/grup-akses/actions.ts` |
| `src/app/(admin)/pengaturan/pengguna/actions.ts` |
| `src/app/(admin)/super-admin/actions.ts` |
| `src/app/(admin)/super-admin/pengguna/actions.ts` |
| `src/app/(warga)/layanan-mandiri/ubah-pin/actions.ts` |
| `src/features/keuangan/application/apbdes-import-use-cases.ts` |

## 4. Rincian use case dan repository per modul

### agenda

**Use case/application**
- `src/features/agenda/application/agenda-use-cases.ts`

**Repository**
- `src/features/agenda/infrastructure/agenda-repository.ts`

### analisis

**Use case/application**
- Tidak ada.

**Repository**
- `src/features/analisis/infrastructure/analisis-repository.ts`

### anjungan

**Use case/application**
- `src/features/anjungan/application/anjungan-use-cases.ts`
- `src/features/anjungan/application/kiosk-use-cases.ts`

**Repository**
- `src/features/anjungan/infrastructure/anjungan-repository.ts`

### api-eksternal

**Use case/application**
- `src/features/api-eksternal/application/api-key-use-cases.ts`

**Repository**
- `src/features/api-eksternal/infrastructure/api-key-repository.ts`

### api-publik

**Use case/application**
- `src/features/api-publik/application/public-api.ts`

**Repository**
- Tidak ada.

### arsip

**Use case/application**
- Tidak ada.

**Repository**
- `src/features/arsip/infrastructure/arsip-repository.ts`

### audit

**Use case/application**
- `src/features/audit/application/audit-use-cases.ts`

**Repository**
- `src/features/audit/infrastructure/audit-repository.ts`

### auth

**Use case/application**
- `src/features/auth/application/login-otp-use-cases.ts`

**Repository**
- `src/features/auth/infrastructure/auth-repository.ts`
- `src/features/auth/infrastructure/login-otp-repository.ts`

### bantuan

**Use case/application**
- `src/features/bantuan/application/use-cases.ts`

**Repository**
- `src/features/bantuan/infrastructure/bantuan-repository.ts`

### buku-tamu

**Use case/application**
- Tidak ada.

**Repository**
- `src/features/buku-tamu/infrastructure/buku-tamu-repository.ts`

### bumindes

**Use case/application**
- `src/features/bumindes/application/use-cases.ts`

**Repository**
- `src/features/bumindes/infrastructure/bumindes-repository.ts`
- `src/features/bumindes/infrastructure/pembangunan-repository.ts`
- `src/features/bumindes/infrastructure/sekretariat-repository.ts`
- `src/features/bumindes/infrastructure/tanah-kas-repository.ts`

### dashboard

**Use case/application**
- `src/features/dashboard/application/dashboard-use-cases.ts`

**Repository**
- `src/features/dashboard/infrastructure/dashboard-repository.ts`

### database

**Use case/application**
- `src/features/database/application/database-use-cases.ts`

**Repository**
- Tidak ada.

### desa

**Use case/application**
- `src/features/desa/application/get-identitas.ts`
- `src/features/desa/application/platform-host.ts`
- `src/features/desa/application/resolve-village.ts`
- `src/features/desa/application/statistik-desa.ts`
- `src/features/desa/application/statistik-publik.ts`
- `src/features/desa/application/use-cases.ts`

**Repository**
- `src/features/desa/infrastructure/desa-repository.ts`
- `src/features/desa/infrastructure/statistik-desa-repository.ts`

### gis

**Use case/application**
- `src/features/gis/application/use-cases.ts`

**Repository**
- `src/features/gis/infrastructure/gis-repository.ts`

### idm

**Use case/application**
- `src/features/idm/application/idm-use-cases.ts`

**Repository**
- `src/features/idm/infrastructure/idm-repository.ts`

### inventaris

**Use case/application**
- `src/features/inventaris/application/inventaris-publik-use-cases.ts`
- `src/features/inventaris/application/inventaris-use-cases.ts`

**Repository**
- `src/features/inventaris/infrastructure/inventaris-repository.ts`

### kebijakan-berkas

**Use case/application**
- Tidak ada.

**Repository**
- Tidak ada.

### kehadiran

**Use case/application**
- `src/features/kehadiran/application/kehadiran-use-cases.ts`

**Repository**
- `src/features/kehadiran/infrastructure/kehadiran-repository.ts`

### kelompok

**Use case/application**
- `src/features/kelompok/application/use-cases.ts`

**Repository**
- `src/features/kelompok/infrastructure/kelompok-repository.ts`

### keluarga

**Use case/application**
- `src/features/keluarga/application/catat-anggota-kk.ts`
- `src/features/keluarga/application/use-cases.ts`

**Repository**
- `src/features/keluarga/infrastructure/keluarga-repository.ts`

### kesehatan

**Use case/application**
- `src/features/kesehatan/application/ekspor-kesehatan.ts`
- `src/features/kesehatan/application/export-use-cases.ts`
- `src/features/kesehatan/application/kia-use-cases.ts`

**Repository**
- `src/features/kesehatan/infrastructure/kesehatan-repository.ts`

### keuangan

**Use case/application**
- `src/features/keuangan/application/apbdes-import-use-cases.ts`
- `src/features/keuangan/application/keuangan-use-cases.ts`
- `src/features/keuangan/application/laporan-dokumen-publik-use-cases.ts`
- `src/features/keuangan/application/laporan-dokumen-use-cases.ts`
- `src/features/keuangan/application/laporan-publik-use-cases.ts`

**Repository**
- `src/features/keuangan/infrastructure/keuangan-repository.ts`
- `src/features/keuangan/infrastructure/laporan-dokumen-repository.ts`
- `src/features/keuangan/infrastructure/sisa-lebih-repository.ts`

### kontak

**Use case/application**
- `src/features/kontak/application/kontak-use-cases.ts`
- `src/features/kontak/application/statistik-pengunjung-use-cases.ts`
- `src/features/kontak/application/use-cases.ts`

**Repository**
- `src/features/kontak/infrastructure/komentar-repository.ts`
- `src/features/kontak/infrastructure/kontak-repository.ts`
- `src/features/kontak/infrastructure/pengunjung-repository.ts`

### konten

**Use case/application**
- Tidak ada.

**Repository**
- Tidak ada.

### lapak

**Use case/application**
- Tidak ada.

**Repository**
- `src/features/lapak/infrastructure/lapak-repository.ts`

### layanan-mandiri

**Use case/application**
- `src/features/layanan-mandiri/application/admin-use-cases.ts`
- `src/features/layanan-mandiri/application/ajukan-surat.ts`
- `src/features/layanan-mandiri/application/eksternal-use-cases.ts`
- `src/features/layanan-mandiri/application/notification.ts`
- `src/features/layanan-mandiri/application/profil-warga-use-cases.ts`
- `src/features/layanan-mandiri/application/warga-use-cases.ts`

**Repository**
- `src/features/layanan-mandiri/infrastructure/dokumen-warga-repository.ts`
- `src/features/layanan-mandiri/infrastructure/layanan-mandiri-repository.ts`

### modul

**Use case/application**
- Tidak ada.

**Repository**
- Tidak ada.

### multi-desa

**Use case/application**
- `src/features/multi-desa/application/audit-platform-use-cases.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/application/lifecycle-desa-use-cases.ts`
- `src/features/multi-desa/application/pengguna-platform-use-cases.ts`
- `src/features/multi-desa/application/platform-info-use-cases.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts`

**Repository**
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts`
- `src/features/multi-desa/infrastructure/pengguna-platform-repository.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts`

### navigation

**Use case/application**
- `src/features/navigation/application/build-menu.ts`
- `src/features/navigation/application/get-menu.ts`
- `src/features/navigation/application/shortcut-use-cases.ts`
- `src/features/navigation/application/urutan-menu-use-cases.ts`

**Repository**
- `src/features/navigation/infrastructure/shortcut-repository.ts`
- `src/features/navigation/infrastructure/urutan-menu-repository.ts`

### notifikasi

**Use case/application**
- `src/features/notifikasi/application/kirim-notifikasi.ts`
- `src/features/notifikasi/application/mailbox-use-cases.ts`
- `src/features/notifikasi/application/notifikasi-use-cases.ts`

**Repository**
- `src/features/notifikasi/infrastructure/mailbox-repository.ts`
- `src/features/notifikasi/infrastructure/notifikasi-repository.ts`

### pelanggan

**Use case/application**
- `src/features/pelanggan/application/pelanggan-use-cases.ts`

**Repository**
- `src/features/pelanggan/infrastructure/pelanggan-repository.ts`

### pembangunan

**Use case/application**
- `src/features/pembangunan/application/use-cases.ts`

**Repository**
- `src/features/pembangunan/infrastructure/pembangunan-repository.ts`

### pemilihan

**Use case/application**
- Tidak ada.

**Repository**
- Tidak ada.

### pendapat

**Use case/application**
- `src/features/pendapat/application/use-cases.ts`

**Repository**
- `src/features/pendapat/infrastructure/pendapat-repository.ts`

### penduduk

**Use case/application**
- `src/features/penduduk/application/dpt-use-cases.ts`
- `src/features/penduduk/application/dtks-use-cases.ts`
- `src/features/penduduk/application/laporan-penduduk-use-cases.ts`
- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts`
- `src/features/penduduk/application/suplemen-publik-use-cases.ts`
- `src/features/penduduk/application/suplemen-use-cases.ts`
- `src/features/penduduk/application/use-cases.ts`

**Repository**
- `src/features/penduduk/infrastructure/dpt-repository.ts`
- `src/features/penduduk/infrastructure/dtks-repository.ts`
- `src/features/penduduk/infrastructure/laporan-penduduk-repository.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/features/penduduk/infrastructure/reference-repository.ts`
- `src/features/penduduk/infrastructure/riwayat-penduduk-repository.ts`
- `src/features/penduduk/infrastructure/suplemen-publik-repository.ts`
- `src/features/penduduk/infrastructure/suplemen-repository.ts`

### pengaduan

**Use case/application**
- `src/features/pengaduan/application/notification.ts`
- `src/features/pengaduan/application/use-cases.ts`

**Repository**
- `src/features/pengaduan/infrastructure/pengaduan-repository.ts`

### pengaturan

**Use case/application**
- `src/features/pengaturan/application/pengaturan-use-cases.ts`

**Repository**
- `src/features/pengaturan/infrastructure/pengaturan-repository.ts`

### pengguna

**Use case/application**
- `src/features/pengguna/application/pengguna-admin.ts`
- `src/features/pengguna/application/pengguna-use-cases.ts`

**Repository**
- `src/features/pengguna/infrastructure/pengguna-repository.ts`

### pesan-warga

**Use case/application**
- Tidak ada.

**Repository**
- `src/features/pesan-warga/infrastructure/pesan-warga-repository.ts`

### plugin

**Use case/application**
- `src/features/plugin/application/plugin-use-cases.ts`

**Repository**
- `src/features/plugin/infrastructure/plugin-repository.ts`

### publik

**Use case/application**
- `src/features/publik/application/dokumen-publik.ts`
- `src/features/publik/application/konten-admin.ts`
- `src/features/publik/application/konten-publik.ts`
- `src/features/publik/application/media-publik.ts`
- `src/features/publik/application/nav-publik.ts`
- `src/features/publik/application/simpan-berkas-media.ts`

**Repository**
- `src/features/publik/infrastructure/content-repository.ts`

### rate-limit

**Use case/application**
- `src/features/rate-limit/application/rate-limit.ts`

**Repository**
- `src/features/rate-limit/infrastructure/rate-limit-repository.ts`

### rbac

**Use case/application**
- `src/features/rbac/application/authorization.ts`
- `src/features/rbac/application/grup-use-cases.ts`

**Repository**
- `src/features/rbac/infrastructure/rbac-repository.ts`

### rumah-tangga

**Use case/application**
- `src/features/rumah-tangga/application/use-cases.ts`

**Repository**
- `src/features/rumah-tangga/infrastructure/rumah-tangga-repository.ts`

### sinergi

**Use case/application**
- `src/features/sinergi/application/sinergi-use-cases.ts`

**Repository**
- `src/features/sinergi/infrastructure/sinergi-repository.ts`

### statistik

**Use case/application**
- `src/features/statistik/application/rentang-umur-use-cases.ts`
- `src/features/statistik/application/statistik-use-cases.ts`

**Repository**
- `src/features/statistik/infrastructure/rentang-umur-repository.ts`
- `src/features/statistik/infrastructure/statistik-repository.ts`

### surat

**Use case/application**
- `src/features/surat/application/surat-publik-use-cases.ts`
- `src/features/surat/application/surat-use-cases.ts`
- `src/features/surat/application/tte-use-cases.ts`
- `src/features/surat/application/verifikasi-publik.ts`

**Repository**
- `src/features/surat/infrastructure/master-repository.ts`
- `src/features/surat/infrastructure/surat-repository.ts`
- `src/features/surat/infrastructure/tte-repository.ts`

### survey

**Use case/application**
- `src/features/survey/application/use-cases.ts`

**Repository**
- `src/features/survey/infrastructure/survey-repository.ts`

### umpan-balik

**Use case/application**
- Tidak ada.

**Repository**
- Tidak ada.

### warga

**Use case/application**
- `src/features/warga/application/ubah-pin-use-case.ts`

**Repository**
- `src/features/warga/infrastructure/warga-repository.ts`

### wilayah

**Use case/application**
- `src/features/wilayah/application/data-wilayah.ts`
- `src/features/wilayah/application/wilayah-publik.ts`

**Repository**
- `src/features/wilayah/infrastructure/data-wilayah-repository.ts`
- `src/features/wilayah/infrastructure/wilayah-repository.ts`

## 5. Batasan

- Inventaris mencakup berkas di `src/features/*/application`; beberapa berkas di
  sana adalah helper/notifikasi, bukan use case tunggal.
- Route handler di `src/app/api` tercatat sebagai route, bukan Server Action.
- Halaman yang memakai data langsung dari repository tanpa lapisan application
  tetap tercatat route-nya, tetapi tidak menambah daftar use case.
- Inventaris tidak menilai kualitas, cakupan test, atau status fitur. Untuk
  status fitur lihat `docs/SID_FEATURE_MAP.md`.
- Angka mengikuti ref yang digenerate; jalankan `npm run docs:inventory`
  setelah route atau modul bertambah.
