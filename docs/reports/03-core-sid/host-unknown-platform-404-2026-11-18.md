# Host desa tidak dikenal dan host platform mengembalikan 404

- **Task:** memastikan host publik yang tidak resolve tenant dan host platform mengakhiri request dengan sinyal 404 native Next.js, bukan AppError yang tampil sebagai 500.
- **Tanggal:** 18 November 2026
- **Branch:** `task/host-404`
- **Base commit:** `c97c489` (`main`)
- **Jenis pekerjaan:** perbaikan kode + regression test; tidak ada perubahan schema/database.
- **Status:** siap review

## 1. Akar masalah

`resolveVillageByHost()` sudah memanggil `notFound()` dari `next/navigation` untuk host platform. Tetapi jalur host desa tak dikenal / desa tidak ditemukan melempar `notFound()` dari `@/lib/errors`, yang hanya membuat `AppError("NOT_FOUND")`. Tanpa error boundary pemetaan, error aplikasi itu menjadi HTTP 500 di Server Component, bukan mekanisme routing 404 Next.js.

## 2. Perubahan

| File | Perubahan |
|---|---|
| `src/features/desa/application/resolve-village.ts` | Setelah host gagal resolve dan tidak ada identitas desa, panggil helper Next `halamanTidakDitemukan()` yang sudah diimpor. Host platform tetap memakai helper yang sama sebelum query tenant. `notFound` AppError tetap digunakan pada `resolveVillageId()` admin (kasus berbeda dan di luar scope). |
| `src/features/desa/application/resolve-village.test.ts` | Regression test memastikan host asing pada instalasi multi-desa dan host platform menghasilkan digest `NEXT_HTTP_ERROR_FALLBACK;404`, serta tidak memuat data tenant. |

Ini hanya mengubah cara penolakan host publik dirender. Tenant tetap diselesaikan dari `Host`, tanpa perubahan aturan kepemilikan/permission.

## 3. Bukti RED → GREEN

- Sebelum perbaikan, test host asing gagal dengan `AppError { code: "NOT_FOUND" }`, bukan sinyal 404 Next; test host platform lulus.
- Sesudah perbaikan, kedua test menghasilkan sinyal 404 Next dan memastikan repository identitas tidak dipanggil.

## 4. Validasi

| Perintah | Hasil |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/desa/application/resolve-village.test.ts` (sebelum perbaikan) | **FAIL seperti diharapkan** — host asing menghasilkan AppError `NOT_FOUND`; host platform test lulus. |
| `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/desa/application/resolve-village.test.ts src/features/desa/domain/tenant.test.ts` | **PASS** — 2 berkas, 19 test. |
| `npm run check` | **PASS** — 220 berkas test, 1922 test. |
| `npx prettier --check src/features/desa/application/resolve-village.ts src/features/desa/application/resolve-village.test.ts` | **PASS** setelah `prettier --write` pada test baru. |
| `git diff --check` | PASS. |

## 5. Risiko dan keterbatasan

- Regression test menguji sinyal `notFound()` Next secara unit; tidak melakukan HTTP runtime/browser check. Endpoint/halaman yang menangkap exception `resolveVillageByHost()` sendiri (misalnya webhook email) tetap boleh memetakan error tersebut ke response JSON 404 sesuai kontraknya.
- Fallback single-desa adalah perubahan terpisah di PR #135; task ini tidak mengubah atau menggabungkan scope fallback.
- Tidak ada perubahan otorisasi, tenant ID, schema, migration, atau database.

## 6. Kesimpulan

Host platform ditolak sebelum query tenant, dan host publik yang tidak dapat dipetakan sekarang menggunakan mekanisme `notFound()` native Next.js. Regression tests menutup kedua jalur agar tidak kembali tampil sebagai 500.
