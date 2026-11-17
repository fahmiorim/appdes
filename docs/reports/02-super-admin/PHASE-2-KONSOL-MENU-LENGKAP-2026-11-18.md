# Konsol Super Admin: menu lengkap, pengelolaan pengguna platform, dan audit trail

- **Task:** Fase 2 — melengkapi konsol platform menjadi tujuh halaman dengan fitur yang benar-benar berjalan, bukan baca-saja.
- **Tanggal:** 18 November 2026.
- **Branch:** `feat/super-admin-menu-lengkap-2026-11-18`.
- **Base commit:** `829e0f0` (main setelah PR #115).
- **Status:** siap review.

## 1. Tujuan

Pengguna menilai `/super-admin` dibangun "asal-asalan": hanya satu halaman besar, beberapa menu belum ada, dan tiga halaman baru masih baca-saja. Task ini:

1. memisahkan konsol menjadi tujuh halaman dengan kerangka visual dan sub-navigasi yang konsisten;
2. menambahkan backend yang belum ada untuk pengguna platform (buat akun, aktif/nonaktif, reset sandi, cabut sesi);
3. melengkapi audit trail platform dengan filter desa/peristiwa, detail perubahan, dan ekspor CSV;
4. memperbaiki cacat responsif dan tabel yang berdesakan.

## 2. Kondisi awal

- Hanya `/super-admin` yang memuat data; daftar halaman lain belum ada di `main`.
- Menu platform tidak dapat dibangun dari tabel `modules` karena akun platform tidak memiliki desa (`village_id NULL`) dan tabel `modules` kosong untuk tenant.
- Audit trail lintas desa baru bisa dibaca dan dicari; belum ada filter, ekspor, atau detail.
- Pengguna platform hanya ditampilkan; tidak ada jalur untuk membuat akun, menonaktifkan, mereset sandi, atau mencabut sesi.
- `.platform-stats-grid` dideklarasikan setelah media query sehingga tetap empat kolom di layar sempit.

## 3. File yang diperiksa

- `src/features/multi-desa/application/provisioning-use-cases.ts` (`requireSuperAdmin`, aturan role platform).
- `src/features/rbac/domain/role.ts` (`PLATFORM_ROLE_SLUG`).
- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` (pola reset admin dan penghapusan sesi).
- `src/features/audit/infrastructure/audit-repository.ts` dan `src/features/audit/domain/audit.ts`.
- `src/db/schema/auth.ts`, `src/db/schema/rbac.ts`, `src/db/schema/pengaturan.ts`.
- `scripts/platform/bootstrap.mjs` (sandi minimal 12 karakter, role `super-admin`).
- `src/lib/csv.ts` (`toCsv`), `src/lib/action-state.ts`, `src/lib/errors.ts`.
- `src/app/(admin)/super-admin/tenant/page.test.ts`, `page.test.ts`, `src/features/multi-desa/presentation/tenant-console.tsx`.

## 4. Perubahan

### 4.1 Navigasi dan kerangka halaman

- `src/features/navigation/domain/menu-platform.ts` (+ test): menu platform eksplisit; Ringkasan hanya aktif tepat di `/super-admin`.
- `src/features/multi-desa/presentation/platform-nav.tsx`: sub-navigasi tujuh halaman.
- `src/components/shell/admin-sidebar.tsx`: sidebar platform memakai menu platform, bukan menu modul desa.
- `src/features/multi-desa/presentation/platform-ui.tsx`: `PlatformPageHeader`, `PlatformCard`, `PlatformEmpty`, `PlatformStatus` agar judul, deskripsi, section, dan empty state seragam.
- `src/app/globals.css`: rangkaian aturan `.platform-*` (header, segmented sub-nav, kartu section, stat grid responsif, toolbar filter, definition list, row actions, feed aktivitas) dan penghapusan `.platform-stats-grid` yang menimpa media query.

### 4.2 Backend pengguna platform

- `src/features/multi-desa/infrastructure/pengguna-platform-repository.ts` (baru): daftar, detail, role platform, cek email/username, buat akun + kredensial dalam transaksi, aktif/nonaktif (sekaligus hapus sesi), reset sandi (hapus sesi + aktifkan), cabut sesi. Semua operasi tulis dibatasi `village_id IS NULL` dan memverifikasi id terlebih dahulu.
- `src/features/multi-desa/application/pengguna-platform-use-cases.ts` (baru): guard `requireSuperAdmin`, validasi Zod (sandi minimal 12 karakter), penolakan email/username duplikat, penolakan menonaktifkan akun sendiri, serta audit `platform.user.create`, `platform.user.status`, `platform.user.reset`, `platform.user.session.revoke`. Sandi sementara tidak pernah masuk audit.
- `src/features/multi-desa/domain/sandi-sementara.ts` (baru): generator sandi sementara yang dipakai bersama use case desa dan platform.
- `src/app/(admin)/super-admin/pengguna/actions.ts` (baru): empat Server Action dengan `toErrorState`/`successState` dan revalidasi halaman.
- `src/features/multi-desa/presentation/pengguna-platform-console.tsx` (baru): form tambah akun, tabel akun, tombol per baris, status sesi, dan tampilan sandi sementara sekali pakai.
- `src/app/(admin)/super-admin/pengguna/page.tsx`: halaman memakai konsol tersebut dan menonaktifkan tombol nonaktif untuk akun yang sedang dipakai.

### 4.3 Audit trail

- `src/features/audit/infrastructure/audit-repository.ts`: `listAuditLogsLintasDesa` menerima filter `villageId` dan `event`.
- `src/features/multi-desa/application/audit-platform-use-cases.ts` (baru): normalisasi query (halaman, kata kunci maks 120 karakter, desa hanya digit, event hanya `[a-z0-9._-]`), `ambilAuditPlatform`, dan `eksporAuditPlatform` yang menggabungkan halaman dengan batas 5.000 baris.
- `src/app/(admin)/super-admin/audit/page.tsx`: filter desa dan jenis peristiwa, detail JSON per baris, paginasi yang mempertahankan filter.
- `src/app/(admin)/super-admin/audit/ekspor/route.ts` (baru): unduh CSV dengan BOM, guard di use case, `Cache-Control: private, no-store`, nama berkas bertanggal.

### 4.4 Halaman lain

- `src/app/(admin)/super-admin/page.tsx`: KPI, tenant terbaru, feed audit terbaru, dan daftar "perlu perhatian" dalam kartu terpisah.
- `.../tenant/page.tsx`: konsol tenant penuh di dalam kerangka platform.
- `.../domain/page.tsx`: KPI domain dan tabel lintas desa dengan badge Utama/Alias.
- `.../template/page.tsx`: role, modul, tema, dan menu publik dalam tabel serta definition list.
- `.../pengaturan/page.tsx`: kebijakan retensi dan konfigurasi environment sebagai definition list, bukan tabel KPI.
- `src/app/(admin)/super-admin/guard.ts`: mengembalikan pengguna terverifikasi agar halaman dapat membandingkan id akun sendiri.

### 4.5 Test

- `pengguna-platform-use-cases.test.ts`: guard, validasi sandi, duplikat email, audit tanpa sandi, larangan menonaktifkan diri, akun desa ditolak, reset sandi, cabut sesi.
- `audit-platform-use-cases.test.ts`: normalisasi filter, penolakan filter tidak valid, paginasi, ekspor multi-halaman, guard.
- `platform-konsol.integration.test.ts`: 11 test, termasuk pembuatan akun + kredensial, nonaktif + pencabutan sesi, reset sandi, cabut sesi, dan penolakan perubahan akun administrator desa lewat jalur platform.
- `page.test.ts`: memastikan Ringkasan memuat audit dan tetap 403/redirect untuk non-platform.

## 5. Security dan tenant

- Seluruh fungsi pengguna platform memanggil `requireSuperAdmin()` dan repository membatasi `village_id IS NULL`; id akun desa yang dikirim dari form menghasilkan `NOT_FOUND` tanpa perubahan data (diuji di integrasi).
- `id` dari FormData tidak dianggap bukti otorisasi; akun platform diverifikasi ulang di server.
- Operator tidak dapat menonaktifkan akunnya sendiri, sehingga konsol tidak terkunci tanpa jalur pemulihan.
- Reset sandi dan nonaktif menghapus sesi; sandi sementara 12 karakter dan tidak dicatat di audit maupun log.
- Ekspor audit hanya menghasilkan kolom non-rahasia (aktor, peristiwa, desa, IP, resource) dan dibatasi 5.000 baris.
- Filter audit dinormalisasi ketat; input seperti `1 OR 1=1` tidak lagi diam-diam diparse menjadi desa 1 (ditemukan oleh test).
- Tidak ada migration atau perubahan schema pada task ini.

## 6. Validasi yang dijalankan

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 error (5 warning `no-console` dari skrip bantu sementara yang dihapus sebelum commit) |
| `npm run format:check` | PASS |
| `npm run test:unit` | PASS — 214 file, 1.876 test |
| `npm run build` | PASS — rute `/super-admin`, `/super-admin/audit`, `/super-admin/audit/ekspor`, `/super-admin/domain`, `/super-admin/pengaturan`, `/super-admin/pengguna`, `/super-admin/template`, `/super-admin/tenant` terdaftar |
| `TEST_DATABASE_URL=…desa_test TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration` | PASS — 53 file, 289 test (database uji disposable) |

## 7. Risiko dan batasan

- Verifikasi visual ber-login belum dilakukan: database pengembangan belum memiliki akun platform bersandi, sehingga halaman tidak dapat dibuka di browser. Validasi tampilan baru sebatas build, markup, dan aturan CSS; walkthrough browser tetap perlu di staging.
- MFA, undangan anggota tim, verifikasi DNS/SSL domain, monitor, backup, feature flag, dan langganan belum termasuk.
- Template dan pengaturan sengaja tetap baca-saja karena sumbernya artefak kode dan environment.
- Ekspor audit dibatasi 5.000 baris per unduhan; arsip/retensi audit terpusat belum ada.
- Sandi sementara ditampilkan sekali di halaman; bila operator kehilangan nilainya, harus reset ulang.

## 8. Kesimpulan

Konsol Super Admin kini memiliki tujuh halaman dengan kerangka visual konsisten dan fitur yang berjalan di server: pengelolaan akun platform dengan audit, audit trail yang dapat difilter dan diekspor, serta halaman tenant/domain/template/pengaturan yang tidak lagi berdesakan. Seluruh pemeriksaan yang tercantum di atas lulus; walkthrough browser ber-login masih menjadi langkah verifikasi berikutnya.
