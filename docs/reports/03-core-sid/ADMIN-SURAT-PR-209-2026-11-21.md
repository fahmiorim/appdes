# PR #209 — Admin Surat Dashboard: sinkronisasi `origin/main` dan pemulihan CI

- **Tanggal:** 21 November 2026
- **Branch:** `feature/admin-surat-dashboard`
- **Base sebelum sinkronisasi:** `3715b6e5` (feat(pelayanan): add IKM comparison across survey periods)
- **Commit `origin/main` yang digabung:** `336b2fa8` (Merge pull request #206)
- **Commit hasil pekerjaan:** `b974e093`
- **Pull request:** #209 (`feature/admin-surat-dashboard` → `main`)

## Tujuan

Menyinkronkan PR #209 dengan `origin/main` agar seluruh pemeriksaan CI berjalan
pada basis terbaru, memperbaiki kegagalan yang muncul setelah penggabungan, lalu
menyerahkan branch untuk review tanpa melakukan merge.

## Kondisi awal

- Branch tertinggal dari `main` dan menghasilkan konflik pada `src/app/globals.css`,
  `src/db/migrations/meta/_journal.json`, `src/db/templates/tenant-template.ts`,
  `src/features/multi-desa/domain/template-tenant.test.ts`,
  `src/features/navigation/domain/menu-tampil.test.ts`, dan
  `src/features/navigation/domain/menu-tampil.ts`.
- Migrasi surat memakai nomor 0023–0027 yang bertabrakan dengan migrasi
  `main` (0023–0026), dan branch tidak memiliki snapshot Drizzle untuk migrasi
  tersebut sehingga `src/db/migrasi-paritas.test.ts` gagal.
- Setelah konflik diselesaikan, `tsc`, ESLint, Prettier, dan
  `src/features/publik/application/lapisan-publik.test.ts` masih gagal.

## Analisis dan pendekatan

1. **Konflik migrasi.** Migrasi surat dinomori ulang menjadi `0027`–`0031`
   (`layanan_publik_catalog`, `pengajuan_layanan`, `riwayat_pengajuan_layanan`,
   `pengajuan_layanan_berkas`, `pengajuan_layanan_hasil`), journal dibangun ulang
   dengan `idx` 27–31, dan snapshot 0027–0031 disusun dari snapshot 0026 `main`
   ditambah tabel surat. Snapshot ini tidak pernah ada di branch.
2. **Paritas skema ↔ SQL.** Foreign key pada schema surat diubah dari
   `.references()` inline menjadi `foreignKey({ name: ... })` dengan nama yang
   sama seperti SQL yang sudah di-commit, dan indeks
   `pengajuan_layanan_berkas_tenant_type_idx` ditambahkan ke schema. Berkas SQL
   dirapikan ke indentasi tab agar parser `kolomMigrasi()` dapat membaca kolom.
3. **Typecheck.** Sepuluh error diperbaiki pada sumbernya: antarmuka
   `BukuAgendaRow`, tipe `nationalId` pada form surat, pemanggilan
   `bacaHasilPengajuanWargaData`, serta beberapa nilai opsional berkas.
4. **Batas lapisan.** Guard `lapisan-publik.test.ts` menolak import `@/db` dan
   `features/*/infrastructure` dari route serta `@/db` dari application layer.
   Perbaikan dilakukan dengan memindahkan akses data ke repository, bukan dengan
   melonggarkan guard:
   - `getSuratCurrentRoleSlugData()` menggantikan `findRoleById` di halaman detail
     surat.
   - `src/features/pelayanan/infrastructure/survei-repository.ts` (baru) menampung
     seluruh query survei/IKM tenant-scoped yang sebelumnya inline di
     `survei-use-cases.ts`.
   - `denganKunciNomorTiket()` di `pengaduan-repository.ts` membungkus kunci MySQL
     pembuatan nomor tiket.
   - `kirimPengaduanDenganLampiranData()` memindahkan penyimpanan/penghapusan
     lampiran dari Server Action ke application layer.
5. **Format dan lint.** Seluruh berkas branch diformat Prettier; error ESLint
   (`NextRequest` type-only, import tak terpakai, `<a>` → `<Link>`, `import()`
   inline) diperbaiki tanpa suppression.

## File yang diperiksa

- `src/db/migrations/meta/_journal.json`, `src/db/migrations/00*.sql`,
  `src/db/schema/{layanan-publik,pengajuan-layanan,riwayat-pengajuan-layanan,pengajuan-layanan-berkas}.ts`
- `src/db/migrasi-paritas.test.ts`, `src/features/publik/application/lapisan-publik.test.ts`
- `src/features/surat/application/*`, `src/features/surat/infrastructure/*`,
  `src/app/(admin)/persuratan/**`
- `src/features/pelayanan/application/survei-use-cases.ts`,
  `src/features/survey/infrastructure/survey-repository.ts`,
  `src/app/(admin)/pelayanan-publik/survei/**`
- `src/features/pengaduan/application/use-cases.ts`,
  `src/features/pengaduan/infrastructure/pengaduan-repository.ts`,
  `src/app/pengaduan/baru/actions.ts`
- `src/features/publik/infrastructure/media-storage.ts`,
  `src/features/publik/application/simpan-berkas-media.ts`

## File yang diubah (ringkasan)

- **Migrasi & schema:** `0027`–`0031_*.sql`, snapshot `0027`–`0031`,
  `meta/_journal.json`, empat berkas schema pengajuan layanan.
- **Surat:** `buku-agenda-use-cases.ts`, `surat-use-cases.ts`,
  `surat-form.tsx`, halaman detail surat, serta penyesuaian repository surat.
- **Pelayanan/survei:** `survei-use-cases.ts` (hapus seluruh akses Drizzle),
  `survei-repository.ts` (baru).
- **Pengaduan:** `use-cases.ts`, `pengaduan-repository.ts`,
  `src/app/pengaduan/baru/actions.ts`.
- **Dokumentasi:** laporan ini.

Total diff terhadap `origin/main`: 121 berkas (99 baru, 22 berubah), mayoritas
baris berasal dari lima snapshot Drizzle.

## Security / tenant

- Seluruh fungsi repository baru tetap menyaring `village_id` tenant pada
  select, update, dan delete; tidak ada `villageId` dari input klien.
- Pemeriksaan `NIK` duplikat responden survei tetap dijalankan di dalam
  transaksi yang sama dengan insert, sehingga perilaku race tidak berubah.
- Kunci nomor tiket tetap per tenant + prefiks tanggal; nilai prefiks dihitung
  server.
- Validasi lampiran pengaduan tetap memakai `simpanUnggahanMedia` (allowlist
  MIME, magic bytes, batas ukuran, kuota desa); lampiran dibersihkan bila
  penyimpanan pengaduan gagal.
- Tidak ada penurunan strictness TypeScript, suppression, `any` baru, atau
  penghapusan assertion.

## Validasi

Perintah dijalankan pada 21 November 2026 dari root repository.

| Perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** | exit 0 |
| `npx eslint .` | **PASS** | 0 error; 2 warning `no-console` lama di `scripts/wilayah/generate-wilayah.mjs:91–92` |
| `npm run format:check` | **PASS** | "All matched files use Prettier code style!" |
| `npm run test:unit` (`vitest run`) | **PASS** | 245 berkas, 2078 test lulus |
| `npx vitest run src/features/publik/application/lapisan-publik.test.ts src/db/migrasi-paritas.test.ts` | **PASS** | 13 test lulus (guard lapisan + paritas migrasi) |
| `npm run build` | **PASS** | exit 0, route ter-generate |
| Integration test MySQL | **SKIPPED** | Docker/MySQL lokal tidak tersedia; tidak dijalankan terhadap database production |

## Risiko tersisa

- Integration test dan migrasi belum dijalankan pada database MySQL nyata;
  paritas baru diverifikasi melalui snapshot Drizzle dan test statis.
- Dua warning `no-console` pada skrip generator wilayah sudah ada sebelumnya dan
  tidak termasuk scope PR ini.
- CI remote belum diverifikasi pada commit `b974e093`; hasilnya menyusul setelah
  push.

## Kesimpulan

Branch sudah sinkron dengan `origin/main`, seluruh pemeriksaan lokal lulus tanpa
melonggarkan guard, dan perubahan siap direview pada PR #209. Merge menunggu
hasil CI dan persetujuan reviewer.
