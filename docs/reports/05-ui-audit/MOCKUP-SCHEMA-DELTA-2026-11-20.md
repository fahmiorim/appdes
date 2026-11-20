# Delta Schema dari Mockup Admin Desa dan Super Admin

| Field | Nilai |
|---|---|
| Tanggal | 20 November 2026 |
| Jenis task | Audit dokumentasi dan kesiapan schema |
| Branch | `task/mockup-schema-delta-2026-11-20` |
| Base commit | `4bd4cd6` |
| Status | Audit selesai; menunggu keputusan implementasi |
| Perubahan kode/schema | Tidak ada |

## Tujuan

Memetakan 46 mockup Admin Desa dan 39 mockup Super Admin terhadap schema Drizzle yang berlaku, untuk menjawab tiga pertanyaan:

1. Layar mana yang membutuhkan tabel baru?
2. Layar mana yang cukup dengan penyesuaian kolom/relasi pada tabel yang sudah ada?
3. Layar mana yang tidak membutuhkan perubahan schema sama sekali?

Laporan ini adalah snapshot audit. Laporan tidak mengubah schema, migration, data, atau kode aplikasi.

## Ringkasan

Dari seluruh mockup yang diperiksa, mayoritas modul operasional sudah memiliki tabel. Kebutuhan schema terkonsentrasi pada area berikut:

- **4 cluster tabel baru yang dibutuhkan**: pusat laporan, langganan/billing platform, keamanan desa, dan pengaturan platform.
- **2 cluster tabel baru yang bersifat opsional**: indikator kinerja dan observability in-app.
- **7 cluster penyesuaian**: kepegawaian, lembaga desa, inventaris aset, analitik website, domain/SSL, struktur organisasi, dan katalog layanan surat.
- **Sisanya tidak membutuhkan schema baru**; gap-nya berupa use case, route, permission, dan seed menu.

Kesimpulan utamanya: mockup tidak menuntut perubahan besar pada model inti SID. Yang belum ada adalah entitas pendukung untuk laporan, monetisasi, keamanan akun, dan operasional platform.

## Metode dan batasan

Yang diperiksa:

- `src/db/migrations/meta/0017_snapshot.json` sebagai sumber daftar tabel dan kolom aktual (150 tabel).
- `src/db/migrations/0017_role_tenant_trigger.sql` dan ADR-003 untuk konteks constraint role yang baru ditutup.
- `docs/reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md`.
- `docs/reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md`.
- `docs/design/ADMIN-DESA-SCREEN-SPEC.md`.
- 13 mockup kunci di `docs/mockups/` yang mewakili area laporan, kepegawaian, inventaris, lembaga, website, layanan, langganan, keamanan, dan monitoring.

Batasan:

- `docs/design/ADMIN-DESA-SCREEN-SPEC.md` baru merinci 12 halaman Admin Desa. Sebagian besar dari 46 mockup Admin Desa belum memiliki spesifikasi field-level.
- Audit ini memetakan kebutuhan entity/column, bukan menetapkan nama kolom final, tipe data, indeks, atau urutan migration.
- Tidak ada migration atau integration test yang dijalankan karena tidak ada perubahan schema.
- Mockup adalah referensi UI, bukan kontrak bisnis final. Beberapa layar menampilkan data contoh yang tidak semuanya perlu dipersistenkan.

## Kondisi awal

- Migration terakhir adalah `0017_role_tenant_trigger.sql`.
- Schema memiliki 150 tabel.
- Beberapa tabel yang relevan dengan mockup sudah ada, tetapi cakupannya lebih sempit dari yang ditampilkan mockup:
  - `keuangan_laporan` hanya menyimpan file laporan keuangan, bukan pusat semua laporan.
  - `tenant_exports` adalah job ekspor, bukan katalog laporan.
  - `pelanggan` menyimpan kemitraan desa, bukan paket/harga/invoice platform.
  - `letter_requirements` adalah master persyaratan per desa; relasi ke jenis surat disimpan sebagai JSON di `letter_types.syarat_surat`.
  - `pengaturan_desa.village_id` wajib terisi, sehingga tidak dapat menyimpan pengaturan global platform.

## Temuan

### A. Entitas baru yang dibutuhkan

