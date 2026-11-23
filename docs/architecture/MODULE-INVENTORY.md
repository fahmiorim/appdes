# Inventaris Modul Appdes SID

Dokumen ini adalah inventaris route, Server Action, repository, dan use case yang
digenerate ulang dari tree `origin/main` commit `2c86ec48` (23 November 2026).
Ini adalah inventaris faktual, bukan daftar fitur yang dijanjikan.

- 149 halaman (`page.tsx`), 3 layout, dan 115 route handler.
- 34 berkas berisi `"use server"` (Server Action).
- 57 direktori fitur di `src/features`; 89 berkas `*-repository.ts` dan 113 berkas application/use case non-test.
- 102 halaman di route group `(admin)`: 89 halaman non-super-admin dan 13 halaman `/super-admin` (tujuh area menu).
- `RUTE_ADMIN_TERSEDIA` berisi 65 entri.

> Metode: `git ls-tree -r --name-only origin/main`; hitungan `page.tsx`,
> `route.ts`, `layout.tsx`, `src/features/*/application/*.ts` non-test, dan
> `src/features/*/infrastructure/**/*-repository.ts` non-test. Route group
> Next.js (`(admin)`, `(auth)`, `(public)`, `(warga)`) dihapus dari path;
> dynamic segment ditulis apa adanya, misalnya `[id]`.

Layout: `src/app/(admin)/layout.tsx`, `src/app/layout.tsx`, `src/app/public-site-layout.tsx`.

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
| desa | 7 | 3 |
| gis | 1 | 1 |
| idm | 1 | 1 |
| inventaris | 2 | 1 |
| kebijakan-berkas | 0 | 0 |
| kehadiran | 1 | 1 |
| kelompok | 1 | 1 |
| keluarga | 2 | 1 |
| kepegawaian | 1 | 1 |
| kesehatan | 3 | 1 |
| keuangan | 6 | 4 |
| kontak | 3 | 3 |
| konten | 0 | 0 |
| lapak | 0 | 1 |
| laporan-statistik | 2 | 1 |
| layanan-mandiri | 6 | 2 |
| modul | 0 | 0 |
| multi-desa | 8 | 8 |
| navigation | 4 | 2 |
| notifikasi | 3 | 2 |
| pelanggan | 1 | 1 |
| pelayanan | 4 | 3 |
| pembangunan | 1 | 1 |
| pemerintahan | 2 | 1 |
| pemilihan | 0 | 0 |
| pendapat | 1 | 1 |
| penduduk | 7 | 8 |
| pengaduan | 2 | 1 |
| pengaturan | 2 | 2 |
| pengguna | 2 | 2 |
| pesan-warga | 0 | 1 |
| plugin | 1 | 1 |
| publik | 8 | 2 |
| rate-limit | 1 | 1 |
| rbac | 2 | 1 |
| registrasi-warga | 1 | 1 |
| rumah-tangga | 1 | 1 |
| sinergi | 1 | 1 |
| statistik | 2 | 2 |
| surat | 7 | 5 |
| survey | 1 | 1 |
| umpan-balik | 0 | 0 |
| warga | 1 | 1 |
| wilayah | 3 | 2 |

## 2. Route dan route handler

Halaman adalah UI; route handler adalah endpoint ekspor, PDF, berkas, API, atau
webhook. Route handler Admin di bawah umumnya bukan UI pengelolaan.

