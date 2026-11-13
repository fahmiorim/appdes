# Master Roadmap — Appdes SID

> Roadmap stabilisasi, penguatan multi-tenant, dan pengembangan Sistem Informasi Desa.  
> Repository: `fahmiorim/appdes` · Baseline audit statis: 12 November 2026.

## 1. Prinsip roadmap

1. Stabilkan keamanan dan integritas tenant sebelum menambah modul baru.
2. Pertahankan stack saat ini: Next.js, TypeScript, MySQL, Drizzle ORM, Better Auth, Zod, dan Vitest.
3. Pertahankan IDM sebagai modul inti.
4. Bangun area Super Admin platform yang terpisah dari Admin Desa.
5. Gunakan server pusat dengan isolasi data tenant; hindari kompleksitas arsitektur yang belum dibutuhkan.
6. Setiap fase harus memiliki acceptance criteria dan bukti pengujian.

## 2. Ringkasan fase

| Fase | Fokus | Prioritas | Output |
|---|---|---|---|
| 0 | Baseline dan quality gate | P0 | CI, baseline schema, environment, risiko tervalidasi |
| 1 | Tenant isolation dan security hardening | P0 | Perbaikan role, foreign reference, join, TTE, forwarded host |
| 2 | Super Admin dan lifecycle tenant | P1 | Dashboard tenant, template provisioning, lifecycle, audit |
| 3 | Core SID dan data dasar | P1 | Penduduk, keluarga, wilayah, surat, IDM stabil |
| 4 | Layanan dan tata kelola desa | P2 | Bantuan, inventaris, pembangunan, KIA, kehadiran, arsip |
| 5 | Reliability dan operasi | P1/P2 | Backup DB+media, restore drill, monitoring, SOP |
| 6 | Integrasi dan fitur tambahan | P3 | TTE, WhatsApp, API lanjutan, GIS, plugin setelah hardening |

## 2A. Arsitektur domain FlexiDesa

**Dokumen acuan:** [FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md](architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md).

Target hostname:
- `flexidesa.id`: landing page platform.
- `admin.flexidesa.id`: konsol Super Admin platform.
- `demo.flexidesa.id`: tenant demo khusus dengan data sintetis.
- `<slug>.flexidesa.id`: website dan Admin Desa tenant.
- Domain custom: hanya setelah verifikasi kepemilikan dan TLS.

Pekerjaan domain dilakukan setelah hardening isolasi tenant prioritas P0/P1. Urutan implementasi: keputusan hostname/auth → classifier dan reserved slug → server-side tenant context → routing platform/demo → auth multi-host → staging DNS/TLS/reverse proxy → custom domain verification.

Invarian: host platform/reserved/unknown tidak boleh jatuh ke tenant; tidak ada fallback single-tenant implisit pada production FlexiDesa; hostname bukan autentikasi; sesi default host-only; seluruh operasi privat tetap memeriksa session, permission, dan tenant di server.

**Catatan baseline:** tenant resolver, wildcard slug, domain alias, provisioning desa, dan host-only cookie sudah ditemukan pada audit statis. Proxy belum menjadi classifier domain platform, Better Auth masih memakai satu `BETTER_AUTH_URL`, custom domain verification belum ditemukan, dan DNS/TLS/reverse proxy belum diverifikasi.

## 3. Rincian fase

### Fase 0 — Baseline, kualitas, dan lingkungan

**Prioritas:** P0 · **Posisi:** sebelum perubahan besar.

Pekerjaan:
- Tetapkan baseline commit dan snapshot database staging.
- Siapkan pipeline CI untuk install, typecheck, lint, format check, dan test.
- Pisahkan unit test dan integration test; test integrasi harus melaporkan status skip secara eksplisit bila MySQL tidak tersedia.
- Dokumentasikan environment wajib, secret, versi Node, dan proses deployment.
- Inventarisasi route, action, repository, dan use case per modul.

**Kriteria selesai:**
- Pipeline CI berjalan pada setiap pull request.
- Test yang di-skip tidak dilaporkan sebagai bukti keberhasilan integrasi.
- Staging dapat dibangun berdasarkan dokumentasi.

### Fase 1 — Tenant isolation dan security hardening

**Prioritas:** P0 · **Penghambat produksi multi-tenant.**

