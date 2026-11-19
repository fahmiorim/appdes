# Matriks Isolasi Tenant per Modul

Matriks ini memetakan bukti test isolasi tenant yang benar-benar ada per modul.
Fokusnya adalah data milik desa: daftar, detail, hitungan, ekspor/impor, dan
perubahan yang mencoba memakai ID desa lain.

Status:

- **Kuat** — ada integration test khusus yang mencakup pembacaan dan perubahan
  data, termasuk penolakan lintas tenant.
- **Sebagian** — ada test, tetapi cakupannya baru sebagian (misalnya hanya
  schema/relasi, hanya baca, atau hanya satu jalur tulis).
- **Belum** — belum ada integration test isolasi tenant khusus untuk modul itu.

Matriks ini bukan pengganti audit kode. Test yang ada membuktikan jalur yang
diuji, bukan seluruh query di modul.

## Matriks

| Modul | Data tenant utama | Bukti test | Cakupan | Status |
|---|---|---|---|---|
| Penduduk | `residents`, `dtks*`, `suplemen*`, `resident_mutations` | `dtks-tenant-isolation`, `riwayat-penduduk-tenant-isolation`, `suplemen-tenant-isolation`, `penduduk-tenant-references` | Daftar, detail, hitungan, pencarian, ekspor, impor, relasi RTM/KK/wilayah, mutasi | Kuat |
| Keluarga | `families`, `family_member_logs` | `keluarga-tenant-isolation` | Daftar, detail, hitungan, update/delete, wilayah | Kuat |
| Rumah tangga | `rtm`, `residents` | `rumah-tangga-tenant-isolation` | Daftar, laporan, update/delete, penetapan anggota, wilayah | Kuat |
| Inventaris | `inventaris`, `inventaris_kategori`, `inventaris_mutasi` | `inventaris-tenant-isolation` | Daftar, detail, kategori, mutasi, create/update, kebocoran nama kategori | Kuat |
| Kelompok dan lembaga | `kelompok`, `kelompok_anggota`, `kelompok_master` | `kelompok-tenant-isolation` | Daftar, detail, publik, laporan, tambah anggota, perubahan parent | Kuat |
| Kontak | `kontak`, `kontak_grup`, `anggota_grup_kontak` | `kontak-tenant-isolation` | Create/update, tautan penduduk, grup, hitungan, payload `villageId` | Kuat |
| RBAC dan pengguna | `users`, `roles`, `role_permissions`, `modules` | `rbac-tenant-isolation`, `m0017-role-tenant-constraint` | Role, permission efektif, trigger role tenant, update/delete role | Kuat |
| Multi-desa | `villages`, `village_domains`, `tenant_exports` | `isolasi-host`, `kelola-domain`, `lifecycle-tenant`, `provisioning-template`, `template-ekspor`, `cleanup-ekspor`, `platform-konsol` | Host, domain, lifecycle, provisioning, ekspor template, konsol platform | Kuat |
| Statistik | `residents`, `bantuan_program`, wilayah | `statistik-tenant-isolation` | Filter wilayah, label, hitungan, peserta lintas desa | Kuat |
| Modul lintas kelompok | `lapak`, `arsip`, `buku_tamu`, `anjungan`, `sisa_lebih`, `kehadiran_perangkat` | `isolasi-village` | Daftar, pencarian, update/delete lintas desa | Kuat |
| Survey | `survey*`, `analisis_indikator` | `m0018-survey-indicator-tenant-fk`, unit validation | Relasi soal-indikator, FK lintas tenant, pelepasan referensi saat delete | Sebagian |
| Wilayah | `regions`, `area` | `keluarga`, `rumah-tangga`, `statistik` | Wilayah dipakai sebagai referensi; belum ada CRUD wilayah khusus | Sebagian |
| Surat | `letters`, `permohonan_surat`, `letter_*`, arsip nomor | `penomoran-archive`, schema composite FK | Arsip nomor dan relasi tenant; belum ada test isolasi menyeluruh untuk semua jalur surat | Sebagian |
| Keuangan | `keuangan*`, `sisa_lebih` | `keuangan-concurrency`, `apbdes-import-concurrency`, `isolasi-village` | Concurrency, impor APBDes, SiLPA; belum semua ekspor/laporan | Sebagian |
| Pembangunan | `pembangunan_proyek`, `pembangunan_dokumentasi` | `m0016-tenant-child-tables`, schema composite FK | Relasi dokumentasi dan proyek; belum ada test CRUD/ekspor khusus | Sebagian |
| Bantuan | `bantuan_program`, `bantuan_peserta` | Schema composite FK, `integrasi-warga` | Relasi peserta/program; belum ada test isolasi daftar/ekspor khusus | Sebagian |
| Kesehatan dan KIA | `kia`, `ibu_hamil`, `bulanan_anak` | Schema composite FK | Relasi ibu/anak/posyandu; belum ada test isolasi daftar/ekspor khusus | Sebagian |
| Agenda | `agenda_kegiatan` | `agenda-repository` | Repository dasar; belum ada skenario dua desa | Sebagian |
| Website dan konten | `halaman_statis`, `berita`, `dokumen_publik`, `widget`, `slider` | `dokumen-publik` | Publikasi dokumen; belum ada test isolasi menu/halaman/berita | Sebagian |
| Kehadiran | `kehadiran_perangkat`, `kehadiran_izin`, `kehadiran_pengaturan` | `rekap-kehadiran-tenant-isolation`, `isolasi-village` | Rekap izin, daftar kehadiran; belum semua jalur tulis | Sebagian |
| IDM | `idm_indikator`, `idm_sdgs` | Belum ada | — | Belum |
| Pengaduan | `pengaduan`, lampiran | Belum ada | — | Belum |
| BUMDes | `bumindes_*` | Belum ada | — | Belum |
| Pemilihan | `elections`, `pemilihan_kandidat` | Belum ada | — | Belum |
| API eksternal | `api_keys` | Belum ada | — | Belum |
| Pelanggan dan plugin | `pelanggan`, `plugin_registry` | Belum ada | — | Belum |