| Path | Jenis | Area | Berkas |
|---|---|---|---|
| `/` | Halaman | Publik | `src/app/page.tsx` |
| `/absensi-kepegawaian` | Halaman | Admin | `src/app/(admin)/absensi-kepegawaian/page.tsx` |
| `/absensi-kepegawaian/absensi` | Halaman | Admin | `src/app/(admin)/absensi-kepegawaian/absensi/page.tsx` |
| `/absensi-kepegawaian/absensi/ekspor` | Route handler | Admin | `src/app/(admin)/absensi-kepegawaian/absensi/ekspor/route.ts` |
| `/absensi-kepegawaian/absensi/ekspor-bulanan` | Route handler | Admin | `src/app/(admin)/absensi-kepegawaian/absensi/ekspor-bulanan/route.ts` |
| `/absensi-kepegawaian/absensi/ekspor-pdf` | Route handler | Admin | `src/app/(admin)/absensi-kepegawaian/absensi/ekspor-pdf/route.ts` |
| `/absensi-kepegawaian/absensi/ekspor-xlsx` | Route handler | Admin | `src/app/(admin)/absensi-kepegawaian/absensi/ekspor-xlsx/route.ts` |
| `/absensi-kepegawaian/cuti-izin` | Halaman | Admin | `src/app/(admin)/absensi-kepegawaian/cuti-izin/page.tsx` |
| `/absensi-kepegawaian/pegawai` | Halaman | Admin | `src/app/(admin)/absensi-kepegawaian/pegawai/page.tsx` |
| `/agenda` | Halaman | Publik | `src/app/agenda/page.tsx` |
| `/agenda/[id]` | Halaman | Publik | `src/app/agenda/[id]/page.tsx` |
| `/analisis-survei/[id]/ekspor` | Route handler | Admin | `src/app/(admin)/analisis-survei/[id]/ekspor/route.ts` |
| `/analisis-survei/[id]/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/analisis-survei/[id]/laporan/ekspor/route.ts` |
| `/api/admin/pelayanan-publik/pengajuan/[id]/berkas/[berkasId]` | Route handler | API | `src/app/api/admin/pelayanan-publik/pengajuan/[id]/berkas/[berkasId]/route.ts` |
| `/api/admin/pelayanan-publik/pengajuan/[id]/lampiran` | Route handler | API | `src/app/api/admin/pelayanan-publik/pengajuan/[id]/lampiran/route.ts` |
| `/api/admin/persuratan/surat-dinas/[id]/lampiran` | Route handler | API | `src/app/api/admin/persuratan/surat-dinas/[id]/lampiran/route.ts` |
| `/api/auth/[...all]` | Route handler | API | `src/app/api/auth/[...all]/route.ts` |
| `/api/database/backup` | Route handler | API | `src/app/api/database/backup/route.ts` |
| `/api/database/restore` | Route handler | API | `src/app/api/database/restore/route.ts` |
| `/api/eksternal/openapi` | Route handler | API | `src/app/api/eksternal/openapi/route.ts` |
| `/api/eksternal/surat` | Route handler | API | `src/app/api/eksternal/surat/route.ts` |
| `/api/eksternal/surat/[token]` | Route handler | API | `src/app/api/eksternal/surat/[token]/route.ts` |
| `/api/eksternal/surat/verifikasi` | Route handler | API | `src/app/api/eksternal/surat/verifikasi/route.ts` |
| `/api/eksternal/tte/tanda-tangan` | Route handler | API | `src/app/api/eksternal/tte/tanda-tangan/route.ts` |
| `/api/kehadiran/foto/[id]` | Route handler | API | `src/app/api/kehadiran/foto/[id]/route.ts` |
| `/api/kepegawaian/cuti/[id]/lampiran` | Route handler | API | `src/app/api/kepegawaian/cuti/[id]/lampiran/route.ts` |
| `/api/kepegawaian/dokumen/[id]` | Route handler | API | `src/app/api/kepegawaian/dokumen/[id]/route.ts` |
| `/api/laporan-statistik/ekspor` | Route handler | API | `src/app/api/laporan-statistik/ekspor/route.ts` |
| `/api/laporan-statistik/template` | Route handler | API | `src/app/api/laporan-statistik/template/route.ts` |
| `/api/laporan-statistik/tersimpan` | Route handler | API | `src/app/api/laporan-statistik/tersimpan/route.ts` |
| `/api/laporan-statistik/tersimpan/[id]/ekspor` | Route handler | API | `src/app/api/laporan-statistik/tersimpan/[id]/ekspor/route.ts` |
| `/api/pemerintahan/dokumen/[id]` | Route handler | API | `src/app/api/pemerintahan/dokumen/[id]/route.ts` |
| `/api/penduduk/nik` | Route handler | API | `src/app/api/penduduk/nik/route.ts` |
| `/api/pengaduan/lampiran/[...path]` | Route handler | API | `src/app/api/pengaduan/lampiran/[...path]/route.ts` |
| `/api/pengaturan-desa` | Route handler | API | `src/app/api/pengaturan-desa/route.ts` |
| `/api/pengaturan-desa/backup` | Route handler | API | `src/app/api/pengaturan-desa/backup/route.ts` |
| `/api/pengaturan-desa/layanan` | Route handler | API | `src/app/api/pengaturan-desa/layanan/route.ts` |
| `/api/pengaturan-desa/media` | Route handler | API | `src/app/api/pengaturan-desa/media/route.ts` |
| `/api/pengaturan-desa/tte` | Route handler | API | `src/app/api/pengaturan-desa/tte/route.ts` |
| `/api/pengaturan/api-key` | Route handler | API | `src/app/api/pengaturan/api-key/route.ts` |
| `/api/pengaturan/pengguna/aktivitas/ekspor` | Route handler | API | `src/app/api/pengaturan/pengguna/aktivitas/ekspor/route.ts` |
| `/api/peta` | Route handler | API | `src/app/api/peta/route.ts` |
| `/api/publik/berita/[slug]/komentar` | Route handler | API | `src/app/api/publik/berita/[slug]/komentar/route.ts` |
| `/api/publik/dokumen` | Route handler | API | `src/app/api/publik/dokumen/route.ts` |
| `/api/publik/favicon` | Route handler | API | `src/app/api/publik/favicon/route.ts` |
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
| `/daftar` | Halaman | Auth | `src/app/(auth)/daftar/page.tsx` |
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
| `/halaman/[slug]` | Halaman | Publik | `src/app/halaman/[slug]/page.tsx` |
| `/hubung-warga/daftar-kontak/ekspor` | Route handler | Admin | `src/app/(admin)/hubung-warga/daftar-kontak/ekspor/route.ts` |
| `/informasi` | Halaman | Publik | `src/app/informasi/page.tsx` |
| `/inventaris` | Halaman | Admin | `src/app/(admin)/inventaris/page.tsx` |
| `/inventaris/[id]` | Halaman | Admin | `src/app/(admin)/inventaris/[id]/page.tsx` |
| `/inventaris/dashboard` | Halaman | Admin | `src/app/(admin)/inventaris/dashboard/page.tsx` |
| `/inventaris/dokumen/[id]` | Route handler | Admin | `src/app/(admin)/inventaris/dokumen/[id]/route.ts` |
| `/inventaris/laporan` | Halaman | Admin | `src/app/(admin)/inventaris/laporan/page.tsx` |
| `/inventaris/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/inventaris/laporan/ekspor/route.ts` |
| `/inventaris/mutasi` | Halaman | Admin | `src/app/(admin)/inventaris/mutasi/page.tsx` |
| `/inventaris/pengelolaan` | Halaman | Admin | `src/app/(admin)/inventaris/pengelolaan/page.tsx` |
| `/kehadiran/rekap/ekspor` | Route handler | Admin | `src/app/(admin)/kehadiran/rekap/ekspor/route.ts` |
| `/kelompok/ekspor` | Route handler | Admin | `src/app/(admin)/kelompok/ekspor/route.ts` |
| `/keluarga` | Halaman | Admin | `src/app/(admin)/keluarga/page.tsx` |
| `/keluarga/[id]` | Halaman | Admin | `src/app/(admin)/keluarga/[id]/page.tsx` |
| `/keluarga/[id]/pdf` | Route handler | Admin | `src/app/(admin)/keluarga/[id]/pdf/route.ts` |
| `/keluarga/[id]/ubah` | Halaman | Admin | `src/app/(admin)/keluarga/[id]/ubah/page.tsx` |
| `/keluarga/baru` | Halaman | Admin | `src/app/(admin)/keluarga/baru/page.tsx` |
| `/keluarga/ekspor` | Route handler | Admin | `src/app/(admin)/keluarga/ekspor/route.ts` |
| `/kesehatan/ibu-hamil/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/ibu-hamil/ekspor/route.ts` |
| `/kesehatan/kia/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/kia/ekspor/route.ts` |
| `/kesehatan/pemantauan-anak/ekspor` | Route handler | Admin | `src/app/(admin)/kesehatan/pemantauan-anak/ekspor/route.ts` |
| `/keuangan` | Halaman | Admin | `src/app/(admin)/keuangan/page.tsx` |
| `/keuangan/anggaran/template` | Route handler | Admin | `src/app/(admin)/keuangan/anggaran/template/route.ts` |
| `/keuangan/apbdes` | Halaman | Admin | `src/app/(admin)/keuangan/apbdes/page.tsx` |
| `/keuangan/dokumen` | Halaman | Admin | `src/app/(admin)/keuangan/dokumen/page.tsx` |
| `/keuangan/kegiatan` | Halaman | Admin | `src/app/(admin)/keuangan/kegiatan/page.tsx` |
| `/keuangan/kegiatan/[id]` | Halaman | Admin | `src/app/(admin)/keuangan/kegiatan/[id]/page.tsx` |
| `/keuangan/laporan` | Halaman | Admin | `src/app/(admin)/keuangan/laporan/page.tsx` |
| `/keuangan/laporan-dokumen/[id]/berkas` | Route handler | Admin | `src/app/(admin)/keuangan/laporan-dokumen/[id]/berkas/route.ts` |
| `/keuangan/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/ekspor/route.ts` |
| `/keuangan/laporan/ekspor-excel` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/ekspor-excel/route.ts` |
| `/keuangan/laporan/realisasi/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/laporan/realisasi/ekspor/route.ts` |
| `/keuangan/realisasi` | Halaman | Admin | `src/app/(admin)/keuangan/realisasi/page.tsx` |
| `/keuangan/triwulan/ekspor` | Route handler | Admin | `src/app/(admin)/keuangan/triwulan/ekspor/route.ts` |
| `/kontak` | Halaman | Publik | `src/app/kontak/page.tsx` |
| `/konten/berita` | Halaman | Admin | `src/app/(admin)/konten/berita/page.tsx` |
| `/konten/galeri` | Halaman | Admin | `src/app/(admin)/konten/galeri/page.tsx` |
| `/konten/potensi` | Halaman | Admin | `src/app/(admin)/konten/potensi/page.tsx` |
| `/laporan-statistik` | Halaman | Admin | `src/app/(admin)/laporan-statistik/page.tsx` |
| `/laporan-statistik/laporan-desa` | Halaman | Admin | `src/app/(admin)/laporan-statistik/laporan-desa/page.tsx` |
| `/laporan-statistik/laporan-desa/tersimpan/[id]` | Halaman | Admin | `src/app/(admin)/laporan-statistik/laporan-desa/tersimpan/[id]/page.tsx` |
| `/laporan-statistik/rekap-analisis` | Halaman | Admin | `src/app/(admin)/laporan-statistik/rekap-analisis/page.tsx` |
| `/laporan-statistik/statistik-desa` | Halaman | Admin | `src/app/(admin)/laporan-statistik/statistik-desa/page.tsx` |
| `/layanan` | Halaman | Publik | `src/app/layanan/page.tsx` |
| `/layanan-mandiri` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/page.tsx` |
| `/layanan-mandiri/beranda` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/beranda/page.tsx` |
| `/layanan-mandiri/dokumen/[id]/berkas` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/dokumen/[id]/berkas/route.ts` |
| `/layanan-mandiri/pengajuan/[id]` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/pengajuan/[id]/page.tsx` |
| `/layanan-mandiri/pengajuan/[id]/berkas/[berkasId]` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/pengajuan/[id]/berkas/[berkasId]/route.ts` |
| `/layanan-mandiri/pengajuan/[id]/hasil/[berkasId]` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/pengajuan/[id]/hasil/[berkasId]/route.ts` |
| `/layanan-mandiri/pengajuan/[id]/lampiran` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/pengajuan/[id]/lampiran/route.ts` |
| `/layanan-mandiri/pengajuan/baru` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/pengajuan/baru/page.tsx` |
| `/layanan-mandiri/permohonan/[id]/syarat/[syaratId]` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/permohonan/[id]/syarat/[syaratId]/route.ts` |
| `/layanan-mandiri/surat/[id]/pdf` | Route handler | Warga | `src/app/(warga)/layanan-mandiri/surat/[id]/pdf/route.ts` |
| `/layanan-mandiri/survei` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/survei/page.tsx` |
| `/layanan-mandiri/survei/[id]` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/survei/[id]/page.tsx` |
| `/layanan-mandiri/ubah-pin` | Halaman | Warga | `src/app/(warga)/layanan-mandiri/ubah-pin/page.tsx` |
| `/layanan/surat` | Halaman | Publik | `src/app/layanan/surat/page.tsx` |
| `/masuk` | Halaman | Auth | `src/app/(auth)/masuk/page.tsx` |
| `/masuk-admin` | Halaman | Auth | `src/app/(auth)/masuk-admin/page.tsx` |
| `/mutasi-penduduk` | Halaman | Admin | `src/app/(admin)/mutasi-penduduk/page.tsx` |
| `/mutasi-penduduk/baru` | Halaman | Admin | `src/app/(admin)/mutasi-penduduk/baru/page.tsx` |
| `/mutasi-penduduk/ekspor` | Route handler | Admin | `src/app/(admin)/mutasi-penduduk/ekspor/route.ts` |
| `/pelanggan/[id]/dokumen` | Route handler | Admin | `src/app/(admin)/pelanggan/[id]/dokumen/route.ts` |
| `/pelayanan-publik` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/page.tsx` |
| `/pelayanan-publik/layanan` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/layanan/page.tsx` |
| `/pelayanan-publik/layanan/[id]` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/layanan/[id]/page.tsx` |
| `/pelayanan-publik/layanan/[id]/edit` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/layanan/[id]/edit/page.tsx` |
| `/pelayanan-publik/layanan/baru` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/layanan/baru/page.tsx` |
| `/pelayanan-publik/pengajuan` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/pengajuan/page.tsx` |
| `/pelayanan-publik/pengajuan/[id]` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/pengajuan/[id]/page.tsx` |
| `/pelayanan-publik/pengajuan/ekspor` | Route handler | Admin | `src/app/(admin)/pelayanan-publik/pengajuan/ekspor/route.ts` |
| `/pelayanan-publik/survei` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/survei/page.tsx` |
| `/pelayanan-publik/survei/[id]` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/survei/[id]/page.tsx` |
| `/pelayanan-publik/survei/[id]/edit` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/survei/[id]/edit/page.tsx` |
| `/pelayanan-publik/survei/[id]/hasil` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/survei/[id]/hasil/page.tsx` |
| `/pelayanan-publik/survei/[id]/hasil/ekspor` | Route handler | Admin | `src/app/(admin)/pelayanan-publik/survei/[id]/hasil/ekspor/route.ts` |
| `/pelayanan-publik/survei/baru` | Halaman | Admin | `src/app/(admin)/pelayanan-publik/survei/baru/page.tsx` |
| `/pembangunan` | Halaman | Publik | `src/app/pembangunan/page.tsx` |
| `/pembangunan/[slug]` | Halaman | Publik | `src/app/pembangunan/[slug]/page.tsx` |
| `/pembangunan/buku/ekspor` | Route handler | Admin | `src/app/(admin)/pembangunan/buku/ekspor/route.ts` |
| `/pemerintahan` | Halaman | Publik | `src/app/pemerintahan/page.tsx` |
| `/pemerintahan-desa` | Halaman | Admin | `src/app/(admin)/pemerintahan-desa/page.tsx` |
| `/pemerintahan-desa/lembaga` | Halaman | Admin | `src/app/(admin)/pemerintahan-desa/lembaga/page.tsx` |
| `/pemerintahan-desa/perangkat` | Halaman | Admin | `src/app/(admin)/pemerintahan-desa/perangkat/page.tsx` |
| `/pemerintahan-desa/wilayah` | Halaman | Admin | `src/app/(admin)/pemerintahan-desa/wilayah/page.tsx` |
| `/pendapat/ekspor` | Route handler | Admin | `src/app/(admin)/pendapat/ekspor/route.ts` |
| `/penduduk` | Halaman | Admin | `src/app/(admin)/penduduk/page.tsx` |
| `/penduduk/[id]` | Halaman | Admin | `src/app/(admin)/penduduk/[id]/page.tsx` |
| `/penduduk/[id]/ubah` | Halaman | Admin | `src/app/(admin)/penduduk/[id]/ubah/page.tsx` |
| `/penduduk/baru` | Halaman | Admin | `src/app/(admin)/penduduk/baru/page.tsx` |
| `/penduduk/dashboard` | Halaman | Admin | `src/app/(admin)/penduduk/dashboard/page.tsx` |
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
| `/pengaduan-admin/[id]` | Halaman | Admin | `src/app/(admin)/pengaduan-admin/[id]/page.tsx` |
| `/pengaduan-admin/[id]/lampiran` | Route handler | Admin | `src/app/(admin)/pengaduan-admin/[id]/lampiran/route.ts` |
| `/pengaduan/baru` | Halaman | Publik | `src/app/pengaduan/baru/page.tsx` |
| `/pengaduan/berhasil` | Halaman | Publik | `src/app/pengaduan/berhasil/page.tsx` |
| `/pengaduan/lacak` | Halaman | Publik | `src/app/pengaduan/lacak/page.tsx` |
| `/pengaturan-desa` | Halaman | Admin | `src/app/(admin)/pengaturan-desa/page.tsx` |
| `/pengaturan/grup-akses` | Halaman | Admin | `src/app/(admin)/pengaturan/grup-akses/page.tsx` |
| `/pengaturan/pengguna` | Halaman | Admin | `src/app/(admin)/pengaturan/pengguna/page.tsx` |
| `/pengaturan/pengguna/aktivitas` | Halaman | Admin | `src/app/(admin)/pengaturan/pengguna/aktivitas/page.tsx` |
| `/pengaturan/pengguna/keamanan` | Halaman | Admin | `src/app/(admin)/pengaturan/pengguna/keamanan/page.tsx` |
| `/pengaturan/pengguna/pendaftaran` | Halaman | Admin | `src/app/(admin)/pengaturan/pengguna/pendaftaran/page.tsx` |
| `/pengumuman` | Halaman | Publik | `src/app/pengumuman/page.tsx` |
| `/pengumuman/[slug]` | Halaman | Publik | `src/app/pengumuman/[slug]/page.tsx` |
| `/perangkat/[id]` | Halaman | Publik | `src/app/perangkat/[id]/page.tsx` |
| `/permohonan-surat` | Halaman | Admin | `src/app/(admin)/permohonan-surat/page.tsx` |
| `/permohonan-surat/[id]` | Halaman | Admin | `src/app/(admin)/permohonan-surat/[id]/page.tsx` |
| `/permohonan-surat/[id]/syarat/[syaratId]` | Route handler | Admin | `src/app/(admin)/permohonan-surat/[id]/syarat/[syaratId]/route.ts` |
| `/permohonan-surat/ekspor` | Route handler | Admin | `src/app/(admin)/permohonan-surat/ekspor/route.ts` |
| `/persuratan/arsip` | Halaman | Admin | `src/app/(admin)/persuratan/arsip/page.tsx` |
| `/persuratan/arsip/ekspor` | Route handler | Admin | `src/app/(admin)/persuratan/arsip/ekspor/route.ts` |
| `/persuratan/dashboard` | Halaman | Admin | `src/app/(admin)/persuratan/dashboard/page.tsx` |
| `/persuratan/jenis-surat` | Halaman | Admin | `src/app/(admin)/persuratan/jenis-surat/page.tsx` |
| `/persuratan/jenis-surat/[id]/edit` | Halaman | Admin | `src/app/(admin)/persuratan/jenis-surat/[id]/edit/page.tsx` |
| `/persuratan/jenis-surat/baru` | Halaman | Admin | `src/app/(admin)/persuratan/jenis-surat/baru/page.tsx` |
| `/persuratan/master` | Halaman | Admin | `src/app/(admin)/persuratan/master/page.tsx` |
| `/persuratan/surat` | Halaman | Admin | `src/app/(admin)/persuratan/surat/page.tsx` |
| `/persuratan/surat-dinas` | Halaman | Admin | `src/app/(admin)/persuratan/surat-dinas/page.tsx` |
| `/persuratan/surat-dinas/[id]/edit` | Halaman | Admin | `src/app/(admin)/persuratan/surat-dinas/[id]/edit/page.tsx` |
| `/persuratan/surat-dinas/baru` | Halaman | Admin | `src/app/(admin)/persuratan/surat-dinas/baru/page.tsx` |
| `/persuratan/surat-keluar` | Halaman | Admin | `src/app/(admin)/persuratan/surat-keluar/page.tsx` |
| `/persuratan/surat-keluar/[id]/edit` | Halaman | Admin | `src/app/(admin)/persuratan/surat-keluar/[id]/edit/page.tsx` |
| `/persuratan/surat-keluar/baru` | Halaman | Admin | `src/app/(admin)/persuratan/surat-keluar/baru/page.tsx` |
| `/persuratan/surat-masuk` | Halaman | Admin | `src/app/(admin)/persuratan/surat-masuk/page.tsx` |
| `/persuratan/surat-masuk/[id]/edit` | Halaman | Admin | `src/app/(admin)/persuratan/surat-masuk/[id]/edit/page.tsx` |
| `/persuratan/surat-masuk/baru` | Halaman | Admin | `src/app/(admin)/persuratan/surat-masuk/baru/page.tsx` |
| `/persuratan/surat/[id]` | Halaman | Admin | `src/app/(admin)/persuratan/surat/[id]/page.tsx` |
| `/persuratan/surat/[id]/edit` | Halaman | Admin | `src/app/(admin)/persuratan/surat/[id]/edit/page.tsx` |
| `/persuratan/surat/[id]/pdf` | Route handler | Admin | `src/app/(admin)/persuratan/surat/[id]/pdf/route.ts` |
| `/persuratan/surat/arsip/ekspor` | Route handler | Admin | `src/app/(admin)/persuratan/surat/arsip/ekspor/route.ts` |
| `/persuratan/surat/baru` | Halaman | Admin | `src/app/(admin)/persuratan/surat/baru/page.tsx` |
| `/potensi` | Halaman | Publik | `src/app/potensi/page.tsx` |
| `/profil` | Halaman | Publik | `src/app/profil/page.tsx` |
| `/profil/keamanan` | Halaman | Publik | `src/app/profil/keamanan/page.tsx` |
| `/profil/sejarah` | Halaman | Publik | `src/app/profil/sejarah/page.tsx` |
| `/profil/visi-misi` | Halaman | Publik | `src/app/profil/visi-misi/page.tsx` |
| `/rumah-tangga/laporan/ekspor` | Route handler | Admin | `src/app/(admin)/rumah-tangga/laporan/ekspor/route.ts` |
| `/sejarah` | Halaman | Publik | `src/app/sejarah/page.tsx` |
| `/statistik` | Halaman | Publik | `src/app/statistik/page.tsx` |
| `/statistik/bantuan/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/bantuan/ekspor/route.ts` |
| `/statistik/bantuan/ekspor/pdf` | Route handler | Admin | `src/app/(admin)/statistik/bantuan/ekspor/pdf/route.ts` |
| `/statistik/penduduk` | Halaman | Admin | `src/app/(admin)/statistik/penduduk/page.tsx` |
| `/statistik/penduduk/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/penduduk/ekspor/route.ts` |
| `/statistik/penduduk/ekspor/pdf` | Route handler | Admin | `src/app/(admin)/statistik/penduduk/ekspor/pdf/route.ts` |
| `/statistik/penduduk/kustom` | Halaman | Admin | `src/app/(admin)/statistik/penduduk/kustom/page.tsx` |
| `/statistik/rentang-umur/ekspor` | Route handler | Admin | `src/app/(admin)/statistik/rentang-umur/ekspor/route.ts` |
| `/super-admin` | Halaman | Admin | `src/app/(admin)/super-admin/page.tsx` |
| `/super-admin-login` | Halaman | Auth | `src/app/(auth)/super-admin-login/page.tsx` |
| `/super-admin/audit` | Halaman | Admin | `src/app/(admin)/super-admin/audit/page.tsx` |
| `/super-admin/audit/ekspor` | Route handler | Admin | `src/app/(admin)/super-admin/audit/ekspor/route.ts` |
| `/super-admin/domain` | Halaman | Admin | `src/app/(admin)/super-admin/domain/page.tsx` |
| `/super-admin/domain/[domainId]` | Halaman | Admin | `src/app/(admin)/super-admin/domain/[domainId]/page.tsx` |
| `/super-admin/domain/tambah` | Halaman | Admin | `src/app/(admin)/super-admin/domain/tambah/page.tsx` |
| `/super-admin/pengaturan` | Halaman | Admin | `src/app/(admin)/super-admin/pengaturan/page.tsx` |
| `/super-admin/pengguna` | Halaman | Admin | `src/app/(admin)/super-admin/pengguna/page.tsx` |
| `/super-admin/template` | Halaman | Admin | `src/app/(admin)/super-admin/template/page.tsx` |
| `/super-admin/template/[templateId]` | Halaman | Admin | `src/app/(admin)/super-admin/template/[templateId]/page.tsx` |
| `/super-admin/template/baru` | Halaman | Admin | `src/app/(admin)/super-admin/template/baru/page.tsx` |
| `/super-admin/template/fondasi` | Halaman | Admin | `src/app/(admin)/super-admin/template/fondasi/page.tsx` |
| `/super-admin/template/penggunaan` | Halaman | Admin | `src/app/(admin)/super-admin/template/penggunaan/page.tsx` |
| `/super-admin/tenant` | Halaman | Admin | `src/app/(admin)/super-admin/tenant/page.tsx` |
| `/transparansi/apbdes` | Halaman | Publik | `src/app/transparansi/apbdes/page.tsx` |
| `/transparansi/laporan-keuangan` | Halaman | Publik | `src/app/transparansi/laporan-keuangan/page.tsx` |
| `/two-factor` | Halaman | Auth | `src/app/(auth)/two-factor/page.tsx` |
| `/visi-misi` | Halaman | Publik | `src/app/visi-misi/page.tsx` |
| `/website` | Halaman | Admin | `src/app/(admin)/website/page.tsx` |
| `/website/dokumen` | Halaman | Admin | `src/app/(admin)/website/dokumen/page.tsx` |
| `/website/halaman` | Halaman | Admin | `src/app/(admin)/website/halaman/page.tsx` |
| `/website/konten` | Halaman | Admin | `src/app/(admin)/website/konten/page.tsx` |
| `/website/pengaturan` | Halaman | Admin | `src/app/(admin)/website/pengaturan/page.tsx` |
| `/wilayah` | Halaman | Publik | `src/app/wilayah/page.tsx` |

## 3. Server Action

| Berkas |
|---|
| `src/app/(admin)/absensi-kepegawaian/actions.ts` |
| `src/app/(admin)/inventaris/actions.ts` |
| `src/app/(admin)/keluarga/actions.ts` |
| `src/app/(admin)/keuangan/actions.ts` |
| `src/app/(admin)/konten/galeri/actions.ts` |
| `src/app/(admin)/konten/potensi/actions.ts` |
| `src/app/(admin)/mutasi-penduduk/actions.ts` |
| `src/app/(admin)/pelayanan-publik/layanan/actions.ts` |
| `src/app/(admin)/pelayanan-publik/pengajuan/actions.ts` |
| `src/app/(admin)/pelayanan-publik/survei/actions.ts` |
| `src/app/(admin)/pemerintahan-desa/actions.ts` |
| `src/app/(admin)/penduduk/actions.ts` |
| `src/app/(admin)/pengaduan-admin/actions.ts` |
| `src/app/(admin)/pengaturan/grup-akses/actions.ts` |
| `src/app/(admin)/pengaturan/grup-akses/salin-role-action.ts` |
| `src/app/(admin)/pengaturan/pengguna/actions.ts` |
| `src/app/(admin)/pengaturan/pengguna/keamanan-actions.ts` |
| `src/app/(admin)/pengaturan/pengguna/pendaftaran/actions.ts` |
| `src/app/(admin)/permohonan-surat/actions.ts` |
| `src/app/(admin)/persuratan/buku-agenda-actions.ts` |
| `src/app/(admin)/persuratan/jenis-surat/actions.ts` |
| `src/app/(admin)/persuratan/surat-dinas/actions.ts` |
| `src/app/(admin)/persuratan/surat/actions.ts` |
| `src/app/(admin)/super-admin/actions.ts` |
| `src/app/(admin)/super-admin/pengguna/actions.ts` |
| `src/app/(admin)/super-admin/template/actions.ts` |
| `src/app/(auth)/daftar/actions.ts` |
| `src/app/(warga)/layanan-mandiri/pengajuan/baru/actions.ts` |
| `src/app/(warga)/layanan-mandiri/survei/actions.ts` |
| `src/app/(warga)/layanan-mandiri/ubah-pin/actions.ts` |
| `src/app/pengaduan/baru/actions.ts` |
| `src/app/pengaduan/lacak/actions.ts` |
| `src/features/keuangan/application/apbdes-import-use-cases.ts` |
| `src/features/publik/application/website-admin-actions.ts` |

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
- `src/features/desa/application/statistik-rinci-publik.ts`
- `src/features/desa/application/use-cases.ts`

**Repository**
- `src/features/desa/infrastructure/desa-repository.ts`
- `src/features/desa/infrastructure/statistik-desa-repository.ts`
- `src/features/desa/infrastructure/statistik-rinci-repository.ts`

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

### kepegawaian

**Use case/application**
- `src/features/kepegawaian/application/use-cases.ts`

**Repository**
- `src/features/kepegawaian/infrastructure/kepegawaian-repository.ts`

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
- `src/features/keuangan/application/keuangan-bulanan-use-cases.ts`
- `src/features/keuangan/application/keuangan-use-cases.ts`
- `src/features/keuangan/application/laporan-dokumen-publik-use-cases.ts`
- `src/features/keuangan/application/laporan-dokumen-use-cases.ts`
- `src/features/keuangan/application/laporan-publik-use-cases.ts`

**Repository**
- `src/features/keuangan/infrastructure/keuangan-bulanan-repository.ts`
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

### laporan-statistik

**Use case/application**
- `src/features/laporan-statistik/application/export-laporan.ts`
- `src/features/laporan-statistik/application/laporan-statistik-use-cases.ts`

**Repository**
- `src/features/laporan-statistik/infrastructure/laporan-statistik-repository.ts`

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
- `src/features/multi-desa/application/pemantauan-domain-use-cases.ts`
- `src/features/multi-desa/application/pengguna-platform-use-cases.ts`
- `src/features/multi-desa/application/platform-info-use-cases.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts`
- `src/features/multi-desa/application/template-website-use-cases.ts`

**Repository**
- `src/features/multi-desa/infrastructure/domain-dns-repository.ts`
- `src/features/multi-desa/infrastructure/domain-ssl-repository.ts`
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/infrastructure/lifecycle-tenant-repository.ts`
- `src/features/multi-desa/infrastructure/pengguna-platform-repository.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts`
- `src/features/multi-desa/infrastructure/template-website-repository.ts`

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

