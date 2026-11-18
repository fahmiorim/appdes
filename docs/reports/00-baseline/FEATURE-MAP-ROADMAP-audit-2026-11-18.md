# Audit kesesuaian `SID_FEATURE_MAP.md` dan `MASTER_ROADMAP.md` dengan kode

- **Task:** memeriksa apakah klaim status fitur dan roadmap sesuai kode nyata di `main`, tanpa mengubah kode.
- **Tanggal:** 18 November 2026
- **Branch:** `audit/feature-map-roadmap`
- **Base commit:** `c97c489` (`main`)
- **Jenis pekerjaan:** audit statis read-only — **tidak ada perubahan kode, schema, migration, konfigurasi, atau data**
- **Status:** selesai — siap review

## 1. Ruang lingkup dan metode

Diperiksa: `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`, `docs/architecture/MODULE-INVENTORY.md` (dirujuk kedua dokumen), `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` (acuan invarian), serta kode di `src/app`, `src/features`, `src/db/schema`, `.github/workflows`, dan `package.json`.

Metode: pencocokan setiap klaim status/pekerjaan dengan keberadaan route, halaman, use case, repository, test, schema, dan commit/PR yang tercatat di riwayat. Tidak ada klaim yang dianggap benar tanpa bukti file.

## 2. Ringkasan eksekutif

Sebagian besar klaim **fase 0 dan fase 2 sudah akurat** dan dapat dibuktikan (CI, artefak baseline, tujuh halaman konsol, lifecycle/purge/cleanup, ekspor audit, filter status). Sebagian besar klaim modul di feature map juga sesuai sebagai *keberadaan kode*.

Masalah utamanya bukan fitur yang dikarang, melainkan:

1. **Dua klaim keamanan bertentangan dengan kode `main`**: invarian "tidak ada fallback single-tenant implisit" dan instruksi webhook `X-Forwarded-Host`.
2. **Kedua dokumen tidak mencatat fakta besar**: UI admin modul SID belum ada; yang ada hanya 8 halaman admin (beranda + 7 konsol platform) dan 50 route handler ekspor/PDF.
3. **Status roadmap tidak lengkap**: hanya fase 0 dan 2 punya status, padahal fase 1 dan beberapa item fase 5 sudah merged; satu dokumen acuan (`MODULE-INVENTORY.md`) sudah kedaluwarsa.

## 3. Temuan

### F-01 — Tinggi — Invarian "tanpa fallback implisit" dilanggar kode `main`

- Klaim: `docs/MASTER_ROADMAP.md:40` — "tidak ada fallback single-tenant implisit pada production FlexiDesa"; dikuatkan `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` §3/§3.1.
- Kode: `src/features/desa/domain/tenant.ts:100` (`main`) masih `return peta.jumlahDesa === 1 ? peta.desaPertamaId : null;` untuk host apa pun. Akibatnya instalasi satu desa menampilkan desa itu pada `localhost`, IP server, atau domain asing.
- Status: perbaikan ada di PR **#135** (`task/tenant-fallback-opt-in`, commit `063bcfa`), **belum merged** ke `main`.
- Rekomendasi: merge #135 sebelum dokumen dianggap benar, atau ubah klaim menjadi "belum terpenuhi di `main`" sampai PR tersebut masuk.

### F-02 — Tinggi — Instruksi webhook fase 1 berlawanan dengan hardening yang sudah diterapkan

- Klaim: `docs/MASTER_ROADMAP.md:83` — "reverse proxy harus menimpa forwarded host atau tenant diikat ke credential webhook".
- Kode: `src/app/api/webhooks/email/route.ts:95-99` secara eksplisit **mengabaikan `X-Forwarded-Host`** dan menetapkan tenant dari `resolveVillageByHost(rawHost)`; lihat juga test `route.test.ts:130` dan laporan `docs/reports/01-security/AUD-029-webhook-forwarded-host-hardening.md`.
- Dampak: agen/operator yang mengikuti roadmap dapat menghidupkan kembali kepercayaan pada header yang dapat dipalsukan klien — persis risiko yang sudah ditutup AUD-029.
- Rekomendasi: ganti butir ini menjadi "tenant diikat ke `Host` yang dipertahankan proxy; `X-Forwarded-Host` tidak dipercaya", selaras dengan `ENVIRONMENT.md`/`README.md`/`OPERATIONS.md` yang baru diperbaiki di PR #134.

