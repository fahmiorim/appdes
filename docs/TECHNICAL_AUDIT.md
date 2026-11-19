# Technical Audit — Appdes

> **Repository:** `fahmiorim/appdes`  
> **Branch yang diperiksa:** `main`  
> **Tanggal pemeriksaan:** 12 November 2026  
> **Metode:** audit statis source code, schema, route, konfigurasi, dan test.
>
> **Catatan pembaruan (18 November 2026):** isi temuan dipertahankan sebagai snapshot audit awal. Status kode terkini untuk setiap temuan yang sudah diremediasi dicatat pada tabel di awal §5 dan pada temuan yang buktinya berubah (AUD-021, AUD-029).
>
> **Catatan koreksi status (19 November 2026):** beberapa klaim status dikoreksi setelah pemeriksaan ulang terhadap kode: konfigurasi cookie cache (§3), status AUD-013, AUD-015, dan AUD-028, bukti AUD-030 dan AUD-031, serta angka inventaris §2. Temuan lain tetap snapshot audit awal. Rincian dan bukti ada di [laporan pemeriksaan status](./reports/00-baseline/TECHNICAL-AUDIT-STATUS-CHECK-2026-11-19.md).
>
> **Catatan status (19 November 2026):** inventaris kode kini 48 `page.tsx` (19 halaman admin: 12 Admin Desa + 7 konsol platform), 82 route handler, 52 direktori fitur, 16 migrasi (`0000`–`0015`), dan 50 berkas `*.integration.test.ts` (53 test terpetakan). Temuan AUD di bawah tetap snapshot; status UI per layer ada di [audit mockup dan dokumen](./reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md).

## 1. Ringkasan eksekutif

Audit ini menilai arsitektur, kesiapan multi-tenant, keamanan data, integrasi, dan kesiapan operasional aplikasi Sistem Informasi Desa (SID).

Aplikasi menggunakan Next.js App Router, React, TypeScript, MySQL, Drizzle ORM, Better Auth, Zod, dan Vitest. Struktur fitur cukup luas dan pada banyak modul menerapkan pemisahan domain, application, dan infrastructure.

**Kesimpulan:** fondasi teknis cukup baik untuk dilanjutkan, tetapi aplikasi belum dapat dinyatakan siap produksi multi-tenant sebelum temuan prioritas tinggi ditangani dan pengujian runtime dilakukan. Area paling penting adalah integritas relasi antar-tenant, validasi foreign reference, pengamanan integrasi TTE, serta pembuktian backup dan restore media.

### Ringkasan area

| Area | Penilaian statis | Catatan |
|---|---|---|
| Arsitektur | Baik | Next.js App Router, TypeScript, pemisahan fitur/lapisan. |
| Resolusi tenant | Baik dengan syarat | Exact host, alias, wildcard; konfigurasi reverse proxy harus benar. |
| Auth dan RBAC | Perlu hardening | Role ownership dan invalidasi sesi perlu diperkuat. |
| Integritas data tenant | Prioritas tinggi | Sejumlah relasi belum memakai constraint komposit tenant. |
| Integrasi TTE | Prioritas tinggi | URL hasil provider dan header Authorization perlu dibatasi. |
| Backup/restore | Sebagian tersedia | Backup DB dan restore ada; backup media belum terverifikasi. |
| Pengujian | Belum tervalidasi | Test tersedia tetapi tidak dijalankan dalam audit ini. |

## 2. Ruang lingkup dan metodologi

Audit dilakukan secara **read-only** terhadap repository. Tidak ada perubahan source code, migrasi database, penghapusan file, atau operasi tulis ke lingkungan aplikasi.

Inventaris statis yang teridentifikasi:
- 1.307 file ter-track di Git (per 19 November 2026).
- 52 direktori fitur aktual.
- 284 file test, termasuk 50 integration test.
- 79 file schema TypeScript di `src/db/schema/`.
- Satu baseline SQL migration saat audit: `src/db/migrations/0000_baseline.sql` (per 19 November 2026: 16 migrasi, `0000`–`0015`).
- 130 entri halaman/API (per 19 November 2026: 48 halaman `page.tsx`, 82 route handler, 52 direktori fitur, dan 79 berkas schema; 284 berkas test termasuk 50 integration test).
- Stack utama: Next.js 16.4.2, React 19.3.0, TypeScript, MySQL, Drizzle ORM, Better Auth, Zod, Vitest.

Tidak dilakukan:
- Menjalankan build, lint, typecheck, atau test.
- Mengakses database atau melakukan migrasi.
- Penetration test, fuzzing, atau uji eksploitasi.
- Verifikasi konfigurasi server, reverse proxy, firewall, DNS, dan provider eksternal.
- Uji pemulihan backup.

Karena itu, temuan yang berasal dari source code dibedakan dari risiko yang masih memerlukan validasi runtime/deployment.

## 3. Arsitektur dan komponen

