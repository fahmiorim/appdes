# Audit Klaim Dokumentasi — 18 November 2026

- **Task:** memeriksa klaim berlebih (overclaim) dan klaim usang pada dokumen status aktif, lalu memperbaikinya.
- **Tanggal:** 18 November 2026.
- **Branch:** `task/design-mockup-assets`.
- **Base commit:** `f5a6f42` (`main`, `docs: add FlexiDesa design mockups (#147)`); branch sudah di-rebase ke commit ini.
- **Jenis perubahan:** dokumentasi saja. Tidak ada perubahan source, schema, migration, konfigurasi, atau data.
- **Commit hasil:** `c2fd248` (`docs(audit): koreksi klaim usang dan berlebih pada dokumen status`) setelah rebase; commit generator inventaris menyusul di branch yang sama.
- **Status:** selesai — siap review.

## 1. Kondisi awal

Dokumen status aktif sudah pernah diselaraskan pada 18 November 2026, tetapi hanya AUD-009/AUD-010 dan enam berkas deployment yang diperbarui. Audit independen `docs/reports/00-baseline/FEATURE-MAP-ROADMAP-audit-2026-11-18.md` masih mencatat klaim yang bertentangan dengan kode, dan banyak temuan di `TECHNICAL_AUDIT.md` sudah diremediasi lewat PR #86–#147 tanpa pembaruan status.

## 2. Metode

Setiap klaim dicocokkan langsung ke kode `origin/main` (`f5a6f42`), bukan ke judul laporan. Hasil remediasi yang dilaporkan di `docs/reports/01-security/` diverifikasi ulang dengan membaca file implementasi. Klaim yang tidak dapat dibuktikan tidak diubah.

Verifikasi utama:

| Klaim | Bukti kode |
|---|---|
| Fallback satu desa sudah opt-in | `src/features/desa/domain/tenant.ts` (`OpsiResolusiHost.fallbackSatuDesa`, default `false`); `src/lib/env.ts` (`TENANT_LEGACY_SINGLE_HOST_FALLBACK`, ditolak pada production bila host platform `flexidesa.id`) |
| Host tak dikenal bukan tenant | `src/features/desa/application/resolve-village.ts:38-56` (hanya `Host`, `notFound()`), PR #137 |
| Host platform terpisah + landing page | `PLATFORM_HOSTS` di `src/lib/env.ts`; cabang `adalahHostPlatform` di `src/app/page.tsx` |
| Webhook tidak memakai `X-Forwarded-Host` | `src/app/api/webhooks/email/route.ts:20-49,95-99` (HMAC mengikat `timestamp`, `eventId`, `host`, body); `route.test.ts:130` |
| Role ownership divalidasi | `src/features/rbac/application/authorization.ts:40-49` |
| Reset password mencabut sesi | `src/lib/auth.ts:69` (`revokeSessionsOnPasswordReset: true`) |
| Provisioning memakai template | `src/features/multi-desa/infrastructure/provisioning-repository.ts:103-104,161-191` |
| Foreign reference penduduk/keluarga/RTM/KIA/permohonan | `validatePendudukTenantReferences`, `validateKeluargaRegion`, `validateRumahTanggaRegion`, `konteksKia`, `ajukan-surat.ts:65-71` |
| Join keluarga/penduduk tenant-scoped | `keluarga-repository.ts:123-147`, `penduduk-repository.ts:193-205` |
| Race condition ditangani | `keuangan-repository.ts:119`, `media-storage.ts:187`, `layanan-mandiri-repository.ts:258,339,358` |
| Magic bytes | `src/features/publik/domain/media.ts:104-126` |
| TTE allowlist dan TLS wajib | `src/features/surat/domain/tte.ts:255-277`; `TTE_SSL` tidak ada di `src/lib/env.ts` |
| UI admin terbatas | `RUTE_ADMIN_TERSEDIA` di `src/features/navigation/domain/menu-tampil.ts:18-27` (8 path); 8 `page.tsx` di `src/app/(admin)` |
| Tema belum ada UI | tidak ada `src/themes/`; `src/db/schema/theme.ts:18` merujuk file yang tidak ada |
| Hitungan terkini | 13 migration (`0000`–`0012`), 36 halaman, 81 route handler, 274 berkas test, 79 berkas schema |

## 3. Klaim bermasalah dan koreksi

### Klaim berlebih

