# Larang fallback satu-desa pada production FlexiDesa

- **Task:** tegakkan larangan `TENANT_LEGACY_SINGLE_HOST_FALLBACK=true` untuk deployment production FlexiDesa.
- **Tanggal:** 18 November 2026
- **Branch:** `task/guard-flexidesa-legacy-fallback`
- **Base commit:** `063bcfa` (`task/tenant-fallback-opt-in`, PR #135; belum merged saat task dikerjakan)
- **Jenis pekerjaan:** guard validasi environment, test, dokumentasi; tidak ada perubahan schema/database.
- **Status:** siap review

## 1. Analisis

Sebelumnya `TENANT_LEGACY_SINGLE_HOST_FALLBACK` hanya divalidasi sebagai boolean string dengan default `false`. Nilai `true` dapat diterima di semua `NODE_ENV`, termasuk production FlexiDesa, walaupun dokumentasi melarangnya. Environment sudah menyediakan `NODE_ENV`, `PLATFORM_HOSTS`, dan `APP_URL`, sehingga guard dapat mengenali deployment FlexiDesa tanpa menambah flag deployment lain.

## 2. Perubahan

| File | Perubahan |
|---|---|
| `src/lib/env.ts` | `superRefine` menolak konfigurasi bila `NODE_ENV=production`, fallback bernilai `true`, dan host platform efektif berisi exact host `flexidesa.id` atau `www.flexidesa.id`. Host efektif dinormalisasi dengan helper domain yang sudah ada, dari `PLATFORM_HOSTS` atau fallback `APP_URL`. |
| `src/lib/env.test.ts` | Test menolak FlexiDesa melalui `APP_URL`, menolak bila `PLATFORM_HOSTS` memuat host FlexiDesa meski `APP_URL` host lain, dan memastikan mode development / production mandiri-host lain masih dapat memakai fallback. |
| `.env.example` | Memperjelas nilai `true` ditolak saat production FlexiDesa. |
| `docs/deployment/ENVIRONMENT.md` | Mencatat kondisi enforcement, asal host efektif, dan kompatibilitas production mandiri. |

Guard berlaku ketika host platform tepat `flexidesa.id` atau alias `www.flexidesa.id`; domain menyerupai seperti `flexidesa.id.evil.example` tidak dianggap FlexiDesa. Jika `PLATFORM_HOSTS` disetel, itulah daftar efektif; `APP_URL` hanya menjadi fallback saat nilainya kosong.

## 3. Bukti RED → GREEN

- Sebelum implementasi: dua test baru gagal karena `parseEnv()` menerima fallback aktif untuk production FlexiDesa (baik ditentukan melalui `APP_URL` maupun `PLATFORM_HOSTS`).
- Sesudah implementasi: semua 11 test `env.test.ts` lulus, termasuk penolakan production FlexiDesa dan penerimaan development/production mandiri.

## 4. Validasi

| Perintah | Hasil |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/lib/env.test.ts` (sebelum guard) | **FAIL seperti diharapkan** — 2 assertion guard gagal, nilai diterima. |
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/lib/env.test.ts` (sesudah guard) | **PASS** — 11 test. |
| `npm run check` | **PASS** — 219 berkas, 1923 test (termasuk typecheck, lint, format, unit test). |
| `npx prettier --write src/lib/env.ts src/lib/env.test.ts docs/deployment/ENVIRONMENT.md` | Dijalankan sebelum check; pemformatan diterapkan. |
| `git diff --check` | PASS. |

## 5. Risiko dan keterbatasan

- Guard fail-fast hanya dapat mengenali deployment FlexiDesa dari `PLATFORM_HOSTS` atau host `APP_URL`. Jika keduanya salah dikonfigurasi dengan host non-FlexiDesa, validasi tidak bisa mengetahui deployment tersebut sebenarnya production FlexiDesa. Konfigurasi produksi wajib menetapkan host platform yang benar.
- Host lain (instalasi mandiri) masih bisa mengaktifkan fallback di production sesuai permintaan scope; risiko keamanan fallback untuk host asing tetap ada dan harus dipahami pemilik deployment.
- PR ini bertumpuk di atas PR #135 yang belum merged; review/merge harus dilakukan berurutan.
- Tidak ada verifikasi terhadap konfigurasi environment server production maupun restart service.

## 6. Kesimpulan

Startup production FlexiDesa sekarang gagal dengan pesan validasi yang jelas bila fallback legacy diaktifkan. Development dan deployment mandiri dengan host platform lain tidak terpengaruh.
