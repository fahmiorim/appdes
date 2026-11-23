# SID Feature Map — Appdes

> Peta modul, fungsi, status bukti implementasi, prioritas, dan pekerjaan lanjutan.
> Repository: `fahmiorim/appdes` · Status kode Fase 2 diperbarui 18 November 2026; status referensi UI dan tindak lanjut diverifikasi ulang 19 November 2026; inventaris route dan template direkonsiliasi ke `origin/main` `2c86ec48` pada 23 November 2026.
>
> Inventaris route, Server Action, repository, dan use case per modul:
> [`architecture/MODULE-INVENTORY.md`](architecture/MODULE-INVENTORY.md).

## 1. Cara membaca status

Status di bawah menunjukkan keberadaan struktur/kode yang teridentifikasi pada repository. Status ini **bukan jaminan bahwa seluruh alur siap dipakai di produksi**.

**Cakupan UI (23 November 2026):** UI pengelolaan modul SID **sebagian tersedia**. Ada 149 berkas `page.tsx`; 102 berada di route group `(admin)` — 89 halaman non-super-admin dan 13 halaman `/super-admin` yang tersusun dalam tujuh area menu (`/super-admin`, tenant, domain, pengguna, audit, template, pengaturan). `RUTE_ADMIN_TERSEDIA` berisi 65 entri. Template tenant menyemai 23 modul dan 62 grant untuk 4 role, serta 8 menu publik. **Keberadaan route tidak sama dengan alur yang siap dipakai:** jumlah halaman tidak membuktikan CRUD lengkap, dan status kedalaman per modul harus dibaca dari [inventaris modul](architecture/MODULE-INVENTORY.md) serta laporan UI yang ditautkan di bawah. Login Admin Desa `/masuk-admin` tetap halaman autentikasi, bukan UI pengelolaan modul. Modul SID lain sebagian baru memiliki route handler ekspor, PDF, atau berkas. Halaman publik yang ada adalah situs desa, bukan UI pengelolaan.

**Referensi mockup bukan status implementasi.** Peta ini merangkum modul dan status bukti, bukan pemetaan satu baris per layar: katalog 126 aset dipetakan per area pada laporan audit yang ditautkan di bawah. Katalog tetap berisi **39 layar Super Admin** dan **46 layar Admin Desa** sebagai referensi desain per 19 November 2026. Angka itu bukan status route: per 23 November 2026 ada 89 halaman non-super-admin dan 13 halaman `/super-admin`, dengan kedalaman implementasi yang berbeda per modul. Area seperti langganan, analitik penggunaan, pusat keamanan, dan editor template belum menjadi bagian modul yang ada; jangan menambahkannya ke peta ini sebagai "tersedia" sebelum use case, permission, dan model data dibuat. Pemetaan rinci ada di [audit mockup dan dokumen](reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md), [audit kesiapan backend](reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md), dan [audit mockup Super Admin](reports/05-ui-audit/REVIEW-MOCKUP-SUPER-ADMIN-2026-11-19.md).

| Kategori | Definisi |
|---|---|
| **Core** | Wajib untuk layanan inti SID dan operasi harian desa. |
| **Important** | Penting untuk tata kelola/pelayanan, tetapi dapat dirilis bertahap. |
| **Optional** | Nilai tambah setelah core stabil. |
| **Deferred** | Ditunda karena risiko, integrasi, atau beban operasional. |
| **Needs validation** | Kode/struktur ada, tetapi kelengkapan UI, alur, atau kesiapan produksi perlu dibuktikan. |

## 2. Peta modul

