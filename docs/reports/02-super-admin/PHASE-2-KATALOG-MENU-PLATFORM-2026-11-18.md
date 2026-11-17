# Katalog Fitur dan Menu Konsol Super Admin

- **Task:** dokumentasi katalog fitur/menu konsol platform (tidak ada perubahan kode).
- **Tanggal:** 18 November 2026.
- **Branch:** `docs/super-admin-menu-catalog-2026-11-18`.
- **Base commit:** `f713b53` (`docs(phase-2): selaraskan status dengan implementasi yang sudah merged`, #114).
- **Commit hasil:** lihat riwayat branch/PR; laporan ini di-commit bersama dokumen pada commit yang sama.

## 1. Tujuan

Mencatat daftar fitur dan menu yang umumnya dimiliki konsol Super Admin pada produk SaaS multi-tenant, lalu memetakannya ke kondisi nyata repository. Tujuannya menjadi acuan ruang lingkup ketika konsol `/super-admin` dipecah menjadi beberapa menu, tanpa mengubah kode.

## 2. Kondisi awal

- `docs/design/ADMIN-PLATFORM-DESIGN.md` sudah memuat prinsip visual, tujuan, dan acceptance criteria untuk shell Admin Desa dan Super Admin, tetapi **belum memuat katalog fitur/menu** konsol platform.
- `docs/SID_FEATURE_MAP.md` hanya menyebut "dashboard Super Admin" pada baris Platform multi-desa tanpa rincian menu.
- Bagian "Batasan saat ini" pada dokumen desain masih menyatakan dashboard Super Admin "belum merupakan manajemen tenant lengkap", padahal konsol tenant (provisioning, status, kuota, domain, reset akses, ekspor, purge) sudah ada di `main`.

## 3. File yang diperiksa

- `docs/design/ADMIN-PLATFORM-DESIGN.md`
- `docs/SID_FEATURE_MAP.md`
- `docs/MASTER_ROADMAP.md` (konteks fase)
- `src/app/(admin)/super-admin/page.tsx` dan `actions.ts`
- `src/features/multi-desa/presentation/tenant-console.tsx`
- `src/features/multi-desa/application/{provisioning,kelola-desa,lifecycle-desa}-use-cases.ts`
- `src/features/audit/application/audit-use-cases.ts`, `src/features/audit/infrastructure/audit-repository.ts`
- `src/features/navigation/application/{get-menu,build-menu}.ts`, `src/features/navigation/domain/menu-tampil.ts`
- `src/components/shell/admin-sidebar.tsx`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `docs/design/ADMIN-PLATFORM-DESIGN.md` | Menambah subbagian "Katalog fitur dan menu konsol platform" dan mengoreksi batasan yang sudah tidak akurat. |
| `docs/reports/02-super-admin/PHASE-2-KATALOG-MENU-PLATFORM-2026-11-18.md` | Laporan task wajib. |

Tidak ada perubahan kode, schema, migration, atau konfigurasi.

## 5. Perubahan dokumen

Subbagian baru pada §3 Super Admin Platform berisi:

1. **Menu inti** — 10 baris (Ringkasan, Tenant, Domain, Pengguna platform, Langganan/paket, Audit trail, Monitor dan kesehatan, Template dan konten, Pengaturan platform, Dukungan) dengan isi umum dan status `Ada` / `Sebagian` / `Belum` di `main`.
2. **Menu lanjutan** — feature flag per tenant, integrasi dan API key, backup/restore, notifikasi dan broadcast, ekspor dan retensi, statistik penggunaan, manajemen insiden.
3. **Pola tata letak** — pengelompokan sidebar, ringkasan yang tidak memuat semua aksi, tab pada halaman detail tenant, danger zone, dan audit yang dapat dibaca kembali.
4. **Urutan prioritas** — pemisahan halaman konsol tenant, audit lintas tenant, pengguna dan pengaturan platform, lalu fitur lanjutan.
5. **Catatan implementasi menu** — menu admin berasal dari tabel `modules` yang dibatasi tenant, sementara akun platform memakai `villageId === null` sehingga sidebar Super Admin saat ini hanya memiliki tautan tetap "Dashboard platform"; menambah menu memerlukan rute baru dan pembaruan daftar rute admin yang tersedia.

Bagian §4 "Batasan saat ini" diperbarui agar menyatakan konsol tenant sudah lengkap dalam satu halaman, menu platform belum terpisah, dan Audit Trail platform belum memiliki UI.

## 6. Security dan tenant

- Dokumen tidak menambahkan jalur otorisasi atau data baru; setiap item katalog tetap disyaratkan melewati use case server-side dengan permission platform dan audit trail.
- Tidak ada data tenant, kredensial, atau data pribadi yang dimasukkan ke dokumen.
- Catatan impersonasi dan integrasi dipertahankan sebagai item yang memerlukan keputusan keamanan tersendiri, bukan fitur yang disetujui.

## 7. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --check docs/design/ADMIN-PLATFORM-DESIGN.md docs/reports/02-super-admin/PHASE-2-KATALOG-MENU-PLATFORM-2026-11-18.md` | PASS |
| `git diff --check` | PASS |
| Typecheck / unit test / integration test | SKIPPED — hanya dokumentasi, tidak ada perubahan kode |

## 8. Risiko dan keterbatasan

- Status `Ada` / `Sebagian` / `Belum` diverifikasi lewat pembacaan kode pada commit `f713b53`, bukan lewat walkthrough UI di staging.
- Katalog ini bersifat acuan umum; keputusan menu final tetap memerlukan persetujuan maintainer karena memengaruhi navigasi, rute, dan cakupan fase.

## 9. Rekomendasi berikutnya

1. Memisahkan konsol tenant menjadi halaman Ringkasan, Tenant, dan Domain, lalu menambahkan menu platform pada sidebar.
2. Menambahkan UI pembacaan audit trail lintas tenant (butuh use case baru; repository audit saat ini hanya menerima satu `villageId`).
3. Meninjau ulang dokumen ini setelah menu platform pertama diimplementasikan.