Pekerjaan:
- Validasi `role.villageId` terhadap `users.villageId`; definisikan pengecualian platform Super Admin secara eksplisit.
- Audit foreign reference untuk penduduk, keluarga, RTM, KIA, surat, kelompok, bantuan, dan inventaris.
- Tambahkan composite unique dan composite FK untuk relasi tenant-scoped yang relevan.
- Perbaiki join/agregasi keluarga dan penduduk agar menyertakan villageId.
- Amankan TTE: origin allowlist, tolak URL absolut eksternal yang tidak disetujui, kontrol redirect, blok IP private/link-local, dan wajibkan TLS.
- Amankan webhook email: reverse proxy harus menimpa forwarded host atau tenant diikat ke credential webhook.
- Cabut seluruh sesi admin desa ketika password di-reset.
- Tambahkan test dua tenant untuk jalur baca, tulis, import, dan export.

**Kriteria selesai:**
- Use case tidak dapat menyimpan relasi lintas tenant.
- TTE tidak mengirim Authorization ke host yang tidak disetujui.
- Reset password membatalkan sesi lama.
- Test isolasi tenant lulus untuk modul prioritas.

### Fase 2 — Super Admin dan lifecycle tenant

**Prioritas:** P1 · **Prasyarat:** model role dan tenant sudah aman.

Pekerjaan:
- Bangun area Super Admin yang terpisah dari Admin Desa.
- Dashboard daftar desa: status, domain, jumlah pengguna/penduduk/jenis surat, dan kuota media.
- Halaman detail tenant: identitas, domain utama/alias, kuota, status, dan akun admin.
- Buat provisioning berbasis template platform, bukan menyalin desa pertama.
- Definisikan suspend/reactivate, reset admin, pengelolaan domain, dan audit trail.
- Definisikan soft delete, retensi, ekspor data, dan prosedur purge khusus.

**Kriteria selesai:**
- Platform Super Admin dapat membuat dan mengelola tenant tanpa menyamar sebagai Admin Desa.
- Provisioning bekerja pada instalasi baru tanpa desa sumber.
- Semua aksi sensitif tercatat dalam audit trail.

### Fase 3 — Stabilkan core SID

**Prioritas:** P1 · **Fokus:** fondasi pelayanan desa.

Pekerjaan:
- Validasi master wilayah dan profil desa.
- Stabilkan penduduk, keluarga, rumah tangga, dan mutasi.
- Stabilkan jenis surat, persyaratan, permohonan, verifikasi, penerbitan, dan arsip.
- Pertahankan IDM: indikator IKS/IKE/IKL, klasifikasi, SDGs, laporan, dan ekspor.
- Rapikan hak akses dan alur peran operator, sekretaris, kepala desa, dan warga.
- Validasi import/export dan sanitasi CSV/spreadsheet.

**Kriteria selesai:**
- Data dasar dapat dikelola tanpa relasi silang tenant.
- Surat dapat diajukan, diverifikasi, diproses, dan ditelusuri melalui audit.
- IDM menghasilkan klasifikasi/laporan konsisten dengan aturan bisnis.

### Fase 4 — Modul layanan dan tata kelola

**Prioritas:** P2 · **Prasyarat:** core SID stabil.

Pekerjaan:
- Bantuan sosial: program, sasaran, peserta, import, dan laporan.
- Inventaris: aset, kategori, status, persetujuan, dan audit.
- Pembangunan: kegiatan, dokumentasi, dan laporan.
- Kesehatan/KIA: Posyandu, ibu hamil, anak; batasi akses data sensitif.
- Kehadiran perangkat, arsip, pengaduan, umpan balik, agenda, dan statistik.
- Anjungan/kiosk dengan device binding dan uji keamanan.

**Kriteria selesai:**
- Setiap modul memiliki owner proses, permission, audit log, dan test tenant.
- Data sensitif hanya terlihat oleh role berwenang.
- Upload/download memiliki validasi dan backup.

### Fase 5 — Reliability, backup, dan operasi

**Prioritas:** P1/P2 · **Berjalan paralel dan wajib sebelum skala.**

Pekerjaan:
- Rancang backup database dan media sebagai satu paket pemulihan.
- Terapkan backup terenkripsi, offsite, retensi, checksum, dan pemantauan.
- Lakukan restore drill berkala di staging; catat RPO/RTO aktual.
- Tambahkan monitoring disk, database, worker/queue, proses WhatsApp, sertifikat TLS, dan domain.
- Sediakan log terpusat, alert, prosedur insiden, dan SOP operasional.
- Perbaiki race condition agregasi keuangan, kuota media, dan transisi status surat.

