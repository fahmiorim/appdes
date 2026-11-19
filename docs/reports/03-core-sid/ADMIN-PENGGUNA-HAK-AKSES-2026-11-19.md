# ADMIN-PENGGUNA — Manajemen Pengguna & Hak Akses

- **Tanggal:** 19 November 2026
- **Branch:** `task/admin-pengguna`
- **Base commit:** `d62526b` (branch `task/admin-beranda`)
- **Commit implementasi:** `e22d960` (modul), `b3ec7c0` (menu sidebar)
- **Status:** Selesai secara lokal, siap review. Belum di-push.

## Tujuan

Membangun modul Manajemen Pengguna & Hak Akses untuk Admin Desa dengan data
nyata dan use case yang sudah ada:

- Daftar pengguna dengan pencarian, filter role/status, dan paginasi.
- Tambah, ubah, dan hapus akun pengguna.
- Daftar grup akses (role) desa, anggota, serta editor matriks izin.
- Ringkasan statistik akun dan log aktivitas desa.

## Kondisi awal

Shell Admin Desa sudah ada dari pekerjaan beranda (`d62526b`), tetapi belum
memiliki halaman pengguna maupun grup akses. Backend `pengguna-use-cases` dan
`grup-use-cases` sudah tersedia, termasuk audit dan pemeriksaan tenant. Yang
belum ada adalah lapisan presentasi yang memakai use case tersebut.

`users.active` hanya memodelkan aktif/nonaktif. Tidak ada status "diblokir"
terpisah, sehingga KPI "Diblokir" pada mockup tidak dibuat dan tidak diisi
angka palsu.

## File yang diperiksa

- `src/features/pengguna/application/pengguna-use-cases.ts`
- `src/features/pengguna/infrastructure/pengguna-repository.ts`
- `src/features/pengguna/domain/pengguna.ts`
- `src/features/rbac/application/grup-use-cases.ts`
- `src/features/rbac/infrastructure/rbac-repository.ts`
- `src/features/rbac/domain/role.ts`, `resources.ts`, `grup.ts`
- `src/features/audit/application/audit-use-cases.ts`
- `src/lib/dal.ts`, `src/lib/action-state.ts`
- `src/features/dashboard/domain/aktivitas.ts`, `waktu-relatif.ts`
- `src/features/navigation/domain/menu-tampil.ts`
- Mockup `docs/mockups/village/User Management & Access Dashboard.png`
- `docs/reports/05-ui-audit/REVIEW-MOCKUP-ADMIN-DESA-2026-11-19.md`

## File yang diubah

### Baru

| File | Alasan |
| --- | --- |
| `src/features/pengguna/domain/statistik-pengguna.ts` | Menghitung total, aktif, nonaktif, dan jumlah per role dari data nyata. |
| `src/features/pengguna/domain/statistik-pengguna.test.ts` | Test statistik termasuk data kosong, akun tanpa role, dan distribusi role. |
| `src/features/pengguna/application/pengguna-admin.ts` | Data halaman pengguna dan grup akses; memfilter role desa dan menghitung flag izin UI. |
| `src/app/(admin)/pengaturan/pengguna/actions.ts` | Server action tambah/ubah/hapus pengguna dengan validasi Zod. |
| `src/app/(admin)/pengaturan/pengguna/page.tsx` | Halaman pengguna: KPI, tab, tabel, rail role/statistik/aktivitas, dan log audit. |
| `src/app/(admin)/pengaturan/pengguna/pengguna-console.tsx` | Pencarian, filter, paginasi 10 baris, dan dialog CRUD sisi klien. |
| `src/app/(admin)/pengaturan/pengguna/dialog-pengguna.tsx` | Form tambah/ubah akun; akun sendiri tidak dapat menurunkan role atau menonaktifkan diri. |
| `src/components/ui/dialog-hapus.tsx` | Dialog konfirmasi hapus generik untuk pengguna dan role. |
| `src/app/(admin)/pengaturan/grup-akses/actions.ts` | Server action CRUD role dan simpan matriks izin. |
| `src/app/(admin)/pengaturan/grup-akses/page.tsx` | Daftar role, anggota, editor izin, dan indikator role sistem. |
| `src/app/(admin)/pengaturan/grup-akses/dialog-role.tsx` | Dialog tambah/ubah nama role. |
| `src/app/(admin)/pengaturan/grup-akses/form-izin.tsx` | Matriks izin read/write/manage per modul. |

