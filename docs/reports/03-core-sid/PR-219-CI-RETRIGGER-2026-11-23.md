# Perbaikan lanjutan dan pemicu CI PR #219 — 23 November 2026

- **Task:** PR #219 — menyelesaikan perbaikan lokal pasca empat blocker build/format awal, merapikan batas lapisan dan memastikan workflow CI/Visual QA berjalan.
- **Tujuan:** menjaga query dan validasi Pengaturan Desa/Keamanan melalui application use case dan repository; memperbaiki test yang gagal di branch; memicu required checks di GitHub.
- **Tanggal:** 2026-11-23.
- **Branch task:** `task/PR-219-ci-fix` (dipublikasikan pada branch head PR `work/pengaturan-desa`).
- **Base commit kerja:** `fc9dc3ef32fd833c8bf5f58740657afeca7817d4` (`origin/main` setelah PR #216 masuk).
- **Commit implementasi dan laporan awal:** `971210ded5e9752e27d7b540ab3a3cbf71449e68`.
- **Pembaruan laporan hasil Visual QA dan perbaikan schema:** tercakup dalam commit koreksi pada histori branch/penyerahan task.
- **PR:** [#219](https://github.com/fahmiorim/appdes/pull/219).

## Kondisi awal dan analisis

Empat blocker build/format yang telah dicatat dalam laporan [perbaikan CI PR #216 dan pemeriksaan #219](./INVENTARIS-PR-216-CI-2026-11-23.md) sudah diperbaiki dan commit `9ddead098174bb176aecc0fec2bd8c2708eefbac` sudah ada pada branch PR. Perubahan lanjutan lokal berasal dari kegagalan unit test/typecheck dan guard arsitektur: beberapa route/page mengakses Drizzle/repository secara langsung, sementara test lama tidak menyediakan kontrak permission/sesi terbaru atau memanggil komponen server async secara tepat.

Workflow `.github/workflows/ci.yml` dan `.github/workflows/visual-qa.yml` hanya berjalan untuk Pull Request dengan base `main`. PR #219 awalnya berbasis `feature/inventaris-aset-mockup-v2`, sehingga base dipindah ke `main` untuk menjalankan checks. PR #216 telah masuk `main`, dan perubahan #219 menggunakan migration `0051`–`0056`, setelah rangkaian migration #216 `0045`–`0050`.

Run CI #45113247301 pada head `4ec3d0d34b0094cbf716c7180127e0795cbb76d9` lulus, termasuk test unit/quality, build produksi, dan integration test disposable MySQL 8. Visual QA #45113247331 gagal pada step `Start Next.js`; log menunjukkan Better Auth mengharapkan key schema `twoFactors` karena adapter dikonfigurasi `usePlural: true`, sedangkan schema hanya mengekspor `twoFactor`. Tabel fisik `two_factor` dan migrasinya sudah ada; penyebabnya adalah nama key export schema Drizzle yang tunggal, bukan DDL yang hilang.

## File yang diperiksa

`AGENTS.md`, `docs/README.md`, `docs/reports/README.md`, `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`, workflow CI dan Visual QA, route Pengaturan Desa, halaman keamanan, use case dan repository terkait, schema/migration terkait melalui perubahan sebelumnya, serta unit test yang terdampak.

## File yang diubah dan alasan

- `src/app/api/pengaturan-desa/{route.ts,backup/route.ts,layanan/route.ts,media/route.ts}`: delegasikan validasi dan operasi data ke application use case; route tetap menjadi batas HTTP dan memeriksa permission serta tenant dari sesi.
- `src/features/pengaturan/{application/pengaturan-desa-use-cases.ts,domain/pengaturan-desa.ts,infrastructure/pengaturan-desa-repository.ts}`: skema dan validasi domain, operasi aplikasi, serta query/mutasi desa dipisah per lapisan. Referensi logo/favicon backup divalidasi terhadap tenant aktif; mutasi layanan mempersempit query ke `villageId`.
- `src/app/api/publik/favicon/route.ts`: resolusi tenant/path dan pembacaan media menggunakan use case/pola media publik yang sudah ada.
- `src/app/(admin)/pengaturan/pengguna/keamanan/{page.tsx,keamanan-actions.ts}`, `src/app/profil/keamanan/page.tsx`, `src/features/pengguna/{application/pengguna-use-cases.ts,domain/keamanan.ts,infrastructure/keamanan-repository.ts}`: query keamanan akun dan pemanggilan repository dipindahkan dari page/action ke use case; kebijakan default dipusatkan di domain.
- `src/app/api/pengaturan/pengguna/aktivitas/ekspor/route.ts`, `src/features/audit/application/audit-use-cases.ts`: ekspor audit menggunakan application use case.
- `src/features/pengaturan/infrastructure/pengaturan-repository.ts`: tipe mode penomoran diselaraskan dengan integer pada schema.
- Test yang diperbarui: `src/app/(admin)/statistik/penduduk/ekspor/pdf/route.test.ts`, `src/app/public-site-layout.test.ts`, `src/features/{anjungan,gis,pelanggan,penduduk,pengaturan,pengguna}/application/*test.ts`, dan `src/lib/dal.test.ts`. Test ini memperbarui fixture terhadap permission CRUD, profil sesi, konfigurasi repository, serta komponen server async.
- `src/features/pengaturan/domain/pengaturan-desa.test.ts`: uji path media yang sah, tenant lain, traversal, dan ekstensi yang tidak diizinkan.
- `docs/reports/03-core-sid/PR-219-CI-RETRIGGER-2026-11-23.md`: laporan ini.

Tidak ada dependency, schema, atau migration baru dalam perubahan lanjutan ini. Migration #219 yang sudah ada tidak diedit atau dijalankan.

## Security dan tenant

- Route admin tetap memanggil `requirePermission` dan mendapatkan `villageId` melalui `resolveVillageId(user)` di server; body/query klien bukan sumber otorisasi tenant.
- Query operasi katalog layanan dan konfigurasi dibatasi `villageId`; operasi layanan update/nonaktif mengikat ID record dan tenant pada kondisi query.
- Restore backup menolak path media yang bukan milik tenant atau tidak sesuai direktori/ekstensi yang diizinkan. Test domain mencakup path tenant silang dan traversal.
- Halaman profil keamanan mengambil user dari `requireUser`; policy desa hanya dibaca ketika konteks user memiliki `villageId`.
- Perubahan ini tidak menjalankan migration, tidak mengakses database production, dan tidak memasukkan data pribadi/secrets ke fixture atau laporan.

## Validasi lokal

Perintah berikut dijalankan pada working tree yang akan dipublikasikan:

| Status | Perintah | Hasil |
|---|---|---|
| PASS | `npm test` | 249 file dan 2.104 test lulus setelah perbaikan export schema. |
| PASS | `npm run lint` | 0 error, 10 warning (warning `console`, `<img>`, dan navigasi internal yang tercatat pada output). |
| PASS | `npm run typecheck` | `next typegen && tsc --noEmit` lulus setelah koreksi nama export. |
| PASS | `npm run build` | Build produksi selesai. Turbopack mengeluarkan dua warning tracing akses filesystem dinamis pada modul ekspor/WhatsApp yang tidak diubah. |
| PASS | `npm run format:check` | Semua file sesuai Prettier setelah koreksi schema dan regression test. |
| PASS | `npx vitest run src/db/migrasi-paritas.test.ts` | 12 test lulus; regression test untuk key `twoFactors` gagal sebelum fix karena key schema tidak tersedia karena key schema tidak tersedia.\"twoFactors\"`. |
| PASS | `git diff --check` | Tidak menemukan whitespace error pada perubahan saat ini. |
| SKIPPED | `npm run test:integration:ci` lokal | Tidak dijalankan karena MySQL disposable lokal tidak disiapkan; workflow GitHub menggunakan MySQL 8 disposable. |
| PASS | CI GitHub Actions run #45113247301 pada head `4ec3d0d34b0094cbf716c7180127e0795cbb76d9` | Unit/quality, build produksi, dan integration MySQL 8 lulus. Run ini mendahului koreksi export schema. |
| FAIL | Visual QA run #45113247331 pada head `4ec3d0d34b0094cbf716c7180127e0795cbb76d9` | `Start Next.js` gagal dengan `SCHEMA_MISMATCH`: Better Auth melaporkan missing schema key `twoFactors`; telah diperbaiki dengan export plural dan regression test. |
| PENDING | CI GitHub Actions untuk koreksi export schema | Belum dipush atau dijalankan oleh GitHub Actions. |
| PENDING | Visual QA GitHub Actions untuk koreksi export schema | Belum dipush atau dijalankan; harus diverifikasi pada run baru setelah push. |

## Status Git/PR dan risiko tersisa

PR #219 berstatus `OPEN`, head `work/pengaturan-desa`, base `main`. Perbaikan berlapis sebelumnya telah dipush (`971210ded5e9752e27d7b540ab3a3cbf71449e68` dan pembaruan laporan `4ec3d0d34b0094cbf716c7180127e0795cbb76d9`). CI utama lulus pada commit laporan itu, tetapi Visual QA gagal karena model schema Better Auth diekspor dengan key `twoFactor`, bukan `twoFactors`. Koreksi lokal sekarang mengganti nama export saja, mempertahankan tabel DB `two_factor`, dan menambahkan regression test statis; validasi lokal lulus. Koreksi ini belum dikomit/dipush dan belum diverifikasi ulang oleh Actions. Tidak ada migration yang diubah/dijalankan, merge, atau deployment.

Risiko/keterbatasan:
- CI utama PASS tetapi Visual QA FAIL pada commit sebelum koreksi; Visual QA ulang dan CI untuk koreksi export schema masih menunggu push/run.
- Integration MySQL lulus di CI pada run sebelumnya; tidak dijalankan lokal.
- Warning lint yang sudah ada dan warning tracing Turbopack pada build sebelumnya tetap di luar scope. Mismatch schema 2FA telah diperbaiki di working tree, tetapi belum mendapat konfirmasi dari Actions setelah push.
- PR tetap menunggu review maintainer; perubahan tidak menyatakan PR siap merge sebelum seluruh required check remote lulus.

## Kesimpulan dan langkah berikutnya

Perubahan lanjutan dipisahkan ke use case/repository dengan tenant berasal dari konteks server, disertai koreksi test. Akar kegagalan Visual QA pada run sebelumnya ditemukan di nama export schema Better Auth, diperbaiki tanpa mengubah migration, dan dilindungi regression test yang terbukti gagal sebelum fix. Validasi lokal lulus; push dan verifikasi ulang run GitHub CI/Visual QA masih perlu dilakukan sebelum checks dapat dinyatakan hijau.