### pelayanan

**Use case/application**
- `src/features/pelayanan/application/layanan-use-cases.ts`
- `src/features/pelayanan/application/pengajuan-use-cases.ts`
- `src/features/pelayanan/application/pengajuan-warga-use-cases.ts`
- `src/features/pelayanan/application/survei-use-cases.ts`

**Repository**
- `src/features/pelayanan/infrastructure/layanan-repository.ts`
- `src/features/pelayanan/infrastructure/pengajuan-repository.ts`
- `src/features/pelayanan/infrastructure/survei-repository.ts`

### pembangunan

**Use case/application**
- `src/features/pembangunan/application/use-cases.ts`

**Repository**
- `src/features/pembangunan/infrastructure/pembangunan-repository.ts`

### pemerintahan

**Use case/application**
- `src/features/pemerintahan/application/publik.ts`
- `src/features/pemerintahan/application/use-cases.ts`

**Repository**
- `src/features/pemerintahan/infrastructure/pemerintahan-repository.ts`

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
- `src/features/pengaturan/application/pengaturan-desa-use-cases.ts`
- `src/features/pengaturan/application/pengaturan-use-cases.ts`

**Repository**
- `src/features/pengaturan/infrastructure/pengaturan-desa-repository.ts`
- `src/features/pengaturan/infrastructure/pengaturan-repository.ts`

