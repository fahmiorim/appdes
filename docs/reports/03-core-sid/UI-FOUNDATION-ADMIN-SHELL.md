# UI Foundation + Login + Admin Shell

- **Task:** Fondasi UI, alur masuk, dan shell Dashboard Admin Desa.
- **Base commit:** `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4`.
- **Branch:** `feat/ui-foundation-admin-shell`.
- **Status:** Implementasi awal; menunggu CI dan review.

## Keputusan implementasi

- Root layout Next.js App Router dengan metadata aplikasi.
- Token CSS semantik dan komponen dasar tanpa menambah dependency runtime.
- Login memakai Better Auth username client yang sudah sesuai konfigurasi server.
- Admin layout menggunakan `verifySession()`, data user dari DAL, dan menu berdasarkan permission RBAC.
- Dashboard hanya menampilkan agregasi yang difilter menggunakan `user.villageId`.
- Akun warga dialihkan ke area layanan mandiri; akun platform tidak diberi agregasi lintas desa.

## File

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/(auth)/masuk/page.tsx`
- `src/app/(auth)/masuk/login-form.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/beranda/page.tsx`
- `src/lib/auth-client.ts`
- `src/components/ui/*`
- `src/components/shell/*`

## Validasi

Belum dijalankan di lingkungan repository pada saat laporan ini ditulis. CI wajib memvalidasi typecheck, lint, format, unit test, dan build sebelum perubahan dinyatakan siap review.

## Batasan yang diketahui

- Nilai token visual adalah baseline awal, bukan token final yang telah diaudit terhadap semua screenshot.
- Navigasi modul masih mengikuti katalog RBAC; halaman modul operasional akan diimplementasikan bertahap.
- Dashboard belum menampilkan statistik keuangan, kesehatan, atau data sensitif.
- Belum ada migration atau deployment.
