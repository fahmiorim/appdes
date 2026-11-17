# Laporan Follow-up Lokal Fase 1 — Runner Integration dan Rollback `0011`

- **Task:** membereskan sisa validasi lokal Fase 1: runner integration Windows/Node 26 dan rehearsal rollback `0011`.
- **Tanggal:** 17 November 2026.
- **Branch:** `task/phase-1-local-followups`.
- **Base commit:** `7f17746b701915ffcdfc4672c2bbcb09e99fe46c` (`main`, merge PR #103).
- **Commit implementasi:** `bf6b72b2fa8e203b352b2f8b59c40f145b19fa10`.
- **Pull Request:** [#104](https://github.com/fahmiorim/appdes/pull/104).
- **Status:** siap review; belum di-merge.
- **Lingkungan:** Windows, Node `26.2.0`, MySQL `8.0.30` dari Laragon.

## 1. Ringkasan

Dua sisa lokal diselesaikan:

1. `npm run test:integration:ci` tidak lagi gagal karena `spawnSync ... vitest.cmd EINVAL` di Windows/Node 26. Runner sekarang menjalankan entry JavaScript Vitest dengan Node yang sama.
2. Rollback `0011` direhearse pada salinan schema staging lokal: 68 tenant FK kembali ke 60, delapan FK baseline `SET NULL` pulih, lalu `0011` diterapkan ulang sampai kembali 68.

Integration suite penuh lulus melalui perintah repository: **47/47 suite, 253/253 test**. Tidak ada assertion yang dihapus, test yang di-skip, atau strictness TypeScript yang diturunkan.

## 2. Kondisi awal

`scripts/run-integration-tests.mjs` memilih `node_modules/.bin/vitest.cmd` di Windows. Pada Node 26, `spawnSync` menolak file `.cmd` dengan `EINVAL` sebelum Vitest berjalan. Suite dapat dijalankan dengan `node node_modules/vitest/vitest.mjs`, tetapi perintah resmi repository tetap gagal.

Setelah runner diperbaiki, suite rollback B2 masih melewati `hookTimeout` 120 detik saat seluruh suite berjalan paralel. `beforeAll` suite tersebut membuat beberapa database dan menjalankan DDL; dengan batas 300 detik suite lulus tanpa perubahan test.

## 3. File yang diperiksa

- `scripts/run-integration-tests.mjs`
- `vitest.integration.config.mts`
- `src/db/b2-migration-guard-rollback.integration.test.ts`
- `docs/reports/01-security/AUD-034-b1-rollback.sql`
- `docs/reports/01-security/AUD-034-b1-rollback.md`
- `src/db/migrations/0011_b1_set_null_relations_composite_fk.sql`
- `docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md`

## 4. File yang diubah

| File | Alasan |
| --- | --- |
| `scripts/run-integration-tests.mjs` | Menjalankan `node_modules/vitest/vitest.mjs` melalui `process.execPath`, bukan `vitest.cmd`/`.bin`. |
| `vitest.integration.config.mts` | Menaikkan `hookTimeout` dari 120 detik ke 300 detik untuk setup DDL paralel. |
| `docs/reports/01-security/PHASE-1-LOCAL-FOLLOWUPS-2026-11-17.md` | Laporan task ini. |

Tidak ada perubahan schema, migration, route, use case, atau perilaku aplikasi.

## 5. Perubahan

### 5.1 Runner integration

`spawnSync` sekarang memakai:

```text
process.execPath node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts
```

Keuntungan:

- Tidak bergantung pada shim `.cmd` Windows.
- Memakai Node yang sama dengan runner.
- Path executable dan entry Vitest ditangani tanpa shell.
- Perilaku `SKIPPED` dan `--require-db` tidak berubah.

### 5.2 Batas hook

`hookTimeout` menjadi `300_000` milidetik. Suite migration membuat beberapa database dan menjalankan DDL; batas 120 detik terlalu pendek pada Windows saat suite paralel. Tidak ada `testTimeout` yang diubah dan tidak ada test yang di-skip.

## 6. Rehearsal rollback `0011`

Database salinan: `desa_test_rollback_0011_20261117b`, dibuat dari schema `sid_staging_local` dengan `mysqldump --no-data`.

| Tahap | Tenant FK | FK baseline | Composite B1 | Composite index | Index village |
| --- | ---: | ---: | ---: | ---: | ---: |
| Salinan awal (`0011`) | 68 | 0 | 8 | 7 | 0 |
| Setelah `AUD-034-b1-rollback.sql` | 60 | 8 (`SET NULL`) | 0 | 0 | 2 |
| Setelah `0011` diterapkan ulang | 68 | 0 | 8 | 7 | 2 |

Verifikasi tambahan:

- 148 tabel pada semua tahap.
- Tidak ada tabel `_b1_tenant_preflight_findings` atau `_b1_tenant_preflight_abort` setelah forward.
- Skrip rollback selesai dengan exit 0.
- Forward `0011` selesai dengan exit 0 setelah marker Drizzle `--> statement-breakpoint` dihapus dari SQL mentah.

Dua index `village_id` yang dibuat skrip rollback tetap ada setelah `0011` diterapkan ulang. Jumlah tenant FK dan composite FK kembali benar, tetapi state index tidak identik dengan database `0011` fresh (yang memiliki 0 index village tersebut). Ini adalah drift index yang tidak mengubah constraint, bukan kegagalan rollback.

Catatan: `mysql < 0011.sql` langsung gagal karena marker `--> statement-breakpoint` adalah format Drizzle, bukan komentar SQL. Untuk rehearsal forward, hanya substring marker yang dihapus; statement SQL tidak diubah. Jalur resmi aplikasi tetap memakai Drizzle migrator.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Runner tanpa database | `env -u TEST_DATABASE_URL -u TEST_DATABASE_ACK npm run test:integration` | **PASS** — SKIPPED eksplisit, exit 0 |
| Integration penuh lewat runner | `npm run test:integration:ci` | **PASS** — 47/47 suite, 253/253 test, 142,96 detik |
| Typecheck | `npm run typecheck` | **PASS** |
| Lint | `npm run lint` | **PASS** — 0 error, 7 warning `no-img-element` pada file yang tidak diubah |
| Format runner/config | `npx prettier --check scripts/run-integration-tests.mjs vitest.integration.config.mts` | **PASS** |
| Rollback `0011` | `mysql < docs/reports/01-security/AUD-034-b1-rollback.sql` | **PASS** — 68 → 60 tenant FK |
| Forward `0011` setelah rollback | Apply `0011` tanpa marker Drizzle | **PASS** — 60 → 68 tenant FK |
| Diff whitespace | `git diff --check` | **PASS** |
| CI PR #104 | GitHub Actions | **PASS** — quality, build, MySQL integration, dan ringkasan |
| Build/unit test terpisah | — | **SKIPPED** — tidak ada perubahan aplikasi; integration suite dan typecheck menjadi bukti utama |

## 8. Risiko dan batasan

- Rehearsal memakai schema tanpa data domain. Rollback tidak mengubah baris, tetapi perilaku dengan data legacy tetap harus diuji pada staging.
- `hookTimeout` 300 detik juga memperpanjang waktu tunggu bila suatu suite benar-benar macet. Nilai ini hanya batas waktu, bukan pelemahan assertion.
- Perbaikan runner diverifikasi pada Windows/Node 26 dan lewat integration suite lokal; CI Linux/Node 22 pada PR #104 juga menjalankan integration dan lulus.
- Forward `0011` pada rehearsal memakai SQL yang marker Drizzle-nya dihapus; migrasi resmi tetap melalui Drizzle.
- Forward setelah rollback mempertahankan dua index `village_id` buatan rollback, sehingga state index tidak identik dengan `0011` fresh. Bila kesetaraan persis diperlukan, rekonsiliasi index harus dilakukan terpisah.
- Staging eksternal, data legacy, TTE, dan webhook tetap belum diuji. Fase 1 belum ditutup.

## 9. Kesimpulan

Perintah integration resmi repository kini berjalan di Windows/Node 26 dan seluruh suite lulus. Rollback `0011` mengembalikan constraint ke kondisi `0010`, dan forward `0011` dapat dijalankan ulang sampai 68 tenant FK. Dua index `village_id` tetap ada setelah forward, jadi hasilnya setara secara constraint tetapi tidak identik secara index dengan `0011` fresh. Tidak ada perubahan perilaku aplikasi.

Langkah berikutnya tetap staging eksternal dengan data representatif; bukti lokal ini tidak menggantikan validasi deployment.
