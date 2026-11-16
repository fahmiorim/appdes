# AUD-034 — Rekonsiliasi drift index `bumindes_item_village_buku_idx`

- **Task:** menyelaraskan definisi index `bumindes_item_village_buku_idx` antara schema Drizzle, snapshot migrasi, dan migration `0006_b4_cascade_relations_composite_fk.sql`.
- **Tanggal:** 16 November 2026.
- **Branch:** `task/AUD-034-bumindes-index-drift`, ditumpuk di atas branch Batch 4C-2a (`feat(db): composite FK RESTRICT letter_classifications`) karena snapshot terakhir berada di sana.
- **Base commit `origin/main`:** `6c662de58be07b7a6486ad6da9cc888f11f877db`.
- **Status:** siap review. Tidak ada perubahan DDL baru dan tidak ada database yang disentuh.

## 1. Kondisi awal

`0006_b4_cascade_relations_composite_fk.sql` membuat index eksplisit:

```sql
CREATE INDEX `bumindes_item_village_buku_idx` ON bumindes_item (village_id, buku_id);
```

Index itu dipakai composite FK `bumindes_item_buku_tenant_fk` dan memang ada di database yang menjalankan `0006`. Namun:

| Artefak | Status index |
| --- | --- |
| Migration `0006` | dibuat |
| Snapshot `0006_snapshot.json` | tercatat |
| Schema `src/db/schema/bumindes.ts` | **tidak dideklarasikan** |
| Snapshot `0007`–`0009` | **tidak tercatat** |

Laporan Batch 4B (§6) mencatat bahwa `drizzle-kit generate` saat itu ingin mengeluarkan `DROP INDEX`; SQL itu dibuang, tetapi snapshot hasil generate tetap menghapus index dari pelacakan. Akibatnya schema, snapshot terakhir, dan database tidak lagi setara: index hidup di database tetapi tidak diketahui tooling.

## 2. Analisis dan keputusan

Dua arah rekonsiliasi dipertimbangkan:

1. **Drop index** agar database sama dengan schema. Ditolak: composite FK `bumindes_item_buku_tenant_fk` membutuhkan index pada `(village_id, buku_id)`. `DROP INDEX` akan gagal (`ER_CANT_DROP_FIELD_OR_KEY`, 1553) atau memaksa index pengganti; menghapus index juga tidak memberi manfaat.
2. **Deklarasikan index di schema** agar schema/snapshot sama dengan database dan `0006`. Dipilih.

Karena `0006` sudah merged dan sudah membuat index, **tidak ada migration baru**. DDL tambahan justru berisiko `ER_DUP_KEYNAME` pada database yang sudah menjalankan `0006`. Yang diperbaiki adalah sumber kebenaran (schema) dan snapshot head.

## 3. Perubahan

| File | Perubahan |
| --- | --- |
| `src/db/schema/bumindes.ts` | tambah `index("bumindes_item_village_buku_idx").on(t.villageId, t.bukuId)` pada `bumindesItem`, dengan komentar bahwa index dibuat `0006` |
| `src/db/migrations/meta/0009_snapshot.json` | tambahkan entri index yang sama pada `tables.bumindes_item.indexes` (10 baris; tidak ada perubahan snapshot lain) |
| `src/db/migrasi-paritas.test.ts` | test baru: himpunan nama index yang dideklarasikan schema harus sama persis dengan himpunan index pada snapshot terakhir (dua arah) |

Tidak ada perubahan pada migration `0006`, `0007`, `0008`, `0009`, dan tidak ada perubahan data.

## 4. Bukti paritas

`npx drizzle-kit generate` setelah perubahan:

```text
No schema changes, nothing to migrate 😴
```

Sebelum perubahan, schema tidak memuat index sehingga tooling menganggap index database sebagai objek asing (dan pada generate Batch 4B menawarkan `DROP INDEX`).

Sebelum snapshot diperbaiki, perbandingan schema vs snapshot menghasilkan selisih satu nama:

```text
schema: 267 index, snapshot: 267 index, snapshot tidak dideklarasikan schema:
[ 'bumindes_item_village_buku_idx' ]
```

Setelah perubahan: schema 268 index, snapshot 268 index, selisih dua arah kosong.

## 5. Test

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Guard paritas index | `npx vitest run --config vitest.config.mts src/db/migrasi-paritas.test.ts` | **PASS** — 8 tes |
| Bukti guard menangkap drift | test yang sama setelah deklarasi index di schema dihapus sementara | **FAIL** — `expected [ 'bumindes_item_village_buku_idx' ] to deeply equal []`; file dipulihkan lalu PASS |
| Typecheck | `npm run typecheck` | **PASS** |
| ESLint | `npx eslint src/db/migrasi-paritas.test.ts src/db/schema/bumindes.ts` | **PASS** |
| Format | `npx prettier --check` berkas berubah | **PASS** |

Tidak ada integration test baru: perubahan tidak menyentuh DDL maupun jalur runtime, dan tidak ada database yang dimigrasi ulang.

## 6. Risiko tersisa

1. **Snapshot historis `0007`/`0008` masih tidak memuat index.** Hanya snapshot head (`0009`) yang diperbaiki karena `db:generate` hanya membandingkan snapshot terakhir. Branch lama yang belum merged dan masih memakai snapshot `0007`/`0008` akan kembali melihat drift sampai di-rebase.
2. **Branch ditumpuk di atas Batch 4C-2a.** Commit ini mengubah `0009_snapshot.json` milik PR #70; review/merge sebaiknya berurutan (`#67` → `#69` → `#70` → PR ini).
3. **Tidak ada verifikasi terhadap database produksi.** Tidak ada DDL yang dijalankan; index dianggap sudah ada karena `0006` tercatat di journal setiap database yang dimigrasi berurutan.
4. **Guard test bergantung pada pola deklarasi schema.** Regex menangkap `index("...")`/`uniqueIndex("...")` literal; index yang dibangun dinamis di masa depan perlu penyesuaian test.

## 7. Kesimpulan

Drift `bumindes_item_village_buku_idx` direkonsiliasi dengan mendeklarasikan index di schema dan mencatatnya pada snapshot head, tanpa migration baru karena `0006` sudah membuatnya. `drizzle-kit generate` kini bersih dan guard test mencegah drift sejenis kembali. Tidak ada perubahan perilaku runtime, data, atau deployment.
