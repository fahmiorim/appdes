# AUD-034 lanjutan — `village_id` dan composite FK pada empat tabel anak

- **Tanggal:** 20 November 2026
- **Branch:** `task/AUD-034-tenant-child-tables`
- **Base commit:** `34c8cc5` (`main`)
- **Commit pekerjaan:** diisi pada penyerahan
- **PR:** diisi pada penyerahan

## 1. Tujuan

Menutup sisa pekerjaan database pada Fase 1: empat tabel anak yang sebelumnya tidak menyimpan `village_id`, sehingga isolasi tenant hanya dijaga oleh join di application layer dan tidak dapat ditegakkan constraint.

Tabel: `survey_soal`, `survey_responden`, `survey_jawaban`, `pembangunan_dokumentasi`.

`users.role_id` **tidak** disentuh: keputusan `docs/decisions/ADR-002-users-role-id-app-enforced.md` tetap berlaku karena composite FK akan menolak kombinasi sah "user desa + role global".

## 2. Kondisi awal

- `survey` dan `pembangunan_proyek` sudah membawa `village_id`.
- Tabel anak hanya menunjuk induk lewat `survey_id` / `proyek_id`, sehingga pasangan id lintas tenant dapat tersimpan bila ada bug di use case.
- Tidak ada unique index `(village_id, id)` pada induk, sehingga composite FK belum mungkin dibuat.

## 3. Perubahan

### 3.1 Schema (`src/db/schema/survey.ts`, `src/db/schema/pembangunan.ts`)

- `survey_soal`, `survey_responden`, `survey_jawaban`, `pembangunan_dokumentasi`: kolom `village_id` NOT NULL + FK ke `villages(id)` `ON DELETE CASCADE`.
- Unique index `(village_id, id)` pada `survey`, `survey_soal`, `survey_responden`, `pembangunan_proyek` sebagai target composite FK.
- Composite FK:
  - `survey_soal (village_id, survey_id) → survey (village_id, id)`
  - `survey_responden (village_id, survey_id) → survey (village_id, id)`
  - `survey_jawaban (village_id, responden_id) → survey_responden (village_id, id)`
  - `survey_jawaban (village_id, soal_id) → survey_soal (village_id, id)`
  - `pembangunan_dokumentasi (village_id, proyek_id) → pembangunan_proyek (village_id, id)`
- Index pencarian `(village_id, <parent_id>)` menggantikan index single-column pada dokumentasi.
- FK single-column lama pada keempat tabel dilepas karena sudah digantikan composite FK.

### 3.2 Migration `0016_tenant_child_tables.sql`

Urutan dibuat data-safe:

1. Tambah kolom `village_id` **nullable**.
2. Backfill dari induk:
   - soal/responden dari `survey`;
   - jawaban dari `survey_soal`;
   - dokumentasi dari `pembangunan_proyek`.
3. Preflight guard: menghitung baris tanpa induk dan jawaban yang mencampur responden/soal beda tenant. Migration berhenti lewat duplicate-key error sebelum constraint berubah bila ada temuan (pola sama dengan migration `0008`/`0011`).
4. `MODIFY village_id ... NOT NULL`.
5. Lepas FK single-column, tambah unique index induk, tambah composite FK, buat index baru.

Catatan deploy: **migration harus dijalankan sebelum kode baru**, karena kode sekarang menulis `village_id` saat insert. Backfill berjalan sebagai `UPDATE ... JOIN` di dalam migration; pada tabel besar perlu jendela maintenance karena `ALTER TABLE` mengunci tabel.

Rollback: tidak disediakan otomatis. Untuk kembali, kolom `village_id` harus dibuat nullable, composite FK dilepas, FK single-column dipasang ulang, lalu kolom dihapus — hanya bila benar-benar diperlukan dan setelah backup.

### 3.3 Aplikasi

