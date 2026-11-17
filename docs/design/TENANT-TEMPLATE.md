# Template Tenant Bawaan — Desain Isi v1

> Status: **proposal desain**, 18 November 2026. Dokumen ini **belum diterapkan**:
> `src/db/templates/tenant-template.ts` masih memakai isi minimal (satu role,
> tanpa modul, tanpa menu publik). Penerapan menunggu keputusan maintainer pada §9.

## 1. Tujuan

Menetapkan isi template fondasi tenant yang dipakai `provisionDesa` saat membuat
desa baru, sehingga desa yang di-onboard memiliki role awal, katalog modul, matriks
akses, tema, dan menu publik yang **dapat dipertanggungjawabkan** — bukan warisan
dari desa pertama yang kebetulan ada di database, dan bukan pula katalog kosong
yang memaksa operator menyiapkan semuanya secara manual.

Ruang lingkup dokumen: isi template. Bukan perubahan skema, bukan migration, bukan
perubahan perilaku provisioning.

## 2. Fakta repository yang mengikat desain

| Fakta | Bukti | Konsekuensi desain |
|---|---|---|
| Template divalidasi Zod; role `administrator` wajib ada | `src/features/multi-desa/domain/template-tenant.ts` | Setiap usulan harus lolos `parseTemplateTenant`; administrator tidak boleh dihapus dari daftar. |
| Slug role/modul wajib unik di dalam template, dan unik per `(village_id, slug)` di database | `template-tenant.ts`, `src/db/schema/rbac.ts:40,71` | Tidak boleh ada role/modul duplikat; nama role juga unik per tenant (`roles_village_name_uq`). |
| Akses harus menunjuk role dan modul yang ada di template | `template-tenant.ts` | Matriks akses tidak boleh menyebut slug di luar daftar. |
| Slug modul adalah kunci izin yang dipakai halaman | `src/features/rbac/domain/resources.ts`, `authorization.ts` (`readableResources`) | Slug modul template harus sama dengan `RESOURCES`; kalau tidak, grant tidak pernah cocok dengan pemeriksaan halaman. |
| Hanya `/beranda` halaman admin desa yang ada; seluruh folder fitur lain belum punya `page.tsx` | `find src/app/(admin) -name page.tsx` → 8 berkas: beranda + tujuh halaman super-admin | Modul fitur yang disemai sekarang tidak akan bisa dibuka. |
| Menu menandai rute yang belum ada sebagai nonaktif "Segera", bukan tautan mati | `src/features/navigation/domain/menu-tampil.ts` (`RUTE_ADMIN_TERSEDIA`, `ratakanMenu`), `.admin-nav-pending` di `globals.css` | Menyemai banyak modul sekarang berarti sidebar penuh label "Segera". |
| Daftar kelompok modul bisa tanpa grant; hak baca induk turun dari anak | `applyParentInheritance` di `src/features/rbac/domain/permission.ts` | Grup navigasi tidak perlu grant sendiri; cukup anaknya. |
| `menu_publik` belum dibaca oleh situs publik | `src/app/public-shell.tsx` menerima `navigation` sebagai prop; setiap halaman publik menulis daftar tautan sendiri; `listMenuPublik` hanya dipakai CRUD repository | Menyemai menu publik **belum** mengubah tampilan publik hari ini. |
| Belum ada halaman admin untuk mengelola menu publik | tidak ada rute menu publik di `RUTE_ADMIN_TERSEDIA`; halaman `super-admin/template` hanya menampilkan isi template | Tanpa template, menu publik tenant baru kosong dan belum ada UI untuk mengisinya. |
| Provisioning menulis role, modul, akses, tema, dan menu publik dalam satu transaksi | `src/features/multi-desa/infrastructure/template-tenant-repository.ts` | Penambahan isi template berlaku atomik; gagal di tengah membatalkan seluruh tenant baru. |
| Template tidak boleh memuat data master desa (jenis surat, bumindes, kategori inventaris) | komentar kontrak di `template-tenant.ts` | Usulan hanya berisi fondasi platform + permission. |
| Template memakai tema `esensi`; skema menyebut slug tema lain (`natra`) tetapi tidak ada katalog tema di repo | `tenant-template.ts`, komentar `src/db/schema/theme.ts:33` | v1 tetap `esensi`; memilih atau menyediakan tema lain adalah pekerjaan terpisah. |

## 3. Prinsip desain

1. **Hanya semai yang bisa dipakai.** Template tidak boleh membuat tautan mati atau
   membanjiri sidebar dengan label "Segera". Modul fitur ditambahkan ketika
   halamannya ada.
