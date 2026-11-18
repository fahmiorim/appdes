# Redirect login host platform ke login administrator

- **Task:** pada host platform yang ditetapkan eksplisit, arahkan `/masuk` ke `/super-admin-login`; pertahankan login `/masuk` untuk host desa dan deployment tanpa `PLATFORM_HOSTS`.
- **Tanggal:** 18 November 2026
- **Branch:** `task/platform-login-route`
- **Base commit:** `7a119d1` (`main` saat branch dibuat)
- **Commit implementasi:** `55c1b5d93d84ea0d93bd2fb7ebb7619b05f925b7`
- **Commit laporan:** menyusul setelah commit implementasi; akan tercatat di riwayat branch/PR.
- **Status:** siap review

## Analisis

`src/app/(auth)/masuk/page.tsx` menampilkan halaman login warga dengan hero “Layanan Digital Warga Desa” pada semua host. Di host platform, jalur ini seharusnya memakai halaman login administrator yang sudah tersedia di `/super-admin-login`. Pemeriksaan perlu berdasarkan host yang telah dikonfigurasi, bukan hostname yang ditebak atau header forwarded yang tidak tepercaya.

## File diperiksa

- `src/app/(auth)/masuk/page.tsx` dan `login-form.tsx`
- `src/features/desa/application/platform-host.ts`
- `src/features/desa/domain/host.ts`
- `src/lib/public-paths.ts`
- `src/app/page.tsx`
- `vitest.config.mts`

## File berubah

| File | Alasan |
|---|---|
| `src/app/(auth)/masuk/page.tsx` | Memeriksa header `Host` dengan helper normalisasi host yang ada; host platform dialihkan sebelum pemuatan sesi. |
| `src/features/desa/application/platform-host.ts` | Menyediakan `hostPlatformEksplisit`, khusus nilai `PLATFORM_HOSTS`, agar host hasil fallback `APP_URL` tidak salah dianggap konfigurasi eksplisit. |
| `src/app/(auth)/masuk/page.test.ts` | Menguji redirect host platform dan mempertahankan alur login host desa / konfigurasi kosong. |
| `docs/reports/03-core-sid/platform-login-route-2026-11-18.md` | Laporan untuk reviewer sesuai prosedur repository. |

Mockup dan aset lokal untracked lainnya tidak diubah atau dimasukkan.

## Implementasi dan keamanan

- Hanya host yang cocok secara exact dengan daftar `PLATFORM_HOSTS` setelah normalisasi (termasuk pembuangan port dan alias `www` sesuai helper domain) yang dialihkan ke `/super-admin-login`.
- Host desa, host mirip/domain suffix asing, dan deployment tanpa `PLATFORM_HOSTS` tetap menjalankan halaman login sekarang.
- `Host` dibaca server-side melalui `headers()`; tidak mengandalkan `villageId`, query/form/header dari klien sebagai bukti otorisasi.
- Halaman login Super Admin tetap menggunakan autentikasi dan guard server-side yang sudah ada; perubahan ini tidak melemahkan otorisasi.

## Validasi

| Perintah/pemeriksaan | Hasil |
|---|---|
| `npm run test:unit -- "src/app/(auth)/masuk/page.test.ts"` | **PASS** — 1 file, 5 test. |
| `npm run typecheck` | **PASS** — route types dan `tsc --noEmit`. |
| `npm run lint` | **PASS**. |
| `npx prettier --check "src/app/(auth)/masuk/page.tsx" "src/app/(auth)/masuk/page.test.ts" src/features/desa/application/platform-host.ts` | **PASS**. |
| `git diff --check HEAD^ HEAD` | **PASS**. |
| Runtime: `curl` dengan `Host: flexidesa.test:3000` ke `/masuk` | **PASS** — HTTP 307 ke `/super-admin-login`. |
| Runtime: `curl` dengan `Host: 127.0.0.1:3000` atau `sukamaju.localhost:3000` ke `/masuk` | **PASS** — HTTP 200; login yang ada tetap tampil. |
| Runtime: `curl` dengan `Host: flexidesa.test:3000` ke `/super-admin-login` | **PASS** — HTTP 200. |
| CI GitHub pada PR | **SKIPPED** — belum dibuat pada saat laporan ini ditulis; CI dipicu setelah push PR. |

## Risiko dan keterbatasan

- Behavior redirect otomatis membutuhkan `PLATFORM_HOSTS` yang benar dan eksplisit. Ini disengaja untuk menghindari redirect login staf desa pada deployment satu-domain yang hanya memiliki `APP_URL`.
- Pemeriksaan runtime dilakukan pada server lokal yang sudah aktif dan memuat perubahan. CI remote belum berjalan sebelum PR dibuat.
- Tidak ada perubahan schema, migration, kredensial, maupun data database.

## Kesimpulan dan langkah berikutnya

`/masuk` host platform kini diarahkan ke login administrator, sementara host desa dan deployment tanpa daftar host platform eksplisit tetap memakai login lama. Tinjau PR dan hasil CI baru sebelum merge.