### F-03 — Sedang — UI admin modul SID tidak tercatat belum ada

- Fakta: `src/app/(admin)` hanya berisi **8 halaman**: `beranda` + 7 halaman `/super-admin` (root, tenant, domain, pengguna, audit, template, pengaturan). Semua modul SID lain hanya punya **route handler** (50 di area admin), hampir semuanya ekspor/PDF/berkas, mis. `penduduk/ekspor`, `persuratan/surat/[id]/pdf`, `keuangan/laporan/ekspor`, `desa/idm/ekspor`. Tidak ada halaman input/daftar untuk penduduk, keluarga, surat, IDM, keuangan, inventaris, bantuan, kesehatan, dan seterusnya.
- Klaim yang menyesatkan bila dibaca cepat: `docs/SID_FEATURE_MAP.md:32` ("Backend dan route teridentifikasi" untuk surat), `:33` (IDM), baris modul lain dengan status "Implementasi teridentifikasi", serta `§3` daftar modul inti MVP tanpa keterangan UI.
- Catatan: map sudah punya caveat umum (`SID_FEATURE_MAP.md:5-6`, `§5`), tetapi tidak ada pernyataan eksplisit bahwa **UI admin modul belum tersedia** — informasi paling menentukan untuk perencanaan.
- Rekomendasi: tambah kolom/status "UI admin" per modul (mis. `belum ada` / `hanya ekspor`) atau satu paragraf di §1; sebutkan juga bahwa 23 halaman publik yang ada adalah situs desa, bukan UI pengelolaan.

### F-04 — Sedang — `MODULE-INVENTORY.md` kedaluwarsa tetapi masih dirujuk sebagai inventaris

- Isi: `docs/architecture/MODULE-INVENTORY.md:5-8` menyebut snapshot `main` commit `f19267d` (17 November 2026), **29 halaman, 2 layout, 80 route handler**, 52 direktori fitur.
- Aktual (`c97c489`): **35 halaman**, **81 route handler**, 52 direktori fitur. Enam halaman `/super-admin/*` dan landing page platform tidak tercantum; tabel route hanya memuat satu entri `super-admin` (`grep -c "super-admin/"` = 1).
- Dampak: `SID_FEATURE_MAP.md:7` dan `MASTER_ROADMAP.md:67` mengarahkan pembaca ke dokumen ini sebagai inventaris faktual; angka dan daftarnya menyesatkan.
- Rekomendasi: regenerasi inventaris pada commit terkini, atau beri label "snapshot `f19267d`" + catatan delta di bagian atas dan di kedua dokumen yang merujuknya.

### F-05 — Sedang — Status roadmap tidak lengkap dan tidak konsisten dengan laporan yang ada

- Hanya fase 0 (`MASTER_ROADMAP.md:62`) dan fase 2 (`:97`) punya status. Fase 1, 3, 4, 5, 6 dan backlog `§5` tidak.
- Bukti pekerjaan yang sudah merged tetapi tidak tercermin:
  - Fase 1: `docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md` menyatakan hampir seluruh deliverable kode Fase 1 sudah merged, tetapi **fase belum ditutup** karena blocker staging; AUD-001/002/007/019-020 punya laporan dan kode (mis. `src/lib/auth.ts:69` `revokeSessionsOnPasswordReset: true`; allowlist TTE di `src/features/surat/application/tte-use-cases.ts:50`).
  - Fase 5: butir race condition (`:155`) sudah diperbaiki di PR #86 (commit `90e6b35`, laporan `AUD-034-race-conditions.md`).
  - Backlog `§5` baris 1–4 memiliki implementasi kode yang sudah merged (CI, TTE, foreign reference, role ownership/session reset), tetapi masih tampil sebagai pekerjaan awal tanpa status. Ini tidak berarti seluruh acceptance/operational validation selesai; khusus Fase 1 masih ada blocker staging.
- Dampak: pembaca menyimpulkan fase 1 belum dikerjakan dan fase 5 belum disentuh, padahal kode dan laporannya ada; sebaliknya fase 2 ditandai "selesai" padahal prasyaratnya (fase 1) masih terbuka menurut laporan penutupan.
- Rekomendasi: tambahkan status ringkas + link laporan per fase, dan tandai butir backlog yang sudah selesai dengan bukti PR/laporan.

### F-06 — Sedang — Pekerjaan host platform 18 November tidak tercatat di feature map

