# Master Roadmap — Appdes SID

> Roadmap stabilisasi, penguatan multi-tenant, dan pengembangan Sistem Informasi Desa.  
> Repository: `fahmiorim/appdes` · Baseline audit statis: 12 November 2026 · Relevansi perluasan mockup ditinjau: 19 November 2026.

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

**Penegakan invarian di kode (18 November 2026):** fallback satu desa kini opt-in lewat `TENANT_LEGACY_SINGLE_HOST_FALLBACK` dan default mati, host tak dikenal di halaman menghasilkan 404, serta konfigurasi ditolak bila host platform `flexidesa.id` dipakai pada production dengan fallback aktif (PR #135, #137, #138). Host platform dipisah dari `DESA_BASE_DOMAIN` lewat `PLATFORM_HOSTS`; `/` menampilkan landing page platform untuk host tersebut (PR #130).

**Catatan baseline:** tenant resolver, wildcard slug, domain alias, provisioning desa, dan host-only cookie sudah ditemukan pada audit statis. Landing page platform sudah ada, tetapi produsen host lain belum: `demo.flexidesa.id`, host reserved, dan classifier domain di proxy belum tersedia. Better Auth masih memakai satu `BETTER_AUTH_URL`, custom domain verification belum ditemukan, dan DNS/TLS/reverse proxy belum diverifikasi.

## 2B. Relevansi fase terhadap perluasan mockup Super Admin (19 November 2026)

**Kesimpulan:** Fase 0–6 dan urutannya tetap relevan. Perluasan menjadi 39 layar Super Admin memperjelas arah konsol, tetapi tidak menciptakan 23 modul siap pakai: audit memetakan 15 layar sebagai sebagian dan 23 layar belum memiliki fitur atau model data. Mockup tidak boleh dipakai sebagai acceptance data, dan tidak ada area baru yang boleh melompati gate keamanan tenant serta operasional Fase 1/5.

Ekspansi 46 layar Admin Desa pada hari yang sama tidak mengubah urutan fase. Backend modul desa (kehadiran, inventaris, keluarga, mutasi penduduk, bumindes, pembangunan, statistik, kesehatan, bantuan, survei, dan persuratan) sudah tersedia di server, sedangkan UI-nya belum; pekerjaan berikutnya adalah menghubungkan UI ke use case yang ada, bukan membangun backend baru. Rincian per modul ada di [audit kesiapan backend mockup baru](./reports/05-ui-audit/MOCKUP-BACKEND-READINESS-2026-11-19.md).

| Area di mockup | Kondisi repository | Fase/prioritas | Keputusan |
|---|---|---|---|
| Dashboard, tenant, domain, pengguna platform, audit, pengaturan | Tujuh route sudah ada; kedalaman berbeda dari mockup | Fase 2 lanjutan · P1/P2 | Perdalam dengan data nyata dan walkthrough staging. Tidak perlu model data baru untuk memperbaiki tampilan yang sudah didukung. |
| Wizard provisioning, import tenant, dan matriks peran | Sebagian use case tersedia; alur belum satu paket | Fase 2/3 · P2 | Kerjakan setelah validasi tenant dan template stabil; import wajib memiliki validasi, batas ukuran, dan audit. |
| Katalog template, editor template, dan tema website | Template fondasi ada; editor dan registry tema belum | Fase 2 (template fondasi) dan Fase 3 (tema situs) · P2 | Pisahkan kontrak "template fondasi tenant" dari "tema website" sebelum membuat UI. Jangan mencampur keduanya dalam satu menu. |
| Langganan, paket, invoice, dan pembayaran | Belum ada model komersial | Kandidat Fase 7 · P3 | Ditunda sampai keputusan bisnis, provider pembayaran, rekonsiliasi, audit, dan kebijakan pajak/privasi tersedia. |
| Monitoring, backup, dan manajemen insiden | Sebagian prosedur operasional; belum ada UI terpusat | Fase 5 · P1/P2 | Bangun sumber metrik dan prosedur operasi lebih dulu. UI konsol mengikuti, bukan menggantikan backup/restore yang terbukti. |
| Pusat keamanan, sesi, firewall, dan pembatasan akses | Kontrol tersebar; firewall berada di infrastruktur | Fase 1/5 · P1 | Kontrol tetap di server/ingress. Dashboard hanya menampilkan status tepercaya dan aksi berizin; jangan menyamakan tampilan dengan jaminan keamanan. |
| Laporan, analitik penggunaan, dan statistik tenant | Belum ada pipeline event/metrik | Fase 5/6 · P3 | Definisikan metrik, agregasi, retensi, dan privasi sebelum mengumpulkan data. Jangan memakai angka contoh dari mockup. |
| Dukungan, broadcast, feature flag, dan impersonasi | Belum ada; impersonasi memerlukan keputusan keamanan | Fase 6 · P3 | Masuk backlog setelah audit trail dan permission platform matang. Impersonasi wajib memiliki persetujuan, batas waktu, dan audit. |

**Keputusan roadmap:**

1. Fase 0–6 tidak dipecah atau dinomori ulang karena penambahan mockup.
2. Area baru di atas adalah backlog platform, bukan tambahan deliverable yang otomatis masuk fase yang sedang berjalan.
3. Fase 2 tetap ditutup secara operasional melalui walkthrough staging, bukan dengan mengejar seluruh tampilan mockup.
4. Fase 7 hanya dibuka bila model komersial disetujui; sampai saat itu langganan dan invoice tetap ditunda.
5. Setiap butir tetap tunduk pada Definition of Done di §7, termasuk otorisasi server-side, isolasi tenant, audit, dan test negatif.

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

**Status implementasi (17 November 2026):** selesai untuk deliverable repository.
CI menjalankan quality, integration MySQL, build, dan ringkasan pada semua PR;
`main` dilindungi keempat required check tersebut. `npm run test:integration`
melaporkan `SKIPPED` eksplisit, sedangkan `test:integration:ci` gagal bila database
tidak tersedia. Dokumentasi staging ada di `docs/deployment/STAGING.md`; inventaris
modul ada di `docs/architecture/MODULE-INVENTORY.md`; baseline ada di
`docs/reports/00-baseline/phase-0-baseline.json`. Bukti: PR #95 dan laporan
`docs/reports/00-baseline/phase-0-completion-report.md`. Dump database staging dan
deployment staging live tetap merupakan langkah operator karena memerlukan
environment eksternal.

### Fase 1 — Tenant isolation dan security hardening

**Prioritas:** P0 · **Penghambat produksi multi-tenant.**

Pekerjaan:
- Validasi `role.villageId` terhadap `users.villageId`; definisikan pengecualian platform Super Admin secara eksplisit.
- Audit foreign reference untuk penduduk, keluarga, RTM, KIA, surat, kelompok, bantuan, dan inventaris.
- Tambahkan composite unique dan composite FK untuk relasi tenant-scoped yang relevan.
- Perbaiki join/agregasi keluarga dan penduduk agar menyertakan villageId.
- Amankan TTE: origin allowlist, tolak URL absolut eksternal yang tidak disetujui, kontrol redirect, blok IP private/link-local, dan wajibkan TLS.
- Amankan webhook email: tenant hanya ditentukan dari `Host` yang dipertahankan proxy; `X-Forwarded-Host` diabaikan karena dapat dipalsukan klien. Signature HMAC bertimestamp mengikat `host` dan `eventId`, sedangkan credential per tenant masih menjadi pekerjaan terbuka.
- Cabut seluruh sesi admin desa ketika password di-reset.
- Tambahkan test dua tenant untuk jalur baca, tulis, import, dan export.

**Kriteria selesai:**
- Use case tidak dapat menyimpan relasi lintas tenant.
- TTE tidak mengirim Authorization ke host yang tidak disetujui.
- Reset password membatalkan sesi lama.
- Test isolasi tenant lulus untuk modul prioritas.

**Status per 18 November 2026: selesai di repository, belum ditutup secara operasional.** Seluruh deliverable kode dan schema sudah merged: validasi kepemilikan role, composite FK lewat migration `0001`–`0011`, validasi foreign reference penduduk/keluarga/rumah tangga/KIA/permohonan surat, join ber-`villageId`, hardening TTE (allowlist origin, TLS wajib), hardening webhook email, dan pencabutan sesi saat reset password. Rincian bukti ada pada `docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md` dan laporan AUD terkait. Fase ini **belum boleh ditandai selesai** karena migration belum dijalankan pada staging atau production, provider TTE serta reverse proxy nyata belum diverifikasi, dan `users.role_id` beserta empat tabel anak tanpa `village_id` masih dijaga di application layer.

### Fase 2 — Super Admin dan lifecycle tenant

**Prioritas:** P1 · **Prasyarat:** model role dan tenant sudah aman.

**Status kode per 18 November 2026: implementasi repository selesai dan merged ke `main` melalui PR #106–#112.** Hasilnya mencakup bootstrap Super Admin, provisioning berbasis template, konsol tenant, pengelolaan domain, lifecycle retensi/purge, ekspor template, dan cleanup ekspor terjadwal. Ini menandai selesainya pekerjaan kode yang tercantum pada fase ini, bukan bukti deployment atau penerimaan operasional. Perluasan 38 mockup pada 19 November tidak membatalkan status ini; area baru yang belum didukung dicatat sebagai backlog di §2B.

**Kriteria kode selesai:**
- Konsol terpisah mengelola provisioning, status, kuota, reset admin, domain, ekspor, dan purge tenant dengan otorisasi server-side.
- Provisioning menggunakan template platform dan tidak memerlukan desa sumber.
- Aksi sensitif yang didukung use case mencatat audit trail.
- Lifecycle menerapkan masa tenggang, ekspor wajib, purge, tombstone domain, dan cleanup ekspor kedaluwarsa.

**Validasi operasional yang masih terbuka:**
- Lakukan walkthrough konsol pada staging dengan tenant sintetis, termasuk provisioning, reset admin, perubahan domain, ekspor, dan status retensi.
- Pasang systemd timer cleanup pada server yang dituju, lalu verifikasi jadwal dan log eksekusinya.
- Tinjau template bawaan yang masih minimal sebelum onboarding tenant nyata.
- Uji bootstrap dan login Super Admin pada lingkungan staging yang disetujui; jangan menguji pada production tanpa prosedur rilis.

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
- Perbaiki race condition agregasi keuangan, kuota media, dan transisi status surat. (Ketiganya sudah memakai transaksi atau lock di repository per 18 November 2026; validasi beban nyata belum dilakukan.)

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

Butir 1–4 sudah memiliki implementasi kode dan laporan di `main`. Kolom bukti selesai di bawah adalah acceptance yang masih harus diverifikasi, bukan tanda pekerjaan dimulai dari nol.

| Urutan | Pekerjaan | Bukti selesai |
|---|---|---|
| 1 | CI dan baseline test | Hasil typecheck/lint/test tercatat; integration skip jelas |
| 2 | Fix TTE URL, Authorization, dan TLS | Test lintas origin, redirect, private IP, dan HTTPS |
| 3 | Audit foreign reference tenant | Daftar relasi, perbaikan, dan test per modul |
| 4 | Role ownership dan session reset | Test role lintas tenant dan invalidasi sesi lama |
| 5 | Backup media dan restore drill | Dokumentasi dan hasil pemulihan staging |
| 6 | Walkthrough konsol Super Admin di staging | Hasil uji provisioning, domain, reset admin, ekspor, dan retensi |

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
