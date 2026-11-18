# Navigasi situs publik dari `menu_publik`

- **Task:** Mengalihkan navigasi situs publik ke tabel `menu_publik` tenant agar template tenant dan header situs tidak punya dua sumber kebenaran.
- **Tanggal:** 2026-11-18.
- **Branch:** `task/publik-nav-menu-publik`.
- **Base commit:** `f5ae9bb` (branch `task/tenant-template-v1`).
- **Commit kode:** `55e4cd7`.
- **Status:** Siap review. Belum di-merge.

## Kondisi awal

Sembilan halaman publik memakai `PublicShell` dan masing-masing menulis daftar tautan navigasinya sendiri sebagai literal di dalam page. Template tenant v1 menyemai delapan baris `menu_publik` (`src/db/templates/tenant-template.ts`), sehingga terdapat dua sumber navigasi: database yang bisa diubah administrator desa, dan array hardcoded di kode yang tidak pernah ikut berubah.

Dampaknya, perubahan menu oleh desa tidak pernah muncul di situs publik, dan beberapa tautan hardcoded bahkan menunjuk rute yang tidak ada (`/profil/visi-misi`, `/profil/sejarah` padahal halamannya ada di `/visi-misi` dan `/sejarah`).

## File yang diperiksa

- `src/app/public-shell.tsx` — presenter header/footer, menerima prop `navigation`.
- `src/app/public-shell.test.ts` — test render `PublicShell`.
- `src/features/publik/infrastructure/content-repository.ts` — `listMenuPublik(villageId, includeInactive)` sudah ada tetapi belum dipakai navigasi.
- `src/db/schema/content.ts` — tabel `menu_publik` (`parent_id`, `link`, `link_tipe`, `aktif`, `urut`).
- `src/db/templates/tenant-template.ts` — delapan menu publik template v1.
- Sembilan halaman pemakai `PublicShell`: `dokumen`, `kontak`, `layanan`, `layanan/surat`, `pengaduan`, `potensi`, `sejarah`, `transparansi/apbdes`, `visi-misi`.

## File yang diubah

| File | Alasan |
|---|---|
| `src/features/publik/application/nav-publik.ts` (baru) | Penerjemah baris `menu_publik` menjadi item navigasi + fallback. |
| `src/features/publik/application/nav-publik.test.ts` (baru) | Unit test aturan urutan, filter, dan sanitasi tautan. |
| `src/app/public-shell.tsx` | Menerima penanda `eksternal`; tautan keluar dirender `<a>`, bukan `next/link`. |
| `src/app/public-shell.test.ts` | Test tambahan untuk tautan eksternal. |
| 9 halaman publik | Array navigasi hardcoded diganti `await getNavPublik(desa.id)`. |

## Perubahan

- `bangunNavPublik(menu)` (fungsi murni) menyusun navigasi: hanya baris `aktif`, urut `urut` lalu `id`, anak langsung ditampilkan setelah induknya, anak yang induknya nonaktif/hilang diperlakukan sebagai induk agar tautannya tidak hilang, `href` ganda ditampilkan sekali.
- Sanitasi tautan: internal wajib path absolut dan menolak `//host` serta `/\host`; eksternal hanya `http(s)://`. Skema seperti `javascript:` dan `data:` dibuang sebelum dirender.
- `NAV_PUBLIK_BAWAAN` dipakai bila tenant tidak punya satu pun menu yang dapat dirender (tenant lama), isinya sama dengan delapan menu template v1.
- `getNavPublik(villageId)` memanggil `listMenuPublik` pada tiap permintaan. Halaman sudah `force-dynamic`, jadi tidak ada cache lintas tenant.
- Tenant tetap berasal dari `getIdentitasFromRequest()` milik masing-masing halaman; tidak ada `villageId` dari klien.

## Security/tenant

- `villageId` hanya berasal dari resolusi tenant server-side; modul baru tidak menerima input klien.
- Query dibatasi `menu_publik.village_id = villageId` lewat `listMenuPublik` yang sudah tenant-scoped.
- Tautan dari database diperlakukan tidak tepercaya: skema berbahaya dan URL protocol-relative ditolak, sehingga tidak ada jalur `javascript:` ke header situs.
- Tautan eksternal dirender dengan `rel="noreferrer"` dan `target="_blank"`.
- Tidak ada perubahan otorisasi, permission, route, atau data.

## Test

| Perintah | Hasil |
|---|---|
| `npx prettier --check` (13 file) | PASS |
| `npx eslint` (13 file) | PASS |
| `npm run typecheck` | PASS |
| `node node_modules/vitest/vitest.mjs run src/features/publik/application/nav-publik.test.ts src/app/public-shell.test.ts` | PASS — 2 file, 9 test |
| `npm run test:unit` | PASS — 215 file, 1887 test |
| `npm run build` | SKIPPED (dijalankan CI) |
| Integration test | SKIPPED — tidak ada perubahan schema/query tenant-scoped baru |

## Risiko tersisa

- Navigasi dirender apa adanya dari database; rute yang salah ketik oleh administrator tetap menjadi tautan 404. Belum ada validasi "halaman ada" saat menyimpan menu karena repo belum punya daftar rute publik yang otoritatif di runtime.
- Submenu ditampilkan datar di header, bukan dropdown. Header situs memang satu baris tautan, dan menampilkan seluruh tautan aktif lebih baik daripada menghilangkannya, tetapi hierarki tidak terlihat.
- `menu_publik` baru diisi oleh provisioning template; belum ada UI pengelolaan menu desa, sehingga perubahan menu masih lewat data/provisioning.
- Fallback bawaan menduplikasi delapan tautan template. Bila template berubah, daftar ini harus ikut diperbarui; belum ada test yang mengikat keduanya.
- Pemeriksaan visual browser belum dilakukan (tidak diminta).

## Rekomendasi berikutnya

1. Tambahkan test guard yang memastikan `NAV_PUBLIK_BAWAAN` sinkron dengan menu publik template tenant.
2. Validasi rute internal saat menyimpan `menu_publik` begitu UI pengelolaan menu dibuat.
