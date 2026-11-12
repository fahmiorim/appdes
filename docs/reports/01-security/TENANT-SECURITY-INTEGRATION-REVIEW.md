# Tenant Security Integration Review — AUD-002 / AUD-003 / AUD-007

- **Tanggal:** 12 November 2026
- **Task:** master review integrasi PR #3, #5, #7, #8.
- **Base:** `origin/main` @ `5a3f7502be6a71d0809600fa14b07c9f4807f1e5`.
- **Branch integrasi:** `task/AUD-002-003-007-integration` (head saat validasi
  `64c91f73d2fb0ab9878f118bd02f16a0d803017b`; commit laporan ini dibuat setelahnya).
- **Database uji:** `desa_test_integration_20261112`,
  `desa_test_integration_final_20261112`, `desa_test_aud003_fix_20261112`,
  `desa_test_aud007_fix_20261112` — seluruhnya dibuat baru, disposable, dan
  lolos guard `db-test-guard`.
- **Tidak disentuh:** `main` (tidak di-checkout/diubah), production, `desa_dev`,
  database existing lain, keempat branch PR asli selain penambahan commit
  perbaikan yang dijelaskan di bawah.
- **Tidak dilakukan:** merge PR, deploy, force push, perubahan schema/data
  production.

## 1. Executive summary

Keempat PR saling melengkapi dan **tidak saling meniadakan perlindungan**.
AUD-003 dan AUD-007 memperketat lapisan aplikasi; AUD-002 menegakkan kepemilikan
tenant di database; PR #8 menyediakan inverse migration dan runbook.

Satu cacat integrasi nyata ditemukan dan diperbaiki: test AUD-003 dan AUD-007
membangun fixture "relasi legacy lintas desa" dengan insert biasa, sehingga
setelah composite FK AUD-002 terpasang kedua suite **gagal pada tahap seed**
(`ER_NO_REFERENCED_ROW_2`). Perbaikannya mempertahankan makna test: baris legacy
tetap disisipkan, tetapi melalui koneksi terpisah dengan `FOREIGN_KEY_CHECKS = 0`
dan selalu dikembalikan di `finally`; assertion tidak diubah. Teardown kedua
suite juga diurutkan agar `RESTRICT` tidak memblokir cleanup.

Setelah perbaikan, gabungan seluruh perubahan lolos: typecheck, lint, format,
1701 unit test, 71 integration test (12 file, termasuk 37 test AUD), dan build.
Migration memuat tepat 19 composite FK, 8 unique parent key, 3 index eksplisit,
dan 14 implicit FK index yang seluruhnya ditangani inverse PR #8.

**Kesimpulan:** seluruh perubahan **siap direview untuk merge** dengan urutan
#3 → #5 → #7 → #8. Belum production-ready: preflight production, pengukuran lock
DDL, dan backup/restore terverifikasi masih wajib.

## 2. PR dan commit yang diperiksa

