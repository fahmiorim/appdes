# Template Tenant Bawaan — Desain Isi v1

> Status: **diterapkan**; desain v1 diperbarui 19 November 2026 dan direkonsiliasi
> 23 November 2026. Isi template sudah ada di
> `src/db/templates/tenant-template.ts` dan dijaga unit test di
> `src/features/multi-desa/domain/template-tenant.test.ts` serta integration test
> `src/features/multi-desa/provisioning-template.integration.test.ts`.
> Per 23 November 2026 template berisi 4 role, 33 modul, dan 102 grant, dengan 8
> menu publik. Bagian §4–§5 dipertahankan sebagai catatan keputusan desain v1
> dan rencana v2, bukan inventaris modul terkini; daftar aktual ada di file
> template dan dijaga test. `getNavPublik` dipakai 5 halaman (lihat §4.3).

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
| Halaman di route group `(admin)`: 89 halaman non-super-admin dan 13 halaman `/super-admin`; `RUTE_ADMIN_TERSEDIA` berisi 65 entri | `git ls-tree -r --name-only HEAD` → 102 `page.tsx` di `src/app/(admin)`; `RUTE_ADMIN_TERSEDIA` di `menu-tampil.ts` | Template kini menyemai 33 modul, jadi jumlah halaman tidak lagi menjadi batas lima modul v1. Jumlah route tidak menjamin CRUD lengkap; lihat §4.2 dan inventaris modul. |
| Menu menandai rute yang belum ada sebagai nonaktif "Segera", bukan tautan mati | `src/features/navigation/domain/menu-tampil.ts` (`RUTE_ADMIN_TERSEDIA`, `ratakanMenu`), `.admin-nav-pending` di `globals.css` | Menyemai banyak modul sekarang berarti sidebar penuh label "Segera". |
| Daftar kelompok modul bisa tanpa grant; hak baca induk turun dari anak | `applyParentInheritance` di `src/features/rbac/domain/permission.ts` | Grup navigasi tidak perlu grant sendiri; cukup anaknya. |
| `menu_publik` dibaca oleh situs publik melalui `getNavPublik` | `src/features/publik/application/nav-publik.ts`; 5 halaman memanggilnya: `/dokumen`, `/pengaduan`, `/pengaduan/baru`, `/pengaduan/berhasil`, dan `/pengaduan/lacak` | Menyemai menu publik hanya memengaruhi 5 halaman tersebut; halaman publik lain (termasuk beranda, berita, profil, agenda, layanan, dan kontak) masih menulis daftar tautan sendiri sampai peralihan selesai. |
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