2. **Slug modul = slug resource.** Satu nama untuk navigasi, izin, dan pengujian.
3. **Least privilege.** Role baru hanya mendapat hak yang jelas diperlukan; hak
   istimewa (pengguna, grup akses, pengaturan) tetap milik `administrator`.
4. **Aditif dan berversi.** Menambah role, modul, atau grant adalah penambahan;
   tidak menulis ulang tenant yang sudah ada. Perubahan struktural menaikkan versi
   template dan disertai migration.
5. **Data kanonik, bukan cermin UI.** Menu publik disemai sebagai data desa yang
   nanti dibaca situs; jangan menyalin daftar hardcoded per halaman ke template.
6. **Tidak ada data pribadi atau data master desa** di template.

## 4. Isi yang diusulkan — v1 (dapat diterapkan sekarang)

```ts
export const TENANT_TEMPLATE = {
  versi: 1,
  sumber: { jenis: "bawaan", villageId: null, dibuatPada: "2026-11-18" },
  roles: [
    { slug: "administrator", name: "Administrator", isSystem: true },
    { slug: "sekretaris", name: "Sekretaris Desa", isSystem: false },
    { slug: "operator", name: "Operator", isSystem: false },
    { slug: "kepala-desa", name: "Kepala Desa", isSystem: false },
  ],
  modules: [
    {
      slug: "beranda",
      name: "Beranda",
      url: "/beranda",
      icon: "⌂",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
      parentSlug: null,
    },
  ],
  akses: [
    { roleSlug: "administrator", moduleSlug: "beranda", access: "manage" },
    { roleSlug: "sekretaris", moduleSlug: "beranda", access: "read" },
    { roleSlug: "operator", moduleSlug: "beranda", access: "read" },
    { roleSlug: "kepala-desa", moduleSlug: "beranda", access: "read" },
  ],
  tema: { slug: "esensi", nama: "Esensi", versi: "1.0.0", opsi: null },
  menuPublik: [
    { nama: "Beranda", link: "/", linkTipe: "internal", aktif: true, urut: 1 },
    { nama: "Profil Desa", link: "/profil", linkTipe: "internal", aktif: true, urut: 2 },
    { nama: "Pemerintahan", link: "/pemerintahan", linkTipe: "internal", aktif: true, urut: 3 },
    { nama: "Layanan", link: "/layanan", linkTipe: "internal", aktif: true, urut: 4 },
    { nama: "Berita", link: "/berita", linkTipe: "internal", aktif: true, urut: 5 },
    { nama: "Agenda", link: "/agenda", linkTipe: "internal", aktif: true, urut: 6 },
    { nama: "Statistik", link: "/statistik", linkTipe: "internal", aktif: true, urut: 7 },
    { nama: "Kontak", link: "/kontak", linkTipe: "internal", aktif: true, urut: 8 },
  ],
} satisfies TemplateTenant;
```

Payload di atas sudah diuji lolos `parseTemplateTenant` (lihat §8).

### 4.1 Role

| Slug | Nama | `isSystem` | Alasan |
|---|---|---|---|
| `administrator` | Administrator | ya | Wajib: dipakai saat membuat akun admin desa; satu-satunya role yang boleh mengelola pengguna dan akses. |
| `sekretaris` | Sekretaris Desa | tidak | Peran tata usaha: menyiapkan data dan persuratan, tetapi tidak menghapus data induk. |
| `operator` | Operator | tidak | Peran input harian kependudukan; sengaja tidak mendapat hak persuratan atau pengaturan. |
| `kepala-desa` | Kepala Desa | tidak | Peran baca untuk pengawasan dan persetujuan; tidak mengubah data. |

`isSystem: false` untuk tiga role baru berarti role tersebut dapat diubah atau
dihapus operator lewat UI pengelolaan akses ketika halaman itu tersedia. Hanya
`administrator` yang dikunci.

Role warga **tidak** dimasukkan: layanan mandiri memakai `residentId`, bukan role
desa (`src/app/(admin)/layout.tsx` mengalihkan pengguna ber-`residentId`).

### 4.2 Modul

Hanya `beranda`. Alasannya:

- Satu-satunya halaman admin desa yang ada.
- `hasPermission` sudah memperlakukan `beranda` sebagai resource yang selalu boleh
  dibaca (`DEFAULT_RESOURCE`), jadi grant ini bukan pembatas, melainkan fondasi agar
  matriks akses punya baris nyata sejak tenant dibuat.
- `AdminSidebar` tetap menampilkan Beranda satu kali karena baris menu dengan URL
  `/beranda` difilter dari daftar modul.