**Kriteria selesai:**
- Restore DB dan media berhasil pada lingkungan bersih.
- RPO/RTO ditetapkan berdasarkan hasil drill.
- Alert dan runbook telah diuji operator.

### Fase 6 — Integrasi dan ekspansi fitur

**Prioritas:** P3 · **Prasyarat:** hardening dan operasi dasar selesai.

Pekerjaan:
- Aktifkan TTE setelah risiko SSRF/TLS ditutup dan provider diuji.
- Aktifkan WhatsApp setelah worker persisten, penyimpanan kredensial, retry, dan monitoring tersedia.
- Perluas API eksternal dengan scope per key, rotasi, rate limit, dan audit.
- Kembangkan GIS lanjutan berdasarkan kebutuhan dan review privasi.
- Evaluasi plugin, Lapak/BUMDes, dan modul tambahan berdasarkan penggunaan nyata.

**Kriteria selesai:**
- Setiap integrasi memiliki threat model, owner, monitoring, dan fallback manual.
- Fitur tambahan tidak mengganggu layanan inti.

## 4. Dependensi penting

| Pekerjaan | Bergantung pada | Jangan dimulai sebelum |
|---|---|---|
| Provisioning platform | Template bootstrap dan role platform | Model role/tenant disepakati dan diuji |
| Pengelolaan penduduk/keluarga | Composite FK dan validasi foreign reference | Strategi integritas tenant tersedia |
| TTE produksi | Origin allowlist, redirect guard, TLS wajib | Temuan AUD-019/AUD-020 ditutup dan diuji |
| Kiosk pengajuan surat | Device identity dan resident ownership | Jalur AUD-006 tervalidasi |
| Skala banyak desa | Backup media, restore drill, monitoring | RPO/RTO dan pemulihan terbukti |
| WhatsApp otomatis | Worker persisten dan observability | SOP deployment/reconnect tersedia |

## 5. Backlog prioritas awal

| Urutan | Pekerjaan | Bukti selesai |
|---|---|---|
| 1 | CI dan baseline test | Hasil typecheck/lint/test tercatat; integration skip jelas |
| 2 | Fix TTE URL, Authorization, dan TLS | Test lintas origin, redirect, private IP, dan HTTPS |
| 3 | Audit foreign reference tenant | Daftar relasi, perbaikan, dan test per modul |
| 4 | Role ownership dan session reset | Test role lintas tenant dan invalidasi sesi lama |
| 5 | Backup media dan restore drill | Dokumentasi dan hasil pemulihan staging |
| 6 | Rencana Super Admin UI | Route, menu, permission, dan acceptance criteria |

## 6. Risiko bila urutan tidak diikuti

- Menambah modul sebelum tenant integrity kuat memperluas titik potensi kebocoran lintas desa.
- Mengaktifkan TTE sebelum SSRF/TLS ditangani membahayakan kredensial provider dan dokumen.
- Menganggap backup database sama dengan backup aplikasi dapat menyebabkan file media hilang saat pemulihan.
- Membangun banyak fitur opsional sebelum core stabil menaikkan biaya pemeliharaan dan memperpanjang waktu rilis.

## 7. Definition of Done setiap modul

- Use case memvalidasi sesi, permission, dan villageId dari sumber tepercaya; tenant ID dari klien tidak dijadikan otorisasi.
- Foreign reference diverifikasi tenant dan didukung constraint database bila memungkinkan.
- Create/read/update/delete/import/export memiliki test positif, negatif, dan lintas tenant.
- Upload memiliki batas ukuran, validasi MIME dan signature, penyimpanan aman, serta cleanup.
- Operasi penting memiliki audit trail dan penanganan kegagalan yang jelas.
- Dokumentasi operator, backup, monitoring, dan pemulihan tersedia.

## 8. Penutup

Roadmap memprioritaskan stabilitas dan keamanan multi-tenant sebelum ekspansi fitur. Pendekatan ini memungkinkan appdes berkembang sebagai platform SID terpusat tanpa memaksakan migrasi stack atau menambah kompleksitas yang belum diperlukan.

Estimasi durasi sprint belum ditetapkan karena kapasitas tim, jumlah developer, dan target rilis belum menjadi bagian dari audit.