## 4. Isi yang diterapkan

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
    {
      slug: "penduduk",
      name: "Data Penduduk",
      url: "/penduduk",
      icon: "▤",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 3,
      parentSlug: null,
    },
    {
      slug: "pengaturan",
      name: "Pengaturan",
      url: null,
      icon: "⚙",
      isGroup: true,
      isHidden: false,
      isActive: true,
      sortOrder: 2,
      parentSlug: null,
    },
    {
      slug: "pengguna",
      name: "Pengguna & Hak Akses",
      url: "/pengaturan/pengguna",
      icon: "",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
      parentSlug: "pengaturan",
    },
    {
      slug: "grup-akses",
      name: "Grup Akses",
      url: "/pengaturan/grup-akses",
      icon: "",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 2,
      parentSlug: "pengaturan",
    },
  ],
  akses: [
    { roleSlug: "administrator", moduleSlug: "beranda", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "penduduk", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "pengaturan", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "pengguna", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "grup-akses", access: "manage" },
    { roleSlug: "sekretaris", moduleSlug: "beranda", access: "read" },
    { roleSlug: "sekretaris", moduleSlug: "penduduk", access: "read" },
    { roleSlug: "operator", moduleSlug: "beranda", access: "read" },
    { roleSlug: "operator", moduleSlug: "penduduk", access: "read" },
    { roleSlug: "kepala-desa", moduleSlug: "beranda", access: "read" },
    { roleSlug: "kepala-desa", moduleSlug: "penduduk", access: "read" },
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

Payload di atas adalah isi yang sekarang dikirim `provisionDesa`, dan dijaga test
(lihat §8).

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

Bagian ini mencatat keputusan v1: lima modul disemai karena halamannya sudah
ada — `beranda`, `penduduk`, grup `pengaturan`, `pengguna`, dan `grup-akses`.
Template per 23 November 2026 sudah diperluas menjadi 33 modul; daftar aktual
ada di `src/db/templates/tenant-template.ts`. Alasan v1 di bawah tetap menjadi
kriteria: modul yang disemai harus punya halaman dan grant.

- Setiap URL modul aktif sudah terdaftar di `RUTE_ADMIN_TERSEDIA`, sehingga
  sidebar tidak menampilkan label "Segera" atau tautan mati.
- `hasPermission` memperlakukan `beranda` sebagai resource yang selalu boleh
  dibaca (`DEFAULT_RESOURCE`); grant lain mengikuti `RESOURCES` yang diperiksa
  halaman.
- `AdminSidebar` menampilkan Beranda satu kali karena baris menu dengan URL
  `/beranda` difilter dari daftar modul; `pengguna` dan `grup-akses` dirender di
  bawah grup `pengaturan`.

Modul yang halamannya belum ada (keluarga, IDM, …) **tetap tidak** disemai.
Jika disemai, sidebar akan menampilkan belasan label "Segera" dan matriks akses
menjanjikan hak atas halaman yang tidak bisa dibuka. Matriks target untuk modul
tersebut ada di §5.

Snapshot 19 November 2026 mencatat lima halaman baca-saja Admin Desa di luar
lima modul v1: `/keuangan`, `/konten/berita`, `/konten/galeri`,
`/persuratan/surat`, dan `/pengaduan-admin`. Per 23 November 2026 kelima area itu
sudah memiliki modul dan grant, bersama modul inventaris, kepegawaian, pelayanan
publik, dan laporan statistik. Modul/grant hanya membuka akses sisi server;
kedalaman alur tulis per halaman tetap dibaca dari inventaris modul. Modul yang
halamannya belum ada tetap tidak disemai, dan halaman yang memeriksa resource di
luar grant template tetap dapat ditolak 403 sampai modul/grant ditambahkan.

### 4.3 Menu publik

Delapan tautan dipilih karena **semuanya sudah memiliki halaman publik**:
`/`, `/profil`, `/pemerintahan`, `/layanan`, `/berita`, `/agenda`, `/statistik`,
`/kontak`. Menu publik sengaja datar (tanpa submenu) karena skema template hanya
mendukung menu tingkat atas; submenu memerlukan `parentId` yang belum dimodelkan
di template.

Situs publik kini membaca menu ini melalui `getNavPublik` di 5 halaman:
`/dokumen`, `/pengaduan`, `/pengaduan/baru`, `/pengaduan/berhasil`, dan
`/pengaduan/lacak`. Halaman publik lain, termasuk beranda, berita, profil,
agenda, layanan, dan kontak, masih menulis daftar tautannya sendiri, sehingga
perubahan menu dapat menyimpang di halaman-halaman itu sampai peralihan selesai.
Halaman pengelolaan menu publik belum ada di
`RUTE_ADMIN_TERSEDIA`.

## 5. Target v2 — matriks role × modul

Diterapkan bertahap ketika halaman modul inti sudah ada. Sebagian sudah diterapkan
lebih awal pada 19 November (`penduduk`, `pengguna`, `grup-akses`); tabel di bawah
adalah target untuk modul yang belum memiliki halaman. Semua slug memakai nama
pada `RESOURCES` agar cocok dengan pemeriksaan izin.

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
| Tenant baru | Mendapat 4 role, 33 modul, 102 grant, tema `esensi`, dan 8 menu publik. |
| Tenant lama | Tidak berubah. Tidak diperlukan migration atau backfill. |
| Provisioning | Tetap satu transaksi; jumlah baris bertambah sedikit (4 role + 33 modul + 102 grant + 8 menu). |
| Ekspor template | `platform:export-template` membaca data tenant; isi ekspor otomatis mengikuti data baru. |
| Versi template | `versi` masih `1` meski daftar modul bertambah; kenaikan versi hanya diperlukan bila **bentuk** data berubah, misalnya menu publik berjenjang. |
| Keamanan | Tidak ada akun, data pribadi, atau data master desa yang disemai. Semua grant tetap tunduk pada pemeriksaan server-side yang ada. |

## 8. Pengujian yang menyertai penerapan

Pemeriksaan isi template dijalankan sebagai **test guard**, bukan sebagai fungsi
validasi produksi baru. Template adalah data yang diketik tangan; typecheck tidak
menangkap modul yang menunjuk rute belum ada atau role yang tidak punya grant.
Butir di bawah ini tercatat sudah dijalankan dan lulus pada pekerjaan sebelumnya;
rekonsiliasi dokumen 23 November 2026 tidak menjalankan integration test MySQL.

1. `parseTemplateTenant(TENANT_TEMPLATE)` lolos.
2. Setiap URL modul aktif ada di `RUTE_ADMIN_TERSEDIA` — mencegah sidebar
   "Segera" atau tautan mati pada tenant baru.
3. Setiap role punya minimal satu grant; hanya `administrator` memegang `manage`;
   `administrator` satu-satunya role `isSystem`.
4. Setiap menu publik bertipe `internal` menunjuk `src/app/**/page.tsx` yang
   benar-benar ada; nama menu unik dan `urut` menaik.
5. Integration test provisioning (`desa_test`): desa baru memiliki tepat 4 role,
   modul yang sama dengan `TENANT_TEMPLATE`, matriks grant `beranda` (administrator
   `manage`, role lain `read`), 8 baris menu publik, satu tema aktif `esensi`, dan
   tidak membawa role/modul desa sumber. Grant modul lain belum diassert satu per
   satu oleh integration test; unit test menjaga setiap role punya grant dan hanya
   `administrator` memegang `manage`.
6. Skema tetap menolak template tanpa role `administrator`, slug ganda, grant ke
   role/modul di luar template, dan induk modul yang tidak ada.

Catatan: butir 2–4 tidak dapat ditulis sebagai aturan skema karena bergantung pada
isi filesystem dan katalog RBAC, yang bukan urusan `templateTenantSchema`.

## 9. Keputusan yang diambil saat penerapan

1. **Set role v1:** `administrator`, `sekretaris`, `operator`, `kepala-desa`.
   Alternatif konservatif (hanya `administrator`) ditolak karena membuat desa baru
   bergantung pada operator yang harus membuat semua role sebelum bisa bekerja.
2. **Nama tampilan role:** "Sekretaris Desa" dan "Kepala Desa", sesuai istilah
   pemerintahan desa. Nama unik per tenant.
3. **Menu publik v1:** delapan tautan disemai sekarang. Situs publik membaca
   `menu_publik` melalui `getNavPublik` di 5 halaman (`/dokumen` dan empat route
   pengaduan); halaman publik lain masih menulis daftar tautannya sendiri dan
   perlu diselaraskan agar tidak ada dua sumber kebenaran.
4. **Kapan v2 diterapkan:** per kelompok modul setelah halaman dan
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
