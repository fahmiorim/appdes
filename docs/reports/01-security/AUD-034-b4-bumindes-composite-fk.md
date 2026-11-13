# AUD-034 Batch 4 — Composite FK relasi BUMDes

| Item | Nilai |
| --- | --- |
| Task | AUD-034 — menutup relasi tenant `bumindes_item.buku_id` pada database |
| Tujuan | Memastikan item BUMDes hanya dapat menunjuk buku dari desa yang sama tanpa mengubah perilaku cascade |
| Tanggal | 14 November 2026 |
| Branch | `task/AUD-034-b4-bumindes-composite-fk` |
| Base commit | `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4` (`main`) |
| Commit hasil pekerjaan | Belum dibuat saat laporan ini ditulis |

## Kondisi awal dan analisis

Matriks `AUD-034-tenant-relation-matrix.md` mencatat `bumindes_item.buku_id` sebagai relasi tenant-bound yang masih memakai FK single-column. Skema lama memeriksa keberadaan `bumindes_buku.id`, tetapi tidak memastikan nilai `village_id` item sama dengan desa buku. FK lama menggunakan `ON DELETE CASCADE`; perubahan ini mempertahankan aturan tersebut.

## File diperiksa

- `AGENTS.md`
- `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`
- `docs/reports/01-security/AUD-034-tenant-relation-matrix.md`
- `src/db/schema/bumindes.ts`, `src/db/schema/village.ts`
- `src/db/migrations/0000_baseline.sql`, migration `0001`–`0005`, metadata Drizzle
- `src/db/tenant-composite-fk.integration.test.ts`
- `src/db/b3-inventaris-composite-fk.integration.test.ts`, `src/db/b3-inventaris-migration-guard.integration.test.ts`
- `src/testing/db-test-guard.ts`, `src/testing/migrasi-uji.ts`, `vitest.integration.config.mts`

## File diubah

| File | Alasan |
| --- | --- |
| `src/db/schema/bumindes.ts` | Menambahkan unique parent key dan composite FK; mempertahankan cascade serta menamai index child |
| `src/db/migrations/0006_b4_bumindes_composite_fk.sql` | Migration baru dengan preflight fail-closed sebelum perubahan constraint; parent unique/index dan FK baru dibuat sebelum FK lama dilepas |
| `src/db/migrations/meta/_journal.json`, `meta/0006_snapshot.json` | Metadata yang dibuat generator Drizzle |
| `src/db/bumindes-composite-fk.test.ts` | Unit test bentuk deklarasi schema |
| `src/db/b4-bumindes-composite-fk.integration.test.ts` | Test MySQL disposable untuk success, penolakan lintas tenant/orphan/update, dan cascade |
| `src/db/b4-bumindes-migration-guard.integration.test.ts` | Membuktikan data legacy menghentikan migration sebelum perubahan constraint |
| `src/db/tenant-composite-fk.integration.test.ts` | Memasukkan constraint baru ke assertion daftar FK inti |
| `vitest.integration.config.mts` | Mendaftarkan dua integration test baru |

## Perubahan dan hasil pemeriksaan faktual

Schema menyatakan `UNIQUE (bumindes_buku.village_id, bumindes_buku.id)` dan FK `(bumindes_item.village_id, bumindes_item.buku_id) → (bumindes_buku.village_id, bumindes_buku.id) ON DELETE CASCADE`. Migration `0006` menghitung orphan dan referensi lintas desa terlebih dahulu. Bila ada temuan, migration memicu duplicate-key error dengan nama relasi, jenis temuan, dan jumlah; tidak ada data domain yang diperbaiki atau dihapus otomatis. Perubahan DDL hanya berjalan setelah preflight bersih.

TDD schema: test ditambahkan dan dijalankan sebelum perubahan skema; test gagal karena unique parent key belum tersedia. Setelah perubahan, test schema lulus.

Generator Drizzle `npx drizzle-kit generate --name b4_bumindes_composite_fk` berhasil membuat migration dan metadata. File SQL disesuaikan untuk menambahkan preflight dan memastikan index child dibuat sebelum composite FK.

## Validasi

