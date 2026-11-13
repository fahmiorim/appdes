# AUD-034 Batch 3 — Audit & hardening relasi tenant (inventaris)

| Item | Nilai |
| --- | --- |
| Task | Issue #34 lanjutan — Batch 3: tenant relation audit & hardening |
| Tanggal | 14 November 2026 |
| Branch | `task/AUD-034-batch-3-tenant-hardening` |
| Base commit | `de1bf1be98abf664b01d01f00308b67f404c6997` (`origin/main`, merge PR #37) |
| Migration baru | `0005_b3_inventaris_composite_fk.sql` |
| Sifat | Perubahan kode + schema + test + dokumentasi; **tidak** ada migration yang dijalankan ke database development/production |

## 1. Executive summary

Batch 3 menutup empat celah isolasi tenant pada modul **inventaris**:

1. `listInventaris` melakukan `LEFT JOIN inventaris_kategori` hanya dengan `id`, sehingga nama dan kode kategori desa lain ikut tampil pada tiga route baca yang aktif — termasuk ekspor CSV admin, ekspor CSV publik, dan API publik.
2. `listMutasi` melakukan `LEFT JOIN inventaris` hanya dengan `id`, sehingga nama/nomor barang desa lain dapat tampil pada baris mutasi legacy.
3. `saveInventaris` meneruskan `kategoriId` dari formulir apa adanya; FK kategori single-column hanya memeriksa keberadaan baris, bukan desanya.
4. Database belum mencegah `inventaris_mutasi` menunjuk inventaris desa lain. Migration `0005` menambahkan `UNIQUE (village_id, id)` pada `inventaris` dan mengganti FK `inventaris_id` menjadi composite `(village_id, inventaris_id) → (village_id, id)` dengan `ON DELETE CASCADE` (perilaku hapus tidak berubah).

Relasi `inventaris.kategori_id → inventaris_kategori.id` **tidak** diubah menjadi composite FK: FK tersebut memakai `ON DELETE SET NULL` sedangkan `village_id` anak bersifat `NOT NULL`, sehingga composite FK akan mengubah semantik hapus kategori (blocker desain yang sudah tercatat di matriks). Relasi itu tetap single-column dan sekarang dijaga di application layer.

Seluruh pemeriksaan wajib lulus: typecheck, lint, format, 1720 unit test, 183 integration test pada MySQL 8.0.30 disposable, dan build.

## 2. Temuan awal (audit ulang `main` @ `de1bf1b`)

| # | Temuan | Risiko | Jalur aktif | Bukti |
| --- | --- | --- | --- | --- |
| T1 | `listInventaris` join kategori tanpa predikat desa → nama/kode kategori desa lain ikut terkirim | **High** | Ya: `src/app/(admin)/inventaris/laporan/ekspor/route.ts`, `src/app/(public)/desa/inventaris/ekspor/route.ts`, `src/app/api/publik/inventaris/route.ts` | `inventaris-repository.ts` `listInventaris` |
| T2 | `inventaris_mutasi.inventaris_id` FK single-column → baris mutasi lintas desa diterima database | **High** | Tidak ada route tulis terpasang; constraint gap tetap nyata untuk data/import berikutnya | `src/db/schema/inventaris.ts`, `0000_baseline.sql` |
| T3 | `saveInventaris` menerima `kategoriId` mentah dari input | **Medium** | Belum ada route/komponen yang memanggil; use case terekspos bila UI ditambahkan | `inventaris-use-cases.ts` `saveInventaris` |
| T4 | `listMutasi` join inventaris tanpa predikat desa | **Medium** | Belum ada route yang memakai `listMutasi`/`getMutasiPageData` | `inventaris-repository.ts` `listMutasi` |
| T5 | `inventaris.kategori_id` tidak dapat dijadikan composite FK tanpa mengubah `ON DELETE SET NULL` | **Low** (blocker desain) | — | `src/db/schema/inventaris.ts` |

Catatan cakupan: modul inventaris dipilih karena satu-satunya modul tersisa yang JOIN-nya benar-benar aktif pada `main` setelah Batch 2, sekaligus memiliki relasi child→parent tenant-scoped yang belum composite (`inventaris_mutasi.inventaris_id`). Relasi lain pada matriks (22 relasi Matriks B2, 7 relasi `SET NULL`, tabel anak survey/pembangunan) sengaja tidak dimasukkan agar PR tetap terukur.

## 3. Scope Batch 3

Disetujui masuk scope: T1, T2, T3, T4.
Ditunda dengan alasan tertulis: T5 (butuh keputusan maintainer soal `SET NULL`), seluruh 22 relasi Matriks B2, dan rencana lama "ubah `SET NULL` → `RESTRICT`" untuk `letter_number_archive`/`notifikasi_terkirim` (mengubah perilaku hapus).

## 4. File yang diperiksa

- `src/db/schema/inventaris.ts`, `src/db/schema/village.ts`
- `src/db/migrations/0000_baseline.sql`, `0001_aud002_composite_tenant_fk.sql`, `0004_b2_resident_composite_fk.sql`, `meta/_journal.json`
- `src/features/inventaris/infrastructure/inventaris-repository.ts`, `.../application/inventaris-use-cases.ts`, `.../domain/inventaris.ts`
- Route inventaris: `src/app/(admin)/inventaris/laporan/ekspor/route.ts`, `src/app/(public)/desa/inventaris/ekspor/route.ts`, `src/app/api/publik/inventaris/route.ts`
- Seluruh call-site `listInventaris`, `listMutasi`, `saveInventaris`, `ajukanMutasi`, `getMutasiPageData` (grep repository-wide)
- Pola test Batch 1/2: `src/db/b2-resident-composite-fk.integration.test.ts`, `src/db/b2-resident-migration-guard.integration.test.ts`, `src/features/kehadiran/infrastructure/rekap-kehadiran-tenant-isolation.integration.test.ts`
- `src/testing/migrasi-uji.ts`, `src/testing/db-test-guard.ts`, `vitest.integration.config.mts`, `src/lib/errors.ts`

## 5. File yang diubah

| File | Alasan |
| --- | --- |
| `src/db/schema/inventaris.ts` | Tambah `uniqueIndex("inventaris_village_id_uq")`; `inventaris_mutasi.inventarisId` tidak lagi FK inline, diganti `foreignKey` composite `inventaris_mutasi_inventaris_tenant_fk` `ON DELETE cascade` |
| `src/db/migrations/0005_b3_inventaris_composite_fk.sql` | Migration baru: preflight fail-closed, drop FK lama, unique parent, composite FK |
| `src/db/migrations/meta/_journal.json`, `meta/0005_snapshot.json` | Keluaran `drizzle-kit generate` untuk `0005` |
| `src/features/inventaris/infrastructure/inventaris-repository.ts` | Join kategori dan join inventaris dibatasi `village_id` |
| `src/features/inventaris/application/inventaris-use-cases.ts` | `saveInventaris` memvalidasi kepemilikan kategori sebelum create/update |
| `src/db/b3-inventaris-composite-fk.integration.test.ts` *(baru)* | Bukti constraint: bentuk FK, penolakan lintas desa, cascade, update pindah desa |
| `src/db/b3-inventaris-migration-guard.integration.test.ts` *(baru)* | Bukti preflight `0005` gagal-closed dan tidak mengubah constraint |
| `src/features/inventaris/infrastructure/inventaris-tenant-isolation.integration.test.ts` *(baru)* | Regression aplikasi: JOIN, `saveInventaris`, `ajukanMutasi`, semantik NULL |
| `src/db/tenant-composite-fk.integration.test.ts` | Daftar constraint inti ditambah `inventaris_mutasi_inventaris_tenant_fk` |
| `src/features/penduduk/infrastructure/dtks-tenant-isolation.integration.test.ts` | Perbaikan isolasi test: hitungan `dtks_ref_lampiran` dibatasi desa uji (sebelumnya global, gagal bila suite lain menulis paralel) |
| `vitest.integration.config.mts` | Tiga file test baru didaftarkan |
| `docs/reports/01-security/AUD-034-tenant-relation-matrix.md` | Status terkini setelah PR #36, #37, dan `0005` |

## 6. Penjelasan perbaikan

### 6.1 Tenant-scoped JOIN (`listInventaris`, `listMutasi`)

```ts
.leftJoin(
  inventarisKategori,
  and(
    eq(inventaris.kategoriId, inventarisKategori.id),
    eq(inventarisKategori.villageId, inventaris.villageId),
  ),
)
```

Join mutasi memakai pola yang sama terhadap `inventaris.villageId`. Konsekuensi: bila ada baris legacy yang menautkan kategori/barang desa lain, kolom hasil join menjadi `NULL` (tidak membocorkan nilai) — bukan menyembunyikan baris inventaris milik desa sendiri. Total dan filter tetap dihitung dari `where` yang sudah tenant-scoped.

### 6.2 Validasi kategori di application layer (`saveInventaris`)

`kategoriId` dinormalisasi (`""` → `NULL`) lalu diverifikasi lewat `getInventarisKategori(villageId, kategoriId)` yang sudah tenant-scoped. Bila tidak ditemukan, use case melempar `validationError("Kategori inventaris tidak ditemukan.")`. Pesan sama dipakai untuk kategori yang tidak ada maupun milik desa lain, sehingga keberadaan baris tenant lain tidak dapat disimpulkan. Validasi berjalan sebelum insert/update sehingga tidak ada baris yang ditulis saat ditolak.

### 6.3 Composite FK `inventaris_mutasi`

- `inventaris` mendapat `UNIQUE (village_id, id)` — aman tanpa backfill karena `id` sudah PK.
- FK lama `inventaris_mutasi_inventaris_id_inventaris_id_fk` (single-column, cascade) dihapus dan diganti `inventaris_mutasi_inventaris_tenant_fk (village_id, inventaris_id) → inventaris (village_id, id) ON DELETE CASCADE`.
- Perilaku hapus inventaris tidak berubah: mutasi tetap ikut terhapus. Yang baru: mutasi **tidak dapat** dibuat/diubah menunjuk inventaris desa lain, dan update yang memindahkan `village_id` ditolak database.

### 6.4 Operasional migration

- **Preflight read-only, fail-closed.** `0005` menghitung `orphan` dan `cross-tenant` untuk `inventaris_mutasi.inventaris_id`, menulis temuan ke tabel sementara `_b3_inventaris_preflight_findings`, lalu memicu `ER_DUP_ENTRY` (sengaja menyisipkan baris yang sama dua kali ke tabel ber-PK) bila ada temuan. Pesan error memuat relasi, jenis, dan jumlah baris (mis. `B3 inv: inventaris_mutasi.inventaris_id cross-tenant = 1 baris`). Tanpa temuan, statement menyisipkan nol baris dan migration lanjut. Tidak ada `UPDATE`/`DELETE`/backfill data domain.
- **Prefiks pesan dipendekkan** (`B3 inv: `) karena InnoDB memotong nilai kunci duplikat pada pesan error setelah 64 karakter; sudah diverifikasi oleh test guard.
- **Sisa tabel helper saat preflight gagal (runbook).** MySQL melakukan auto-commit pada DDL, dan statement pemicu `ER_DUP_ENTRY` menghentikan migrator sebelum statement cleanup, sehingga `_b3_inventaris_preflight_findings` dan `_b3_inventaris_preflight_abort` **tetap ada** setelah kegagalan. Ini disengaja agar temuan dapat diperiksa:

  ```sql
  SELECT relasi, jenis, jumlah FROM _b3_inventaris_preflight_findings;
  ```

  Retry aman karena migration dimulai dengan `DROP TABLE IF EXISTS` untuk kedua tabel. Cleanup manual (setelah temuan dicatat) dapat dilakukan dengan `DROP TABLE IF EXISTS _b3_inventaris_preflight_abort; DROP TABLE IF EXISTS _b3_inventaris_preflight_findings;`. Tabel hanya berisi agregat jumlah per relasi/jenis — tidak ada NIK atau data pribadi — dan tidak dipakai aplikasi saat runtime.
- **Backup & rollback.** Sebelum dijalankan pada database berisi data: ambil backup logis (`mysqldump`) atau snapshot. Rollback = jalankan migrasi balik manual: `ALTER TABLE inventaris_mutasi DROP FOREIGN KEY inventaris_mutasi_inventaris_tenant_fk`, tambahkan kembali `FOREIGN KEY (inventaris_id) REFERENCES inventaris(id) ON DELETE CASCADE`, lalu `ALTER TABLE inventaris DROP INDEX inventaris_village_id_uq`. Tidak disediakan `down` otomatis karena repo tidak memakai pola itu.
- **Metadata lock.** `ALTER TABLE` pada `inventaris_mutasi` dan `inventaris` memerlukan exclusive metadata lock. Jalankan pada jendela sepi; `ADD CONSTRAINT UNIQUE` pada tabel besar dapat memakan waktu dan disk sementara. Preflight dijalankan lebih dulu agar kegagalan terjadi sebelum `ALTER`.
- **Data legacy.** Bila preflight menemukan referensi lintas desa, migration **berhenti** dan data harus diputuskan maintainer (perbaiki manual atau hapus). Batch ini tidak menyediakan cleanup otomatis.

## 7. Hasil security testing

MySQL 8.0.30 lokal, database disposable `desa_test_aud034b3` (loopback, `TEST_DATABASE_ACK=1`) dan database per-test `desa_test_aud034b3g_*` untuk guard.

| Skenario | Test | Hasil |
| --- | --- | --- |
| Bentuk constraint: kolom `village_id,inventaris_id` → `village_id,id`, `CASCADE`, FK lama hilang, unique parent non-unik=0 | `b3-inventaris-composite-fk` | PASS |
| Insert mutasi menunjuk inventaris desa lain ditolak (`ER_NO_REFERENCED_ROW_2` / 1452) | `b3-inventaris-composite-fk` | PASS |
| Insert mutasi dengan `inventaris_id` tidak ada (desa cocok) ditolak | `b3-inventaris-composite-fk` | PASS |
| Pasangan `(village_id, inventaris_id)` sah diterima | `b3-inventaris-composite-fk` | PASS |
| Update yang memindahkan mutasi ke inventaris desa lain ditolak, baris tidak berubah | `b3-inventaris-composite-fk` | PASS |
| Hapus inventaris meng-cascade mutasinya tanpa menyentuh mutasi desa lain | `b3-inventaris-composite-fk` | PASS |
| Preflight `0005` gagal dengan pesan `... cross-tenant = 1 baris` saat ada referensi lintas desa | `b3-inventaris-migration-guard` | PASS |
| Preflight `0005` gagal dengan pesan `... orphan = 1 baris` saat mutasi menunjuk ID yang tidak ada | `b3-inventaris-migration-guard` | PASS |
| Saat preflight gagal (kedua skenario), FK lama tetap ada dan unique index tidak terpasang (fail-closed) | `b3-inventaris-migration-guard` | PASS |
| Sisa tabel helper hanya berisi agregat temuan (`relasi`, `jenis`, `jumlah`) dan retry dimulai dengan `DROP IF EXISTS` | `b3-inventaris-migration-guard` | PASS |
| `listInventaris` menampilkan kategori desa sendiri | `inventaris-tenant-isolation` | PASS |
| `listInventaris` tidak membocorkan nama/kode kategori desa lain pada baris legacy | `inventaris-tenant-isolation` | PASS |
| `listInventaris` mempertahankan `NULL` untuk aset tanpa kategori | `inventaris-tenant-isolation` | PASS |
| `listInventaris` tidak mengembalikan aset desa lain | `inventaris-tenant-isolation` | PASS |
| `listMutasi` menampilkan nama barang desa sendiri, `NULL` untuk mutasi legacy lintas desa | `inventaris-tenant-isolation` | PASS |
| `saveInventaris` create dengan kategori desa sendiri berhasil | `inventaris-tenant-isolation` | PASS |
| `saveInventaris` create dengan kategori desa lain ditolak, tidak menulis baris | `inventaris-tenant-isolation` | PASS |
| Pesan untuk kategori desa lain identik dengan kategori tidak ada | `inventaris-tenant-isolation` | PASS |
| Kategori kosong disimpan sebagai `NULL` | `inventaris-tenant-isolation` | PASS |
| Update ke kategori desa lain ditolak dan baris tidak berubah | `inventaris-tenant-isolation` | PASS |
| Update ke kategori desa sendiri tetap berhasil | `inventaris-tenant-isolation` | PASS |
| Update aset desa lain → `NOT_FOUND`, tanpa perubahan | `inventaris-tenant-isolation` | PASS |
| `ajukanMutasi` atas aset desa lain → `NOT_FOUND`, tidak ada mutasi tertulis | `inventaris-tenant-isolation` | PASS |

Status TDD: ketiga file test ditulis lebih dulu dan dijalankan pada kode `main` sebelum implementasi. Hasil RED tercatat: 7 test gagal (join kategori, join mutasi, create kategori lintas desa, keseragaman pesan, update kategori lintas desa, bentuk constraint, preflight) — semuanya gagal karena celah yang dituju, bukan karena error setup. Setelah implementasi: 28/28 PASS (guard test diperluas menjadi dua skenario preflight: `cross-tenant` dan `orphan`, masing-masing 3 assertion).

## 8. Hasil seluruh CI checks

| Perintah | Hasil | Ringkasan |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | `next typegen && tsc --noEmit` tanpa error |
| `npm run lint` | **PASS** | `eslint .` tanpa temuan |
| `npm run format:check` | **PASS** | Prettier bersih (3 file dirapikan sebelum check akhir) |
| `npm run test:unit` | **PASS** | 192 file / 1720 test |
| `npm run test:integration` | **PASS** | 30 file / 187 test (MySQL 8.0.30, disposable) |
| `npm run build` | **PASS** | Next.js production build selesai |

Selama verifikasi ditemukan satu kegagalan tidak terkait perubahan produksi: `dtks-tenant-isolation` menghitung `dtks_ref_lampiran` secara **global**, sehingga suite `b2-dtks-suplemen-composite-fk` yang berjalan paralel pada database yang sama membuat hitungan menjadi 3. Test tersebut lulus bila dijalankan sendiri maupun berpasangan, jadi penyebabnya isolasi test, bukan regresi. Perbaikan: hitungan dibatasi `village_id` desa uji (assertion tetap 2 → 1, tidak dilonggarkan).

## 9. Risiko yang masih tersisa

1. **Data legacy lintas desa.** Migration akan gagal-closed bila database berisi mutasi yang menunjuk inventaris desa lain. Belum diukur pada salinan data production; preflight harus dijalankan lebih dulu dan hasilnya diputuskan maintainer.
2. **`inventaris.kategori_id` masih single-column.** Baris legacy kategori lintas desa tidak dapat dibuat lagi lewat `saveInventaris`, tetapi data lama tetap ada dan kolom kategori akan tampil `NULL` pada join. Belum ada constraint DB; keputusan `SET NULL` menunggu maintainer.
3. **Write path inventaris belum punya route.** Perbaikan T3/T4 menjaga use case dan repository, tetapi belum ada UI/route yang menguji alur end-to-end; integration test memanggil use case langsung dengan sesi dimock.
4. **`recordAuditEvent`** menerima aktor nyata pada test (dibuat di tabel `users`) agar FK audit terpenuhi; di production aktor berasal dari sesi.
5. **Preflight hanya memeriksa referensi langsung** `inventaris_mutasi.inventaris_id`. Relasi kategori tidak diperiksa karena tidak diubah.
6. **Batas scope**: 22 relasi Matriks B2, 7 relasi `SET NULL`, dan tabel anak survey/pembangunan masih terbuka; Issue #34 **belum** selesai.

## 10. Rekomendasi Batch 4

1. **Keputusan desain `ON DELETE SET NULL`** untuk `inventaris_kategori`, `kontak`, `lapak`, `pendapat`, `family_member_logs`, `users.resident_id`, `letter_number_archive`, `notifikasi_terkirim` — pilih `RESTRICT`/`NO ACTION` atau pertahankan single-column + jaga app layer, lalu dokumentasikan di `docs/reports/01-security/`.
2. **Batch constraint bertahap per modul** untuk 22 relasi Matriks B2 (tambah `UNIQUE (village_id, id)` parent + composite FK), dimulai dari modul dengan route aktif: `bumindes_*`, `incoming/outgoing_letters`, `galeri_*`, `analisis_*`.
3. **Sertakan migration `0005` pada preflight data nyata**: jalankan query preflight read-only terhadap salinan database, catat jumlah orphan/cross-tenant, dan siapkan prosedur perbaikan manual sebelum deploy.
4. **Aktifkan write path inventaris** (form + server action) setelah Batch 3 merged, agar validasi kategori dan composite FK teruji end-to-end, termasuk audit trail.
5. **Audit ulang matriks** setiap kali ada migration baru; angka pada matriks terikat pada `de1bf1b` + `0005`.

## 11. Kesimpulan

Batch 3 menutup empat celah isolasi tenant pada modul inventaris dengan perubahan minimal: dua JOIN menjadi tenant-scoped, satu validasi application layer, dan satu composite FK dengan preflight fail-closed. Tidak ada migrasi yang dijalankan pada database development/production, tidak ada backfill, dan tidak ada pekerjaan Batch 1/Batch 2 yang diubah. Issue #34 tetap terbuka.