| Komponen | Teknologi / lokasi |
|---|---|
| Frontend dan routing | Next.js App Router, React, TypeScript |
| Database | MySQL, Drizzle ORM; schema di `src/db/schema/` |
| Autentikasi | Better Auth; sesi 7 hari, update age 1 hari, cookie cache dimatikan sehingga sesi diverifikasi ke database setiap permintaan |
| Validasi | Zod dan validasi domain/use case |
| Pengujian | Vitest; unit test dan sebagian integration test MySQL |
| Migrasi | `src/db/migrations/`, Drizzle journal |
| Script kualitas | `check` menjalankan typecheck, lint, format check, dan test |

Route group yang teridentifikasi: `(admin)`, `(public)`, `(warga)`, dan `api`. Pada pemeriksaan 12 November 2026 group khusus `(super-admin)` tidak ditemukan; per 18 November 2026 konsol Super Admin tersedia di `src/app/(admin)/super-admin/` dengan tujuh halaman.

## 4. Kontrol positif yang teridentifikasi

1. Resolusi tenant menggunakan exact host, alias, dan wildcard subdomain. Fallback satu desa bersifat opt-in (`TENANT_LEGACY_SINGLE_HOST_FALLBACK`, default mati), host platform selalu menghasilkan `null`, dan host tak dikenal menjadi 404. Pada production dengan host platform `flexidesa.id`, konfigurasi fallback aktif ditolak.
2. `getCurrentUser()` pada `src/lib/dal.ts` membaca ulang status aktif, villageId, roleId, dan status desa dari database.
3. Backup dan restore database memerlukan Super Admin. Restore membatasi ukuran upload, menerima satu file SQL/SQL.GZ, dan melakukan verifikasi tabel wajib setelah restore.
4. API key eksternal disimpan dalam bentuk hash, mendukung status aktif/kedaluwarsa, dan mencatat last-used.
5. Media publik dibatasi berdasarkan tenant/host, kategori publik, pencegahan path traversal, dan CSP sandbox untuk SVG.
6. `src/lib/sanitize.ts` menerapkan allowlist sanitasi HTML.
7. Import APBDes menerapkan batas ukuran, validasi data, dan upsert batch transaksional yang memakai kunci `(desa, tahun)` serta mengagregasi ulang induk.
8. Ekspor kesehatan yang diperiksa menggunakan permission KIA, konteks desa dari sesi, dan respons private no-store.

## 5. Temuan audit

Prioritas:
- **P0/P1:** kritis/tinggi; harus ditangani sebelum layanan multi-tenant atau integrasi terkait dibuka ke produksi.
- **P2:** menengah; masukkan ke sprint hardening awal.
- **Positif:** kontrol yang sudah terlihat dan perlu dipertahankan.
- **Perlu validasi:** belum dapat dinyatakan sebagai kerentanan terkonfirmasi tanpa pemeriksaan runtime/deployment.

Status temuan sudah berubah sejak audit awal. Tabel berikut adalah ringkasan verifikasi kode per 18 November 2026; temuan yang sudah diperbaiki tetap disimpan di bawah sebagai jejak audit.

