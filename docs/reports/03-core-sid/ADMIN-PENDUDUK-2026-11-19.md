# ADMIN-PENDUDUK — Daftar dan Detail Data Penduduk

- **Tanggal:** 2026-11-19
- **Branch:** `task/admin-penduduk`
- **Base commit:** `cd5c9db`
- **Commit kode:** `643d8f6`
- **Status:** siap review, belum di-push

## Tujuan

Membangun modul Data Penduduk untuk Admin Desa dengan pencarian, filter, paginasi
server-side, ringkasan KPI, halaman detail, dan menu sidebar. Backend penduduk
yang sudah ada dipakai ulang; tidak ada CRUD, impor, atau perubahan model data
penduduk dalam task ini.

## Kondisi awal dan analisis

- `src/app/(admin)/penduduk/page.tsx` hanya menampilkan 25 baris pertama tanpa
  pencarian, filter, paginasi, atau tautan detail.
- `listPenduduk` sudah mendukung filter dan paginasi, tetapi belum dipakai penuh
  oleh halaman.
- `getPendudukDetail` lama tidak memeriksa permission sehingga tidak aman
  dipanggil langsung dari halaman baru.
- Modul `penduduk` belum ada di template tenant maupun database tenant yang
  sudah berjalan, sehingga halaman tidak muncul di sidebar.
- NIK adalah data pribadi; daftar dan detail perlu menyamarkannya.

## File yang diperiksa

- `src/app/(admin)/penduduk/page.tsx`
- `src/app/(admin)/penduduk/ekspor/route.ts`
- `src/features/penduduk/application/use-cases.ts`
- `src/features/penduduk/infrastructure/penduduk-repository.ts`
- `src/features/penduduk/infrastructure/reference-repository.ts`
- `src/features/penduduk/domain/penduduk.ts`
- `src/features/penduduk/domain/penduduk-filter.test.ts`
- `src/features/penduduk/domain/penduduk.test.ts`
- `src/features/wilayah/infrastructure/wilayah-repository.ts`
- `src/db/templates/tenant-template.ts`
- `src/db/migrations/0014_menu_pengguna_grup_akses.sql`
- `src/db/migrations/meta/_journal.json`
- `src/features/multi-desa/domain/template-tenant.test.ts`
- `src/db/migrasi-paritas.test.ts`
- `src/components/ui/stat-icon.tsx`
- `src/app/globals.css`

## File yang diubah

| File | Alasan |
| --- | --- |
| `src/app/(admin)/penduduk/page.tsx` | Halaman daftar baru: KPI, filter GET, tabel, paginasi, ekspor, tautan detail. |
| `src/app/(admin)/penduduk/[id]/page.tsx` | Halaman detail read-only dengan NIK tersamar dan `notFound()` lintas tenant. |
| `src/app/(admin)/penduduk/error.tsx` | Batas error modul dengan tombol muat ulang tanpa membocorkan pesan internal. |
| `src/features/penduduk/domain/penduduk.ts` | Helper `samarkanNik`. |
| `src/features/penduduk/domain/penduduk.test.ts` | Test penyamaran NIK. |
| `src/features/penduduk/infrastructure/penduduk-repository.ts` | Agregat KPI tenant-scoped dalam satu query. |
| `src/features/penduduk/application/use-cases.ts` | Use case KPI, opsi filter wilayah, dan detail yang memeriksa permission serta desa sesi. |
| `src/features/penduduk/application/penduduk-dashboard-use-cases.test.ts` | Test scoping desa, permission, dan opsi filter. |
| `src/db/templates/tenant-template.ts` | Modul `penduduk` untuk tenant baru dan grant role. |
| `src/db/migrations/0015_menu_penduduk.sql` | Backfill modul dan grant untuk tenant lama secara idempoten. |
| `src/db/migrations/meta/_journal.json` | Mendaftarkan migrasi 0015. |
| `src/db/migrations/meta/0015_snapshot.json` | Snapshot paritas skema. |
| `src/features/multi-desa/domain/template-tenant.test.ts` | Penjaga menu dan matriks akses penduduk pada template. |
| `src/app/globals.css` | Gaya KPI, filter, tabel, paginasi, detail, dan error penduduk. |

## Perubahan

### Daftar penduduk

- Empat KPI dari data nyata: total penduduk, jumlah KK, laki-laki, dan perempuan.
- Pencarian `q` untuk NIK/nama/nomor KK serta filter status, jenis kelamin,
  dusun, RW, dan RT. Form memakai GET agar filter dapat dibagikan dan di-bookmark.
- Paginasi server-side 10 baris per halaman dengan nomor halaman dan tautan
  sebelumnya/berikutnya; filter tetap terbawa.
- Halaman di luar rentang diarahkan ke halaman terakhir agar tidak menampilkan
  tabel kosong palsu.
- Tombol ekspor CSV mempertahankan filter aktif.
- Empty state membedakan “belum ada data” dan “tidak cocok dengan filter”.
- NIK pada tabel disamarkan.

