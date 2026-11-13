# AUD-034 Batch 4A — Composite FK untuk enam relasi CASCADE

| Item | Nilai |
| --- | --- |
| Task | Issue #34 — hardening relasi tenant-bound |
| Base | `main` pada `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4` |
| Migration | `0006_b4_cascade_relations_composite_fk.sql` |
| Cakupan | 6 relasi tenant-bound dengan perilaku `ON DELETE CASCADE` |
| Status | CI lulus; siap review, belum merge |
| Operasional | Tidak ada migration dijalankan pada development/production; tidak ada backfill atau perubahan data |

## 1. Relasi yang diperkuat

| Child | Parent | Kolom child → parent | Delete rule |
| --- | --- | --- | --- |
| `bumindes_item` | `bumindes_buku` | `(village_id, buku_id) → (village_id, id)` | CASCADE |
| `bumindes_tanah_kas_mutasi` | `bumindes_tanah_kas` | `(village_id, tanah_kas_id) → (village_id, id)` | CASCADE |
| `galeri_foto` | `galeri_album` | `(village_id, album_id) → (village_id, id)` | CASCADE |
| `lapak_produk` | `lapak` | `(village_id, lapak_id) → (village_id, id)` | CASCADE |
| `bukti_pengiriman_notifikasi` | `pengaduan` | `(village_id, pengaduan_id) → (village_id, id)` | CASCADE |
| `pemilihan_kandidat` | `pemilihan` | `(village_id, pemilihan_id) → (village_id, id)` | CASCADE |

Setiap parent mendapat unique key `(village_id, id)`. Setiap child mendapat composite FK dan indeks pasangan kolom tenant-parent. FK single-column lama diganti, bukan ditumpuk.

## 2. Semantik nullable

`galeri_foto.album_id` tetap nullable. Nilai `NULL` berarti foto mandiri/slider dan tetap valid. Untuk nilai non-NULL, composite FK mewajibkan album berasal dari desa yang sama. Penghapusan album tetap menghapus foto yang terhubung melalui CASCADE.

Tidak ada relasi `SET NULL` yang diubah pada batch ini.

## 3. Preflight migration

Migration `0006` memeriksa orphan dan referensi lintas desa pada keenam relasi. Temuan disimpan sebagai agregat relasi/jenis/jumlah di tabel helper `_b4_tenant_preflight_findings`. Jika ada temuan, statement pemicu duplicate-key sengaja menggagalkan migration sebelum FK lama dihapus atau unique key baru dipasang.

Karena MySQL melakukan auto-commit pada DDL, jika preflight gagal tabel helper tetap tersedia untuk diagnosis. Periksa:

```sql
SELECT relasi, jenis, jumlah
FROM _b4_tenant_preflight_findings
ORDER BY relasi, jenis;
```

Setelah temuan dicatat dan data diperbaiki melalui prosedur terpisah yang disetujui maintainer, retry migration dimulai dengan `DROP TABLE IF EXISTS` pada helper tersebut. Migration tidak melakukan UPDATE, DELETE, atau backfill otomatis.

## 4. Pengujian yang ditambahkan

File `src/db/b4-cascade-relations-composite-fk.integration.test.ts` masuk ke konfigurasi integration MySQL 8 dan mencakup:

- enam insert lintas desa ditolak langsung oleh database,
- keenam pasangan desa-parent yang sah diterima,
- foto galeri tanpa album (`album_id = NULL`) tetap diterima,
- update referensi ke parent desa lain ditolak,
- penghapusan parent menjalankan CASCADE pada child yang benar,
- foto mandiri tetap ada setelah album lain dihapus.\n\nFile `src/db/b4-tenant-migration-guard.integration.test.ts` membuat database disposable tersendiri, menjalankan migrasi sampai `0005`, menyuntikkan satu orphan dan satu cross-tenant legacy row untuk masing-masing enam relasi, lalu membuktikan `0006` berhenti tanpa mengganti FK lama atau memasang unique parent key.

**CI PR #40 lulus:** 192 unit-test files / 1.720 unit tests, serta 32 integration-test files / 195 integration tests pada MySQL 8. Typecheck, lint, dan format check juga lulus.

## 5. File implementasi

- `src/db/schema/bumindes.ts`
- `src/db/schema/bumindes-tanahkas.ts`
- `src/db/schema/content.ts`
- `src/db/schema/lapak.ts`
- `src/db/schema/lapak-produk.ts`
- `src/db/schema/pengaduan.ts`
- `src/db/schema/pemilihan.ts`
- `src/db/schema/bukti-pengiriman-notifikasi.ts`
- `src/db/migrations/0006_b4_cascade_relations_composite_fk.sql`
- `src/db/migrations/meta/_journal.json`
- `src/db/b4-cascade-relations-composite-fk.integration.test.ts`
- `vitest.integration.config.mts`

## 6. Batasan dan langkah berikut

- Batch ini menutup enam relasi CASCADE dari matriks audit; bukan seluruh AUD-034.
- Migration dan guard diuji melalui CI disposable database; belum boleh dijalankan ke database produksi.
- Skenario migration guard disposable sudah ditambahkan pada `src/db/b4-tenant-migration-guard.integration.test.ts`: menyuntikkan orphan dan cross-tenant pada keenam relasi, memastikan migration gagal sebelum FK lama diganti. Skenario guard dan seluruh integration suite lulus pada CI MySQL 8.
- Batch berikutnya melanjutkan relasi B2 lain yang membutuhkan unique parent key, setelah matriks diperbarui dan semantik delete diverifikasi.