| Dokumen | Klaim lama | Masalah | Koreksi |
|---|---|---|---|
| `SID_FEATURE_MAP.md` §1 | Tidak ada pernyataan tentang UI admin | Pembaca menyimpulkan modul SID dapat dikelola lewat UI padahal hanya ada 8 halaman admin dan route ekspor/PDF | Menambah paragraf cakupan UI admin: 8 path, tujuh di antaranya konsol platform; halaman publik adalah situs desa |
| `SID_FEATURE_MAP.md` Website desa | "Profil, konten, menu, tema, media … implementasi luas" | `navigation` membangun menu admin, bukan menu situs; pemilihan tema tidak ada | Memisahkan menu admin vs menu publik dan menurunkan klaim tema menjadi schema + seed |
| `SID_FEATURE_MAP.md` §3 | Daftar modul inti MVP tanpa keterangan UI | Dibaca sebagai fitur siap | Menambah catatan bahwa daftar adalah target, bukan bukti UI |

### Klaim usang

| Dokumen | Klaim lama | Kondisi kode | Koreksi |
|---|---|---|---|
| `MASTER_ROADMAP.md` Fase 1 | "reverse proxy harus menimpa forwarded host atau tenant diikat ke credential webhook" | Tenant hanya dari `Host`; `X-Forwarded-Host` diabaikan; signature mengikat `host` | Instruksi diganti menjadi "pertahankan `Host`, abaikan `X-Forwarded-Host`"; credential per tenant dicatat masih terbuka |
| `MASTER_ROADMAP.md` §2A | Catatan baseline tanpa penegakan invarian | Fallback opt-in + guard production (#135, #138), host tak dikenal 404 (#137), landing platform (#130) | Menambah paragraf penegakan invarian dan memperbarui catatan baseline |
| `MASTER_ROADMAP.md` Fase 1 | Tanpa status, seolah belum dikerjakan | Deliverable kode sudah merged; blocker staging | Menambah status "selesai di repository, belum ditutup secara operasional" dengan rujukan laporan penutupan |
| `MASTER_ROADMAP.md` Fase 5 | Race condition masih daftar pekerjaan | Transaksi/lock sudah ada | Menambah catatan bahwa ketiganya ditangani di repository, validasi beban belum |
| `MASTER_ROADMAP.md` §5 backlog | Butir 1–4 tampak belum dimulai | Implementasi dan laporan sudah ada | Menambah catatan pembacaan kolom "bukti selesai" |
| `TECHNICAL_AUDIT.md` §2 | "Satu baseline SQL migration", "sekitar 91 route" | 13 migration, 36 halaman, 81 route handler | Menambah angka terkini di samping angka snapshot |
| `TECHNICAL_AUDIT.md` §3 | Group `(super-admin)` tidak ditemukan | Tujuh halaman konsol ada | Menandai temuan sebagai snapshot 12 November dan menyebut lokasi halaman |
| `TECHNICAL_AUDIT.md` §4 butir 1 | Fallback hanya "jika tepat satu desa" | Fallback opt-in, host platform `null`, guard production | Menulis ulang kontrol positif sesuai kode |
| `TECHNICAL_AUDIT.md` AUD-021, AUD-029 | Webhook/resolver membaca `X-Forwarded-Host` | Hanya `Host`; `getRequestOrigin()` tetap memakai header itu untuk URL absolut | Menulis ulang bukti dan menambahkan status terkini |
| `TECHNICAL_AUDIT.md` AUD-001…AUD-031 | 21 temuan berstatus terbuka | Sebagian besar sudah diremediasi | Menambah tabel status per temuan dengan bukti `file:line`; temuan asli dipertahankan |
| `MODULE-INVENTORY.md` | 29 halaman, 80 route handler pada `f19267d`, dirujuk sebagai inventaris faktual | 36 halaman, 81 route handler; 7 subhalaman Super Admin dan landing platform tidak tercantum | Menambah blok delta + peringatan agar tabel tidak dibaca sebagai daftar lengkap |

Klaim yang diperiksa dan **sengaja tidak diubah** karena masih sesuai kode: invarian "tanpa fallback implisit" (kini ditegakkan), status kode Fase 2, klaim tujuh halaman konsol, `AUD-015`/`AUD-022`/`AUD-028` yang masih terbuka, dan klaim proteksi branch (konfigurasi GitHub, tidak dapat diverifikasi dari repository).

## 4. File yang diperiksa

- `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, `docs/TECHNICAL_AUDIT.md`, `docs/architecture/MODULE-INVENTORY.md`, `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md`, `docs/design/SCREENSHOT-IMPLEMENTATION-MATRIX.md`.
- `docs/reports/00-baseline/FEATURE-MAP-ROADMAP-audit-2026-11-18.md`, `docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md`, `docs/reports/02-super-admin/PHASE-2-DOKUMEN-STATUS-2026-11-18.md`.
- Kode: `src/features/desa/{domain/tenant.ts,application/resolve-village.ts,application/platform-host.ts}`, `src/app/api/webhooks/email/route.ts`, `src/app/page.tsx`, `src/lib/env.ts`, `src/lib/auth.ts`, `src/lib/request-origin.ts`, `src/features/{rbac,penduduk,keluarga,rumah-tangga,layanan-mandiri,kesehatan,keuangan,publik,surat,multi-desa,navigation}`, `src/db/schema`, `src/db/migrations`.

## 5. File yang diubah

| File | Alasan |
|---|---|
| `docs/MASTER_ROADMAP.md` | Klaim webhook, invarian fallback, status Fase 1/Fase 5, dan pembacaan backlog |
| `docs/SID_FEATURE_MAP.md` | Cakupan UI admin, atribusi `navigation`/tema, status test isolasi per modul |
| `docs/TECHNICAL_AUDIT.md` | Kontrol positif resolusi tenant, angka inventaris, status 21 temuan, koreksi AUD-021/AUD-029 |
| `docs/architecture/MODULE-INVENTORY.md` | Blok delta snapshot dengan angka terukur |
| `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md` | Laporan ini |

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --check docs/MASTER_ROADMAP.md docs/SID_FEATURE_MAP.md docs/TECHNICAL_AUDIT.md docs/architecture/MODULE-INVENTORY.md` | **PASS** — semua berkas sesuai gaya Prettier |
| `git diff --stat` | 4 berkas dokumen, 71 insertions, 19 deletions (sebelum laporan ini) |
| `git ls-tree -r --name-only origin/main -- src/app \| grep -c '/page\.tsx$'` | **36** |
| `git ls-tree ... \| grep -c '/route\.ts$'` | **81** |
| `ls src/db/migrations/*.sql \| wc -l` | **13** |
| `git diff --check` | **PASS** — tidak ada trailing whitespace pada diff |
| `git rebase origin/main` | **PASS** — dua commit mockup lama dijatuhkan karena sudah upstream; tanpa konflik |
| Build/typecheck/unit/integration test | **SKIPPED** — hanya dokumentasi; tidak ada kode yang berubah |

## 7. Risiko dan batasan

- Koreksi berbasis pemeriksaan statis. Tidak ada uji browser, runtime, provider TTE, atau konfigurasi reverse proxy pada task ini.
- Status "diperbaiki" berarti kode dan test terkait ada di `repository`; ia bukan bukti perilaku pada staging atau production.
- Branch ini dibuat dari titik yang lebih lama dari `origin/main`; keempat berkas yang diubah identik antara `HEAD` awal dan `origin/main`, sehingga diff tidak menghapus pembaruan lain, tetapi merge tetap perlu review.
- `MODULE-INVENTORY.md` pada task ini hanya diberi delta. Regenerasi penuh dilakukan pada task lanjutan: [MODULE-INVENTORY-REGENERASI-2026-11-18.md](./MODULE-INVENTORY-REGENERASI-2026-11-18.md).
- Laporan historis di `docs/reports/` tidak diubah karena berfungsi sebagai arsip snapshot.

## 8. Kesimpulan

Dokumen aktif kini memisahkan tiga hal: kondisi snapshot 12 November, status kode 18 November, dan validasi operasional yang belum dijalankan. Tidak ada lagi klaim bahwa webhook membaca `X-Forwarded-Host`, bahwa tema/menu situs sudah tersedia, atau bahwa modul SID punya UI pengelolaan. Temuan yang masih terbuka ditandai eksplisit, bukan dihapus.

Langkah berikut: review diff di branch `task/design-mockup-assets`, lalu walkthrough staging Fase 1/Fase 2 bila ingin menutup sisa klaim operasional. Regenerasi `MODULE-INVENTORY.md` sudah dikerjakan pada laporan terpisah.