| Area mockup | Entitas yang diusulkan | Kondisi saat ini | Alasan | Prioritas |
|---|---|---|---|---|
| Laporan Desa, Dashboard Laporan, Rekap & Analisis, Super Admin Laporan & Analitik | `laporan_template`, `laporan`, `laporan_jadwal` | Tidak ada katalog laporan terpusat. `keuangan_laporan` khusus file keuangan; `tenant_exports` hanya job ekspor | Mockup menampilkan template, riwayat, periode, status, format, pembuat, jadwal otomatis, arsip, dan unduhan | P1 |
| Langganan & Paket, Invoice, Riwayat Pembayaran | `paket_langganan`, `langganan_tenant`, `invoice_langganan`, `pembayaran_langganan` | Tidak ada tabel paket, langganan, invoice, atau pembayaran. `pelanggan` tidak memiliki harga/paket/invoice | Mockup menampilkan paket, harga, masa berlaku, auto-renew, metode bayar, invoice, dan limit fitur | P2; naik P1 bila monetisasi SaaS dijalankan |
| Security Settings desa | `two_factor`, `keamanan_ip` | `sessions` dan `login_otp` ada, tetapi tidak ada TOTP/2FA, allow/block IP, atau kebijakan password | Mockup menampilkan 2FA, session timeout, password policy, IP allow/block, login attempts, dan security events | P1 sebelum konsol admin diekspos lebih luas |
| Pengaturan platform | `pengaturan_platform` | `pengaturan_desa` memakai `village_id` NOT NULL | Setting global platform tidak dapat disimpan sebagai pengaturan desa | P2 |
| Rekap & Analisis Kinerja | `indikator_kinerja`, `indikator_target` | Angka dasar dapat diagregasi, tetapi indikator dan target belum dapat dikonfigurasi | Mockup menampilkan indikator kinerja dan rekomendasi per periode | P3, opsional bila indikator cukup hardcoded |
| Monitoring, Backup, Keamanan platform | `server_metrik`, `insiden_platform`, `backup_job`, `security_event`, `vulnerability` | Tidak ada tabel metrik/insiden/backup/vulnerability | Mockup menampilkan metrik server, uptime, service health, alert, insiden, WAF, dan vulnerability | P4; hanya bila tidak memakai layanan eksternal |

Catatan untuk pusat laporan:

- Laporan desa harus memakai `village_id NOT NULL`.
- Laporan platform sebaiknya dipisahkan secara eksplisit, bukan hanya mengandalkan `village_id NULL`, agar query tenant dan query platform tidak tercampur.
- File laporan sebaiknya disimpan sebagai referensi ke penyimpanan objek, bukan blob di MySQL.

Catatan untuk billing:

- `paket_langganan` adalah data platform, bukan data tenant.
- `langganan_tenant` boleh memiliki `village_id`, tetapi satu desa hanya boleh memiliki satu langganan aktif pada satu waktu.
- Invoice dan pembayaran harus menyimpan snapshot harga saat transaksi, bukan hanya foreign key ke paket yang harganya bisa berubah.

### B. Penyesuaian pada tabel yang sudah ada

| Area mockup | Tabel existing | Gap | Penyesuaian yang diusulkan |
|---|---|---|---|
| Data Pegawai, Absensi & Kepegawaian | `perangkat_desa` | Tidak ada `resident_id`, jenis kepegawaian, tanggal mulai/selesai, riwayat jabatan, atau dokumen | Tambah `resident_id` opsional, `jenis_kepegawaian`, `tanggal_mulai`, `tanggal_selesai`; tambah `perangkat_riwayat_jabatan` dan `perangkat_dokumen` |
| Lembaga Desa dan BPD | `kelompok`, `kelompok_anggota` | `kelompok` belum memiliki periode, status aktif, atau masa bakti; `kelompok_anggota` belum memiliki tanggal mulai/selesai; dokumen SK belum terhubung | Tambah kolom periode/status pada `kelompok`, masa jabatan pada `kelompok_anggota`, dan relasi dokumen. Tidak perlu tabel lembaga baru karena BPD/LPM/PKK dapat menjadi `kelompok.type` |
| Kendaraan dan Pengelolaan Aset | `inventaris` | Tidak ada nomor polisi, nomor rangka/mesin, sumber dana, cara perolehan, penyedia, nomor dokumen, akumulasi penyusutan, nilai buku eksplisit, penanggung jawab, riwayat pemeliharaan, atau dokumen | Tambah kolom kendaraan/penyusutan/penanggung jawab; klarifikasi arti `nilai_akhir`; tambah `inventaris_dokumen` dan `inventaris_pemeliharaan` |
| Website Dashboard | `pengunjung_log` | Hanya menyimpan `halaman`, `tanggal`, dan `jumlah` | Tambah `sumber`, `perangkat`, dan `konten_id`; pertimbangkan unique index per desa/tanggal/halaman/sumber/perangkat |
| Website Settings dan Domain | `village_domains` | Belum ada status verifikasi, waktu verifikasi, status SSL, dan kedaluwarsa SSL | Tambah `status_verifikasi`, `verified_at`, `ssl_status`, `ssl_expires_at` |
| Struktur Organisasi Pemerintahan | `jabatan_perangkat` | Belum ada atasan/parent, sehingga bagan berjenjang tidak dapat dibentuk | Tambah `parent_id` self-reference dalam tenant yang sama; cegah siklus di application layer |
| Daftar Layanan Publik | `letter_types` | Mockup menampilkan SLA, biaya, metode pengajuan, output, dan alur; tabel baru memiliki masa berlaku surat | Tambah kolom katalog layanan. Persyaratan per layanan sudah dapat memakai JSON `syarat_surat`; join table baru belum perlu |
| Template Website | `theme` | Tidak ada gap schema yang jelas; `versi`, `sumber`, `aktif`, dan `opsi` sudah tersedia | Tidak perlu perubahan schema; status template dapat diturunkan dari `aktif` dan `opsi` |

