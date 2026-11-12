# SID Feature Map — Appdes

> Peta modul, fungsi, status bukti implementasi, prioritas, dan pekerjaan lanjutan.  
> Repository: `fahmiorim/appdes` · Pemeriksaan statis: 12 November 2026.

## 1. Cara membaca status

Status di bawah menunjukkan keberadaan struktur/kode yang teridentifikasi pada repository. Status ini **bukan jaminan bahwa seluruh alur siap dipakai di produksi**.

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
| Platform multi-desa | `multi-desa`, `desa`, `pelanggan` | Provisioning, domain, status, kuota, akun admin | Backend use case teridentifikasi; UI Super Admin belum jelas | Core platform | Dashboard Super Admin dan template bootstrap independen. |
| Auth & RBAC | `auth`, `rbac` | Login, sesi, role, permission | Struktur dan use case tersedia | Core | Validasi role ownership dan invalidasi sesi. |
| Website desa | `publik`, `konten`, `navigation` | Profil, konten, menu, tema, media | Implementasi luas teridentifikasi | Core | Backup media, signature validation, SEO/editor regression. |
| Profil & wilayah | `wilayah`, `desa`, `gis` | Identitas desa, wilayah, peta | Struktur fitur teridentifikasi | Core | Validasi relasi wilayah pada tenant yang sama. |
| Penduduk | `penduduk`, `warga` | Data penduduk, pencarian, mutasi, katalog | Use case/repository tersedia | Core | Validasi family/region/katalog lintas tenant; test import. |
| Keluarga | `keluarga` | Kartu keluarga, kepala dan anggota keluarga | Implementasi teridentifikasi | Core | Tenant filter pada join/agregasi dan regionId. |
| Rumah tangga | `rumah-tangga` | Data rumah tangga dan anggota | Implementasi teridentifikasi | Important | Validasi regionId dan composite FK. |
| Surat & layanan mandiri | `surat`, `layanan-mandiri` | Jenis surat, persyaratan, permohonan, proses, dokumen | Backend dan route teridentifikasi | Core | Validasi resident/letter type; transisi status atomik; uji kiosk. |
| IDM / SDGs | `idm` | IKS, IKE, IKL, klasifikasi, SDGs, laporan | Domain/use case/test teridentifikasi | Core | **Pertahankan sebagai fitur inti**; validasi perhitungan dengan data nyata. |
| Bantuan sosial | `bantuan` | Program bantuan, sasaran, peserta, impor | Use case/repository teridentifikasi | Important | Audit impor dan relasi sumber. |
| Kelompok masyarakat | `kelompok` | Kelompok, kategori, anggota | Implementasi teridentifikasi | Important | Audit mutation dan join tenant-scoped. |
| Inventaris | `inventaris` | Aset, kategori, kondisi, status | Use case/repository dan audit trail teridentifikasi | Important | Uji workflow persetujuan dan relasi kategori. |
| Pembangunan | `pembangunan` | Kegiatan dan dokumentasi pembangunan | Use case teridentifikasi | Important | Pastikan update/delete tenant-scoped dan cleanup file. |
| Keuangan / APBDes | `keuangan` | APBDes, impor spreadsheet, nilai dan laporan | Import dan batch upsert teridentifikasi | Important | Perbaiki race condition agregasi; validasi file. |
| Kesehatan / KIA | `kesehatan` | Posyandu, KIA, ibu hamil, pemantauan anak | Schema/use case/repository/ekspor teridentifikasi | Important | Validasi relasi tenant; data sangat sensitif. |
| Kehadiran | `kehadiran` | Kehadiran perangkat desa | Repository dan test isolasi terbatas | Important | Perluas test tenant isolation dan alur absensi. |
| Arsip | `arsip` | Arsip dan berkas desa | Repository dan test isolasi terbatas | Important | Backup berkas dan kontrol akses unduhan. |
| Pengaduan & umpan balik | `pengaduan`, `umpan-balik`, `pendapat` | Masukan warga, pengaduan, survei/pendapat | Struktur fitur teridentifikasi; workflow perlu validasi | Important | Moderasi, SLA, privasi, notifikasi. |
| Notifikasi & pesan | `notifikasi`, `pesan-warga` | Notifikasi aplikasi dan komunikasi | Struktur teridentifikasi | Optional | Tenant binding webhook, antrean, monitoring. |
| API eksternal/publik | `api-eksternal`, `api-publik` | Integrasi API dan API key | Hash key dan rate limit pada endpoint yang ditinjau | Optional | Scope per key, rotasi, audit, rate limit menyeluruh. |
| TTE | `surat` / domain TTE | Tanda tangan elektronik provider | Backend teridentifikasi | Deferred / Needs validation | Jangan aktifkan produksi sebelum SSRF/TLS ditangani. |
| WhatsApp | integrasi notifikasi / Baileys | Notifikasi WhatsApp | Dependensi dan penyimpanan auth teridentifikasi; deployment belum diverifikasi | Deferred | Worker persisten, retry, secret storage, monitoring. |
| GIS lanjutan | `gis` | Pemetaan dan visualisasi wilayah | Struktur fitur teridentifikasi | Optional | Sumber data, privasi titik penduduk, performa. |
| Anjungan | `anjungan` | Kiosk layanan mandiri | Repository dan test isolasi terbatas | Important | Device binding dan resident ownership. |
| Lapak / BUMDes | `lapak`, `bumindes` | Lapak produk dan administrasi BUMDes | Fitur dan sebagian test teridentifikasi | Optional | Tentukan kebutuhan desa dan model operasional. |
| Modul pendukung | `agenda`, `statistik`, `analisis`, `survey`, `kontak`, `buku-tamu`, `plugin`, dll. | Fitur pelengkap SID | Tingkat implementasi bervariasi | Optional / Needs validation | Prioritaskan berdasar kebutuhan dan biaya pemeliharaan. |

## 3. Modul inti MVP yang disarankan

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

## 5. Validasi sebelum backlog final

- Walkthrough UI per role: Super Admin, Admin Desa, operator, dan warga.
- Verifikasi alur bisnis dengan perangkat desa.
- Jalankan unit test, integration test, dan test isolasi dua tenant.
- Pastikan semua fitur memiliki permission, validasi tenant, audit trail, serta backup yang sesuai.
- Modul yang memiliki folder atau route belum otomatis berarti seluruh fitur sudah lengkap.