| Perintah | Status | Hasil |
| --- | --- | --- |
| `npm run test:unit -- src/db/bumindes-composite-fk.test.ts` (sebelum perubahan schema) | EXPECTED FAIL (RED) | Perintah exit code 1; 1 test gagal karena unique parent key memang belum ada |
| `npm run test:unit -- src/db/bumindes-composite-fk.test.ts` (sesudah schema) | PASS | 1 file / 1 test lulus |
| `DATABASE_URL=... BETTER_AUTH_SECRET=... npx drizzle-kit generate --name b4_bumindes_composite_fk` | PASS | Migration `0006` dan snapshot/journal dibuat; tidak membuka koneksi atau menjalankan migration |
| Menjalankan integration test B4 | SKIPPED | Tidak dijalankan: `TEST_DATABASE_URL` dan `TEST_DATABASE_ACK` tidak tersedia; sesuai guard, tidak ada koneksi atau operasi database dilakukan |
| `npm run test:unit -- src/db/bumindes-composite-fk.test.ts src/db/migrasi-paritas.test.ts` | PASS | 2 file / 8 test lulus |
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit` berhasil setelah type guard pada assertion index |
| `npx eslint src/db/schema/bumindes.ts src/db/tenant-composite-fk.integration.test.ts src/db/b4-bumindes-composite-fk.integration.test.ts src/db/b4-bumindes-migration-guard.integration.test.ts src/db/bumindes-composite-fk.test.ts vitest.integration.config.mts` | PASS | Tidak ada temuan |
| `npx prettier --check ...` (semua file TS/JSON/Markdown task) | PASS | Semua file terkait terformat |
| `git diff --check` | PASS | Tidak ada whitespace error |

## Dampak migration, deploy, dan rollback

- Migration `0006` hanya migration baru; tidak mengedit file migration yang telah ada. Preflight read-only memeriksa data target sebelum DDL; jika ditemukan row invalid, hentikan deploy dan minta keputusan/perbaikan manual maintainer. Tidak ada backfill atau penghapusan otomatis.
- Sebelum diterapkan pada database berisi, ambil backup/snapshot yang dapat dipulihkan dan verifikasi backup sesuai runbook database repository. Terapkan hanya setelah hasil preflight bersih, dalam maintenance window tanpa write ke tabel BUMDes: urutan DDL mengikuti generator Drizzle, yaitu drop FK lama → add unique key parent → add index child → add composite FK baru. Di antara statement ALTER terdapat interval tanpa FK item→buku; hentikan penulisan modul selama migration dan pastikan constraint baru ada sebelum layanan dibuka kembali.
- MySQL melakukan auto-commit DDL; jika migration gagal setelah salah satu ALTER, perubahan sebelumnya mungkin tetap ada sementara entri journal `0006` belum tercatat. Jangan rerun secara buta. Periksa `information_schema` untuk FK/index yang benar-benar ada, pulihkan FK yang hilang atau lakukan rollback manual sesuai keadaan aktual, dan baru lanjut setelah skema konsisten.
- `ALTER TABLE` dapat memerlukan metadata lock dan ruang disk sementara. Jadwalkan pada jendela operasional sepi setelah mengukur ukuran tabel di salinan/staging; migration production tidak dijalankan dalam task ini.
- Rollback manual bila migration berhasil: `ALTER TABLE bumindes_item DROP FOREIGN KEY bumindes_item_buku_tenant_fk`; tambah kembali FK single-column `FOREIGN KEY (buku_id) REFERENCES bumindes_buku(id) ON DELETE CASCADE ON UPDATE NO ACTION`; lalu `ALTER TABLE bumindes_buku DROP INDEX bumindes_buku_village_id_uq` dan `ALTER TABLE bumindes_item DROP INDEX bumindes_item_village_buku_idx`. Pastikan dahulu tidak ada referensi lintas desa, karena rollback membuat celah lama terbuka kembali. Tidak ada rollback otomatis.

## Security dan tenant

Composite FK database menolak insert/update item yang menunjuk buku desa lain meskipun ID parent valid. Test integration mencakup pasangan same-tenant yang sah, cross-tenant, orphan, update lintas desa, dan cascade yang tidak menyentuh desa lain. Preflight memeriksa referensi legacy sebelum DDL dan berhenti tanpa mengubah constraint jika menemukan invalid row. Test database hanya akan memakai helper yang memvalidasi `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, host loopback, dan nama database disposable.

## Risiko dan keterbatasan

- Integration test MySQL belum dapat dijalankan karena kredensial/acknowledgement database disposable tidak tersedia pada environment sesi ini.
- Migration belum diuji pada salinan data aktual; preflight harus terlebih dahulu dijalankan terhadap salinan database sebelum deployment.
- Bila preflight gagal, tabel helper agregat `_b4_bumindes_preflight_findings` dan `_b4_bumindes_preflight_abort` tertinggal karena DDL MySQL auto-commit. Temuan dapat diperiksa dari tabel findings; percobaan ulang preflight dimulai dengan `DROP TABLE IF EXISTS` untuk keduanya. Tidak ada data pribadi dalam tabel tersebut. Bila kegagalan terjadi setelah DDL constraint mulai, periksa skema parsial sebelum retry; migration tidak menjanjikan rollback otomatis untuk DDL.
- Unique index dan FK memerlukan metadata lock ketika migration dijalankan; jalankan saat jendela operasional sesuai prosedur backup/rollback repository.
- Scope sengaja hanya relasi `bumindes_item.buku_id`; relasi AUD-034 lain tidak disentuh.

## Kesimpulan dan langkah berikut

Implementasi dan unit test schema selesai pada branch terpisah. Langkah review berikutnya: jalankan dua integration test B4 terhadap MySQL 8 disposable yang tervalidasi dan tinjau migration. Sebelum migration digunakan pada data berisi, ukur hasil preflight pada salinan database dan lakukan review risiko lock/rollback. Branch belum dikomit atau dipush; URL GitHub/PR belum tersedia.