Catatan untuk katalog layanan:

- Pada mockup yang diperiksa, 12 layanan yang ditampilkan seluruhnya berupa jenis surat. Karena itu, tabel `layanan` generik belum diperlukan.
- Tabel `layanan` baru relevan bila nanti ada layanan non-surat, misalnya pengaduan, izin usaha, atau layanan kesehatan yang tidak menghasilkan surat.
- `letter_requirements` tidak memiliki `letter_type_id`; hubungan persyaratan ke jenis surat saat ini memakai JSON `letter_types.syarat_surat`. Model ini cukup untuk menampilkan form, tetapi kurang nyaman untuk laporan penggunaan persyaratan lintas jenis surat.

### C. Area yang tidak membutuhkan schema baru

| Kelompok | Tabel/entitas yang sudah ada | Gap yang tersisa |
|---|---|---|
| Kependudukan | `residents`, `family_relations`, `family_member_logs`, `resident_mutations`, `regions`, `area` | Halaman, route, dan use case |
| DPT, DTKS, suplemen | `dtks`, `dtks_anggota`, `dtks_lampiran`, `suplemen`, `suplemen_terdata` | Halaman dan alur verifikasi data |
| Surat, TTE, arsip | `letter_types`, `letter_requirements`, `letters`, `permohonan_surat`, `letter_dinas`, `outgoing_letters`, `incoming_letters`, `tte_config`, `letter_audit_trail` | Katalog layanan dan SLA seperti pada bagian B |
| Keuangan dan APBDes | `keuangan`, `keuangan_transaksi`, `keuangan_jurnal`, `keuangan_triwulan`, `keuangan_laporan`, `keuangan_template` | Pusat laporan lintas modul |
| Pembangunan | `pembangunan_proyek`, `pembangunan_dokumentasi` | Halaman dan agregasi laporan |
| Kehadiran dan izin | `kehadiran_perangkat`, `kehadiran_izin`, `kehadiran_pengaturan` | Hubungan ke data pegawai |
| Bantuan | `bantuan_program`, `bantuan_peserta` | Halaman dan validasi penerima |
| IDM | `idm_indikator`, `idm_sdgs` | Halaman dan laporan |
| Agenda dan pengaduan | `agenda_kegiatan`, `pengaduan` | Halaman dan notifikasi |
| Statistik dan beranda | Tidak ada tabel khusus | Cukup agregasi dari tabel yang ada |
| Pengguna, role, permission, audit | `users`, `roles`, `role_permissions`, `modules`, `audit_logs` | Constraint role tenant sudah ditutup di `0017` |
| Website desa | `halaman_statis`, `menu_publik`, `widget`, `slider`, `dokumen_publik`, `media_settings` | Sebagian besar hanya butuh use case tulis dan seed menu |

### D. Kebutuhan yang bukan schema

Ada dua kebutuhan yang sering terlihat seperti masalah database, tetapi bukan:

1. **Seed modul dan permission.** Halaman baca-saja dapat memanggil permission yang belum diberikan kepada role template tenant. Perbaikannya adalah baris `modules` dan `role_permissions`, bukan tabel baru.
2. **Route dan use case.** Beberapa mockup sudah memiliki tabel, tetapi belum memiliki halaman atau action. Ini pekerjaan implementasi fitur, bukan migration.

