# Manajemen Template — Katalog, Detail, Penggunaan, dan Tambah Template

- **Tanggal:** 20 November 2026
- **Task:** Melanjutkan konsol Super Admin per menu. Menu Manajemen Template mencakup empat halaman mockup: katalog, detail/edit, penggunaan & pembaruan, dan tambah template.
- **Branch:** `task/super-admin-manajemen-template`
- **Base commit:** `0b18f438a724af68080775000f143061e410842f` (`origin/main`)
- **Commit kode:** `3c3e157`
- **Status:** Siap review. Belum di-merge dan belum di-deploy.

## 1. Tujuan dan keputusan scope

User memilih dua keputusan:

1. Template yang dikelola adalah **tema website**, bukan template fondasi tenant.
2. Implementasi memakai **registry penuh + migration**.

Karena itu pekerjaan ini menambahkan katalog tema website yang tersimpan di database,
riwayat versi, status publikasi, penggunaan per tenant, dan distribusi versi. Template
fondasi tenant yang sudah ada tidak dihapus; halamannya dipindah ke
`/super-admin/template/fondasi` agar tidak bertabrakan dengan katalog tema.

Yang **sengaja tidak** diimplementasikan:

- Unggah ZIP, HTML, JavaScript, atau paket tema saat runtime.
- Eksekusi kode dari katalog. Registry hanya menyimpan metadata dan token tampilan
  tervalidasi Zod.
- Mengklaim situs publik sudah memakai token baru. Rendering situs publik masih
  memakai komponen aplikasi yang ada.

## 2. Kondisi awal

Sebelum perubahan, `/super-admin/template` adalah satu halaman baca-saja untuk
template fondasi tenant. Tidak ada katalog tema, riwayat versi, atau distribusi versi.
Tabel `theme` per tenant sudah ada dan menyimpan `slug`, `nama`, `versi`, serta `aktif`.
Tema bawaan tenant baru adalah `esensi` versi `1.0.0` dari template fondasi.

## 3. Perubahan

### Schema dan migration

- `src/db/schema/website-templates.ts`
  - `website_templates`: slug unik, nama, kategori, deskripsi, versi aktif, status,
    token JSON tervalidasi, tag JSON, `created_by`.
  - `website_template_versions`: snapshot token per versi, changelog, unique
    `(template_id, version)`, foreign key cascade ke template.
- `src/db/schema/index.ts`: mengekspor schema baru.
- `src/db/migrations/0019_colorful_dakota_north.sql`
  - Membuat dua tabel, index status/kategori, unique index, dan foreign key.
  - Seed `esensi` versi `1.0.0` berstatus `published` agar katalog tidak kosong dan
    penggunaan nyata dapat ditampilkan.
  - Versi awal disisipkan lewat subquery `slug = 'esensi'`, bukan
    `LAST_INSERT_ID()`, agar tidak bergantung pada state koneksi.
- Snapshot dan journal Drizzle diperbarui.

### Domain dan application layer

- `src/features/multi-desa/domain/template-website.ts`
  - Kategori, status, label, schema slug/versi/warna/tag/token.
  - `websiteTemplateUpdateSchema` tidak menerima slug, sehingga slug stabil.
  - `distribusiTemplateSchema` mengubah id desa dari form menjadi angka positif.
  - `bandingkanVersi` untuk menolak penurunan versi.
- `src/features/multi-desa/application/template-website-use-cases.ts`
  - Semua operasi memanggil `requireSuperAdmin()`.
  - Slug duplikat ditolak sebelum insert.
  - Kenaikan versi wajib lebih tinggi dan wajib memiliki changelog.
  - Distribusi memvalidasi ulang daftar desa terhadap tenant yang benar-benar memakai
    slug template; id desa lain diabaikan dan tidak dapat mengubah tema tenant lain.
  - Audit event baru untuk create, update, status, dan distribusi.
- `src/features/multi-desa/infrastructure/template-website-repository.ts`
  - Katalog beserta jumlah tenant dan jumlah tenant tertinggal versi.
  - Detail, riwayat versi, penggunaan per tenant, create/update/status, dan distribusi.
  - Token/tag JSON yang rusak tidak membuat seluruh katalog gagal dibuka.

### Halaman dan navigasi

- `/super-admin/template`: katalog dengan pencarian, filter kategori/status, tampilan
  grid/list, kartu tema, jumlah penggunaan, dan penanda versi tertinggal.