### Diubah

| File | Alasan |
| --- | --- |
| `src/app/globals.css` | Kelas `.pengguna-*`, `.form-check`, dan tombol bahaya untuk kedua halaman. |
| `src/features/navigation/domain/menu-tampil.ts` | Mendaftarkan `/pengaturan/pengguna` dan `/pengaturan/grup-akses` sebagai rute tersedia. |
| `src/features/navigation/domain/menu-tampil.test.ts` | Assertion rute pengguna tersedia. |
| `src/db/templates/tenant-template.ts` | Menambahkan grup Pengaturan, dua modul anak, dan grant administrator agar tenant baru langsung memiliki menu. |
| `src/db/migrations/0014_menu_pengguna_grup_akses.sql` | Backfill idempoten menu dan grant untuk tenant yang sudah berjalan. |
| `src/db/migrations/meta/_journal.json`, `0014_snapshot.json` | Mencatat migrasi 0014 pada journal dan snapshot Drizzle. |

## Perubahan

### Halaman pengguna

- KPI total, aktif, nonaktif, dan jumlah role — semuanya dihitung dari
  `listPengguna(villageId)` dan role desa. Persentase aktif dan donut mengikuti
  angka sebenarnya; desa tanpa pengguna menampilkan donut netral.
- Tab "Pengguna" dan "Grup & Permission"; tab kedua menuju
  `/pengaturan/grup-akses#izin` agar tidak ada model grup kedua.
- Tabel menampilkan nama/email, role, status, dan login terakhir. Pencarian
  nama/email, filter role/status, dan paginasi dilakukan di klien atas data
  desa yang sudah dimuat.
- Dialog tambah/ubah memakai schema yang sama dengan use case. Password kosong
  saat ubah tidak mengubah password. Role yang dapat dipilih hanya role desa.
- Akun yang sedang login tidak dapat mengubah role sendiri atau menonaktifkan
  diri, mencegah admin kehilangan akses tanpa sengaja.
- Hapus memakai dialog konfirmasi dan memperingatkan bahwa audit lama akan
  kehilangan referensi pelaku (hard delete, `actorId` menjadi NULL).
- Rail kanan menampilkan distribusi role, status akun, dan lima aktivitas
  terbaru dari `getAuditLogPageData` bila pengguna punya izin `auditLog:read`.
- Tombol tambah/ubah/hapus hanya muncul sesuai `pengguna:create/update/delete`.

### Halaman grup akses

- Hanya role milik desa sesi yang didaftar; role global dan role platform
  disaring. `roleParam` hanya memilih role, bukan bukti kepemilikan —
  `getRoleDetail` tetap memverifikasi desa.
- Role sistem ditandai dan matriksnya read-only, sesuai penolakan
  `saveRolePermissions`.
- Matriks mengirim izin per modul; use case menormalkan `manage → write → read`
  lewat `fromCrudPermissions`. Modul yang tidak valid diabaikan use case.
- Tambah/ubah/hapus role memakai `roleFormSchema` dan use case yang sudah ada.

### Menu sidebar

Setelah halaman dibuat, menu belum muncul karena sidebar dibangun dari tabel
`modules`, bukan dari `RUTE_ADMIN_TERSEDIA`. Tenant yang sudah berjalan hanya
memiliki baris `beranda`; daftar rute saja tidak menambah menu.

Perbaikan:

- `TENANT_TEMPLATE` kini memuat grup `pengaturan` (tanpa URL) dengan anak
  `pengguna` dan `grup-akses`. Hanya role `administrator` mendapat `manage`.
- Migrasi `0014_menu_pengguna_grup_akses.sql` mengisi tenant lama secara
  idempoten: baris dengan slug yang sudah ada dilewati, sehingga penyesuaian
  menu milik desa tidak ditimpa. Grant hanya ditambahkan bila belum ada.
