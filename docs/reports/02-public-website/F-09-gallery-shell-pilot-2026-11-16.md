# F-09 — Pilot Shell Header/Footer Galeri

- **Task:** F-09 — ekstrak header/footer bersama untuk daftar dan detail galeri.
- **Tanggal:** 2026-11-16.
- **Branch:** `refactor/public-gallery-shell`.
- **Base commit:** `36163c952f55e409463350b8b062f7d7aa177eb1` (`origin/main`).
- **Commit implementasi:** `0bb98c2fcdb197a735c2dd449c1b092f5c0c67da`.
- **Commit laporan:** lihat riwayat branch; laporan diperbarui setelah CI PR #64.
- **Pull request:** https://github.com/fahmiorim/appdes/pull/64.
- **Status:** di-merge ke `main` melalui PR #64 (`942ed0f70de3f84c8f94a445562735eb279d1651`, 15 November 2026); tidak ada deploy.

## Kondisi awal dan analisis

Audit statis F-09 (`F-09-public-shell-boundary-audit-2026-11-16.md`) menyimpulkan variasi shell publik terlalu besar untuk satu layout global. Route `/galeri` dan `/galeri/[slug]` adalah pasangan yang terbukti memiliki markup header/footer sama dan berbagi `galeri.module.css`, sehingga dipilih sebagai pilot. Working tree bersih pada branch audit sebelum branch implementasi dibuat dari `origin/main`.

## File yang diperiksa

- Laporan batas F-09 dan acuan `docs/TECHNICAL_AUDIT.md`, `docs/SID_FEATURE_MAP.md`, `docs/MASTER_ROADMAP.md`.
- `src/app/galeri/page.tsx`, `src/app/galeri/[slug]/page.tsx`, `src/app/galeri/galeri.module.css`.
- `vitest.config.mts`, `package.json`, serta pola unit test React/server yang tersedia.

## File yang diubah

- `src/app/galeri/gallery-shell.tsx` — komponen presentasional server untuk `<main>`, header/nav, dan footer yang sama.
- `src/app/galeri/gallery-shell.test.ts` — render test kontrak header/footer, identitas desa, tautan navigasi/login, dan children.
- `src/app/galeri/page.tsx` — menggunakan shell bersama; hero, pencarian, grid, ringkasan dan CTA tidak dipindah.
- `src/app/galeri/[slug]/page.tsx` — menggunakan shell bersama; hero, breadcrumb, serta galeri foto tetap di route.
- Laporan task ini — rekam implementasi dan hasil pemeriksaan.

## Perubahan

Markup identik header/footer dipindahkan tanpa mengganti copy, class CSS, urutan tautan, brand mark, atau perilaku route. Komponen menerima nama desa yang sudah di-resolve server-side dan konten anak dari route. Tidak ada perubahan pada query, validasi media, tenant context, data, style, atau UX. Kegagalan tes awal yang diverifikasi adalah import modul belum tersedia; setelah komponen ditambahkan, tes lulus.

## Security/tenant

Tidak ada perubahan akses data atau autentikasi. Kedua route tetap memanggil `getIdentitasFromRequest()` dan memakai `desa.namaDesa` hasil resolusi server-side; nama desa hanya digunakan sebagai konten tampilan. Tidak ada `villageId` dari klien atau query baru.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run --config vitest.config.mts src/app/galeri/gallery-shell.test.ts` | **PASS** — 1 test lulus. Test awal gagal sesuai ekspektasi karena modul shell belum tersedia. |
| `npx eslint src/app/galeri/gallery-shell.tsx src/app/galeri/gallery-shell.test.ts src/app/galeri/page.tsx 'src/app/galeri/[slug]/page.tsx'` | **PASS** — tanpa error/warning. |
| `npx prettier --check src/app/galeri/gallery-shell.tsx src/app/galeri/gallery-shell.test.ts src/app/galeri/page.tsx 'src/app/galeri/[slug]/page.tsx'` | **PASS** — semua file mengikuti format. |
| `npm run typecheck` | **PASS** — `next typegen` dan `tsc --noEmit` selesai. |
| `git diff --check` | **PASS** — whitespace bersih sebelum laporan dibuat. |
| CI PR #64 — unit test dan quality check | **PASS** — check GitHub selesai sukses. |
| CI PR #64 — integration test (MySQL 8) | **PASS** — check GitHub selesai sukses. |
| CI PR #64 — visual QA login desktop/mobile dan ringkasan CI | **PASS** — semua check GitHub selesai sukses; visual QA CI ini adalah alur login, bukan screenshot galeri. |
| Build lokal, unit suite penuh, browser/screenshot QA khusus galeri | **SKIPPED** — perubahan terfokus; tes render server memeriksa markup dan CSS tidak berubah. Tidak ada klaim visual galeri runtime. |

## Diff

Implementasi menghapus 52 baris markup shell duplikat dari kedua halaman dan menggantikannya dengan dua pemanggilan komponen. Komponen baru memuat satu salinan markup. Diff implementasi: empat file, 79 baris ditambahkan dan 58 dihapus. Test dan laporan menambah bukti kontrak serta catatan audit.

## Risiko tersisa

Kesamaan markup diuji dengan server render, tetapi kesetaraan visual runtime belum diverifikasi lewat browser/screenshot. Sebelum memperluas pilot ke route lain, reviewer dapat membandingkan tampilan galeri dan album detail desktop/mobile. Shell bersama ini sengaja hanya digunakan oleh dua route tersebut.

## Kesimpulan dan langkah berikutnya

Pilot terbatas F-09 selesai pada source dan pemeriksaan lokal; semua CI PR #64 lulus. PR #64 sudah di-merge ke `main`; verifikasi visual galeri tetap belum dilakukan. Jika pilot diterima dan verifikasi visual galeri memadai, kelompok halaman lain dapat dimigrasikan satu per satu dengan kontrak menu/brand masing-masing; pekerjaan itu tidak termasuk task ini.
