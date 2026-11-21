# Perbaikan CI Dashboard Admin Desa PR #201

- **Task:** PR #201 — menutup kegagalan typecheck dan format untuk dashboard Admin Desa, lalu menyelaraskan branch terhadap `main` terbaru.
- **Tujuan:** Memastikan dashboard dapat melewati pemeriksaan lokal yang gagal pada CI sebelum PR diajukan untuk review.
- **Tanggal:** 2026-11-21.
- **Branch:** `feature/admin-desa-dashboard-v1`.
- **Base commit:** `5d7f26a` (`main` saat sinkronisasi).
- **Commit hasil:** akan dicatat setelah commit sinkronisasi dan perbaikan dibuat.

## Kondisi awal dan analisis

PR #201 menambahkan KPI APBDes, program pembangunan prioritas, dan panel pengumuman ke dashboard Admin Desa. CI pada head `19c2e30` gagal di:

- **Build produksi:** 9 diagnostic TS2532 pada `src/app/(admin)/beranda/page.tsx` baris 451–459, akibat akses `pengumuman[0]` tanpa pembuktian non-undefined. Diagnostik lokal sesudah integrasi juga menunjukkan akses pertama sekitar baris 450.
- **Unit test dan quality:** langkah `npm run format:check` gagal karena `page.tsx` dan `src/app/globals.css` tidak sesuai Prettier.
- **Visual QA:** gagal pada build TypeScript yang sama sebelum capture dashboard berjalan.
- **Integration test:** dilaporkan PASS pada check terakhir, tetapi job yang menjalankan integration test berstatus skipped karena tidak ada perubahan integration.

Perubahan juga dibangun di atas base `8d250b9`, sedangkan `main` kini `5d7f26a`. Merge `origin/main` hanya berkonflik pada `src/app/globals.css`. Resolusi mempertahankan CSS `main` dan menambahkan blok styling dashboard milik PR; blok halaman publik/Super Admin tidak disalin dari sisi PR lama.

## File yang diperiksa

- `src/app/(admin)/beranda/page.tsx`
- `src/app/globals.css`
- `package.json` untuk perintah quality gate
- `docs/reports/README.md`, `docs/MASTER_ROADMAP.md`, dan `docs/SID_FEATURE_MAP.md`
- Log CI #201 (run `44635175103`, `44635175102`)
- Branch `origin/main` dan `origin/feature/admin-desa-dashboard-v1`

## File yang diubah

| File | Alasan |
|---|---|
| `src/app/(admin)/beranda/page.tsx` | Guard eksplisit atas pengumuman utama sebelum render; hapus variabel `wilayah` yang tidak terpakai; terapkan format Prettier. |
| `src/app/globals.css` | Gabungkan blok style dashboard PR dengan CSS terbaru dari `main`, lalu format Prettier. |
| `docs/reports/03-core-sid/ADMIN-BERANDA-DASHBOARD-CI-2026-11-21.md` | Catatan kondisi awal, root cause, perubahan, dan validasi PR. |

## Perubahan

- Simpan item pertama dalam `pengumumanUtama`, dan tampilkan empty state jika nilainya tidak ada sebelum merender gambar, judul, kategori, tanggal, atau ringkasan.
- Hapus `wilayah`, yang tidak dipakai oleh JSX dashboard.
- Terapkan Prettier untuk halaman dashboard dan CSS yang berubah.
- Pertahankan seluruh layout/komponen dan data dashboard yang dimaksud PR.
- Gabungkan CSS yang berjalan pada `main` dengan dua blok CSS dashboard dari branch feature.

## Security/tenant

Tidak ada perubahan pada DAL, query, server session, tenant filter, permission, schema, atau validasi data. Pemeriksaan permission baca APBDes, pembangunan, dan berita tetap berada pada kode server yang ada; query pengumuman tetap menggunakan `listBeritaAdminData`.

## Validasi

| Perintah | Hasil | Catatan |
|---|---|---|
| `npm run typecheck` | PASS | `next typegen` dan `tsc --noEmit` tanpa error. |
| `npx prettier --check 'src/app/(admin)/beranda/page.tsx' src/app/globals.css` | PASS | Kedua file sesuai format. |
| `npx eslint 'src/app/(admin)/beranda/page.tsx'` | PASS | Tanpa error/warning untuk file ini. |
| `npm run test:unit` | PASS | 244 file test, 2.072 test lulus. |
| `npm run lint` | PASS | Exit code 0; ada dua warning `no-console` yang sudah ada pada `scripts/wilayah/generate-wilayah.mjs` baris 91–92. |
| `npm run format:check` | PASS | Seluruh repository sesuai Prettier. |
| `npm run build` | PASS | Next.js production build sukses; ada dua warning tracing filesystem di `ekspor-kedaluwarsa.mjs` dan `whatsapp-baileys.ts`, di luar scope. |
| `git diff --check` | PASS | Tidak ada whitespace error. |
| `npm run test:integration` | SKIPPED | Tidak dijalankan lokal; CI #201 sebelumnya menandai job eksekusi integration skipped karena tak relevan. |
| Visual QA dashboard | SKIPPED | CI sebelumnya gagal pada build TypeScript sebelum capture; visual QA baru harus diverifikasi pada check sesudah push. |

## Risiko dan keterbatasan

- CSS hasil merge diformat seluruhnya sehingga ada perubahan baris format dalam blok dashboard. CSS umum yang dipertahankan berasal dari `main` terbaru.
- Build menampilkan warning tracing filesystem yang tidak terkait PR ini.
- Pemeriksaan GitHub CI untuk commit yang diperbarui belum tersedia pada saat laporan disusun.
- PR #201 masih draft sampai CI baru dan review maintainer tersedia.

## Kesimpulan dan rekomendasi

Root cause TypeScript ditutup dengan guard eksplisit item utama pengumuman; kegagalan format dan variabel tak terpakai juga diperbaiki. Validasi lokal typecheck, lint, format, unit test, dan build lulus. Push perubahan dan tunggu seluruh checks PR terbaru, termasuk Visual QA, sebelum mengubah status draft atau meminta merge.