- `/super-admin/template/[templateId]`: pratinjau komposisi, metadata, statistik,
  tab Konfigurasi, Penggunaan, dan Versi & riwayat; form edit; aksi terbit/arsip.
- `/super-admin/template/baru`: form tiga bagian (informasi dasar, token tampilan,
  pratinjau dan simpan), tersimpan sebagai draf.
- `/super-admin/template/penggunaan`: statistik, pemilih template, daftar tenant,
  domain, versi, dan tautan distribusi.
- `/super-admin/template/fondasi`: halaman fondasi tenant lama dipertahankan.
- Menu platform berubah menjadi **Manajemen template** dengan submenu katalog,
  penggunaan & pembaruan, dan fondasi tenant.
- `PlatformPageHeader` mendapat dukungan judul dinamis dan tautan kembali.
- CSS responsif ditambahkan untuk katalog, pratinjau, form, tabel distribusi, dan
  sidebar submenu.

### Audit

Empat event ditambahkan ke `src/features/audit/domain/audit.ts`:

- `website-template.create`
- `website-template.update`
- `website-template.status`
- `website-template.distribute`

## 4. Security dan tenant isolation

- Halaman dan use case sama-sama memanggil `requireSuperAdmin()`.
- `villageId` dari form tidak pernah dianggap bukti otorisasi. Distribusi mengambil
  daftar tenant yang sah dari `theme` berdasarkan slug, lalu menginterseksikannya
  dengan pilihan form.
- Query distribusi dibatasi `slug`, `aktif = true`, dan `villageId` terpilih.
- Slug tidak dapat diubah setelah dibuat agar tema tenant tidak kehilangan kaitan.
- Hanya template `published` yang dapat didistribusikan.
- Token dibatasi ke enam warna heksadesimal, font, radius, dan nuansa yang
  diizinkan. Tidak ada HTML mentah atau eksekusi kode.
- Tidak ada unggahan berkas, sehingga tidak ada validasi MIME/signature/path yang
  perlu ditambahkan pada task ini.
- Audit mencatat aktor, resource, slug, versi lama/baru, dan jumlah tenant yang
  terdampak; tidak ada data pribadi atau rahasia.

## 5. File yang diperiksa

