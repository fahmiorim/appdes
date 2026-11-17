# Fase 2 — Penerapan Template Fondasi Tenant v1

- **Task:** menerapkan isi template tenant v1 (role, modul, matriks akses, tema, menu publik) beserta unit test dan integration test provisioning.
- **Tanggal:** 18 November 2026
- **Branch:** `task/tenant-template-v1`
- **Base commit:** `a60fe05` (desain template, di atas `60fe814` / `origin/main`)
- **Commit hasil kode:** `9a88f17`
- **Jenis perubahan:** data template, test guard, perluasan integration test, penyesuaian dokumen desain. Tidak ada perubahan skema, migration, atau alur provisioning.

## 1. Kondisi awal

Template bawaan di `main` sengaja minimal:

```ts
roles: [{ slug: "administrator", name: "Administrator", isSystem: true }],
modules: [],
akses: [],
menuPublik: [],
```

Desain v1 sudah ditulis di `docs/design/TENANT-TEMPLATE.md` (commit `a60fe05`) tetapi belum diterapkan: desa baru tetap tanpa modul dan tanpa menu publik, sehingga operator harus menyiapkan role, akses, dan navigasi manual setelah onboarding.

## 2. Analisis

Isi template adalah data yang diketik tangan, jadi kesalahan isinya tidak tertangkap typecheck. Tiga kelas kesalahan yang perlu dicegah:

1. Modul menunjuk rute yang belum punya `page.tsx` → sidebar penuh label "Segera" atau tautan mati pada tenant baru.
2. Role tanpa grant, atau role non-administrator memegang `manage` → pelanggaran least privilege yang tidak terlihat di UI.
3. Menu publik menunjuk path yang tidak ada → tautan 404 di situs desa.

Karena skema `templateTenantSchema` tidak (dan tidak seharusnya) mengetahui isi filesystem atau katalog RBAC, pemeriksaan tersebut ditulis sebagai test guard, bukan sebagai fungsi validasi produksi baru. Integration test provisioning diperluas agar membuktikan hasil nyata di database: role, modul, matriks grant, menu, tema, dan tidak ada warisan dari desa lain.

## 3. File yang diperiksa

- `src/features/multi-desa/domain/template-tenant.ts` — skema, `ROLE_ADMINISTRATOR`, `urutkanModulIndukDulu`.
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts` — `tulisFondasiTenant` (satu transaksi).
- `src/features/multi-desa/infrastructure/provisioning-repository.ts` — `provisionDesa`.
- `src/features/rbac/domain/resources.ts`, `permission.ts`, `application/authorization.ts` — slug resource, `ACCESS_LEVELS`, `DEFAULT_RESOURCE`.
- `src/features/navigation/domain/menu-tampil.ts` — `RUTE_ADMIN_TERSEDIA`, `ruteTersedia`.
- `src/db/schema/rbac.ts`, `src/db/schema/content.ts`, `src/db/schema/theme.ts` — constraint role/modul/menu/tema.
- `src/app/public-shell.tsx` dan halaman publik — untuk memastikan path menu benar-benar ada.
- `src/testing/migrasi-uji.ts`, `src/testing/db-test-guard.ts`, `scripts/integration-test-map.json`.

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/db/templates/tenant-template.ts` | Mengisi template v1: 4 role, modul `beranda`, 4 grant, tema `esensi`, 8 menu publik; komentar aturan isi diperbarui. |
| `src/features/multi-desa/domain/template-tenant.test.ts` | Menambah describe guard "template bawaan yang dikirim" (role, grant, rute admin, keberadaan `page.tsx` menu publik). |
| `src/features/multi-desa/provisioning-template.integration.test.ts` | Assertion diperluas: 4 role, modul `beranda` saja, matriks grant, 8 menu publik berurutan, tema `esensi`; fixture desa sumber dibuat "kaya" agar warisan konfigurasi terdeteksi. |
| `docs/design/TENANT-TEMPLATE.md` | Status menjadi **diterapkan**; §8 diubah dari rencana menjadi daftar pengujian yang benar-benar dijalankan; §9 mencatat keputusan yang diambil. |

## 5. Perubahan