| PR | Task | Branch | Head awal | Head akhir | Status review |
|---|---|---|---|---|---|
| [#3](https://github.com/fahmiorim/appdes/pull/3) | AUD-003 | `task/AUD-003-penduduk-tenant-references` | `2df893c` | `de81059` | Siap review |
| [#5](https://github.com/fahmiorim/appdes/pull/5) | AUD-007 | `task/AUD-007-riwayat-tenant-isolation` | `b3dd849` | `08e5ba8` | Siap review |
| [#7](https://github.com/fahmiorim/appdes/pull/7) | AUD-002 | `task/AUD-002-composite-tenant-integrity` | `33f706a` | `33f706a` | Siap review |
| [#8](https://github.com/fahmiorim/appdes/pull/8) | AUD-002 rollback | `task/AUD-002-rollback-runbook` | `64e5749` | `64e5749` | Siap review setelah #7 |

Commit perbaikan integrasi:

- `a1cf097` — AUD-003: seed baris legacy melewati composite FK + urutan teardown.
- `7df8c62` — AUD-007: seed mutasi legacy melewati composite FK + urutan teardown.
- `de81059` — AUD-003: catatan rekonsiliasi pada laporan task.
- `08e5ba8` — AUD-007: catatan rekonsiliasi pada laporan task.

Commit merge pada branch integrasi: `87a98c5` (AUD-003), `2a5b49b` (AUD-007),
`e9b44d1` (AUD-002), `dba5f96` (PR #8 + perbaikan fixture), `64c91f7` (catatan
rekonsiliasi). PR #8 diuji sebagai stack di atas AUD-002; base PR tidak diubah.

## 3. Metodologi

- Diff dan source code sebenarnya dibaca, bukan hanya deskripsi PR.
- Keempat branch di-merge lokal ke branch integrasi sementara dari `origin/main`;
  konflik diselesaikan tanpa menghapus perlindungan dari PR lain.
- Test dijalankan pada database disposable baru yang dimigrasi dari nol.
- Inventaris constraint diverifikasi langsung dari `information_schema` pada
  schema hasil integrasi.
- Tidak ada test yang dihapus, di-skip, atau dilonggarkan assertion-nya.

## 4. Temuan audit

| # | Temuan | Tingkat | Status |
|---|---|---|---|
| F1 | Fixture legacy lintas desa AUD-003/AUD-007 ditolak composite FK AUD-002; suite gagal saat seed pada gabungan | Blocker integrasi | **Diperbaiki** (`a1cf097`, `7df8c62`) |
| F2 | Teardown AUD-003/AUD-007 menghapus desa sebelum anak; dengan `RESTRICT` cleanup tidak deterministik | Tinggi (test-only) | **Diperbaiki** bersama F1 |
| F3 | Konflik merge `penduduk-repository.deletePenduduk` (AUD-002 cleanup vs AUD-003 signature) | Tinggi | **Direkonsiliasi** |
| F4 | Konflik merge daftar `include` di `vitest.integration.config.mts` | Rendah | **Direkonsiliasi** |
| F5 | AUD-007 `affectedRows` dipakai mendeteksi penduduk tenant lain; no-op UPDATE dapat terbaca 0 baris | Rendah | **ACCEPTED RISK** — use case selalu mengubah status; kegagalan bersifat aman (rollback) |
| F6 | JOIN `users` untuk `actorName` tidak dibatasi tenant | Rendah | **ACCEPTED RISK** — aktor berasal dari sesi server-side; user platform sah memiliki `villageId = null`, filter tenant akan menghilangkan nama aktor platform |
| F7 | `dtks-repository.ts` dan `suplemen-repository.ts` masih JOIN `families`/`rumahTangga`/`regions`/`residents` tanpa predicate tenant | Sedang | **Tidak diperbaiki** — di luar diff keempat PR; sudah tercatat sebagai relasi deferred AUD-002. Butuh task terpisah |
| F8 | Laporan AUD-002 masih menyebut inverse "belum dibuat dan belum diuji"; artefak dan rehearsal ada di PR #8 | Rendah (dokumentasi) | **Dijelaskan** — risiko tertutup setelah #8; laporan tidak diubah agar base PR #8 tidak bergeser |

Tidak ditemukan kebocoran data lintas desa yang baru akibat penggabungan, dan
tidak ditemukan constraint AUD-002 yang bertentangan dengan validasi AUD-003 /
AUD-007. Keduanya bersifat berlapis: aplikasi memberi error domain yang jelas,
database tetap menolak jalur langsung/import/restore.

## 5. Bug yang diperbaiki

### 5.1 Seed legacy AUD-003 (`a1cf097`)

- Sebelum: `db.insert(residents)` dengan `familyId`/`regionId` milik desa lain →
  `residents_family_tenant_fk` menolak, seluruh file test gagal.
- Sesudah: helper `sisipkanLegacy()` memakai koneksi `mysql2` terpisah dari
  `validasiDatabaseUji(process.env).opsiKoneksi`, menyalakan
  `FOREIGN_KEY_CHECKS = 0` hanya untuk insert tersebut, dan mengembalikannya ke
  `1` di `finally`.
- Assertion tidak berubah: daftar, pencarian KK, detail, data surat, laporan, dan
  DPT tetap harus menyembunyikan identitas desa lain.

### 5.2 Seed legacy AUD-007 (`7df8c62`)

- Sebelum: `residentMutations` desa A menunjuk penduduk desa B ditolak
  `resident_mutations_resident_tenant_fk`.
- Sesudah: pola helper yang sama; 12 test tetap memeriksa daftar, count,
  pagination, pencarian nama/NIK, ekspor, dan riwayat per penduduk.

### 5.3 Urutan teardown

Kedua suite kini menghapus anak lebih dahulu (`residents`/`residentMutations`),
lalu `families`/`regions`/`users`, lalu `villages`. Ini diperlukan karena
AUD-002 mengubah `SET NULL` menjadi `RESTRICT` pada relasi tenant.

Tidak ada perubahan kode produksi pada task integrasi ini. Seluruh perbaikan
berada pada file test dan laporan task masing-masing.

## 6. Rekonsiliasi konflik

| File | PR yang beririsan | Penyelesaian |
|---|---|---|
| `src/features/penduduk/infrastructure/penduduk-repository.ts` | #3, #7 | Signature `deletePendudukRow(villageId, id)` dari AUD-003 dipertahankan; isi transaksi cleanup `letters` + `resident_mutations` dari AUD-002 dipertahankan. Tidak ada `DELETE` tanpa predicate tenant. |
| `vitest.integration.config.mts` | #3, #5, #7 | Ketiga entri test didaftarkan; tidak ada yang hilang. |
| `src/features/penduduk/application/use-cases.ts` | #3, #7 | Auto-merge benar: `validatePendudukTenantReferences` (AUD-003) + `deletePendudukRow(villageId, id)` (AUD-002). |
| `src/features/penduduk/infrastructure/riwayat-penduduk-repository.ts` | #5, #7 | Auto-merge; JOIN tenant AUD-007 tetap ada, repository tidak diubah AUD-002. |

## 7. Hasil review tenant isolation

| Area | Pemeriksaan | Status |
|---|---|---|
| AUD-003 create/update penduduk | `validatePendudukTenantReferences(villageId, …)` sebelum tulis; update memakai `id + villageId`; pesan error generik | PASS |
| AUD-003 delete penduduk | `WHERE id AND villageId` di dalam transaksi cleanup | PASS |
| AUD-003 daftar/count/detail/surat/laporan/DPT | JOIN `families` dan `regions` menyertakan `villageId`; label legacy menjadi `null` | PASS |
| AUD-003 jalur kelahiran/kedatangan | Validasi referensi sebelum simpan; test negatif lintas desa lulus | PASS |
| AUD-007 daftar/count/ekspor | `joinResidentTenant(villageId)` pada `residents`; pencarian memakai kolom yang sudah dibatasi | PASS |
| AUD-007 riwayat per penduduk | `INNER JOIN` tenant-scoped; ID penduduk desa lain tidak membuka baris | PASS |
| AUD-007 jalur tulis mutasi | Kesamaan `villageId`, `residentId` dari hasil insert, cek hasil update di transaksi | PASS |
| AUD-002 composite FK | 19 relasi inti ditegakkan `(village_id, parent_id)`; direct insert/update lintas tenant ditolak | PASS |
| AUD-002 delete parent | Cleanup eksplisit tenant-scoped sebelum delete; `RESTRICT` mencegah orphan lintas tenant | PASS |
| Actor/user tenant | JOIN `users` tanpa predicate tenant | ACCEPTED RISK (F6) |
| DTKS/suplemen joins | Belum tenant-scoped pada JOIN | NOT FIXED / follow-up (F7) |
| Modul deferred AUD-002 (44 relasi) | Hanya dijaga application layer | ACCEPTED RISK |

## 8. Hasil migration dan rollback

Diverifikasi pada schema integrasi hasil migrasi dari nol:

| Objek | Target | Aktual | Status |
|---|---|---|---|
| Composite FK `*_tenant_fk` | 19 | 19 | PASS |
| Unique parent key `*_village_id_uq` | 8 | 8 | PASS |
| Index eksplisit `resident_mutations_village_*_idx` | 3 | 3 | PASS |
| Implicit FK index yang di-drop inverse | 14 | 14 (semua nama ditemukan) | PASS |

- **Forward vs schema aplikasi:** kolom dan constraint pada `src/db/schema/*.ts`
  sesuai dengan migration `0001`; test direct-insert membuktikan constraint
  benar-benar aktif, bukan hanya ada di definisi.
- **`ON DELETE`:** `CASCADE` dipertahankan untuk `permohonan_surat` dan anak
  `kia`; relasi yang sebelumnya `SET NULL` menjadi `RESTRICT` karena composite
  `SET NULL` akan mencoba mengosongkan `village_id NOT NULL`. `ON UPDATE` tetap
  `NO ACTION`.
- **Inverse (PR #8):** rehearsal terdahulu pada MySQL 8.0.30 (lihat
  `AUD-002-rollback-verification.md`) menghasilkan schema yang cocok persis
  dengan baseline: 147 tabel, 1431 kolom, 234 FK, 454 index; failure injection
  berhenti pada error pertama; restore dari backup + inverse berhasil.
- **Konsistensi dengan hasil akhir AUD-002:** branch integrasi tidak mengubah
  SQL AUD-002, dan seluruh objek yang di-drop inverse terverifikasi ada pada
  schema integrasi. Tidak ada perubahan SQL, sehingga rehearsal ulang tidak
  diperlukan; hasil rehearsal sebelumnya tetap berlaku.
- **DDL parsial:** runbook melarang menjalankan inverse utuh pada migration
  parsial, mewajibkan eksekusi statement-by-statement dengan stop-on-error,
  pencatatan statement terakhir, dan rekonsiliasi `information_schema`.
- **Backup/restore:** bagian dari prosedur deployment dan rehearsal rollback.

## 9. Hasil pengujian

Dijalankan pada branch integrasi, database disposable
`desa_test_integration_final_20261112` yang dimigrasi dari nol.

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** — `next typegen` + `tsc --noEmit`, exit 0 |
| Lint | `npm run lint` | **PASS** — `eslint .`, exit 0 |
| Format | `npm run format:check` | **PASS** — `All matched files use Prettier code style!` |
| Unit test | `npm run test:unit` | **PASS** — 187 file, 1701 test |
| Integration test | `npm run test:integration` (DSN + `TEST_DATABASE_ACK=1`, `NODE_ENV=test`) | **PASS** — 12 file, 71 test |
| Build | `npm run build` | **PASS** — 1 warning tracing lama di `whatsapp-baileys.ts:93`, tidak terkait task |
| AUD gabungan | 3 file AUD dijalankan satu rangkaian | **PASS** — 37 test (10 + 15 + 12) |
| AUD-003 mandiri (branch #3) | `penduduk-tenant-references.integration.test.ts` | **PASS** — 15 test |
| AUD-007 mandiri (branch #5) | `riwayat-penduduk-tenant-isolation.integration.test.ts` | **PASS** — 12 test |
| GitHub Actions / status check PR | — | **NOT TESTED** — `gh` tidak tersedia/terautentikasi di environment ini |
| Production-scale test | — | **NOT TESTED** — dilarang/ tidak tersedia |

Kegagalan yang benar-benar teramati sebelum perbaikan: kedua suite AUD gagal
dengan `ER_NO_REFERENCED_ROW_2` pada `residents_family_tenant_fk` dan
`resident_mutations_resident_tenant_fk`. Setelah perbaikan, seluruh rangkaian
lulus. Tidak ada assertion yang dihapus atau dilemahkan.

## 10. Risiko yang masih terbuka

| Risiko | Klasifikasi |
|---|---|
| 44 relasi tenant lain masih hanya dijaga application layer | ACCEPTED RISK (deferred, tercatat di AUD-002) |
| DTKS/suplemen JOIN belum tenant-scoped | NOT FIXED — follow-up terpisah |
| DDL MySQL tidak atomik; kegagalan di tengah meninggalkan schema parsial | ACCEPTED RISK dengan runbook + restore |
| Durasi lock/downtime 19 `ALTER TABLE` belum diukur pada volume production | NOT TESTED |
| Preflight pada salinan production belum dijalankan | NOT TESTED |
| Rehearsal rollback belum pada volume data production | NOT TESTED |
| Deadlock/lock wait saat delete konkuren belum diukur | NOT TESTED |
| `affectedRows` AUD-007 pada UPDATE no-op | ACCEPTED RISK (aman: rollback) |
| Nama aktor platform pada riwayat tidak difilter tenant | ACCEPTED RISK (aktor server-side) |
| Status check CI PR tidak diverifikasi dari GitHub | NOT TESTED |

## 11. Urutan integrasi yang direkomendasikan

1. **#3 AUD-003** — perbaikan aplikasi, tanpa migration. Merge lebih dulu agar
   validasi referensi dan query tenant-scoped aktif.
2. **#5 AUD-007** — perbaikan aplikasi, tanpa migration; independen dari #3,
   tetapi lebih aman setelah #3 karena berbagi file test/config.
3. **#7 AUD-002** — enforcement database + cleanup delete. Setelah merge,
   deploy kode aplikasi lebih dulu, lalu jalankan preflight dan migration pada
   maintenance window.
4. **#8 AUD-002 rollback** — dokumentasi + inverse SQL; merge setelah #7 agar
   diff-nya menjadi dokumentasi murni. Jangan retarget base PR sebelum #7 merge.

Setelah setiap merge, jalankan minimal typecheck, unit test, integration test
pada database disposable, dan build. Jangan merge #8 sebelum #7.

## 12. Checklist kesiapan merge

- [x] Diff keempat PR dibaca dan dipahami.
- [x] Tidak ada perlindungan PR lain yang hilang saat digabungkan.
- [x] Konflik merge diselesaikan dan diuji.
- [x] Test gabungan AUD-002/003/007 lulus sebagai satu rangkaian.
- [x] Typecheck, lint, format, unit, integration, build PASS di branch integrasi.
- [x] Migration dan inverse konsisten secara inventaris objek.
- [x] Laporan task diperbarui dengan catatan rekonsiliasi.
- [x] Tidak ada secret/data pribadi dalam diff atau laporan.
- [x] `main` tidak diubah; tidak ada merge/deploy/force push.
- [ ] Status check CI GitHub diverifikasi (NOT TESTED — `gh` tidak tersedia).
- [ ] Reviewer menyetujui urutan integrasi.

## 13. Checklist sebelum production deployment

- [ ] Backup penuh + bukti restore pada salinan.
- [ ] Preflight read-only pada salinan production; wajib 0 temuan
      orphan/cross-tenant.
- [ ] Ukur durasi dan metadata lock 19 `ALTER TABLE` pada salinan berukuran
      production.
- [ ] Siapkan maintenance window dan rencana penghentian aplikasi.
- [ ] Deploy kode aplikasi dengan cleanup delete lebih dulu.
- [ ] Jalankan migration `0001` dan verifikasi 19 FK / 8 unique key / 3 index.
- [ ] Smoke test delete KK, RTM, penduduk, surat, dan wilayah.
- [ ] Jalankan preflight kembali setelah migration.
- [ ] Siapkan inverse SQL + runbook; pastikan tim tahu rollback menghapus
      enforcement tenant.
- [ ] Pantau error FK dan deadlock setelah deployment.

## 14. Batasan review ini

- Pada saat laporan awal dibuat, environment Freebuff tidak memiliki akses `gh`,
  sehingga deskripsi/komentar PR belum diperbarui dan CI belum diverifikasi.
  Setelah review lanjutan melalui GitHub, deskripsi PR #3, #5, #7, dan #8 telah
  diselaraskan dengan hasil integrasi. Status CI tetap NOT TESTED karena tidak
  ada status check maupun workflow run yang terdeteksi pada commit terkait.
- Pengujian memakai data sintetis kecil, bukan volume production.
- Modul di luar diff keempat PR tidak diaudit menyeluruh; temuan F7 dicatat
  sebagai follow-up, bukan diklaim selesai.

**Status akhir:** siap direview untuk merge dengan urutan di atas; belum
production-ready sampai checklist bagian 13 selesai.