## Kontrol multi-tenant untuk entitas baru

Semua entitas tenant-scoped yang diusulkan harus mengikuti aturan yang sudah berlaku:

- `village_id NOT NULL` pada tabel milik desa.
- Composite foreign key yang menyertakan `village_id` untuk referensi tenant-scoped.
- `village_id` tidak boleh berasal dari body, query, atau header klien; nilainya harus berasal dari sesi/konteks tenant server-side.
- Operasi Admin Desa wajib memeriksa user aktif, desa aktif, permission, dan kecocokan `user.villageId`.
- Tabel platform tidak boleh memiliki `village_id` yang dapat diisi bebas; aksesnya hanya untuk platform super admin.
- Laporan platform yang menampilkan data lintas desa tidak boleh membocorkan nama, NIK, atau agregat desa lain ke sesi desa.
- Setiap tabel baru memerlukan negative test lintas tenant, bukan hanya test positif.

Untuk tabel anak baru seperti `perangkat_riwayat_jabatan`, `perangkat_dokumen`, `inventaris_dokumen`, `inventaris_pemeliharaan`, dan `laporan_jadwal`, composite foreign key ke parent harus menyertakan `village_id` agar satu desa tidak dapat menautkan data ke parent desa lain.

## Urutan implementasi yang diusulkan

1. Pusat laporan desa dan platform.
2. Kepegawaian, lembaga, dan aset.
3. Keamanan desa: 2FA dan IP allow/block.
4. Billing platform bila monetisasi benar-benar dijalankan.
5. Pengaturan platform.
6. Observability platform melalui integrasi eksternal, bukan tabel MySQL.

Urutan ini dipilih karena tiga area pertama memberi manfaat langsung ke layar desa dan dapat diuji dengan tenant test yang sudah ada.

## File yang diperiksa

- `AGENTS.md`
- `docs/README.md`
- `docs/reports/README.md`
- `docs/reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md`
- `docs/reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md`
- `docs/design/ADMIN-DESA-SCREEN-SPEC.md`
- `src/db/migrations/meta/0017_snapshot.json`
- `src/db/migrations/0017_role_tenant_trigger.sql`
- `src/db/schema/letter-types.ts`
- `src/db/schema/letter-requirements.ts`
- `src/features/layanan-mandiri/infrastructure/layanan-mandiri-repository.ts`
- `src/features/surat/infrastructure/master-repository.ts`
- 13 mockup di `docs/mockups/` yang mewakili area audit

## File yang diubah

- `docs/reports/05-ui-audit/MOCKUP-SCHEMA-DELTA-2026-11-20.md` — laporan ini.
- `docs/reports/README.md` — menambahkan laporan ini ke indeks acuan audit UI.

Tidak ada perubahan pada source code, schema, migration, konfigurasi, atau data.

## Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format laporan | `npx prettier --check "docs/reports/05-ui-audit/MOCKUP-SCHEMA-DELTA-2026-11-20.md" "docs/reports/README.md"` | PASS |
| Diff whitespace | `git diff --check` | PASS |
| Typecheck/lint/test | Tidak dijalankan | SKIPPED — tidak ada perubahan kode |

## Risiko dan keterbatasan

- Sebagian besar mockup belum memiliki spesifikasi field-level, sehingga nama dan jumlah kolom final masih perlu dikonfirmasi sebelum migration.
- Audit ini tidak memeriksa seluruh 150 tabel satu per satu untuk kebutuhan mockup; fokusnya pada area yang muncul di mockup.
- Belum ada estimasi ukuran data, retensi, atau dampak indeks untuk tabel laporan dan metrik.
- Rekomendasi monitoring sebagai integrasi eksternal bergantung pada keputusan operasional yang belum diambil.
- Jika billing platform tidak akan dijalankan, empat tabel billing tidak perlu dibuat.

## Rekomendasi

1. Setujui atau koreksi daftar entitas pada bagian A sebelum menulis migration.
2. Pecah implementasi menjadi beberapa task kecil, bukan satu migration besar.
3. Mulai dari pusat laporan karena paling banyak dipakai lintas mockup dan tidak bergantung pada billing.
4. Sebelum migration, tentukan apakah laporan platform memakai tabel terpisah atau `scope` eksplisit.
5. Tambahkan negative test lintas tenant untuk setiap tabel baru.
6. Perbarui `docs/SID_FEATURE_MAP.md` dan `docs/MASTER_ROADMAP.md` hanya setelah ada keputusan implementasi, bukan berdasarkan audit ini.
