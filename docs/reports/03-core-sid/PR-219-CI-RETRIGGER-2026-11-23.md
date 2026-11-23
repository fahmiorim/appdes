# Perbaikan lanjutan dan pemicu CI PR #219 — 23 November 2026

- **Task:** PR #219 — menyelesaikan perbaikan lokal pasca empat blocker build/format awal, merapikan batas lapisan dan memastikan workflow CI/Visual QA berjalan.
- **Tujuan:** menjaga query dan validasi Pengaturan Desa/Keamanan melalui application use case dan repository; memperbaiki test yang gagal di branch; memicu required checks di GitHub.
- **Tanggal:** 2026-11-23.
- **Branch task:** `task/PR-219-ci-fix` (dipublikasikan pada branch head PR `work/pengaturan-desa`).
- **Base commit kerja:** `fc9dc3ef32fd833c8bf5f58740657afeca7817d4` (`origin/main` setelah PR #216 masuk).
- **Commit implementasi dan laporan awal:** `971210ded5e9752e27d7b540ab3a3cbf71449e68`.
- **Pembaruan laporan pemicu CI:** dikirim sebagai commit terpisah setelah perubahan base; lihat SHA terbaru pada histori branch/penyerahan task.
- **PR:** [#219](https://github.com/fahmiorim/appdes/pull/219).

## Kondisi awal dan analisis

Empat blocker build/format yang telah dicatat dalam laporan [perbaikan CI PR #216 dan pemeriksaan #219](./INVENTARIS-PR-216-CI-2026-11-23.md) sudah diperbaiki dan commit `9ddead098174bb176aecc0fec2bd8c2708eefbac` sudah ada pada branch PR. Perubahan lanjutan lokal berasal dari kegagalan unit test/typecheck dan guard arsitektur: beberapa route/page mengakses Drizzle/repository secara langsung, sementara test lama tidak menyediakan kontrak permission/sesi terbaru atau memanggil komponen server async secara tepat.

Workflow `.github/workflows/ci.yml` dan `.github/workflows/visual-qa.yml` hanya berjalan untuk Pull Request dengan base `main`. PR #219 masih berbasis `feature/inventaris-aset-mockup-v2`, sehingga GitHub belum menampilkan checks. PR #216 telah masuk `main`, dan perubahan #219 menggunakan migration `0051`–`0056`, setelah rangkaian migration #216 `0045`–`0050`.

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
| PASS | `npm test` | 249 file dan 2.103 test lulus. Log test mencatat pesan Better Auth `Missing tables: twoFactors` dari konfigurasi test; test suite tetap exit 0. |
| PASS | `npm run lint` | 0 error, 10 warning (warning `console`, `<img>`, dan navigasi internal yang tercatat pada output). |
| PASS | `npm run typecheck` | `next typegen && tsc --noEmit` lulus. |
| PASS | `npm run build` | Build produksi selesai. Turbopack mengeluarkan dua warning tracing akses filesystem dinamis pada modul ekspor/WhatsApp yang tidak diubah. |
| PASS | `npm run format:check` | Semua file sesuai Prettier. |
| PASS | `git diff --check` dan `git diff --cached --check` | Tidak menemukan whitespace error. |
| PASS | `node scripts/ci-changes.mjs origin/main HEAD` | Mengklasifikasikan perubahan kode, integration, dan build sebagai `true`; job-job terkait memang harus berjalan. |
| PASS | Test terarah `npx vitest run src/features/pengaturan/domain/pengaturan-desa.test.ts src/features/pengaturan/application/pengaturan-use-cases.test.ts src/features/pengguna/application/pengguna-use-cases.test.ts` | 3 file, 13 test lulus sebelum cek penuh terakhir. |
| SKIPPED | `npm run test:integration:ci` lokal | Tidak dijalankan karena MySQL disposable lokal tidak disiapkan; workflow GitHub menggunakan MySQL 8 disposable. |
| PENDING | CI GitHub Actions untuk head hasil push | Base sudah `main`, tetapi belum ada run pada SHA implementasi (`gh api` mengembalikan `total_count: 0`); laporan diperbarui dan dipush untuk memicu event `synchronize`. |
| PENDING | Visual QA GitHub Actions untuk head hasil push | Workflow hanya terpicu pada PR ke `main` dengan path UI yang relevan; status diperiksa setelah push sinkronisasi. |

## Status Git/PR dan risiko tersisa

PR #219 semula `OPEN`, head `work/pengaturan-desa` pada `9ddead098174bb176aecc0fec2bd8c2708eefbac`, base `feature/inventaris-aset-mockup-v2`, dan belum memiliki checks. Commit implementasi `971210ded5e9752e27d7b540ab3a3cbf71449e68` telah dipush ke head PR. Base diubah ke `main` agar workflow sesuai trigger yang didefinisikan repository. Setelah perubahan base, GitHub belum membuat run untuk SHA tersebut (`gh api` melaporkan `total_count: 0`, dan `gh pr checks 219` melaporkan tidak ada checks). Pembaruan laporan ini dipush sebagai event sinkronisasi PR agar workflow pada diff menuju `main` mulai berjalan. Tidak ada merge atau deployment.

Risiko/keterbatasan:
- Hasil CI/Visual QA remote belum dapat dinyatakan PASS sampai run selesai pada head commit baru.
- Integration MySQL tidak diverifikasi lokal; CI disposable menjadi pemeriksaan integrasi.
- Lint warning, pesan mismatch tabel 2FA selama unit test, dan warning tracing Turbopack tetap ada dan tidak menjadi scope perubahan.
- PR tetap menunggu review maintainer; perubahan tidak menyatakan PR siap merge sebelum seluruh required check remote lulus.

## Kesimpulan dan langkah berikutnya

Perubahan lanjutan dipisahkan ke use case/repository dengan tenant berasal dari konteks server, disertai koreksi test, dan lulus validasi lokal yang tercantum. Setelah commit dipush dan base PR menjadi `main`, verifikasi status run GitHub CI serta Visual QA untuk head tersebut; laporkan hasil sebenarnya sebelum menyatakan checks hijau.