- `docs/mockups/platform/super-admin/Manajemen Template/*.png` (empat mockup)
- `src/db/schema/theme.ts`
- `src/db/schema/village.ts`
- `src/db/templates/tenant-template.ts`
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts`
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/domain/ringkasan-platform.ts`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/navigation/domain/menu-platform.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/features/navigation/domain/menu-tampil.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/features/audit/domain/audit.ts`
- `src/app/globals.css`

## 6. File yang diubah/ditambahkan

**Baru**

- `src/db/schema/website-templates.ts`
- `src/db/migrations/0019_colorful_dakota_north.sql`
- `src/db/migrations/meta/0019_snapshot.json`
- `src/features/multi-desa/domain/template-website.ts`
- `src/features/multi-desa/domain/template-website.test.ts`
- `src/features/multi-desa/application/template-website-use-cases.ts`
- `src/features/multi-desa/application/template-website-use-cases.test.ts`
- `src/features/multi-desa/infrastructure/template-website-repository.ts`
- `src/features/multi-desa/presentation/template-preview.tsx`
- `src/features/multi-desa/presentation/katalog-template.tsx`
- `src/features/multi-desa/presentation/form-template.tsx`
- `src/features/multi-desa/presentation/aksi-template.tsx`
- `src/app/(admin)/super-admin/template/page.tsx`
- `src/app/(admin)/super-admin/template/page.test.ts`
- `src/app/(admin)/super-admin/template/penggunaan/page.test.ts`
- `src/app/(admin)/super-admin/template/actions.ts`
- `src/app/(admin)/super-admin/template/baru/page.tsx`
- `src/app/(admin)/super-admin/template/[templateId]/page.tsx`
- `src/app/(admin)/super-admin/template/penggunaan/page.tsx`
- `docs/reports/02-super-admin/MANAJEMEN-TEMPLATE-2026-11-20.md`

**Diubah**

- `src/db/schema/index.ts`
- `src/db/migrations/meta/_journal.json`
- `src/features/audit/domain/audit.ts`
- `src/features/multi-desa/presentation/platform-ui.tsx`
- `src/features/navigation/domain/menu-platform.ts`
- `src/features/navigation/domain/menu-platform.test.ts`
- `src/features/navigation/domain/header-platform.ts`
- `src/features/navigation/domain/header-platform.test.ts`
- `src/features/navigation/domain/menu-tampil.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/app/globals.css`
- `src/app/(admin)/super-admin/template/page.tsx` dipindah menjadi
  `src/app/(admin)/super-admin/template/fondasi/page.tsx`.

Tidak ada perubahan pada database pengembangan/produksi dan tidak ada file mockup
publik yang disentuh.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Generate schema/migration | `npm run db:generate` | **PASS** — 152 tabel, “No schema changes, nothing to migrate” |
| Migrasi database disposable | `VISUAL_QA_DATABASE_ACK=1 VISUAL_QA_DATABASE_URL='mysql://root@127.0.0.1:3306/desa_visual_qa_manual_20261120' NODE_ENV=test node scripts/visual-qa/migrate.mjs` | **PASS** — seluruh migration diterapkan |
| Verifikasi seed dan constraint | Query MySQL pada database disposable | **PASS** — `esensi`/`1.0.0`/`published`, `JSON_VALID(tokens)=1`, 3 tag, versi `1.0.0`, 1 foreign key |
| Bersihkan database disposable | `DROP DATABASE desa_visual_qa_manual_20261120` | **PASS** — database uji dihapus |
| Typecheck | `npm run typecheck` | **PASS** |
| Lint | `npm run lint` | **PASS** — 0 error, 2 warning `no-console` lama di `scripts/wilayah/generate-wilayah.mjs` |
| Format | `npm run format:check` | **PASS** |
| Unit test | `set -o pipefail; npm run test:unit` | **PASS** — 235 file, 2.016 test |
| Regresi tautan tenant | `npx vitest run --config vitest.config.mts 'src/app/(admin)/super-admin/template/penggunaan/page.test.ts'` | **PASS** — 1 test, tautan memakai `/super-admin/tenant?q=` |
| Build produksi | `npm run build` | **PASS** — 4 route template terdaftar; 2 warning Turbopack lama (filesystem tracing) |
| Visual login | — | **SKIPPED** — tidak ada sesi login platform di environment ini |

Catatan: percobaan pertama memakai Docker (`npm run visual:qa:db:up`) **FAIL** karena
Docker daemon tidak berjalan. Verifikasi migration kemudian dilakukan pada database
MySQL lokal disposable yang dibuat khusus, bukan database pengembangan.

## 8. Risiko dan keterbatasan

1. **Rendering publik belum mengonsumsi token.** Token dan pratinjau adalah metadata
   katalog; komponen situs publik belum membaca token tersebut. Ini ditandai jujur di
   UI sebagai “pratinjau komposisi”, bukan perubahan situs.
2. **Belum ada alur penugasan template baru ke tenant.** Distribusi hanya memperbarui
   versi tenant yang sudah memakai slug yang sama. Memilih template baru untuk tenant
   memerlukan task terpisah dan keputusan rendering.
3. **Tidak ada unggahan paket tema.** Ini disengaja mengikuti batas keamanan roadmap:
   kode/ZIP dari runtime tidak dieksekusi.
4. **Pratinjau visual dengan login belum diuji.** Build dan unit test lulus, tetapi
   tata letak sebenarnya di browser dengan sesi Super Admin belum diverifikasi.
5. **Race condition update versi.** Unique index mencegah dua baris versi yang sama,
   tetapi dua editor yang menyimpan versi berbeda bersamaan belum diuji.
6. **Tautan "Lihat desa" menuju daftar tenant dengan filter nama.** Konsol belum
   memiliki halaman detail tenant terpisah, sehingga tautan mengarah ke
   `/super-admin/tenant?q=...` yang sudah menerapkan filter pencarian.

## 9. Rekomendasi berikutnya

1. Review diff dan laporan ini sebelum merge.
2. Jika disetujui, task terpisah untuk menghubungkan token tema ke rendering situs
   publik, termasuk cache dan fallback.
3. Task terpisah untuk alur penugasan template ke tenant dan audit perpindahan tema.
4. Visual QA ber-login pada empat halaman setelah database visual siap.

## 10. Kesimpulan

Empat halaman Manajemen Template, registry database, riwayat versi, penggunaan tenant,
distribusi versi, navigasi, audit, test, dan laporan sudah tersedia pada branch task.
Migration berhasil dijalankan pada database disposable dan sudah dihapus kembali.
Pekerjaan belum di-merge dan belum di-deploy.