### pengguna

**Use case/application**
- `src/features/pengguna/application/pengguna-admin.ts`
- `src/features/pengguna/application/pengguna-use-cases.ts`

**Repository**
- `src/features/pengguna/infrastructure/keamanan-repository.ts`
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
- `src/features/publik/application/website-admin-actions.ts`
- `src/features/publik/application/website-admin.ts`

**Repository**
- `src/features/publik/infrastructure/content-repository.ts`
- `src/features/publik/infrastructure/website-admin-repository.ts`

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

### registrasi-warga

**Use case/application**
- `src/features/registrasi-warga/application/registrasi-warga-use-cases.ts`

**Repository**
- `src/features/registrasi-warga/infrastructure/registrasi-warga-repository.ts`

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
- `src/features/surat/application/buku-agenda-use-cases.ts`
- `src/features/surat/application/jenis-surat-use-cases.ts`
- `src/features/surat/application/surat-dinas-use-cases.ts`
- `src/features/surat/application/surat-publik-use-cases.ts`
- `src/features/surat/application/surat-use-cases.ts`
- `src/features/surat/application/tte-use-cases.ts`
- `src/features/surat/application/verifikasi-publik.ts`

**Repository**
- `src/features/surat/infrastructure/buku-agenda-repository.ts`
- `src/features/surat/infrastructure/master-repository.ts`
- `src/features/surat/infrastructure/surat-dinas-repository.ts`
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
- `src/features/wilayah/application/use-cases.ts`
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