## Prioritas penambahan test

1. **Pengaduan dan lampiran** — melibatkan berkas dan data pribadi; perlu test
   baca, unduh, dan tolak lampiran desa lain.
2. **IDM** — modul inti; perlu test indikator, SDGs, dan laporan per desa.
3. **BUMDes** — banyak tabel anak; perlu test relasi dan laporan.
4. **API eksternal** — kunci API harus terikat satu desa dan tidak dapat
   membaca desa lain.
5. **Surat, keuangan, bantuan, kesehatan** — tambahkan test ekspor/impor dan
   jalur tulis yang belum tercakup.

## Aturan minimum untuk modul baru

Setiap modul tenant-scoped yang menambah integration test harus memiliki:

- satu test baca yang memastikan data desa lain tidak muncul;
- satu test tulis yang memastikan ID desa lain ditolak;
- satu test hitungan/ekspor bila modul memiliki agregasi atau unduhan;
- satu negative test yang memakai ID milik desa lain, bukan hanya test positif.

Jika modul belum memiliki integration test, jangan menandainya selesai hanya
karena composite FK sudah ada. FK menjaga relasi, bukan filter daftar, hitungan,
atau ekspor.

## Hubungan dengan migration

- `0017_role_tenant_trigger.sql` menutup `users.role_id`.
- `0018_survey_indicator_tenant_fk.sql` menutup `survey_soal.indikator_id`.
- Daftar 74 composite FK dikunci oleh
  `src/db/tenant-composite-fk.integration.test.ts`.

Lihat juga [Peta Integration Test](./INTEGRATION-TEST-MAP.md) untuk daftar file
test dan kebijakan seleksi test.
