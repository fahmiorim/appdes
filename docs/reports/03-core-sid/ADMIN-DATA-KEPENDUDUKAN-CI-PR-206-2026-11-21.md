# Perbaikan CI PR #206 — Data Kependudukan

- **Task:** PR #206 — memperbaiki regresi alur hubungan keluarga pada mutasi penduduk dan menyelaraskan branch bertingkat dengan `main`.
- **Tujuan:** Membuat CI PR #206 dapat berjalan di atas perubahan #205 yang sudah masuk `main`, menjaga relasi keluarga pilihan form tetap tersimpan, dan memastikan quality gate lokal lolos.
- **Tanggal:** 2026-11-21.
- **Branch:** `feat/admin-data-kependudukan`.
- **Base commit saat sinkronisasi:** `d149a2d1e3c37ea9c3406d38b4524a96f8c6ec12` (`main`, hasil merge PR #205).
- **Commit hasil pekerjaan:** belum dibuat pada saat laporan disusun; akan direkam lewat riwayat commit branch.
- **PR:** https://github.com/fahmiorim/appdes/pull/206

## Kondisi awal dan analisis

PR #206 sebelumnya menargetkan branch PR #205 (`codex/website-admin-complete-main`) dan belum memiliki check yang dilaporkan. Setelah #205 merged, branch #206 disinkronkan terhadap `origin/main` tanpa konflik; kemudian PR perlu ditargetkan langsung ke `main` agar dependency parent tidak menggantung.

`npm run typecheck` awal menemukan error pada perubahan #206 sendiri:

- `catatKelahiran` menambahkan `familyRelationId` dua kali pada objek input penduduk.
- `catatDatang` menyediakan `familyRelationId: null` setelah nilai form, sehingga pilihan relasi hilang, dan schema serta action belum meneruskan pilihan tersebut.
- Action/forms/test lama belum menyertakan properti baru yang menjadi bagian input schema.
- `npm run format:check` gagal pada 23 file yang berubah di PR.

Regression test untuk `catatDatang` ditambahkan lebih dulu dan diamati gagal karena repository menerima `familyRelationId` yang hilang. Implementasi kemudian diperbaiki pada schema/action/use case dan fixture test dilengkapi.

## File yang diperiksa

- `docs/README.md`, `docs/reports/README.md`, `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, dan `AGENTS.md`.
- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts` dan test baru use case.
- `src/features/penduduk/domain/riwayat-penduduk.ts` dan test schema.
- `src/app/(admin)/mutasi-penduduk/actions.ts` serta halaman formulir mutasi.
- Integration test referensi tenant penduduk dan isolasi tenant riwayat.
- Status PR #206/#207, branch lokal/remote, serta hasil typecheck/format/lint/unit/build.

## File yang diubah

- `src/features/penduduk/application/riwayat-penduduk-use-cases.ts` — hapus properti ganda pada kelahiran dan teruskan hubungan keluarga pilihan pada penduduk masuk.
- `src/app/(admin)/mutasi-penduduk/actions.ts` — bawa `familyRelationId` dari FormData ke use case penduduk masuk.
- `src/features/penduduk/application/riwayat-penduduk-use-cases.test.ts` — regression test memastikan nilai relasi terpilih sampai ke repository; test diamati gagal sebelum fix dan lulus sesudahnya.
- `src/features/penduduk/domain/riwayat-penduduk.test.ts` — masukkan pilihan kosong dan assertion null untuk schema yang kini menerima relasi keluarga.
- `src/features/penduduk/infrastructure/penduduk-tenant-references.integration.test.ts` dan `src/features/penduduk/infrastructure/riwayat-penduduk-tenant-isolation.integration.test.ts` — fixture input diperbarui untuk kontrak opsional `familyRelationId`.
- 23 file yang ditandai Prettier dirapikan sesuai CI, meliputi halaman/data kependudukan, keluarga, mutasi, statistik, CSS, dan dua file use case/test terkait.
- `src/features/penduduk/domain/riwayat-penduduk.ts` dan area lain diperiksa; kontrak schema sudah ada pada commit fitur dan tidak diubah untuk mengatasi type error.
- Laporan ini mencatat bukti validasi dan risiko deployment.

## Perubahan dan security/tenant

Field hubungan keluarga kini diteruskan dari formulir penduduk masuk ke skema validasi/use case dan disimpan pada record penduduk. Kelahiran tetap memakai nilai pilihan schema satu kali, tanpa duplikasi. Pemeriksaan ownership tenant pada `validatePendudukTenantReferences` tetap dijalankan sebelum simpan; `villageId` tetap berasal dari sesi melalui `requirePermission` dan `resolveVillageId`, bukan dari form.

## Validasi

| Perintah | Hasil | Bukti/catatan |
|---|---|---|
| `npx vitest run src/features/penduduk/application/riwayat-penduduk-use-cases.test.ts` sebelum fix | FAIL (diharapkan) | Assertion menangkap `familyRelationId` tidak diteruskan; ini membuktikan regresi test. |
| `npx vitest run src/features/penduduk/application/riwayat-penduduk-use-cases.test.ts src/features/penduduk/domain/riwayat-penduduk.test.ts` | PASS | 2 file, 13 test lulus. |
| `npm run typecheck` | PASS | `next typegen` dan `tsc --noEmit`; tidak ada diagnostic. |
| `npm run test:unit` | PASS | 245 file, 2.076 test lulus. |
| `npm run lint` | PASS | Exit code 0; dua warning `no-console` lama di `scripts/wilayah/generate-wilayah.mjs:91–92`. |
| `npm run format:check` | PASS | Semua file repo sesuai Prettier setelah perbaikan. |
| `npm run build` | PASS | Production build Next.js selesai. |
| `git diff --check origin/main...HEAD` sebelum perubahan | PASS | Tidak ada whitespace error pada branch tersinkron. |
| Integration test MySQL lokal | SKIPPED | Database test disposable tidak diverifikasi; jangan menjalankan terhadap database production. Job integration CI PR harus dijadikan bukti. |
| Visual QA lokal | SKIPPED | Visual QA diharapkan dijalankan CI; tidak diminta capture manual. |
| CI GitHub PR #206 pasca-push | PENDING | Harus seluruh check PASS sebelum merge. |

## Risiko tersisa dan rekomendasi

- Belum ada hasil check GitHub setelah head terbaru dikirim; jangan merge sampai semua required checks hijau.
- Dua warning lint repository-level masih ada di skrip generator wilayah di luar scope.
- Integration test lokal dilewati karena tidak ada verifikasi eksplisit database disposable.
- PR #207 masih berbasis PR #206; tunggu #206 merged sebelum retarget/sinkronkan #207, jalankan CI-nya, dan merge hanya jika seluruh check PASS.
- Perubahan format mencakup 23 file PR yang memang disebut `format:check`; tidak ada styling/UX yang disengaja selain normalisasi format.
