# Audit kesesuaian dokumen host/tenant dengan kode nyata

- **Task:** memeriksa apakah dokumen arsitektur dan deployment sesuai dengan perilaku kode saat ini.
- **Tanggal:** 18 November 2026
- **Branch:** `audit/docs-host-consistency`
- **Base commit:** `c97c489` (`main` setelah PR #130)
- **Jenis pekerjaan:** audit dokumentasi — **tidak ada perubahan kode**
- **Status:** siap review

## 1. Ruang lingkup

Dokumen yang diperiksa:

- `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` (seluruh bagian)
- `docs/deployment/ENVIRONMENT.md` (bagian host, proxy, auth, multi-desa)
- `docs/deployment/README.md` (ringkasan arsitektur, keamanan proxy, troubleshooting)
- `docs/deployment/OPERATIONS.md` (prosedur host dan diagnosis)

Kode pembanding: `src/features/desa/domain/host.ts`, `src/features/desa/domain/tenant.ts`, `src/features/desa/application/resolve-village.ts`, `src/features/desa/application/platform-host.ts`, `src/features/desa/infrastructure/desa-repository.ts`, `src/app/page.tsx`, `src/proxy.ts`, `src/lib/request-origin.ts`, `src/lib/auth.ts`, `src/app/api/webhooks/email/route.ts`.

Audit fitur (`docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`) **tidak** termasuk lingkup ini; itu memerlukan pemeriksaan terpisah per modul.

## 2. Ringkasan temuan

| ID | Temuan | Tingkat | Status dokumen |
|---|---|---|---|
| F-01 | Dokumen menyatakan resolver tenant membaca `X-Forwarded-Host` lebih dulu; kode hanya memakai `Host` | Tinggi (menyesatkan operator) | Perlu dikoreksi |
| F-02 | Klaim "host tidak dikenal menghasilkan 404"; jalur halaman justru 500 karena `AppError` tidak dipetakan | Sedang | Perlu dikoreksi |
| F-03 | Model domain pada dokumen arsitektur masih `DESA_BASE_DOMAIN=flexidesa.id`; keputusan produk sekarang platform `flexidesa.id`, desa `desa.id` | Sedang | Perlu diperbarui |
| F-04 | Invarian "fallback satu desa hanya opt-in" dan "unknown/reserved host tidak resolve ke tenant" belum ditegakkan kode | Sedang | Dokumen benar, kode belum |
| F-05 | Host reserved `admin`/`demo`/`api` dan pemisahan konsol per host belum ada | Rendah (target) | Sudah berstatus target |
| F-06 | Dokumen target: `www` redirect kanonis; kode: `www` hanya alias yang tetap melayani 200 | Rendah | Target vs realita |
| F-07 | `X-Forwarded-Host` masih dipakai `getRequestOrigin()` untuk URL verifikasi surat; tidak disebut di dokumen | Rendah (keamanan) | Perlu dicatat |
| F-08 | `PLATFORM_HOSTS` hanya ada di `ENVIRONMENT.md` dan `.env.example`; README/OPERATIONS dan changelog arsitektur belum | Rendah | Perlu disinkronkan |

## 3. Rincian temuan

### F-01 — `X-Forwarded-Host` pada resolusi tenant

**Klaim dokumen**

- `docs/deployment/ENVIRONMENT.md:109`: "resolver tenant tetap membaca `X-Forwarded-Host` lebih dulu, sehingga proxy **wajib** menimpa header tersebut."
- `docs/deployment/ENVIRONMENT.md:160`: "reverse proxy harus menimpa `X-Forwarded-Host`."
- `docs/deployment/README.md:86`: "Tenant publik ditentukan dari `Host`/`X-Forwarded-Host`".
- `docs/deployment/README.md:421-424`: "`X-Forwarded-Host` **wajib ditimpa** oleh proxy. Resolver tenant membaca header ini lebih dulu daripada `Host` … Ini berlaku meskipun `TRUST_PROXY=false`."
- `docs/deployment/README.md:532` dan `docs/deployment/OPERATIONS.md:188, 390`: troubleshooting menyuruh memeriksa `X-Forwarded-Host`.

**Kondisi kode**

- `src/features/desa/application/resolve-village.ts:38-40`: "Hanya header `Host` yang dipakai. `X-Forwarded-Host` sengaja tidak dibaca karena dapat dipalsukan…" Implementasi memakai `requestHeaders.get("host")`.
- `src/app/api/webhooks/email/route.ts:97`: komentar eksplisit bahwa `X-Forwarded-Host` tidak dipercaya sebagai sumber tenant; perilaku ini diuji di `route.test.ts:130` ("uses Host and ignores a forged X-Forwarded-Host").
- Ini hasil remediasi AUD-029 (lihat `docs/reports/01-security/AUD-029-webhook-forwarded-host-hardening.md:43`).

**Dampak:** operator yang mengikuti dokumen akan mengutamakan penulisan ulang `X-Forwarded-Host` dan mungkin membiarkan `Host` berubah menjadi hostname upstream — justru skenario yang membuat tenant salah. Instruksi proxy yang benar sekarang: **pertahankan `Host` asli**, `X-Forwarded-Host` tidak lagi berpengaruh pada pemilihan tenant.

### F-02 — "Host tidak dikenal menghasilkan 404"

**Klaim dokumen**

- `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md:40`: resolver "menghasilkan 404 jika tidak terpetakan".
- `docs/deployment/README.md:88`: "Host yang tidak dikenal menghasilkan 404 pada instalasi multi-desa."

**Kondisi kode**

- `resolveVillageByHost` melempar `notFound()` dari `@/lib/errors`, yaitu `AppError("NOT_FOUND")`, bukan `notFound()` dari `next/navigation`.
- Tidak ada `error.tsx`, `not-found.tsx`, maupun `global-error.tsx` di `src/app` (`find src/app -name "error.tsx" -o -name "not-found.tsx" -o -name "global-error.tsx"` → kosong). `AppError` hanya dipetakan ke status HTTP di Route Handler melalui `src/lib/route-auth.ts`.
- Akibatnya pada halaman, kesalahan ini muncul sebagai **500**, bukan 404. Bukti tidak langsung: sebelum PR #130, `Host: flexidesa.test` pada `/berita` mengembalikan 500 karena jalur ini; setelah cabang host platform memakai `notFound()` Next, statusnya 404.
- Klaim 404 untuk instalasi multi-desa **belum dapat diuji runtime** di mesin ini karena database dev hanya berisi satu desa aktif.

### F-03 — Model domain pada dokumen arsitektur

**Klaim dokumen**

- `§7.1`: "Wildcard `*.flexidesa.id` dipetakan ke slug tenant. Domain induk disimpan dalam konfigurasi aplikasi (`DESA_BASE_DOMAIN=flexidesa.id`). Reserved host selalu mengalahkan wildcard."

**Kondisi kode dan keputusan produk terbaru**

- Domain desa produksi memakai induk lain: `DESA_BASE_DOMAIN=desa.id` (contoh `kwalagunung.desa.id`), sedangkan platform tetap `flexidesa.id`.
- Kode sekarang memisahkan keduanya: `PLATFORM_HOSTS` (`src/lib/env.ts`, `src/features/desa/application/platform-host.ts`) menentukan host platform; `DESA_BASE_DOMAIN` hanya untuk wildcard desa.
- Dokumen belum menyebut `PLATFORM_HOSTS` sama sekali, sehingga pembaca yang mengikuti §7.1 berpotensi mengulang bug yang diperbaiki di PR #130 (apex `desa.id` dianggap landing platform).

### F-04 — Fallback satu desa belum opt-in

**Klaim dokumen**

- `§3 langkah 7`: "**Jangan gunakan fallback satu desa pada domain produksi FlexiDesa.**"
- `§3.1`: fallback harus opt-in via flag, mis. `TENANT_LEGACY_SINGLE_HOST_FALLBACK=true`, dan hanya untuk environment yang disetujui.
- `§9` invarian 2 dan 15: host unknown/reserved tidak pernah resolve ke tenant; tidak ada fallback implisit di produksi.
- `§10.1`: "host platform ketika hanya ada satu tenant | tetap platform, tidak fallback".

**Kondisi kode**

- `src/features/desa/domain/tenant.ts:100`: `return peta.jumlahDesa === 1 ? peta.desaPertamaId : null;` — aktif tanpa flag.
- PR #130 hanya mengecualikan **host platform** (`adalahHostPlatform`) sebelum fallback. Host lain yang tidak dikenal tetap jatuh ke desa satu-satunya bila instalasi berisi satu desa aktif.
- Flag `TENANT_LEGACY_SINGLE_HOST_FALLBACK` tidak ada di `src/lib/env.ts`.

**Dampak:** pada produksi satu-desa, siapa pun yang mengarahkan host apa pun ke server akan melihat website desa tersebut. Bukan kebocoran lintas tenant (hanya satu tenant), tetapi melanggar invarian yang ditulis dokumen dan menyulitkan pembedaan host resmi vs host liar.

### F-05 — Host reserved dan pemisahan konsol

**Klaim dokumen**

- `§1.1` dan `§3`: `admin.flexidesa.id`, `demo.flexidesa.id`, `api.flexidesa.id` adalah host reserved yang diklasifikasi terpisah; konsol Super Admin di `admin.flexidesa.id`; slug reserved (`www`, `admin`, `demo`, `api`, …) harus ditolak saat provisioning.

**Kondisi kode**

- Tidak ada classifier `classifyHost`; `src/proxy.ts` hanya memeriksa cookie dan pathname.
- Konsol platform diakses lewat path `/super-admin` pada host apa pun.
- `§2.1` sudah menyatakan hal ini sebagai batasan; tetapi `§7.1` "Reserved host selalu mengalahkan wildcard" sekarang hanya benar untuk host di `PLATFORM_HOSTS`, bukan untuk label `admin`/`demo`/`api`.
- Belum ada validasi slug reserved di provisioning (tidak ditemukan konstanta daftar reserved pada `src/features/multi-desa/**`).

### F-06 — `www` sebagai alias, bukan redirect

**Klaim dokumen:** `§1.1` "`www.flexidesa.id` — Alias platform — Redirect kanonis ke `flexidesa.id`"; `§4.1` proxy boleh melakukan "redirect kanonis seperti `www` ke apex".

**Kondisi kode:** `hostCandidates()` (`src/features/desa/domain/host.ts`) memperlakukan `www.x` sebagai kandidat tambahan untuk `x`, sehingga kedua host **melayani konten yang sama** dengan status 200; tidak ada redirect. Untuk desa, `www.kwalagunung.desa.id` juga akan menyajikan situs desa yang sama.

**Dampak:** duplikasi konten/SEO dan cookie host-only terpisah antar-`www`, bukan pelanggaran isolasi.

### F-07 — `getRequestOrigin()` masih memakai `X-Forwarded-Host`

**Kondisi kode:** `src/lib/request-origin.ts:13` memakai `x-forwarded-host ?? host` dan dipakai `src/features/surat/application/surat-use-cases.ts:673, 905` untuk menyusun `verificationUrl` yang dicetak pada QR/PDF surat.

**Kaitan dokumen:** narasi keamanan (AUD-029, `ENVIRONMENT.md`, `README.md`) menyatakan header forwarded tidak dipercaya. Untuk **pemilihan tenant** itu benar; tetapi tidak ada dokumen yang menyebut bahwa header tersebut masih memengaruhi URL absolut pada dokumen surat. Jika proxy tidak menimpa header, tautan verifikasi pada surat dapat menunjuk host lain.

**Catatan:** ini temuan dokumentasi dan risiko keamanan; perbaikannya memerlukan keputusan (memakai `Host` saja, atau origin kanonis per tenant) dan di luar lingkup audit ini.

### F-08 — Sinkronisasi dokumen setelah PR #130

- `PLATFORM_HOSTS` tercatat di `docs/deployment/ENVIRONMENT.md` dan `.env.example`, tetapi tidak di `docs/deployment/README.md` (bagian arsitektur/troubleshooting) maupun `docs/deployment/OPERATIONS.md`.
- `§14 Change log` dokumen arsitektur berhenti pada 14 November 2026 dan header menyebut baseline commit `3aad86b` (12 November), sehingga tidak mencerminkan pemisahan host platform (PR #130).
- Landing page platform belum disebut di dokumen deployment mana pun.

## 4. Klaim dokumen yang sudah sesuai

| Klaim | Bukti kode |
|---|---|
| Normalisasi host: huruf, port, trailing dot, IPv6, alias `www` | `src/features/desa/domain/host.ts`, `host.test.ts` |
| Exact domain → wildcard slug → fallback satu desa | `src/features/desa/domain/tenant.ts` |
| Desa nonaktif tidak dipetakan dari host mana pun | `desa-repository.ts:140-152` (`where villages.active = true`), `tenant.ts` |
| Proxy bukan lapisan otorisasi | `src/proxy.ts` (komentar dan perilaku) |
| Cookie sesi host-only, cookie cache dimatikan | `src/lib/auth.ts:124-152`, `auth-config.test.ts` |
| `BETTER_AUTH_URL` tunggal, tautan reset dari nilai itu | `src/lib/auth.ts:53, 82` |
| Webhook memakai `Host`, bukan `X-Forwarded-Host` | `src/app/api/webhooks/email/route.ts:97`, `route.test.ts:130` |
| `.env.example` menyatakan `X-Forwarded-Host` tidak dipakai memilih desa | `.env.example` bagian webhook email |
| Fallback satu desa ada dan berisiko | `tenant.ts:100`, `§12` risiko terbuka |

## 5. Validasi

| Perintah | Hasil |
|---|---|
| `grep -rn "X-Forwarded-Host"` pada `docs/**` dan `src/**` | 32 kecocokan; dasar F-01 dan F-07 |
| `find src/app -name "error.tsx" -o -name "not-found.tsx" -o -name "global-error.tsx"` | kosong — dasar F-02 |
| `grep -n "env.APP_URL"` | `platform-host.ts`, `platform-info-use-cases.ts` — `APP_URL` bukan base OAuth |
| `curl -H "Host: flexidesa.test" /berita` sebelum PR #130 | 500 (bukti tidak langsung F-02); setelah PR #130 → 404 |
| `curl -H "Host: kwala-gunung.flexidesa.test" /berita` | 200 |
| `npm run check` | tidak dijalankan — tidak ada perubahan kode yang perlu diverifikasi |

Tidak ada perintah yang menulis data atau menyentuh database.

## 6. Rekomendasi

1. **Prioritas tinggi (F-01):** perbarui `ENVIRONMENT.md`, `README.md`, dan `OPERATIONS.md` agar menyatakan resolusi tenant hanya dari `Host`; instruksi proxy diubah menjadi "pertahankan `Host` asli" dan hapus klaim "resolver membaca `X-Forwarded-Host` lebih dulu".
2. **F-02:** tambahkan `not-found.tsx` (dan `error.tsx`) atau petakan `AppError` ke `notFound()` di jalur halaman, lalu sesuaikan klaim dokumen menjadi 404. Perlu keputusan karena menyentuh banyak halaman.
3. **F-03/F-08:** perbarui §7.1 dan riwayat perubahan dokumen arsitektur dengan model `PLATFORM_HOSTS` (platform `flexidesa.id`, desa `desa.id`); tambahkan `PLATFORM_HOSTS` ke README/OPERATIONS.
4. **F-04:** jika invarian §9 dipertahankan, tambahkan flag fallback legacy yang eksplisit dan nonaktif secara default di produksi, beserta test yang membuktikan host unknown tidak resolve ke tenant.
5. **F-07:** putuskan sumber origin untuk URL verifikasi surat (memakai `Host` saja atau origin kanonis per tenant), lalu catat di dokumen keamanan.

## 7. Kesimpulan

Dokumen host/tenant masih menggambarkan perilaku sebelum remediasi AUD-029 dan sebelum pemisahan host platform (PR #130). Fondasi yang paling berisiko adalah instruksi `X-Forwarded-Host` yang kini bertentangan dengan kode, karena dapat membuat operator salah mengonfigurasi reverse proxy. Selebihnya adalah kesenjangan target-vs-realita yang sudah sebagian diakui dokumen (classifier, host reserved, demo, custom domain).

Audit ini tidak mengubah kode. Perbaikan dokumen sebaiknya menjadi task terpisah agar setiap koreksi dapat direview terhadap kode yang bersangkutan.