Modul fitur (penduduk, keluarga, surat, IDM, …) **tidak** disemai sekarang karena
belum ada halamannya. Jika disemai, sidebar akan menampilkan belasan label "Segera"
dan matriks akses menjanjikan hak atas halaman yang tidak bisa dibuka.

### 4.3 Menu publik

Delapan tautan dipilih karena **semuanya sudah memiliki halaman publik**:
`/`, `/profil`, `/pemerintahan`, `/layanan`, `/berita`, `/agenda`, `/statistik`,
`/kontak`. Menu publik sengaja datar (tanpa submenu) karena skema template hanya
mendukung menu tingkat atas; submenu memerlukan `parentId` yang belum dimodelkan
di template.

Menyemai sekarang bermanfaat meski belum dirender: tenant baru tidak lagi memiliki
menu publik kosong ketika halaman pengelolaan menu dibuat, dan situs publik dapat
beralih ke menu berbasis data tanpa backfill per desa. Konsekuensinya, sampai
peralihan itu terjadi, daftar ini **belum** memengaruhi navigasi publik dan bisa
menyimpang dari daftar hardcoded per halaman — perbedaan itu harus diselesaikan
saat nav publik dipindahkan ke data.

## 5. Target v2 — matriks role × modul

Diterapkan ketika halaman modul inti sudah ada. Semua slug modul di bawah memakai
nama pada `RESOURCES` agar cocok dengan pemeriksaan izin.

### 5.1 Pohon modul inti

| Grup (tanpa grant) | Slug grup | Anak (slug resource → usulan URL) |
|---|---|---|
| Data Desa | `data-desa` | `profil-desa` → `/desa/profil`, `wilayah` → `/desa/wilayah`, `penduduk` → `/penduduk`, `keluarga` → `/keluarga`, `rumah-tangga` → `/rumah-tangga`, `kelompok` → `/kelompok` |
| Persuratan | `persuratan-utama` | `jenis-surat` → `/persuratan/jenis`, `syarat-surat` → `/persuratan/syarat`, `surat-masuk` → `/persuratan/masuk`, `surat-keluar` → `/persuratan/keluar`, `permohonan-surat` → `/permohonan-surat`, `arsip` → `/persuratan/arsip` |
| IDM | `idm-utama` | `idm` → `/idm`, `idm-sdgs` → `/idm/sdgs` |
| Pengaturan | `pengaturan-utama` | `pengguna` → `/pengaturan/pengguna`, `grup-akses` → `/pengaturan/grup-akses`, `pengaturan-aplikasi` → `/pengaturan/aplikasi`, `menu-publik` → `/pengaturan/menu-publik` |

Slug grup sengaja berbeda dari slug resource mana pun (`persuratan` dan
`pengaturan` sudah dipakai sebagai resource) agar tidak ada tabrakan makna antara
judul navigasi dan izin.

### 5.2 Matriks akses inti

| Modul | administrator | sekretaris | operator | kepala-desa |
|---|---|---|---|---|
| `beranda` | manage | read | read | read |
| `profil-desa` | manage | write | read | read |
| `wilayah` | manage | write | read | read |
| `penduduk` | manage | write | write | read |
| `keluarga` | manage | write | write | read |
| `rumah-tangga` | manage | write | write | read |
| `kelompok` | manage | write | read | read |
| `jenis-surat` | manage | write | read | read |
| `syarat-surat` | manage | write | read | read |
| `surat-masuk` | manage | write | read | read |
| `surat-keluar` | manage | write | read | read |
| `permohonan-surat` | manage | write | write | read |
| `arsip` | manage | write | read | read |
| `idm` | manage | write | read | read |
| `idm-sdgs` | manage | write | read | read |
| `pengguna` | manage | — | — | — |
| `grup-akses` | manage | — | — | — |
| `pengaturan-aplikasi` | manage | — | — | — |
| `menu-publik` | manage | — | — | — |

Aturan yang menyertainya:

- Hanya `administrator` yang memegang `manage` (termasuk hapus) di semua modul.
- `sekretaris` menulis data dan persuratan tetapi tidak menghapus; `operator`
  fokus input kependudukan; `kepala-desa` hanya membaca.
- Hak baca grup diturunkan otomatis dari anaknya, jadi grup tidak diberi grant.
- Modul sensitif (kesehatan/KIA, keuangan, bantuan) **tidak** masuk v2 inti. Saat
  modul itu ditambahkan, matriksnya harus ditetapkan tersendiri dengan prinsip
  least privilege, bukan disalin dari tabel ini.