| Temuan | Status kode 18 November 2026 | Bukti |
|---|---|---|
| AUD-001 | Diperbaiki | `src/features/rbac/application/authorization.ts:40-49` memvalidasi `villageId` role dan pengecualian platform `villageId === null`. |
| AUD-002 | Diperbaiki | Migration `0001`–`0011`; `src/db/tenant-composite-fk.integration.test.ts` mengharapkan 68 constraint `%_tenant_fk`. Dicatat lulus pada MySQL disposable di `PHASE-1-CLOSURE-2026-11-17.md`; belum dijalankan pada staging/production. |
| AUD-003 | Diperbaiki | `validatePendudukTenantReferences` di `src/features/penduduk/application/use-cases.ts:104,141`; validasi family/region ber-`villageId` di repository. |
| AUD-004 | Diperbaiki | `validateKeluargaRegion` di `src/features/keluarga/application/use-cases.ts:172,199`. |
| AUD-005 | Diperbaiki | `validateRumahTanggaRegion` di `src/features/rumah-tangga/application/use-cases.ts:182,196`. |
| AUD-006 | Diperbaiki di kode; jalur kiosk belum diuji runtime | `src/features/layanan-mandiri/application/ajukan-surat.ts:65-71` memakai `findPendudukById(villageId, residentId)` dan `getSuratUntukWarga(villageId, letterTypeId)`; penyimpanan dalam transaksi. |
| AUD-007 | Diperbaiki | `src/lib/auth.ts:69` menetapkan `revokeSessionsOnPasswordReset: true`. |
| AUD-008 | Diperbaiki | `provisioning-repository.ts:103-104,161-191` memakai template platform `src/db/templates/tenant-template.ts`, bukan desa pertama. |
| AUD-011 | Diperbaiki | Join kepala keluarga, wilayah, dan agregasi anggota memakai `villageId` (`keluarga-repository.ts:123-147`). |
| AUD-012 | Diperbaiki | Join keluarga dan wilayah pada daftar penduduk memakai `villageId` (`penduduk-repository.ts:193-205`). |
| AUD-013 | Diperbaiki | `saveKeuanganNilai` berjalan di kunci MySQL `(desa, tahun)` + `db.transaction` (`keuangan-repository.ts:109`); impor APBDes memakai jalur yang sama, termasuk agregasi ulang induk. |
| AUD-014 | Diperbaiki | Pemeriksaan kuota dan penulisan berkas dijalankan di bawah kunci (`media-storage.ts:189`). |
| AUD-016 | Diperbaiki | Transisi status dalam `db.transaction` dan memeriksa `affectedRows` (`layanan-mandiri-repository.ts:258,339,358`). |
| AUD-017 | Diperbaiki | `validasiIsiMedia` memeriksa magic bytes, bukan MIME klien (`src/features/publik/domain/media.ts:104-126`). |
| AUD-019 | Diperbaiki di kode; provider nyata belum diuji | Allowlist `TTE_ALLOWED_HOSTS` dan validasi host provider (`src/features/surat/domain/tte.ts:255-277`, `src/lib/env.ts`). |
| AUD-020 | Diperbaiki | `TTE_SSL` dihapus dari environment; verifikasi TLS tidak dapat dimatikan lewat environment maupun konfigurasi desa (`src/lib/env.ts`). |
| AUD-021 | Diperbaiki | `src/app/api/webhooks/email/route.ts` hanya membaca `Host`; signature HMAC mengikat `host` dan `eventId`. |
| AUD-025 | Diperbaiki | `konteksKia` mengambil `villageId` dari sesi dan seluruh operasi KIA memakainya (`kia-use-cases.ts:52-97`). |
| AUD-029 | Sebagian: kode tertutup, konfigurasi proxy belum diverifikasi | `resolve-village.ts:38-40` hanya memakai `Host`; host tak dikenal menjadi 404 (PR #137); `getRequestOrigin()` masih memakai `X-Forwarded-Host` untuk URL absolut. |
| AUD-030 | Terbuka | Test repository memeriksa bahwa `where` dipanggil, tetapi belum mengassert predikat `villageId` (`kesehatan-repository.test.ts:66`); integration test dua tenant belum ada. |
| AUD-031 | Sebagian | 12 berkas integration test isolasi (11 per modul + `isolasi-village.integration.test.ts`); modul seperti keuangan, surat, layanan mandiri, dan agenda belum tercakup. |

Temuan AUD-009 dan AUD-010 sudah diperbarui langsung pada bagiannya. AUD-022 (matriks endpoint publik) tetap terbuka. AUD-015 (backup media) berstatus prosedur terdokumentasi tanpa drill, dan AUD-028 (regression test XSS) tertutup oleh `src/lib/sanitize.test.ts`.

### AUD-001 — Kepemilikan role terhadap tenant belum dibuktikan

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan validasi statis; eksploitabilitas belum dibuktikan.

**Bukti:** `src/lib/dal.ts`, `src/features/rbac/application/authorization.ts`, `src/features/rbac/infrastructure/rbac-repository.ts`. Perhitungan effective permissions mengambil role berdasarkan roleId; belum terlihat validasi eksplisit bahwa `role.villageId` sama dengan `user.villageId`.

Role slug `administrator` memberi hak penuh dalam konteks aplikasi desa dan bukan platform Super Admin. Provisioning memiliki pemeriksaan terpisah untuk platform user dengan `villageId === null` dan role slug `super-admin`.

**Dampak:** bila roleId dapat dimanipulasi atau relasi role salah, izin dapat dihitung dari role tenant lain.

**Rekomendasi:** validasi kepemilikan role untuk user desa; pertahankan pengecualian platform Super Admin secara eksplisit; tambah test roleId lintas tenant.

### AUD-002 — Foreign key belum menegakkan integritas tenant komposit

**Prioritas:** P1 — Tinggi  
**Status:** terlihat pada schema.

**Bukti:** `src/db/schema/resident.ts`, `family.ts`, `region.ts`, `permohonan-surat.ts`, `letter-types.ts`, `letters.ts`, dan `rumah-tangga.ts`. Relasi yang diperiksa umumnya merujuk ID tunggal tanpa composite foreign key yang memastikan `village_id` sama.

**Dampak:** relasi tenant A berpotensi menunjuk entitas tenant B jika validasi aplikasi terlewat.

**Rekomendasi:** tambahkan unique key `(village_id, id)` pada tabel induk dan composite FK `(village_id, foreign_id)` pada tabel anak, disertai validasi use case.

### AUD-003 — Foreign reference penduduk belum divalidasi berdasarkan tenant

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan terkonfirmasi secara statis.

**Bukti:** `src/features/penduduk/application/use-cases.ts`, `src/features/penduduk/infrastructure/penduduk-repository.ts`, `src/db/schema/resident.ts`. familyId, regionId, dan sejumlah ID katalog divalidasi bentuk ID-nya, tetapi belum tampak pemeriksaan kepemilikan tenant sebelum disimpan. Join keluarga/wilayah juga perlu filter tenant.

**Dampak:** referensi keluarga, wilayah, atau katalog dari desa lain dapat tersimpan/ditampilkan bila input mencapai jalur tersebut.

**Rekomendasi:** validasi semua referensi terhadap villageId yang sama pada create, update, dan import; scope mutation dan join dengan villageId.

### AUD-004 — Validasi wilayah pada keluarga belum tenant-scoped

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan terkonfirmasi secara statis.

**Bukti:** `src/features/keluarga/domain/keluarga.ts`, `src/features/keluarga/application/use-cases.ts`, `src/features/keluarga/infrastructure/keluarga-repository.ts`. regionId divalidasi sebagai ID opsional, lalu digunakan tanpa pemeriksaan kepemilikan wilayah pada tenant yang sama.

**Dampak:** keluarga dapat terhubung dengan wilayah tenant lain; join dapat menampilkan label lintas desa.

**Rekomendasi:** validasi regionId pada create/update dan gunakan composite FK serta join tenant-scoped.

### AUD-005 — Validasi wilayah rumah tangga belum tenant-scoped

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan terkonfirmasi secara statis.

**Bukti:** `src/features/rumah-tangga/domain/rumah-tangga.ts`, `application/use-cases.ts`, `infrastructure/rumah-tangga-repository.ts`, dan `src/db/schema/rumah-tangga.ts`.

**Dampak:** relasi rumah tangga–wilayah lintas tenant dapat tersimpan jika validasi aplikasi terlewat.

**Rekomendasi:** validasi regionId berdasarkan villageId saat create/update; scope join dan mutation.

### AUD-006 — Kepemilikan relasi permohonan surat perlu dipastikan untuk seluruh jalur

**Prioritas:** P1 — Tinggi  
**Status:** sebagian kontrol baik; jalur kiosk/perangkat perlu diverifikasi.

**Bukti:** `src/features/layanan-mandiri/application/ajukan-surat.ts`, `eksternal-use-cases.ts`, dan `infrastructure/layanan-mandiri-repository.ts`. Jalur eksternal mencari jenis surat dan penduduk berdasarkan villageId. Fungsi penyimpanan menerima villageId, residentId, dan letterTypeId; jalur kiosk/perangkat perlu ditelusuri untuk memastikan identitas perangkat dan penduduk tidak dapat dipalsukan.

**Dampak:** permohonan dapat terhubung ke penduduk atau jenis surat yang tidak sesuai tenant bila konteks device/session tidak tervalidasi.

**Rekomendasi:** validasi residentId dan letterTypeId pada tenant yang sama dalam transaksi; uji jalur warga login, kiosk, dan eksternal.

### AUD-007 — Reset password admin desa belum terlihat mencabut sesi lama

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan statis.

**Bukti:** `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`, `src/features/multi-desa/application/kelola-desa-use-cases.ts`, `src/lib/auth.ts`. Reset memperbarui credential dan mengaktifkan akun; penghapusan sesi user tidak terlihat.

**Dampak:** sesi lama mungkin tetap berlaku sampai kedaluwarsa atau invalidasi lain terjadi.

**Rekomendasi:** cabut seluruh sesi user ketika password di-reset dan uji bahwa sesi lama langsung ditolak.

### AUD-008 — Provisioning bergantung pada desa pertama sebagai template

**Prioritas:** P2 — Menengah  
**Status:** terbukti dari implementasi.

**Bukti:** `src/features/multi-desa/infrastructure/provisioning-repository.ts`. Provisioning menyalin role, modul, permission, tema, menu publik, klasifikasi/persyaratan/jenis surat, dan beberapa registry dari desa pertama. Jika tidak ada desa sumber, proses gagal.

**Dampak:** instalasi baru membutuhkan desa sumber dan konfigurasi tenant baru bergantung pada keadaan desa pertama.

**Rekomendasi:** buat template/bootstrap platform independen dan berversi; salin konfigurasi master saja, bukan data operasional/private.

### AUD-009 — Dashboard dan pengelolaan tenant Super Admin belum lengkap

**Prioritas awal:** P2 — Menengah

**Status awal (12 November 2026):** dashboard belum teridentifikasi dalam audit statis.

**Status kode terkini (18 November 2026):** dashboard tenant, konsol pengelolaan, domain alias, ekspor, dan lifecycle retensi/purge sudah ada di `main`. Validasi UI di staging masih terbuka.

**Temuan baseline:** audit 12 November tidak menemukan route group `(super-admin)`. Temuan itu menggambarkan snapshot saat audit, bukan kondisi kode sekarang.

**Bukti kode saat ini:** halaman `src/app/(admin)/super-admin/page.tsx` memeriksa role Super Admin dan menampilkan KPI, tabel tenant, serta konsol pengelolaan (`TenantConsole`). Server Action di `src/app/(admin)/super-admin/actions.ts` menghubungkan provisioning, status, kuota, reset admin, domain alias, ekspor, dan purge ke use case yang memanggil `requireSuperAdmin` kembali. Provisioning memakai template platform `src/db/templates/tenant-template.ts`, bukan desa pertama, sehingga instalasi baru tanpa desa sumber terpenuhi. Bootstrap akun platform tersedia melalui `npm run platform:bootstrap`. Cleanup ekspor kedaluwarsa tersedia sebagai CLI `npm run platform:cleanup-exports`.

**Dampak saat ini:** Super Admin dapat membuat dan mengelola tenant dari konsol tanpa menyamar sebagai Admin Desa. Yang belum terbukti adalah jalur runtime pada lingkungan staging: interaksi form, login hasil bootstrap, dan eksekusi purge belum diuji browser/server nyata pada task implementasi.

**Rekomendasi:** jalankan walkthrough konsol pada staging dengan tenant sintetis, verifikasi login hasil bootstrap, dan tinjau hasil purge pada database uji. Pertahankan guard server-side dan audit untuk setiap aksi sensitif. Untuk sisa validasi Fase 2, lihat [Fase 2 di Master Roadmap](MASTER_ROADMAP.md#fase-2--super-admin-dan-lifecycle-tenant).

### AUD-010 — Use case penghapusan permanen tenant belum ditemukan

**Prioritas:** P2 — Menengah  
**Status (18 November 2026):** tertutup di lapisan kode dan masih menunggu validasi operasional.

**Bukti awal:** pengelolaan desa menyediakan status aktif/nonaktif; use case penghapusan permanen belum ditemukan pada audit 12 November 2026.

**Perubahan kode:** lifecycle tenant kini tersedia dengan jalur nonaktif → masa tenggang 90 hari → ekspor wajib → purge. Purge menghapus baris ber-`village_id` dalam satu transaksi, menyimpan statistik agregat di `tenant_purge_archive`, mencatat domain bekas tenant di `tenant_domain_tombstones`, dan menolak desa aktif atau desa tanpa ekspor berlaku. UI konsol menyediakan aksi ekspor dan purge; cleanup ekspor kedaluwarsa dapat dijadwalkan dengan `npm run platform:cleanup-exports`.

**Dampak saat ini:** kebijakan retensi, ekspor, dan penghapusan terdefinisi di aplikasi dan tercatat lewat audit `desa.export`/`desa.purge`.

**Rekomendasi:** uji purge hanya pada database atau tenant sintetis, dan pastikan backup database serta `storage/media` selesai sebelum eksekusi. Purge tidak dapat dibatalkan. Lihat [DATABASE.md](deployment/DATABASE.md) §6.3.

### AUD-011 — Join dan agregasi keluarga tidak seluruhnya tenant-scoped

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan query statis.

**Bukti:** `src/features/keluarga/infrastructure/keluarga-repository.ts`. Join kepala keluarga dan agregasi anggota memakai familyId tanpa filter villageId pada tabel residents.

**Dampak:** jika ada foreign reference lintas tenant, nama kepala keluarga atau jumlah anggota dapat tercampur.

**Rekomendasi:** tambahkan filter villageId pada join/agregasi dan tegakkan composite FK.

### AUD-012 — Join daftar penduduk belum tenant-scoped

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan query statis.

**Bukti:** `src/features/penduduk/infrastructure/penduduk-repository.ts`. Daftar penduduk difilter berdasarkan villageId, tetapi join keluarga/wilayah menggunakan ID saja.

**Dampak:** label keluarga atau wilayah tenant lain dapat muncul jika foreign reference salah.

**Rekomendasi:** scope semua join terkait dengan villageId.

### AUD-013 — Agregasi nilai keuangan tidak terlihat transaksional

**Prioritas:** P2 — Menengah  
**Status:** risiko race condition (snapshot audit awal).

**Status kode (19 November 2026): tertutup.** `saveKeuanganNilai` berjalan di bawah kunci MySQL `(desa, tahun)` dan di dalam satu transaksi. Impor APBDes (`upsertKeuanganBatch`) memakai jalur yang sama, sehingga induk selalu diagregasi ulang dari nilai tersimpan; sebelumnya impor menulis nilai induk dari berkas tanpa kunci. Bukti: `src/features/keuangan/infrastructure/keuangan-repository.ts` dan `apbdes-import-concurrency.integration.test.ts`.

**Bukti:** `src/features/keuangan/infrastructure/keuangan-repository.ts`. `saveKeuanganNilai()` membaca nilai lama, mengagregasi, lalu upsert tanpa transaction yang terlihat; batch upsert lain menggunakan transaction.

**Dampak:** update bersamaan dapat menimpa agregasi atau menghasilkan nilai tidak konsisten.

**Rekomendasi:** gunakan transaction, locking atau atomic update, serta test concurrent update.

### AUD-014 — Pemeriksaan kuota media rentan race condition

**Prioritas:** P2 — Menengah  
**Status:** risiko race condition.

**Bukti:** `src/features/publik/infrastructure/media-storage.ts`. Kuota diperiksa sebelum file ditulis.

**Dampak:** upload bersamaan dapat sama-sama lolos pemeriksaan dan melampaui kuota.

**Rekomendasi:** gunakan reservasi kuota, locking, atau serialisasi per tenant; sediakan rekonsiliasi pemakaian.

### AUD-015 — Backup media belum terverifikasi

**Prioritas:** P1 — Tinggi  
**Status:** belum terbukti ada/tidaknya backup eksternal (snapshot audit awal).

**Status kode (19 November 2026): sebagian.** Prosedur backup dan restore media terdokumentasi di `docs/deployment/BACKUP-RESTORE.md` §5 dan §6.3, termasuk arsip `tar` + checksum dan peringatan bahwa backup database tidak mencakup `storage/media`. Yang belum ada: drill restore gabungan DB + media dan bukti RPO/RTO.

**Bukti:** media disimpan di `storage/media/<villageId>/`; use case backup database yang diperiksa tidak menunjukkan bahwa direktori media ikut diarsipkan.

**Dampak:** restore database saja dapat menghasilkan referensi file yang hilang.

**Rekomendasi:** dokumentasikan dan uji backup/restore media bersama database; tetapkan RPO/RTO dan konsistensi snapshot.

### AUD-016 — Transisi status permohonan surat rentan race condition

**Prioritas:** P2 — Menengah  
**Status:** risiko race condition.

**Bukti:** `src/features/layanan-mandiri/infrastructure/layanan-mandiri-repository.ts`. Status dibaca, transisi divalidasi, lalu diperbarui.

**Dampak:** dua operator dapat memproses status bersamaan dan menimpa hasil.

**Rekomendasi:** gunakan conditional update berdasarkan status sebelumnya atau transaction dengan row lock.

### AUD-017 — Validasi upload mengandalkan MIME dari klien

**Prioritas:** P2 — Menengah  
**Status:** hardening gap.

**Bukti:** `src/features/publik/domain/media.ts`. Validasi menggunakan allowlist MIME, ukuran, dan nama file; magic-byte/signature validation belum terlihat. SVG/GIF diterima untuk media publik. Lampiran surat warga memakai allowlist yang lebih ketat.

**Dampak:** MIME palsu dapat membuat konten yang tidak sesuai tipe lolos validasi awal.

**Rekomendasi:** periksa magic bytes, decode gambar, batasi atau sanitasi SVG secara khusus, dan uji file polyglot.

### AUD-019 — Integrasi TTE berisiko SSRF dan kebocoran kredensial

**Prioritas:** P1 — Tinggi  
**Status:** risiko kuat dari source; belum dieksploitasi.

**Bukti:** `src/features/surat/domain/tte.ts`, sekitar baris 402–410. URL unduhan PDF dari respons provider dapat menjadi URL absolut dan fetch menggunakan Authorization Basic yang sama.

**Dampak:** jika URL eksternal dapat dipengaruhi, server berpotensi mengakses host yang tidak semestinya dan mengirim kredensial provider ke origin lain. Ini belum dibuktikan melalui eksploitasi.

**Rekomendasi:** batasi URL ke origin provider yang dikonfigurasi; tolak IP private/link-local; nonaktifkan redirect atau validasi setiap redirect; jangan teruskan Authorization ke origin lain.

### AUD-020 — Konfigurasi TTE menerima opsi TLS nonaktif

**Prioritas:** P1 — Tinggi  
**Status:** opsi konfigurasi teridentifikasi; efek runtime perlu divalidasi.

**Bukti:** `src/features/surat/domain/tte.ts` dan `tte.test.ts`; konfigurasi `ssl: false` diterima dan dipertahankan oleh test.

**Dampak:** jika opsi tersebut menonaktifkan verifikasi TLS pada runtime, komunikasi provider dapat tidak terlindungi dari serangan man-in-the-middle.

**Rekomendasi:** wajibkan HTTPS dan verifikasi sertifikat di produksi; batasi perubahan konfigurasi dan catat auditnya.

### AUD-021 — Webhook email menentukan tenant dari X-Forwarded-Host

**Prioritas:** P1 — Tinggi  
**Status:** risiko konfigurasi deployment.

**Status kode (18 November 2026): tertutup.** Route hanya membaca header `Host`, mengabaikan `X-Forwarded-Host` secara eksplisit, dan memakai signature HMAC bertimestamp yang mengikat `host`, `eventId`, dan body; replay dibatasi per `host`+`eventId`. Test `route.test.ts:130` memastikan header palsu tidak mengubah tenant. Risiko tersisa: `EMAIL_WEBHOOK_TOKEN` masih satu credential global, sehingga pengikatan credential per tenant belum ada.

**Bukti awal:** `src/app/api/webhooks/email/route.ts` mengambil host dari `x-forwarded-host` atau `host` untuk resolusi tenant. Token webhook divalidasi secara terpisah.

**Dampak awal:** jika reverse proxy tidak menimpa header forwarding, pemanggil berpotensi memengaruhi resolusi tenant.

**Rekomendasi:** pertahankan pembacaan `Host` saja dan jangan hidupkan kembali `X-Forwarded-Host` sebagai penentu tenant; pertimbangkan credential webhook unik per tenant.

### AUD-022 — Kontrol API publik perlu diverifikasi per endpoint

**Prioritas:** P2 — Menengah  
**Status:** sebagian endpoint yang ditinjau memiliki kontrol.

**Bukti:** endpoint publik yang diperiksa memiliki rate limit dan/atau batas ukuran body; cakupan semua endpoint belum dibuktikan.

**Dampak:** endpoint yang tidak konsisten dapat terkena abuse atau resource exhaustion.

**Rekomendasi:** buat matriks endpoint dan wajibkan body limit, rate limit, validasi input, serta tenant scope.

### AUD-023 — API key eksternal memiliki kontrol dasar yang baik

**Status:** kontrol positif.

**Bukti:** `src/features/api-eksternal/domain/auth.ts`; key disimpan dalam bentuk hash, memiliki status aktif/kedaluwarsa, dan last-used timestamp.

**Rekomendasi:** pertahankan; tambahkan rotasi, scope izin per key, audit penggunaan, dan rate limit per key.

### AUD-024 — Backup/restore database memiliki guardrail dasar

**Status:** kontrol positif dengan risiko operasional.

**Bukti:** `src/app/api/database/backup/route.ts`, `src/app/api/database/restore/route.ts`, `src/features/database/application/database-use-cases.ts`, `infrastructure/restore.ts`, dan `verifikasi-restore.ts`. Operasi memerlukan Super Admin, restore membatasi ukuran dan tipe file, serta verifikasi tabel wajib setelah restore.

**Rekomendasi:** lakukan restore drill berkala di staging, checksum, backup sebelum restore, dan prosedur rollback. Verifikasi media secara terpisah.

### AUD-025 — Validasi relasi KIA belum terlihat tenant-scoped

**Prioritas:** P1 — Tinggi  
**Status:** kesenjangan statis.

**Bukti:** `src/features/kesehatan/application/kia-use-cases.ts`, `src/features/kesehatan/infrastructure/kesehatan-repository.ts`, dan `src/db/schema/kesehatan.ts`. Sejumlah ID penduduk/KIA/Posyandu divalidasi bentuknya, tetapi pemeriksaan bahwa setiap referensi berasal dari villageId yang sama belum terlihat secara menyeluruh.

**Dampak:** data kesehatan yang sensitif dapat terkait dengan penduduk atau fasilitas tenant lain.

**Rekomendasi:** validasi setiap foreign reference pada tenant yang sama, tambahkan composite FK, dan test isolasi dua desa.

### AUD-028 — Sanitasi HTML merupakan kontrol positif

**Status:** kontrol positif.

**Bukti:** `src/lib/sanitize.ts`; sanitasi memakai allowlist tag, atribut, dan skema URL serta diterapkan saat simpan/render sesuai alur yang diperiksa. Regression test tersedia di `src/lib/sanitize.test.ts` (9 test): `<script>`, handler `onerror`, atribut `style` berisi `javascript:`, URI `javascript:`, `<iframe>`, dan `data:` URI ditolak.

**Rekomendasi:** pertahankan; tambahkan payload baru bila ada jalur render atau tag yang diizinkan bertambah.

### AUD-029 — Keamanan resolusi host bergantung reverse proxy

**Prioritas:** P1 — Tinggi  
**Status:** perlu verifikasi lingkungan.

**Status kode (18 November 2026): sebagian tertutup.** Resolver halaman hanya memakai `Host`, host tak dikenal menjadi 404, dan webhook email tidak membaca `X-Forwarded-Host`. `getRequestOrigin()` masih memakai `x-forwarded-host ?? host` untuk URL absolut seperti tautan verifikasi surat, sehingga header itu tetap harus ditimpa proxy meski bukan penentu tenant. Konfigurasi proxy, DNS, dan TLS nyata belum diverifikasi.

**Bukti:** resolusi tenant memakai `Host`; webhook email memakai `Host` saja.

**Dampak:** host forwarding yang tidak tepercaya atau proxy yang mengubah `Host` dapat menyebabkan salah resolusi tenant.

**Rekomendasi:** proxy harus mempertahankan `Host` asli, menimpa `X-Forwarded-Host` untuk URL absolut, dan uji spoofing dari koneksi langsung.

### AUD-030 — Test kesehatan belum memverifikasi filter tenant secara eksplisit

**Prioritas:** P2 — Menengah  
**Status:** terlihat dari isi test.

**Bukti:** `src/features/kesehatan/infrastructure/kesehatan-repository.test.ts` lebih banyak memeriksa rantai query dipanggil daripada memastikan predicate villageId.

**Rekomendasi:** assert predicate villageId dan tambahkan integration test dua tenant.

### AUD-031 — Cakupan integration test isolasi belum mencakup seluruh modul

**Prioritas:** P2 — Menengah  
**Status:** terkonfirmasi dari cakupan test yang diperiksa.

**Bukti:** 12 berkas isolasi: 11 `*tenant-isolation.integration.test.ts` (inventaris, kehadiran, kelompok, keluarga, kontak, penduduk/DTKS, riwayat penduduk, suplemen, RBAC, rumah tangga, statistik) plus `src/features/isolasi-village.integration.test.ts` (SiLPA, Lapak, Buku Tamu, Arsip, Kehadiran, Anjungan). Modul seperti keuangan, surat, layanan mandiri, dan agenda belum memiliki test isolasi dua tenant.

**Rekomendasi:** buat matriks coverage repository/use case per fitur dan tambah test lintas tenant.

> Catatan penomoran: AUD-018 tidak digunakan dalam daftar temuan yang dikonsolidasikan. Catatan awal AUD-026/AUD-027 digabung ke AUD-002/AUD-009 agar tidak menduplikasi temuan.

## 6. Rekomendasi prioritas

1. **P1:** batasi origin TTE, cegah Authorization leakage/redirect, dan wajibkan TLS.
2. **P1:** validasi relasi tenant untuk penduduk, keluarga, rumah tangga, KIA, dan permohonan surat.
3. **P1:** validasi role ownership dan cabut sesi saat reset password.
4. **P1:** pastikan reverse proxy mengamankan forwarded host.
5. **P1:** tetapkan backup media dan uji restore DB + media.
6. **P2 (selesai di kode):** race condition keuangan (termasuk impor APBDes), kuota media, dan transisi status surat sudah diserialkan. Sisa pekerjaan adalah validasi runtime pada lingkungan nyata.
7. **P2:** tambahkan signature validation untuk upload dan audit semua endpoint publik.
8. **P2:** perluas integration test isolasi dua tenant.
9. **P2:** pisahkan dashboard Super Admin dan template provisioning dari data desa pertama.

## 7. Validasi lanjutan sebelum produksi

| Tahap | Aktivitas | Kriteria selesai |
|---|---|---|
| CI dasar | Install, typecheck, lint, format check, test | Hasil semua perintah tercatat; test yang skip terlihat jelas. |
| DB staging | Migrasi dari DB kosong dan upgrade dari snapshot | Schema dan data konsisten; rollback terdokumentasi. |
| Tenant isolation | Dua tenant; uji baca/tulis/import/export tiap fitur | Tidak ada akses silang; mutation selalu memeriksa tenant. |
| Security test | TTE SSRF/redirect, host spoofing, upload signature, reset sesi | Tidak ada bypass atau credential leakage. |
| Restore drill | Pulihkan DB dan seluruh media | Aplikasi berjalan; file dan relasi cocok; RPO/RTO tercapai. |

## 8. Kesimpulan

Repository menunjukkan fondasi arsitektur yang terstruktur dan beberapa kontrol keamanan yang baik. Namun, integritas tenant dan integrasi TTE harus menjadi prioritas. Audit ini **tidak menyatakan aplikasi bebas kerentanan**. Status kesiapan produksi hanya dapat ditetapkan setelah temuan prioritas tinggi ditangani dan pengujian runtime, database, serta pemulihan selesai.

## Lampiran — Arsitektur domain FlexiDesa

Dokumen arsitektur target dan rencana implementasi hostname multi-tenant tersedia di [FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md](architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md).

Lampiran tersebut memperjelas perbedaan antara:
- kondisi source code yang telah ditemukan pada baseline audit;
- keputusan arsitektur target untuk `flexidesa.id`, `admin.flexidesa.id`, `demo.flexidesa.id`, dan `<slug>.flexidesa.id`;
- kontrol yang belum tersedia atau belum diverifikasi;
- security invariants, test matrix, acceptance criteria, dan urutan rollout.

**Penting:** dokumen arsitektur bukan bukti bahwa routing domain, DNS wildcard, TLS, reverse proxy, atau autentikasi multi-host sudah diterapkan. Semua itu tetap memerlukan implementasi, pengujian staging, dan verifikasi deployment terpisah.