- `insertSoal(villageId, surveyId, values)` dan `insertResponden(villageId, surveyId, …)` menerima tenant dari use case (sesi terverifikasi atau host publik), bukan dari input klien.
- `insertDokumentasi(villageId, proyekId, …)`; `findDokumentasiScoped` memfilter `village_id` langsung, tidak lagi lewat join.
- Tidak ada perubahan perilaku UI atau signature Server Action.

## 4. Test

`src/db/m0016-tenant-child-tables.integration.test.ts` (6 test, terdaftar di peta integration test):

1. soal, responden, dan jawaban menyimpan `village_id` tenant pemanggil;
2. soal dengan `village_id` desa B + `survey_id` desa A ditolak database (1452);
3. jawaban yang mencampur responden desa A dan soal desa B ditolak database;
4. hapus survei menghapus soal/responden/jawaban lewat cascade;
5. dokumentasi menyimpan `village_id` pemanggil;
6. dokumentasi desa B untuk proyek desa A ditolak database.

Verifikasi tambahan (skrip sementara, tidak di-commit): database dimigrasi sampai `0015`, diisi satu set data (survey, soal, responden, jawaban, proyek, dokumentasi), lalu `0016` diterapkan. Hasil: `soal=1 responden=1 jawaban=1 dokumentasi=1` (semua terisi `village_id` desa induk) dan 5 composite FK terpasang.

## 5. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** |
| ESLint | `npx eslint <7 berkas berubah>` | **PASS** (tanpa temuan) |
| Prettier | `npx prettier --check <berkas berubah>` | **PASS** |
| Unit test modul | `npx vitest run --config vitest.config.mts src/features/survey src/features/pembangunan` | **PASS** — 6 file, 63 test |
| Integration test baru | `TEST_DATABASE_URL=…/desa_test_m0016b_20261120 … vitest run --config vitest.integration.config.mts src/db/m0016-tenant-child-tables.integration.test.ts` | **PASS** — 6 test |
| Peta integration test | `node scripts/integration-test-map.mjs --check` | **PASS** — 55 test, 20 modul, 22 lintas modul |
| Backfill data lama | skrip verifikasi sementara (0015 → isi data → 0016) | **PASS** |
| Suite integration penuh | — | **SKIPPED** — dijalankan pada task terpisah agar tidak mencampur perubahan |

## 6. File berubah

- `src/db/schema/survey.ts` — kolom tenant, unique index, composite FK.
- `src/db/schema/pembangunan.ts` — idem untuk dokumentasi + unique index proyek.
- `src/db/migrations/0016_tenant_child_tables.sql` — migration data-safe.
- `src/db/migrations/meta/_journal.json`, `src/db/migrations/meta/0016_snapshot.json` — metadata Drizzle.
- `src/features/survey/infrastructure/survey-repository.ts` — insert menulis `village_id`.
- `src/features/survey/application/use-cases.ts` — meneruskan tenant sesi/host.
- `src/features/pembangunan/infrastructure/pembangunan-repository.ts` — insert + filter scoped.
- `src/features/pembangunan/application/use-cases.ts` — meneruskan tenant sesi.
- `src/db/m0016-tenant-child-tables.integration.test.ts` — test baru.
- `vitest.integration.config.mts`, `scripts/integration-test-map.json` — registrasi test.
- `docs/MASTER_ROADMAP.md` — status empat tabel diperbarui.

## 7. Risiko dan keterbatasan

- Migration belum dijalankan pada staging/production (di luar scope keputusan saat ini). Pada data nyata, backfill menambah `village_id` dari induk dan guard akan menghentikan migration bila ada referensi lintas tenant.
- `ALTER TABLE ... MODIFY NOT NULL` mengunci tabel; pada instalasi dengan data besar perlu jendela maintenance.
- `users.role_id` tetap application-enforced sesuai ADR-002; bukan bagian task ini.
- Suite integration penuh belum dijalankan ulang untuk branch ini.

## 8. Rekomendasi

1. Review diff schema + migration, lalu jalankan migration di staging sebelum deploy kode.
2. Setelah PR ini masuk, lanjutkan item terpisah: evaluasi model role platform bila constraint `users.role_id` tetap diinginkan.
