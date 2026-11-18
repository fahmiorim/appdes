# Picker wilayah dan perbaikan UI konsol tenant

- **Task:** UI konsol tenant dan picker wilayah untuk pendaftaran desa.
- **Tanggal:** 2026-11-18.
- **Branch:** `fix/ui-routing-review`.
- **Base commit:** `c8d4b4d` (`feat(404): halaman 404 global`), HEAD ketika perubahan task ini mulai.
- **Commit hasil:** disertakan dalam commit task pada branch ini; SHA dicatat pada ringkasan serah-terima setelah commit.

## Kondisi awal dan analisis

Form pendaftaran tenant meminta kode desa 10 digit dan nama secara manual. Schema `villages` sudah menyediakan kolom nama dan kode provinsi, kabupaten/kota, serta kecamatan, tetapi provisioning hanya menyimpan nama wilayah tanpa kode wilayah. Dataset wilayah penuh belum dibundel. Panel domain tenant hanya menunjukkan aksi untuk alias sehingga perubahan domain utama kurang jelas.

## File diperiksa

- `src/db/schema/village.ts`
- `src/features/multi-desa/domain/desa-baru.ts` dan test-nya
- `src/features/multi-desa/infrastructure/provisioning-repository.ts`
- `src/features/multi-desa/presentation/dialog-daftar-desa.tsx`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/app/globals.css`, `src/components/shell/admin-sidebar.tsx`
- test halaman konsol tenant dan use case provisioning
- dataset SQL sumber Kepmendagri 2025

## Perubahan

- Menambahkan picker berjenjang provinsi → kabupaten/kota → kecamatan → desa/kelurahan dengan API server `/api/wilayah`; klien hanya menerima satu tingkat per permintaan.
- Membundel JSON hasil generator berisi 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan 83.762 desa/kelurahan. Kode desa di dataset disimpan sebagai 10 digit tanpa titik.
- Memilih desa mengisi otomatis nama dan kode desa, serta mengirim nama dan kode provinsi/kabupaten/kecamatan. Nilai kode wilayah divalidasi dan dinormalisasi ke format digit sebelum disimpan.
- Menambahkan generator `scripts/wilayah/generate-wilayah.mjs` dan provenance di `src/features/wilayah/data/README.md`.
- Memperjelas langkah penggantian domain utama di panel konsol tenant.
- Memperbaiki kontras branding sidebar Super Admin yang sebelumnya terkena selector tema terang; menyesuaikan teks sidebar berdasarkan jenis admin.

## Sumber dan keamanan/tenant

Dataset berasal dari dump `db/wilayah.sql` di `https://github.com/cahyadsn/wilayah`, yang menyebut Kepmendagri No. 300.2.2-2138 Tahun 2025 dan lisensi MIT. Dataset hanya berisi kode/nama wilayah administratif, tidak memuat data tenant pribadi. API memvalidasi nama tingkat dan format kode induk; nilai form tetap divalidasi ulang oleh Zod di server. Akses database tidak diubah dan tidak ada query lintas tenant.

## Validasi

- **PASS** — `npm run typecheck` (`next typegen && tsc --noEmit`).
- **PASS** — ESLint untuk file wilayah, route API, dialog, panel tenant, provisioning, dan sidebar.
- **PASS** — Prettier pada semua file sumber yang disentuh; `git diff --cached --check` sebelum penambahan laporan.
- **PASS** — `npx vitest run src/features/wilayah/domain/data-wilayah.test.ts src/features/multi-desa/domain/desa-baru.test.ts "src/app/(admin)/super-admin/tenant/page.test.ts" src/features/multi-desa/application/provisioning-use-cases.test.ts` (4 file, 28 test).
- **PASS** — `npm run build`; route `/api/wilayah` tercantum. Build mencatat dua warning Turbopack tracing filesystem yang sudah ada pada skrip ekspor kedaluwarsa dan integrasi WhatsApp.
- **PASS** — Uji runtime dev dan production pada endpoint provinsi/kabupaten/kecamatan/desa; induk hilang atau tingkat tak dikenal ditolak dengan HTTP 400.
- **FAIL (di luar file task)** — `npm run format:check` menemukan `src/app/public-shell.tsx` tidak terformat; file tersebut tidak diubah dalam task ini.

## Risiko dan keterbatasan

- Dataset statis berukuran sekitar 2,5 MB; pembaruan kode wilayah memerlukan regenerasi dari sumber yang lebih baru.
- Dataset tidak berisi nama kepala desa, NIP, alamat kantor, telepon, atau website.
- Picker dipasang pada pendaftaran tenant; belum menambahkan form edit identitas untuk tenant yang sudah ada.
- Belum ada commit/push saat laporan ditulis.

## Kesimpulan

Perubahan siap diserahkan untuk review pada branch task. Jalankan `node scripts/wilayah/generate-wilayah.mjs` saat memperbarui dataset; jangan menganggap data identitas kepala desa tersedia dari dataset ini.