| Area | Folder/fitur | Fungsi utama | Status bukti | Prioritas | Catatan lanjutan |
|---|---|---|---|---|---|
| Platform multi-desa | `multi-desa`, `desa`, `pelanggan` | Provisioning, domain, status, kuota, akun admin, retensi dan purge | Landing page platform dengan pemisahan host (`PLATFORM_HOSTS`), bootstrap CLI, template platform, konsol platform tujuh area menu (13 halaman `page.tsx`: `/super-admin`, tenant, domain, pengguna, audit, template, pengaturan), pengelolaan domain alias, ekspor tenant, purge, cleanup ekspor, pengelolaan akun platform, serta filter dan ekspor audit tersedia di `main` | Core platform | Walkthrough konsol dan bootstrap di staging; halaman template/pengaturan masih baca-saja; MFA dan undangan anggota tim belum ada; tinjau kelengkapan template bawaan (4 role, 23 modul, 62 grant); pasang dan verifikasi timer cleanup; `demo` dan host reserved belum ada. |
| Auth & RBAC | `auth`, `rbac` | Login, sesi, role, permission | Use case tersedia; validasi role ownership dan pencabutan sesi saat reset sandi sudah ada di kode (PR #33, #41) | Core | Selesai di kode. Sisa: validasi runtime MySQL/staging, `users.role_id` masih dijaga application layer (ADR-002), dan empat tabel anak tanpa `village_id` (`survey_soal`, `survey_responden`, `survey_jawaban`, `pembangunan_dokumentasi`). |
| Website desa | `publik`, `konten`, `navigation` | Profil, konten, menu, media | Konten publik, galeri, pengumuman, dan media teridentifikasi | Core | `navigation` membangun menu **admin** dari modul dan izin RBAC; menu situs publik ada di `publik/nav-publik`. Pemilihan tema belum ada UI: tabel `theme` hanya diisi seed provisioning dan `src/themes/registry.ts` yang dirujuk schema belum ada. Backup media, signature validation, SEO/editor regression. |
| Profil & wilayah | `wilayah`, `desa`, `gis` | Identitas desa, wilayah, peta | Struktur fitur teridentifikasi | Core | Validasi relasi wilayah pada tenant yang sama. |
| Penduduk | `penduduk`, `warga` | Data penduduk, pencarian, mutasi, katalog | Use case/repository serta UI daftar, detail, tambah, dan ubah tersedia | Core | Form tambah/ubah memakai izin `update`; validasi family/region lintas tenant dan test import. |
| Keluarga | `keluarga` | Kartu keluarga, kepala dan anggota keluarga | Implementasi teridentifikasi | Core | Tenant filter pada join/agregasi dan regionId. |
| Rumah tangga | `rumah-tangga` | Data rumah tangga dan anggota | Implementasi teridentifikasi | Important | Validasi regionId dan composite FK. |
| Surat & layanan mandiri | `surat`, `layanan-mandiri` | Jenis surat, persyaratan, permohonan, proses, dokumen | Backend dan route teridentifikasi | Core | Validasi resident/letter type; transisi status atomik; uji kiosk. |
| IDM / SDGs | `idm` | IKS, IKE, IKL, klasifikasi, SDGs, laporan | Domain/use case/test teridentifikasi | Core | **Pertahankan sebagai fitur inti**; validasi perhitungan dengan data nyata. |
| Bantuan sosial | `bantuan` | Program bantuan, sasaran, peserta, impor | Use case/repository teridentifikasi | Important | Audit impor dan relasi sumber. |
| Kelompok masyarakat | `kelompok` | Kelompok, kategori, anggota | Implementasi teridentifikasi | Important | Audit mutation dan join tenant-scoped. |
| Inventaris | `inventaris` | Aset, kategori, kondisi, status | Use case/repository dan audit trail teridentifikasi | Important | Uji workflow persetujuan dan relasi kategori. |
| Pembangunan | `pembangunan` | Kegiatan dan dokumentasi pembangunan | Use case teridentifikasi | Important | Pastikan update/delete tenant-scoped dan cleanup file. |
| Keuangan / APBDes | `keuangan` | APBDes, impor spreadsheet, nilai dan laporan | Simpan nilai diserialkan per (desa, tahun); impor dan batch upsert tersedia | Important | Race condition agregasi sudah ditutup lewat kunci MySQL per (desa, tahun) (AUD-034, PR #86). Sisa: `upsertKeuanganBatch` belum memakai kunci yang sama, sehingga impor yang berjalan bersamaan dengan simpan manual masih dapat menghasilkan induk tidak konsisten; tambahan validasi file impor. |
| Kesehatan / KIA | `kesehatan` | Posyandu, KIA, ibu hamil, pemantauan anak | Schema/use case/repository/ekspor teridentifikasi | Important | Validasi relasi tenant; data sangat sensitif. |
| Kehadiran | `kehadiran` | Kehadiran perangkat desa | Repository dan integration test isolasi tenant tersedia | Important | Perluas cakupan test tenant dan alur absensi. |
| Arsip | `arsip` | Arsip dan berkas desa | Repository dan test domain tersedia; belum ada integration test isolasi | Important | Tambah integration test lintas tenant, backup berkas, dan kontrol akses unduhan. |
| Pengaduan & umpan balik | `pengaduan`, `umpan-balik`, `pendapat` | Masukan warga, pengaduan, survei/pendapat | Struktur fitur teridentifikasi; workflow perlu validasi | Important | Moderasi, SLA, privasi, notifikasi. |
| Notifikasi & pesan | `notifikasi`, `pesan-warga` | Notifikasi aplikasi dan komunikasi | Struktur teridentifikasi | Optional | Tenant binding webhook, antrean, monitoring. |
| API eksternal/publik | `api-eksternal`, `api-publik` | Integrasi API dan API key | Hash key dan rate limit pada endpoint yang ditinjau | Optional | Scope per key, rotasi, audit, rate limit menyeluruh. |
| TTE | `surat` / domain TTE | Tanda tangan elektronik provider | Backend teridentifikasi | Deferred / Needs validation | Jangan aktifkan produksi sebelum SSRF/TLS ditangani. |
| WhatsApp | integrasi notifikasi / Baileys | Notifikasi WhatsApp | Dependensi dan penyimpanan auth teridentifikasi; deployment belum diverifikasi | Deferred | Worker persisten, retry, secret storage, monitoring. |
| GIS lanjutan | `gis` | Pemetaan dan visualisasi wilayah | Struktur fitur teridentifikasi | Optional | Sumber data, privasi titik penduduk, performa. |
| Anjungan | `anjungan` | Kiosk layanan mandiri | Repository dan test domain/use case tersedia; belum ada integration test isolasi | Important | Device binding, resident ownership, dan integration test lintas tenant. |
| Lapak / BUMDes | `lapak`, `bumindes` | Lapak produk dan administrasi BUMDes | Fitur dan sebagian test teridentifikasi | Optional | Tentukan kebutuhan desa dan model operasional. |
| Modul pendukung | `agenda`, `statistik`, `analisis`, `survey`, `kontak`, `buku-tamu`, `plugin`, dll. | Fitur pelengkap SID | Tingkat implementasi bervariasi | Optional / Needs validation | Prioritaskan berdasar kebutuhan dan biaya pemeliharaan. |

## 3. Modul inti MVP yang disarankan

Daftar ini adalah target modul. Sebagian sudah memiliki halaman Admin Desa (penduduk termasuk tambah/ubah, pengguna, grup akses), sedangkan modul inti lain masih berupa backend, route handler, atau struktur fitur (lihat §1 dan §2).

1. **Platform:** provisioning tenant, domain, status tenant, akun Admin Desa, dashboard Super Admin.
2. **Akses:** login, RBAC, manajemen akun, audit trail.
3. **Website desa:** profil, struktur pemerintahan, berita/konten, menu, tema, media.
4. **Data dasar:** wilayah, penduduk, keluarga, rumah tangga.
5. **Administrasi surat:** master jenis surat, persyaratan, permohonan, verifikasi, proses, arsip.
6. **IDM:** input indikator, perhitungan, klasifikasi, laporan, ekspor.
7. **Operasional:** backup database dan media, monitoring, log, pelatihan, SOP.

## 4. Fitur yang ditunda atau dibatasi

| Fitur | Alasan | Syarat sebelum diaktifkan |
|---|---|---|
| TTE otomatis | Integrasi pihak ketiga dan risiko SSRF/TLS | Origin allowlist, TLS wajib, isolasi kredensial, test provider. |
| WhatsApp otomatis | Membutuhkan worker persisten dan pengelolaan sesi | Supervisor, secret storage, retry, monitoring, SOP reconnect. |
| GIS lanjutan | Menambah beban data dan risiko privasi | Use case jelas, sumber data, privacy review, uji performa. |
| Lapak/BUMDes kompleks | Bukan prasyarat SID dasar | Kebutuhan desa dan model operasional tervalidasi. |
| Plugin ecosystem | Menambah permukaan keamanan dan kompatibilitas | Permission sandbox, versioning, review/signing plugin. |
| Langganan, invoice, dan pembayaran platform | Belum ada model komersial; menyentuh data finansial dan integrasi payment gateway | Keputusan model bisnis, provider pembayaran, rekonsiliasi, audit, dan kebijakan pajak/privasi. Jangan dianggap bagian Fase 2. |
| Analitik penggunaan dan telemetri tenant | Belum ada pipeline event/metrik; berisiko mengumpulkan data pribadi tanpa dasar yang jelas | Definisikan metrik, retensi, agregasi, akses, dan privasi lebih dulu; kaitkan dengan observabilitas Fase 5. |
| Editor template dan pemilihan tema website | Istilah "template fondasi tenant" dan "tema website" masih tercampur; `theme` baru diisi seed dan registry yang dirujuk schema belum ada | Pisahkan kontrak template vs tema, buat model data dan validasi tenant, lalu tetapkan permission serta audit perubahan. |
| Pusat keamanan/firewall di konsol | Sebagian besar kontrol bersifat infrastruktur, bukan fitur aplikasi; dashboard tidak boleh disalahartikan sebagai kontrol keamanan | Terapkan kontrol di ingress/host, siapkan sumber status yang tepercaya, dan batasi aksi ke operator berwenang. |

## 5. Validasi sebelum backlog final

- Walkthrough UI per role: Super Admin, Admin Desa, operator, dan warga.
- Verifikasi alur bisnis dengan perangkat desa.
- Jalankan unit test, integration test, dan test isolasi dua tenant.
- Pastikan semua fitur memiliki permission, validasi tenant, audit trail, serta backup yang sesuai.
- Modul yang memiliki folder atau route belum otomatis berarti seluruh fitur sudah lengkap.
