# Laporan pemulihan CI PR #218 — Laporan Statistik

- **Task:** PR #218 — memperbaiki CI dan memastikan query laporan statistik berada pada jalur tenant-scoped.
- **Tujuan:** Menuntaskan kegagalan quality/build yang terlihat pada run CI PR #218, tanpa mengubah migration SQL atau melakukan merge.
- **Tanggal:** 2026-11-22.
- **Branch task:** `task/PR-218-laporan-statistik-ci`.
- **Branch sumber PR:** `feature/laporan-statistik-mockup`.
- **Base branch PR:** `main`.
- **Commit awal task / head PR saat pemeriksaan:** `9bec3c85b537abbba472c47dbd0b5e86a5fd1914`.
- **Merge-base dengan `origin/main`:** `a70254baaf38547f5b71282c8e1a836538ead963`.
- **Commit hasil perubahan kode:** `d553119825a0d4791c96f334db07e894ab5855ef`.
- **Commit koreksi laporan setelah push:** akan dicatat setelah laporan diperbarui dengan status workflow.
- **PR:** [#218](https://github.com/fahmiorim/appdes/pull/218), terbuka dan draft saat laporan dibuat.

## Kondisi awal dan analisis

Working tree pada head PR `9bec3c85` berisi perubahan fitur laporan statistik yang belum di-commit. Log CI terbaru yang tersedia saat mulai adalah run `44932651952` (2026-11-21), bukan hasil perubahan lokal. Log run tersebut menunjukkan:

- **Format check gagal:** Prettier menemukan 18 file laporan statistik tidak terformat.
- **Build gagal pada TypeScript:** akses `affectedRows` yang salah pada dua route template dan dua operasi laporan tersimpan, serta tipe body PDF (`Uint8Array<ArrayBufferLike>`) yang tidak diterima sebagai `BodyInit`.
- **Integration test MySQL lulus** pada run tersebut.
- **Visual QA run `44932651929` gagal**; log job menjalankan build yang gagal pada error TypeScript yang sama, sehingga run tersebut tidak membuktikan kegagalan visual tersendiri.
- Check CI gagal karena job quality/build tersebut.

Perubahan lokal merapikan format file fitur, memperbaiki tipe/body ekspor dan hasil operasi database, memindahkan query laporan ke infrastructure repository, serta memperbaiki pemetaan authorization error pada route ekspor snapshot. Run CI yang dikutip mendahului perubahan ini.

## File yang diperiksa

`AGENTS.md`, `docs/README.md`, `docs/reports/README.md`; seluruh staged diff PR; `src/features/laporan-statistik/application/laporan-statistik-use-cases.ts`; `src/features/laporan-statistik/infrastructure/laporan-statistik-repository.ts`; route API laporan, template, tersimpan, dan ekspor; test use case/route; `src/db/schema/laporan-statistik.ts`; `src/db/migrasi-paritas.test.ts`; migration journal dan snapshot `0034`–`0036`.

## File berubah dan alasan

- UI laporan statistik, halaman laporan desa, saved reports, template, navigasi, rekap, statistik, dan stylesheet di `src/app/(admin)/laporan-statistik/`: perubahan fitur laporan yang memang ada pada branch PR; dirapikan formatnya.
- `src/app/api/laporan-statistik/{ekspor,template,tersimpan}/route.ts` dan `src/app/api/laporan-statistik/tersimpan/[id]/ekspor/route.ts`: route memakai use case untuk akses/otorisasi dan memetakan `AppError` ke HTTP status; ekspor snapshot tidak lagi mengubah penolakan permission menjadi 500.
- `src/features/laporan-statistik/application/export-laporan.ts`: memperbaiki pembuatan response/format ekspor yang terkait kegagalan typecheck/build.
- `src/features/laporan-statistik/application/laporan-statistik-use-cases.ts` dan `src/features/laporan-statistik/infrastructure/laporan-statistik-repository.ts`: memisahkan otorisasi/resolusi tenant dari query database; query/mutasi saved report dan template dibatasi `villageId`.
- `src/app/api/laporan-statistik/tersimpan/[id]/ekspor/route.test.ts` dan `src/features/laporan-statistik/application/laporan-statistik-use-cases.test.ts`: regression test status 403/500, izin, dan tenant yang berasal dari sesi.
- `src/db/schema/laporan-statistik.ts`, `src/db/migrasi-paritas.test.ts`, dan snapshot metadata Drizzle `0034_snapshot.json`–`0036_snapshot.json`: nama foreign key schema disamakan dengan migration lama, parser paritas menerima indentasi tab/spasi, dan snapshot melengkapi journal entries yang sudah ada.

Tidak ada migration SQL baru, tidak ada perubahan journal untuk entri migration baru, dan tidak ada snapshot `0037`. Generator Drizzle menyatakan tidak ada perubahan schema untuk dibuat.

## Hasil perubahan dan keamanan tenant

- Use case meminta permission server-side sebelum memanggil repository dan mendapatkan `villageId` lewat `resolveVillageId(user)`; tidak menerima identitas tenant dari request client.
- Query list, detail, update, dan delete laporan tersimpan/template memakai kondisi `villageId`; join statistik juga mengikat tenant pada join yang relevan.
- Route ekspor laporan tersimpan mempertahankan status HTTP dari `AppError`; regression test memeriksa 403 untuk permission ditolak dan 500 untuk error tak terduga.
- Tidak menjalankan migration database dan tidak menggunakan data production.

## Validasi

Pemeriksaan lokal yang telah dijalankan pada perubahan akhir sebelum commit:

| Status | Perintah | Hasil |
|---|---|---|
| PASS | `npm run test:unit` | 247 file / 2.085 test lulus. |
| PASS | Test terarah laporan statistik dan paritas migration | 20 test lulus. |
| PASS | `npm run typecheck` | Typecheck lulus. |
| PASS | `npm run format:check` | Format check lulus. |
| PASS | `npm run lint` | Lulus dengan 2 warning yang telah ada di `scripts/wilayah/generate-wilayah.mjs`. |
| PASS | `npm run build` | Build lulus; ada 2 warning Turbopack filesystem tracing dari modul lain. |
| PASS | `npx drizzle-kit generate --name=laporan_statistik_followup` | “No schema changes, nothing to migrate”. Tidak menjalankan migration. |
| PASS | `git diff --cached --check` | Tidak ada whitespace error pada staged diff. |
| FAIL (run lama) | GitHub Actions `44932651952` | Format check dan production build gagal sebelum perbaikan lokal; integration job lulus. |
| FAIL (run lama) | GitHub Actions `44932651929` | Visual QA job gagal; log menunjukkan build typecheck PR gagal pada error yang sama. |
| PENDING | CI GitHub Actions pada commit hasil | Run CI `44936904611` sedang berjalan setelah push; status final belum tersedia saat laporan diperbarui. |
| PENDING | Visual QA pada commit hasil | Run Visual QA `44936904617` sedang berjalan setelah push; status final belum tersedia saat laporan diperbarui. |
| SKIPPED | `db:migrate` / migration integration lokal | Sengaja tidak dijalankan; tidak diperlukan untuk cek unit/build dan dilarang untuk database production. |

**Peringatan yang tersisa:** dua warning lint dan dua warning Turbopack berasal dari area lain dan tidak diperbaiki dalam task ini.

## Status Git dan perubahan

Sebelum commit, perubahan kode yang dipilih mencakup 25 file dengan kira-kira 69.875 insertions dan 524 deletions; mayoritas ukuran adalah tiga snapshot schema Drizzle lengkap. Tidak ada dependency baru atau migration SQL pada diff terpilih. File laporan ini ditambahkan pada branch yang sama. Commit SHA final akan tercatat setelah commit kode dan laporan.

## Risiko dan keterbatasan

- Run CI dan Visual QA baru terpicu pada head `d553119825a0d4791c96f334db07e894ab5855ef`; saat pembaruan ini dibuat keduanya masih `in_progress`, jadi belum ada verdict remote.
- PR #218 tetap draft dan tidak di-merge.
- Integration behavior database selain yang dijalankan oleh job remote lama tidak diverifikasi secara lokal; tidak menjalankan migration lokal.
- Isi snapshot besar namun diperlukan agar urutan snapshot metadata cocok dengan journal 0040–0042; schema generation melaporkan tidak ada migration lanjutan.

## Kesimpulan dan langkah berikutnya

Penyebab format/typecheck yang tercatat pada CI lama telah diperbaiki dan seluruh pemeriksaan lokal yang disebut di atas lulus. Commit `d5531198` telah di-push ke branch sumber PR #218 dan memicu run CI/Visual QA baru yang masih berjalan saat laporan ini diperbarui. Jangan merge selama PR masih draft atau ada check gagal/pending.
