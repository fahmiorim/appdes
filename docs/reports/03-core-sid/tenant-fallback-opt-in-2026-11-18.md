# Fallback satu-desa menjadi opt-in

- **Task:** mengganti fallback host satu-desa yang selalu aktif menjadi flag opt-in, dan membuktikan host tak dikenal / host platform tidak resolve ke tenant.
- **Tanggal:** 18 November 2026
- **Branch:** `task/tenant-fallback-opt-in`
- **Base commit:** `c97c489` (`main`)
- **Status:** siap review

## 1. Kondisi awal

`villageIdDariHost()` selalu memakai fallback ke desa pertama bila instalasi berisi tepat satu desa, untuk **host apa pun** — termasuk `localhost`, IP server, atau domain asing. Selama instalasi belum memiliki desa kedua, siapa pun yang menembak IP/host acak melihat beranda desa tersebut. Pola ini bertentangan dengan aturan fail-closed di `docs/architecture/FLEXIDESA-MULTI-TENANT-DOMAIN-ARCHITECTURE.md` §3 dan §3.1.

Resolusi host platform sudah ditolak lebih dulu di `resolve-village.ts`, tetapi penolakan itu bergantung pada pemanggil; fungsi domain sendiri masih mengembalikan desa tunggal untuk host platform bila dipanggil langsung.

## 2. Perubahan

### Kode

| File | Perubahan |
|---|---|
| `src/lib/env.ts` | Variabel baru `TENANT_LEGACY_SINGLE_HOST_FALLBACK` (enum `true`/`false`, default `false`). Pola sama dengan `TRUST_PROXY`: nilai selain `true`/`false` ditolak saat validasi. |
| `src/features/desa/domain/tenant.ts` | `villageIdDariHost(host, peta, opsi?)` menerima `OpsiResolusiHost { hostPlatform?, fallbackSatuDesa? }`. Default keduanya fail closed. Host platform selalu `null`. Fallback hanya dijalankan bila `fallbackSatuDesa === true` **dan** `jumlahDesa === 1`. |
| `src/features/desa/application/resolve-village.ts` | Meneruskan `hostPlatform` dan `env.TENANT_LEGACY_SINGLE_HOST_FALLBACK` ke fungsi domain. Guard `notFound()` Next untuk host platform tetap dipertahankan agar statusnya 404, bukan 500. |

Perilaku hasil:

| Skenario | Sebelum | Sesudah (default) | Sesudah (flag `true`) |
|---|---|---|---|
| Host domain desa terdaftar | desa | desa | desa |
| `*.DESA_BASE_DOMAIN` cocok slug | desa | desa | desa |
| Host platform (`PLATFORM_HOSTS`) | 404 | 404 | 404 |
| Host tak dikenal, 1 desa | desa | tidak resolve | desa |
| Host tak dikenal, >1 desa | tidak resolve | tidak resolve | tidak resolve |

### Dokumentasi

- `.env.example`: menambahkan `TENANT_LEGACY_SINGLE_HOST_FALLBACK=false` beserta peringatan hanya untuk development/instalasi mandiri.
- `docs/deployment/ENVIRONMENT.md`: bagian variabel baru (fungsi, default, risiko: saat aktif **semua** host asing termasuk yang mirip domain platform menampilkan desa tunggal; host platform tetap tidak pernah menjadi tenant).
- `docs/deployment/README.md` §9.1: langkah fallback kini menyebut flag dan default mati.

## 3. Test

Ditambahkan di `src/features/desa/domain/tenant.test.ts` (menggantikan blok fallback lama yang mengharapkan perilaku selalu aktif):

- fallback mati secara default — `localhost:3000`, `desa-lain.desa.id`, dan `null` tidak resolve pada instalasi satu desa;
- fallback aktif hanya dengan `{ fallbackSatuDesa: true }`;
- instalasi tanpa desa tetap `null` meski flag aktif;
- instalasi multi-desa tidak pernah memakai fallback meski flag aktif;
- **host platform tidak pernah resolve ke desa tunggal meski flag aktif** (`flexidesa.id`, `www.flexidesa.id`, `FLEXIDESA.ID:3000`), sementara domain desa tetap dipetakan;
- host mirip platform (`flexidesa.id.evil.example`) bukan host platform — terdokumentasi sebagai konsekuensi flag.

Di `src/lib/env.test.ts`: default `false`, `"true"` → `true`, dan nilai `"1"` ditolak.

## 4. Validasi

| Perintah | Hasil |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/desa/domain/tenant.test.ts src/lib/env.test.ts` | PASS — 25 test |
| `npm run check` (typecheck + lint + format + seluruh test) | PASS — 219 file, 1920 test |
| `npx prettier --check` | PASS setelah `--write` pada `tenant.test.ts` (temuan awal: format) |

Tidak ada integration test baru; integration test host yang ada (`src/features/multi-desa/isolasi-host.integration.test.ts`) memakai fungsi yang sama dengan opsi default sehingga tetap berjalan pada perilaku fail-closed.

## 5. Risiko dan catatan

- **Perubahan perilaku development:** instalasi satu desa yang diakses lewat `127.0.0.1`/`localhost` sekarang 404 kecuali `.env` lokal menambahkan `TENANT_LEGACY_SINGLE_HOST_FALLBACK=true`. `.env` milik mesin pengembangan tidak diubah oleh task ini.
- **Host tak dikenal tetap berstatus 500, bukan 404**: jalur `throw notFound()` dari `@/lib/errors` belum punya error boundary. Ini temuan F-02 audit dokumen dan sengaja tidak diubah di sini agar scope tetap satu temuan; flag mati hanya memastikan tenant tidak bocor.
- Flag tidak ditegakkan mati pada `NODE_ENV=production`; larangan aktif di production FlexiDesa masih berupa instruksi dokumentasi. Enforcement butuh keputusan karena instalasi mandiri satu desa bisa memerlukannya.
- `resolveVillageId(user)` (fallback desa pertama untuk admin tanpa penugasan) **tidak** diubah; itu jalur otorisasi sesi, bukan host publik.

## 6. Kesimpulan

Host tak dikenal tidak lagi otomatis menampilkan desa tunggal. Fallback tetap tersedia untuk development/instalasi mandiri lewat flag eksplisit, dengan host platform dan instalasi multi-desa tetap tertutup. Perilaku ini terkunci oleh 6 test domain dan 1 test env.
