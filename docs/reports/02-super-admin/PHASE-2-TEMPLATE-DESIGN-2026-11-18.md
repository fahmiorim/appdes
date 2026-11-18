# Fase 2 — Desain Isi Template Tenant Bawaan

- **Task:** merancang isi template fondasi tenant (role, modul, matriks akses, menu publik) sebelum onboarding desa nyata.
- **Tanggal:** 18 November 2026
- **Branch:** `docs/tenant-template-design`
- **Base commit:** `60fe8140b15376faab2d2023114c10d0c4e227b3` (`origin/main`)
- **Jenis perubahan:** dokumentasi desain saja. `src/db/templates/tenant-template.ts` **tidak** diubah.

## 1. Kondisi awal

Template bawaan di `main` sengaja minimal:

```ts
roles: [{ slug: "administrator", name: "Administrator", isSystem: true }],
modules: [],
akses: [],
menuPublik: [],
```

Roadmap mencatat "tinjau template bawaan yang masih minimal sebelum onboarding tenant nyata" sebagai validasi Fase 2 yang masih terbuka, tanpa menetapkan isi yang diinginkan. Belum ada dokumen yang menjelaskan role mana yang harus ada, modul mana yang boleh disemai, dan bagaimana menu publik awal dibentuk.

## 2. Analisis

Isi template tidak bisa ditentukan dari daftar fitur saja; ada empat pembatas teknis yang ditemukan di kode:

1. **Halaman admin desa baru satu.** `find src/app/(admin) -name page.tsx` menghasilkan 8 berkas: `/beranda` dan tujuh halaman super-admin. Seluruh folder fitur lain (penduduk, keluarga, persuratan, IDM, keuangan, …) belum memiliki `page.tsx`.
2. **Menu menandai rute yang belum ada sebagai "Segera".** `ratakanMenu` memakai `RUTE_ADMIN_TERSEDIA`, sehingga modul tanpa halaman tidak menjadi tautan mati — tetapi akan memenuhi sidebar dengan label nonaktif jika disemai terlalu banyak.
3. **Slug modul adalah kunci izin.** `readableResources` mencocokkan slug modul dengan `RESOURCES`; slug template yang tidak sama dengan resource halaman tidak akan pernah memberi akses.
4. **Menu publik belum dipakai situs.** `PublicShell` menerima daftar navigasi sebagai prop dan setiap halaman publik menulis tautannya sendiri; `listMenuPublik` baru dipakai CRUD. Menyemai menu publik tidak mengubah tampilan hari ini, tetapi menyiapkan data kanonik.

## 3. File yang diperiksa

- `src/db/templates/tenant-template.ts`
- `src/features/multi-desa/domain/template-tenant.ts` dan `.test.ts`
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts`
- `src/features/multi-desa/application/template-ekspor.test.ts`
- `src/features/rbac/domain/resources.ts`, `permission.ts`, `src/features/rbac/application/authorization.ts`
- `src/features/navigation/domain/menu-tampil.ts`, `application/get-menu.ts`, `application/build-menu.ts`
- `src/components/shell/admin-sidebar.tsx`
- `src/db/schema/rbac.ts`, `src/db/schema/content.ts`, `src/db/schema/theme.ts`
- `src/app/public-shell.tsx` dan halaman publik di `src/app/`
- `src/app/(admin)/layout.tsx`
- `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md`, `docs/deployment/STAGING.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `docs/design/TENANT-TEMPLATE.md` | Dokumen desain baru: fakta pembatas, prinsip, payload v1, matriks role × modul v2, dampak, pengujian, dan keputusan terbuka. |

Tidak ada perubahan kode, skema, migration, atau data.

## 5. Hasil desain (ringkas)

- **v1 (dapat diterapkan sekarang):** 4 role (`administrator` sistem, `sekretaris`, `operator`, `kepala-desa`), 1 modul (`beranda`), 4 grant, tema `esensi`, dan 8 menu publik yang seluruh tautannya sudah punya halaman (`/`, `/profil`, `/pemerintahan`, `/layanan`, `/berita`, `/agenda`, `/statistik`, `/kontak`).
- **v2 (setelah halaman modul inti ada):** pohon modul Data Desa, Persuratan, IDM, dan Pengaturan dengan slug mengikuti `RESOURCES`, serta matriks least privilege: hanya `administrator` memegang `manage`, `sekretaris` menulis data/persuratan, `operator` menulis kependudukan, `kepala-desa` membaca.
- Modul sensitif (kesehatan/KIA, keuangan, bantuan) dan modul opsional sengaja di luar v2 inti dan harus punya matriks tersendiri.
- Template tidak menyemai akun, data pribadi, atau data master desa (jenis surat, bumindes, kategori inventaris), sesuai kontrak di `template-tenant.ts`.

## 6. Security dan tenant

- Dokumen tidak memuat secret, kredensial, atau data pribadi.
- Usulan tidak menambah jalur otorisasi baru; seluruh grant tetap diperiksa server-side oleh `hasPermission`/`readableResources`.
- Least privilege dijadikan aturan eksplisit: hak hapus (`manage`) tetap hanya pada `administrator`.
- Risiko penyalahgunaan role baru (mis. `kepala-desa` mendapat hak tulis) dinyatakan sebagai hal yang harus ditolak pada review.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| Unit test sementara `parseTemplateTenant(USULAN)` di `src/features/multi-desa/domain/tmp-usulan-template.test.ts` | **PASS** — 1 berkas, 1 test lulus; berkas sementara dihapus setelah validasi dan tidak ikut commit |
| `npx prettier --write` + `npm run format:check` pada dokumen | **PASS** |
| `npm run typecheck`, `npm run build`, unit test penuh | **SKIPPED** — tidak ada source code yang berubah |

## 8. Risiko dan keterbatasan

- Usulan role v1 adalah keputusan produk: nama, jumlah, dan pembagian tugas perlu persetujuan maintainer sebelum diterapkan.
- Menu publik v1 belum dirender situs. Sampai navigasi publik membaca `menu_publik`, ada dua sumber kebenaran (template dan daftar hardcoded per halaman) yang harus disatukan pada task terpisah.
- Matriks v2 bergantung pada URL modul yang belum dibuat; path yang diusulkan (`/persuratan/masuk`, `/idm/sdgs`, dst.) baru mengikat setelah halaman dan `RUTE_ADMIN_TERSEDIA` diperbarui.
- Belum ada uji integrasi provisioning untuk isi template baru karena template belum diubah.

## 9. Kesimpulan dan langkah berikutnya

Desain isi template tersedia dan payload v1 sudah terbukti lolos skema. Langkah berikutnya: maintainer memilih set role dan keputusan menu publik pada §9 dokumen desain, lalu penerapan dilakukan sebagai task terpisah yang menyertakan unit test (URL modul terdaftar, setiap role punya grant, menu publik menunjuk rute nyata) dan integration test provisioning.
