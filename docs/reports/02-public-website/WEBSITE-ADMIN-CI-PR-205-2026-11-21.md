# Perbaikan CI PR #205 — Website Desa Management

- **Task:** memperbaiki kegagalan check PR #205 (`feat(admin): complete Website Desa management`).
- **Tanggal:** 21 November 2026.
- **Branch:** `codex/website-admin-complete-main`.
- **Base commit PR:** `main` @ `02f8695`.
- **Head sebelum perbaikan:** `d3300cc222bad859c98532a01150131f04b45b94`.

## Kondisi awal

Run CI `44640098103` dan `44640098063` gagal pada empat check:

| Check | Status awal | Penyebab |
|---|---|---|
| Build produksi | FAIL | type error pada data website admin |
| Unit test dan quality check | FAIL | 13 file belum diformat Prettier |
| Visual QA login (desktop/mobile) | FAIL | type error yang sama |
| Ringkasan CI | FAIL | agregasi kegagalan di atas |

`npm run lint` juga menghasilkan 3 error pada file PR ini, dan `npm run test:unit`
gagal pada 4 test (batas lapisan, paritas migrasi, dan layout publik).

## Analisis akar masalah

1. **Tuple `Promise.all` bergeser.** `getWebsiteDashboardData` mendestrukturisasi
   12 nama dari 15 query: dua query kategori berita duplikat dan satu query foto
   yang tidak dipakai. Akibatnya `album`, `menu`, `temaAktif`, dan statistik
   kunjungan menerima hasil query yang salah. `getWebsiteContentData` sebaliknya
   mendestrukturisasi 7 nama dari hanya 6 query, sehingga `photos`, `agenda`, dan
   `categories` menjadi `undefined`/bertipe salah.
2. **Batas lapisan dilanggar.** Route `website/actions.ts` mengimpor `@/db` dan
   schema secara langsung, route `halaman/[slug]` dan `public-site-layout`
   mengimpor repository infrastructure, dan use case `website-admin.ts`
   mengimpor `@/db`. Guard `lapisan-publik.test.ts` menolak ketiganya.
3. **Snapshot migrasi 0020 tidak ada.** Journal mencatat
   `0020_website_desa_menu`, tetapi `meta/0020_snapshot.json` belum dibuat,
   sehingga `migrasi-paritas.test.ts` gagal.
4. **Header publik menjadi async.** `PublicSiteHeader` kini membaca menu tenant,
   sehingga `renderToStaticMarkup` pada test layout memicu Suspense tanpa
   boundary.
5. **Lint.** Dua import tak terpakai di `website/halaman/page.tsx` dan satu
   `<a href="/">` yang seharusnya `next/link`.

## File yang diubah

| File | Alasan |
|---|---|
| `src/features/publik/infrastructure/website-admin-repository.ts` (baru) | memindahkan seluruh akses `db` modul website admin ke infrastructure; semua query difilter `villageId` |
| `src/features/publik/application/website-admin.ts` | use case membaca lewat repository; susunan tuple diperbaiki |
| `src/features/publik/application/website-admin-actions.ts` (dari `src/app/(admin)/website/actions.ts`) | server action dipindah ke lapisan application agar route tidak menyentuh `db`/infrastructure |
| `src/app/(admin)/website/{page,konten,dokumen,halaman,pengaturan}/page.tsx` | import action dari lapisan application; hapus import tak terpakai |
| `src/app/public-site-layout.tsx` | menu tenant dibaca lewat use case application |
| `src/app/halaman/[slug]/page.tsx` | memakai use case application; breadcrumb memakai `next/link` |
| `src/app/public-site-layout.test.ts` | menunggu komponen server async dan mem-mock pembacaan menu (assertion tidak diubah) |
| `src/db/migrations/meta/0020_snapshot.json` (baru) | snapshot paritas migrasi 0020 (identik dengan 0019 karena migrasi hanya backfill data) |
| 13 file lain (CSS, shell, halaman) | hanya diformat Prettier sesuai tuntutan CI |

Tidak ada perubahan schema, migration SQL, atau perilaku bisnis baru.

## Security / tenant

- Setiap fungsi repository baru menyertakan `villageId` pada `where`, termasuk
  operasi update/delete, sehingga id milik tenant lain tidak dapat dibaca atau
  diubah.
- Pemeriksaan foreign reference (halaman statis tujuan menu, album foto,
  kategori berita, menu induk) tetap dibatasi tenant yang sama seperti sebelumnya.
- Permission server-side (`requirePermission`) dan resolusi tenant
  (`resolveVillageId`) tidak berubah.

## Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 2 warning lama di `scripts/wilayah/generate-wilayah.mjs` |
| `npm run format:check` | PASS |
| `npm run test:unit` | PASS — 233 file, 2.009 test |
| `npm run build` | PASS |

Validasi integration dan Visual QA dijalankan oleh CI; hasilnya dicatat pada
komentar PR/run setelah push.

## Risiko tersisa

- Migrasi `0020` hanya berisi backfill idempoten; snapshot disalin dari `0019`
  karena tidak ada perubahan DDL. Bila `db:generate` dijalankan ulang, pastikan
  tidak menghasilkan diff tak terduga.
- Perilaku header publik sekarang membaca menu tenant pada setiap permintaan
  (sudah demikian sebelum perbaikan); biaya query tambahan per halaman belum
  diukur.
- Visual QA bergantung pada seed database CI; belum diverifikasi lokal.

## Kesimpulan

Kegagalan CI berasal dari satu kesalahan susunan query yang menjalar ke tipe,
ditambah pelanggaran batas lapisan dan artefak migrasi yang belum lengkap.
Perbaikan bersifat terfokus pada modul website admin; status: siap review.