- Fakta: `PLATFORM_HOSTS` (`src/lib/env.ts`), cabang host platform di `src/app/page.tsx`, dan `src/app/platform-landing.tsx` sudah ada di `main` (PR #130).
- Klaim: `SID_FEATURE_MAP.md:4` menyatakan status kode fase 2 diperbarui 18 November, dan `:25` menyebut konsol tujuh halaman, tetapi **landing page platform dan pemisahan host platform tidak disebut sama sekali**. `MASTER_ROADMAP.md:38` masih menempatkan "routing platform/demo" sebagai urutan pekerjaan berikutnya, dan `:42` (catatan baseline) tidak memperbarui bahwa host platform sudah terpisah dari `DESA_BASE_DOMAIN` (proxy memang masih belum classifier — bagian itu tetap benar).
- Rekomendasi: tambahkan baris/klausa "host platform + landing page" di feature map dan perbarui catatan baseline §2A (demo/reserved tetap belum ada).

### F-07 — Rendah — Atribusi modul `navigation` dan "tema" tidak sesuai kode

- `SID_FEATURE_MAP.md:27` menempatkan `navigation` di area "Website desa" untuk "menu". Faktanya `src/features/navigation/application/build-menu.ts:1-25` membangun **menu admin** dari modul + izin RBAC, ditambah urutan menu dan shortcut pengguna; menu situs publik ada di `src/features/publik/application/nav-publik.ts`.
- "tema" disebut sebagai fungsi website desa, tetapi tidak ada folder/fitur runtime tema; `src/db/schema/theme.ts` menyebut `src/themes/registry.ts` yang **tidak ada**, dan tabel `theme` hanya diisi oleh template provisioning (`template-tenant-repository.ts:86`). Tidak ada UI pemilihan tema.
- Rekomendasi: pindahkan `navigation` ke area admin/RBAC (atau jelaskan dua cakupannya), dan turunkan status "tema" menjadi "schema + seed saja".

### F-08 — Rendah — Frasa status bukti yang sama menutupi kondisi test berbeda

- `SID_FEATURE_MAP.md:40-41,48` memakai "Repository dan test isolasi terbatas" untuk kehadiran, arsip, dan anjungan.
- Aktual: **kehadiran** punya integration test isolasi tenant (`src/features/kehadiran/infrastructure/rekap-kehadiran-tenant-isolation.integration.test.ts`); **arsip** hanya punya test domain (`arsip/domain/arsip.test.ts`); **anjungan** hanya punya test domain/use case (`anjungan/domain/*.test.ts`, `application/*.test.ts`) tanpa test isolasi.
- Rekomendasi: bedakan "ada test isolasi" vs "belum ada test isolasi" agar prioritas test berikutnya jelas.

### F-09 — Rendah — Ruang lingkup "tenant binding webhook" perlu dibedakan

- `SID_FEATURE_MAP.md:47` mencantumkan "Tenant binding webhook" sebagai pekerjaan lanjutan.
- Kode webhook email menyelesaikan **resolusi tenant** dari `Host` (`src/app/api/webhooks/email/route.ts:95-100`) dan membatasi replay per `host+eventId` (`:85-86`). Namun autentikasinya memakai satu `EMAIL_WEBHOOK_TOKEN` global (lihat awal route dan `src/lib/env.ts`), bukan credential/signature khusus tenant.
- Jadi klaim tersebut belum tentu usang: bila maksudnya mencegah credential webhook global menulis ke tenant berbeda hanya dengan mengubah `Host`, pekerjaan masih terbuka. Istilahnya saat ini ambigu.
- Rekomendasi: nyatakan eksplisit apakah backlog meminta verifikasi signature provider atau credential/otorisasi webhook per tenant; jangan menyamakan resolusi tenant dari `Host` dengan pengikatan credential ke tenant.

### F-10 — Info — Klaim proteksi branch tidak dapat diverifikasi dari repository

- `MASTER_ROADMAP.md:62-64` menyatakan `main` dilindungi **empat required check**. Repository hanya membuktikan CI punya 6 job: `changes`, `quality`, `integration`, `integration-test`, `build`, `summary` (`.github/workflows/ci.yml`). Proteksi branch adalah pengaturan GitHub, bukan isi repo.
- Rekomendasi: cantumkan tautan/tangkapan pengaturan required check bila klaim ini ingin dipertahankan sebagai bukti.

## 4. Klaim yang terverifikasi sesuai

- Konsol platform **tujuh halaman** (`SID_FEATURE_MAP.md:25`): `/super-admin`, `tenant`, `domain`, `pengguna`, `audit`, `template`, `pengaturan` ada sebagai `page.tsx`.
- Filter dan ekspor audit: `src/features/multi-desa/application/audit-platform-use-cases.ts:50-95` + route `src/app/(admin)/super-admin/audit/ekspor/route.ts`.
- Lifecycle/purge/cleanup ekspor/template/provisioning: `src/features/multi-desa/**` (use case, repository, integration test) + script `platform:bootstrap`, `platform:export-template`, `platform:cleanup-exports`.
- Halaman template & pengaturan **baca-saja**: tidak memuat form/`use client`; hanya memanggil use case baca.
- MFA dan undangan anggota tim belum ada: tidak ada kode `totp`/`mfa`/`invite` di `src`.
- Klaim fase 0: artefak `docs/reports/00-baseline/phase-0-baseline.json`, `phase-0-completion-report.md`, `docs/deployment/STAGING.md`, dan `scripts/run-integration-tests.mjs:30` (SKIPPED eksplisit) ada; PR #95 tercatat di riwayat.
- Klaim fase 2 (PR #106–#112) tercatat di riwayat commit.
- Hash API key dan rate limit per key: `src/features/api-eksternal/domain/api-key.ts:3-8`, `src/app/api/eksternal/surat/route.ts:84`.
- WhatsApp: dependensi Baileys ada di `package.json`; belum ada worker/verifikasi deployment — sesuai status "Deferred".
- Custom domain verification memang belum ada (tabel `village_domains` hanya `domain`, `is_primary`, `created_at`); `BETTER_AUTH_URL` tunggal dan proxy bukan classifier juga masih benar.

## 5. Perintah dan hasil

| Perintah | Hasil |
|---|---|
| `find src/app -name page.tsx \| wc -l` / `-name route.ts` | 35 halaman; 81 route handler (50 admin, 22 api, 6 public, 3 warga) |
| `find "src/app/(admin)" -name page.tsx` | 8 halaman: beranda + 7 super-admin |
| `ls -d src/features/*/ \| wc -l` | 52 (sama dengan inventaris) |
| `grep -rn "super-admin/" docs/architecture/MODULE-INVENTORY.md \| wc -l` | 1 (inventaris hanya memuat halaman root) |
| `grep -n "jumlahDesa === 1" <(git show main:src/features/desa/domain/tenant.ts)` | baris 100 — fallback implisit masih ada di `main` |
| `grep -rn "X-Forwarded-Host" src/app/api/webhooks/email/route.ts` | hanya komentar penolakan; tenant dari `Host` |
| `grep -nE "^  [a-z-]+:$" .github/workflows/ci.yml` | 6 job CI |
| `npm run check` | **SKIPPED** — tidak dijalankan karena audit read-only; tidak ada perubahan kode yang perlu diverifikasi dengan build/test |

## 6. Risiko dan keterbatasan

- Audit bersifat statis: tidak menjalankan aplikasi, tidak menguji UI, dan tidak memeriksa database.
- Proteksi branch, status deployment, dan timer cleanup adalah konfigurasi eksternal yang tidak dapat dibuktikan dari repository.
- PR #135 dan #134 masih terbuka; temuan F-01/F-02 akan berubah status setelah keduanya merged. Audit ini menilai `main` pada `c97c489`.
- Test integration tidak dijalankan (butuh database test disposable dan di luar kebutuhan audit dokumen).

## 7. Kesimpulan dan rekomendasi

Dokumen tidak memuat fitur fiktif: hampir semua modul yang disebut memang punya kode atau struktur terkait. Yang perlu diperbaiki adalah **kejujuran status dan kelengkapan konteks**:

1. Segera selaraskan dua klaim keamanan (F-01, F-02) — keduanya berpotensi menyesatkan implementasi.
2. Tambahkan status UI admin yang belum ada (F-03) dan regenerasi inventaris (F-04).
3. Lengkapi status fase 1/5/backlog dengan bukti laporan (F-05) dan catat pekerjaan platform host (F-06).
4. Rapikan atribusi modul, status test, dan rincian kebutuhan webhook (F-07–F-09) pada revisi berikutnya.