- Migrasi sudah dijalankan pada database pengembangan lokal. Hasil query:
  grup `pengaturan` (id 2), `pengguna` (id 3), `grup-akses` (id 4), dengan
  grant `manage` untuk role `administrator` desa.

Dampak migration: hanya `INSERT ... SELECT`, tanpa mengubah atau menghapus baris
lama. Urutan deploy: backup database, jalankan `npm run db:migrate`, lalu login
ulang halaman sebagai administrator desa agar menu ter-render dari data terbaru.

## Security dan tenant

- Tidak ada `villageId` dari body/query yang dipakai sebagai otorisasi. Desa
  selalu berasal dari `requirePermission` + `resolveVillageId(user)`.
- `getPenggunaAdminData` memfilter role dengan `role.villageId === villageId`
  dan `!isPlatformRole(role)`, sehingga role lintas tenant/platform tidak bisa
  dipilih di form.
- Create/update/delete pengguna dan role tetap melewati use case yang sudah
  memeriksa tenant dan permission. Server action hanya memvalidasi bentuk input.
- Matriks izin tidak menerima `villageId`; `saveRolePermissions` memakai sesi.
- Flag `canUpdate`/`canDelete` hanya menyembunyikan kontrol UI; use case tetap
  menolak operasi tanpa izin.
- Tab audit tidak dimuat tanpa `auditLog:read`.
- Tidak ada secret atau data pribadi yang ditambahkan ke fixture, log, atau
  laporan.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint "src/app/(admin)/pengaturan" src/features/pengguna src/features/navigation/domain src/components/ui/dialog-hapus.tsx` | **PASS** |
| `npx vitest run --config vitest.config.mts src/features/pengguna/domain/statistik-pengguna.test.ts src/features/navigation/domain/menu-tampil.test.ts src/features/pengguna/application/pengguna-use-cases.test.ts src/features/rbac/application/grup-use-cases.test.ts` | **PASS** — 4 file, 19 test |
| `npx vitest run --config vitest.config.mts src/features/multi-desa/domain/template-tenant.test.ts src/db/migrasi-paritas.test.ts src/features/navigation/domain/menu-tampil.test.ts src/features/navigation/application/build-menu.test.ts` | **PASS** — 4 file, 35 test |
| `npm run db:migrate` (database pengembangan lokal) | **PASS** — migrasi 0014 diterapkan |
| Query verifikasi `modules` dan `role_permissions` | **PASS** — 3 modul baru dan grant administrator terverifikasi |
| `npm run build` | **PASS** — `/pengaturan/pengguna` dan `/pengaturan/grup-akses` muncul sebagai rute dinamis |
| Pemeriksaan browser/visual | **SKIPPED** — tidak diminta dan tidak ada sesi login desa di lingkungan ini |

`npx prettier --write` dijalankan pada file baru, `src/app/globals.css`, dan
`TENANT_TEMPLATE`.

## Risiko dan keterbatasan

- Daftar pengguna memuat seluruh akun desa ke klien sebelum pencarian/paginasi.
  Untuk desa dengan akun sangat banyak, ini perlu dipindah ke query server-side
  dengan parameter halaman. Skala desa saat ini masih wajar.
- Status "Diblokir" dari mockup tidak dimodelkan; modul hanya membedakan
  aktif/nonaktif. Perlu keputusan model data bila fitur blokir dibutuhkan.
- Hapus pengguna bersifat permanen. Audit lama tetap ada, tetapi nama pelaku
  tidak lagi dapat ditampilkan setelah `actorId` menjadi NULL.
- Matriks izin belum memiliki test UI; perilaku normalisasi dan penolakan role
  sistem berasal dari test use case yang sudah ada.
- Branch ini bertumpu pada `task/admin-beranda` yang belum di-merge ke `main`.
- Tampilan belum diverifikasi di browser dengan data desa nyata.

## Kesimpulan

Modul Manajemen Pengguna & Hak Akses sudah terhubung ke use case nyata, dibatasi
tenant di server, dan lolos typecheck, lint, test terarah, serta build. Langkah
berikutnya adalah review diff dan, bila disetujui, penggabungan branch dasar
beranda terlebih dahulu sebelum branch ini.