## 6. Urutan penambahan setelah v1

1. Tambah halaman modul beserta slug resource-nya.
2. Daftarkan path-nya di `RUTE_ADMIN_TERSEDIA` (kalau tidak, menu tetap "Segera").
3. Tambah modul + grant per role ke template, satu kelompok per perubahan agar
   mudah direview.
4. Untuk tenant yang sudah ada, tawarkan penyesuaian lewat **ekspor template →
   review → impor/apply**, bukan migration massal yang menimpa kustomisasi desa.

Tenant yang sudah berjalan **tidak** otomatis berubah saat template diperbarui;
itu keputusan yang disengaja karena desa boleh menyesuaikan role dan menunya.

## 7. Kompatibilitas dan dampak

| Aspek | Dampak |
|---|---|
| Tenant baru | Mendapat 4 role, 1 modul, 4 grant, tema `esensi`, dan 8 menu publik. |
| Tenant lama | Tidak berubah. Tidak diperlukan migration atau backfill. |
| Provisioning | Tetap satu transaksi; jumlah baris bertambah sedikit (4 role + 1 modul + 4 grant + 8 menu). |
| Ekspor template | `platform:export-template` membaca data tenant; isi ekspor otomatis mengikuti data baru. |
| Versi template | `versi` masih `1` karena struktur tidak berubah (masih daftar role/modul/akses/menu yang sama). Menaikkan versi hanya jika bentuk data berubah, misalnya menu publik berjenjang. |
| Keamanan | Tidak ada akun, data pribadi, atau data master desa yang disemai. Semua grant tetap tunduk pada pemeriksaan server-side yang ada. |

## 8. Pengujian yang harus menyertai penerapan

1. `parseTemplateTenant(TENANT_TEMPLATE)` lolos (sudah dibuktikan pada proposal ini:
   1 unit test sementara, 1 test lulus, berkas uji dihapus setelah validasi).
2. Setiap URL modul ada di `RUTE_ADMIN_TERSEDIA` **atau** modul ditandai
   `isActive: false` — mencegah sidebar "Segera" yang tidak disengaja.
3. Setiap role punya minimal satu grant; `administrator` memegang `manage`.
4. Setiap menu publik bertipe `internal` menunjuk path yang benar-benar ada di
   direktori publik (`/`, `/profil`, `/pemerintahan`, `/layanan`, `/berita`,
   `/agenda`, `/statistik`, `/kontak`).
5. Integration test provisioning: desa baru memiliki tepat 4 role, 1 modul,
   8 baris menu publik, tema aktif tunggal, dan tidak membawa data dari desa lain.
6. Unit test negatif: template dengan role tanpa grant atau modul dengan URL tak
   terdaftar ditolak oleh pemeriksaan baru di (2) dan (3).

## 9. Keputusan yang menunggu maintainer

1. **Set role v1.** Usulan: `administrator`, `sekretaris`, `operator`,
   `kepala-desa`. Alternatif konservatif: hanya `administrator` sampai matriks
   v2 ditetapkan, lalu tambah tiga role lain sekaligus dengan grant-nya.
2. **Nama tampilan role.** "Sekretaris Desa" dan "Kepala Desa" dipilih agar cocok
   dengan istilah pemerintahan desa; nama ini unik per tenant dan tidak bisa
   diduplikasi tanpa mengubah data.
3. **Menu publik v1.** Usulan: semai delapan tautan sekarang. Alternatif: tetap
   kosong sampai situs publik membaca `menu_publik`, agar tidak ada dua sumber
   kebenaran navigasi.
4. **Kapan v2 diterapkan.** Usulan: per kelompok modul setelah halaman dan
   `RUTE_ADMIN_TERSEDIA` siap, dimulai dari Data Desa.

## 10. Rujukan

- `src/db/templates/tenant-template.ts` — isi template saat ini.
- `src/features/multi-desa/domain/template-tenant.ts` — skema dan aturan validasi.
- `src/features/multi-desa/infrastructure/template-tenant-repository.ts` — penerapan transaksional.
- `src/features/rbac/domain/resources.ts` — katalog slug resource.
- `src/features/rbac/domain/permission.ts` — tingkat akses dan warisan grup.
- `src/features/navigation/domain/menu-tampil.ts` — ketersediaan rute admin.
- `src/db/schema/rbac.ts`, `src/db/schema/content.ts` — constraint role/modul/menu.
- `docs/MASTER_ROADMAP.md` §Fase 2–3, `docs/SID_FEATURE_MAP.md`,
  `docs/design/ADMIN-PLATFORM-DESIGN.md`.