- Template v1:
  - Role: `administrator` (`isSystem: true`), `sekretaris`, `operator`, `kepala-desa`.
  - Modul: hanya `beranda` (`/beranda`), karena satu-satunya halaman admin desa yang ada dan sudah terdaftar di `RUTE_ADMIN_TERSEDIA`.
  - Grant: `administrator:manage`, tiga role lain `read` pada `beranda`.
  - Tema: `esensi` v1.0.0.
  - Menu publik: Beranda, Profil Desa, Pemerintahan, Layanan, Berita, Agenda, Statistik, Kontak (urut 1–8, semuanya `internal` dan punya `page.tsx`).
- Test guard pada template yang benar-benar dikirim (bukan salinan fixture):
  - `administrator` satu-satunya role `isSystem`;
  - setiap role punya minimal satu grant dan hanya `administrator` memegang `manage`;
  - setiap modul aktif menunjuk rute yang terdaftar di `RUTE_ADMIN_TERSEDIA`;
  - nama menu unik, `urut` menaik, dan setiap tautan internal punya berkas `src/app/**/page.tsx`.
- Integration test provisioning memeriksa hasil di database, termasuk bahwa modul desa sumber (`khusus-sumber`) dan tema desa sumber tidak ikut terbawa.

## 6. Security/tenant

- Tidak ada perubahan pada resolusi tenant, sesi, atau otorisasi. Grant template tetap tunduk pada pemeriksaan server-side yang sudah ada (`hasPermission`).
- Foreign reference provisioning tidak berubah: seluruh baris ditulis dengan `villageId` desa baru di dalam satu transaksi.
- Tidak ada data pribadi, NIK, atau kredensial yang disemai oleh template; akun admin tetap dibuat dari input provisioning.
- Integration test berjalan hanya pada `desa_test` (loopback, `NODE_ENV=test`, `TEST_DATABASE_ACK=1`, DSN valid sama untuk `DATABASE_URL` dan `TEST_DATABASE_URL`).
- Catatan risiko terbuka: menu publik kini bersumber dari data, tetapi situs publik **belum** membacanya, sehingga untuk sementara ada dua daftar (template vs hardcoded per halaman). Peralihan nav publik ke `menu_publik` adalah task terpisah.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --write` (3 berkas) lalu `npm run format:check` | PASS — "All matched files use Prettier code style!" |
| `npx eslint` (3 berkas) dan `npm run lint` | PASS — tanpa temuan |
| `npm run typecheck` | PASS — `next typegen && tsc --noEmit` tanpa error |
| `npx vitest run src/features/multi-desa/domain/template-tenant.test.ts` | PASS — 15 test |
| `npm run test:unit` | PASS — 214 berkas, 1880 test |
| `npx vitest run src/features/multi-desa/provisioning-template.integration.test.ts --config vitest.integration.config.mts` (DB `desa_test`, `NODE_ENV=test`, `TEST_DATABASE_ACK=1`) | PASS — 3 test, target `desa_test @ 127.0.0.1` |
| `npm run build` | SKIPPED — tidak dijalankan pada task ini |

Tidak ada test yang dinonaktifkan, assertion yang dihapus, atau `any` yang ditambahkan.

## 8. Risiko tersisa

- `npm run build` belum dijalankan setelah perubahan ini; perubahan hanya menyentuh data template dan test, tetapi build tetap perlu dijalankan di CI.
- Menu publik v1 belum dirender situs publik; sampai nav publik dipindahkan ke `menu_publik`, template dan daftar hardcoded per halaman dapat menyimpang.
- Modul fitur (penduduk, surat, IDM, …) sengaja belum disemai; v2 menunggu halaman dan `RUTE_ADMIN_TERSEDIA` tersedia.
- Template ini baru diuji pada database uji disposable, belum pada tenant produksi.

## 9. Kesimpulan

Template fondasi tenant v1 diterapkan dan dijaga test, sehingga desa baru tidak lagi bergantung pada konfigurasi desa pertama atau pada penyiapan manual operator. Langkah berikutnya: memindahkan navigasi situs publik ke `menu_publik` agar tidak ada dua sumber kebenaran, lalu memperluas template per kelompok modul saat halamannya tersedia.