### Detail penduduk

- Identitas, alamat/kontak, data orang tua, dan Kartu Keluarga.
- NIK penduduk, ayah, dan ibu disamarkan; tidak ada NIK penuh di tampilan.
- `getPendudukDetailData(id)` memakai `requirePermission("penduduk", "read")` dan
  desa dari sesi. ID milik desa lain menghasilkan `null` lalu `notFound()`.

### Menu dan migrasi

- Template tenant baru memuat `Data Penduduk` (`/penduduk`) dan grant:
  administrator `manage`; sekretaris, operator, kepala-desa `read`.
- Migrasi 0015 memakai `INSERT ... SELECT ... WHERE NOT EXISTS`, sehingga aman
  dijalankan ulang dan tidak menimpa penyesuaian menu tenant.
- Migrasi hanya menambah baris modul/grant; tidak mengubah atau menghapus data
  penduduk. Tidak perlu downtime khusus dan rollback dapat dilakukan dengan
  menghapus baris `modules`/`role_permissions` yang dibuat jika diperlukan.

## Security dan tenant

- `villageId` selalu berasal dari `resolveVillageId(user)`; tidak ada parameter
  desa dari URL, body, atau header.
- Semua use case baru memeriksa permission baca di server.
- Query KPI, daftar, opsi wilayah, dan detail dibatasi `village_id` desa sesi.
- Detail lintas tenant tidak membedakan “tidak ada” dan “milik desa lain”.
- NIK disamarkan di daftar dan detail. Ekspor CSV tetap memuat NIK penuh sesuai
  perilaku fitur ekspor yang sudah ada; aksesnya dibatasi permission baca.
- Tidak ada secret atau data pribadi yang ditambahkan ke fixture, test, atau
  laporan ini.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint "src/app/(admin)/penduduk/page.tsx" "src/app/(admin)/penduduk/error.tsx" "src/app/(admin)/penduduk/[id]/page.tsx" src/features/penduduk/application/penduduk-dashboard-use-cases.test.ts` | **PASS** |
| `npx eslint` pada file domain, repository, use case, template, dan test template | **PASS** |
| `npx vitest run --config vitest.config.mts src/features/penduduk/domain/penduduk.test.ts src/features/penduduk/application/penduduk-dashboard-use-cases.test.ts src/features/multi-desa/domain/template-tenant.test.ts src/db/migrasi-paritas.test.ts` | **PASS** — 4 file, 45 test |
| `npm run db:migrate` | **PASS** — migrasi 0015 diterapkan |
| Query verifikasi DB lokal | **PASS** — modul `penduduk` ada dan grant administrator `manage`, tiga role lain `read` |
| `npm run build` | **PASS** — route `/penduduk` dan `/penduduk/[id]` terbentuk |
| `npx prettier --write` pada file yang diubah | **PASS** |
| Full test suite | **SKIPPED** — hanya test relevan yang dijalankan |
| Integration test database disposable | **SKIPPED** — tidak diperlukan untuk perubahan ini; DB lokal hanya dipakai untuk migrasi |
| Pemeriksaan visual browser | **SKIPPED** — tidak diminta |

Build menghasilkan dua warning Turbopack yang sudah ada dan tidak terkait
perubahan ini: akses filesystem dinamis pada `ekspor-kedaluwarsa.mjs` dan
`whatsapp-baileys.ts`.

## Risiko dan keterbatasan

- KPI “Total Penduduk” menghitung seluruh status kependudukan agar konsisten
  dengan tabel; belum ada pemisahan khusus penduduk aktif.
- “Jumlah KK” menghitung KK yang memiliki anggota pada tabel penduduk, bukan
  seluruh baris tabel keluarga.
- Tab Kartu Keluarga, Mutasi, dan Statistik dari mockup belum dibuat karena di
  luar scope; halaman saat ini fokus pada daftar dan detail.
- CRUD, impor, dan ekspor detail belum diperluas.
- Belum ada uji browser atas tampilan nyata; validasi visual masih bergantung
  pada review maintainer.
- Menu baru berada setelah Pengaturan pada tenant lama karena `sort_order` 3;
  urutan dapat disesuaikan di pengaturan menu jika diinginkan.

## Rekomendasi berikutnya

1. Review tampilan daftar/detail pada data desa nyata dan sesuaikan urutan menu.
2. Tambahkan tab Kartu Keluarga, Mutasi, dan Statistik sebagai task terpisah.
3. Pertimbangkan kebijakan akses NIK penuh pada ekspor dan audit unduhannya.

## Kesimpulan

Modul Data Penduduk untuk daftar, filter, paginasi, detail, KPI, dan menu sudah
terimplementasi dengan isolasi tenant dan permission di server. Pekerjaan
di-commit lokal pada branch `task/admin-penduduk` dan belum di-push sesuai
instruksi.
