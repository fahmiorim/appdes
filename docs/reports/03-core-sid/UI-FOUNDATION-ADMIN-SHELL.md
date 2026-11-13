# UI Foundation + Login + Admin Shell

- **Task:** Fondasi UI, alur masuk, dan shell Dashboard Admin Desa.
- **Base commit:** `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4`.
- **Branch:** `feat/ui-foundation-admin-shell`.
- **Status:** Implementasi awal; menunggu CI dan review.

## Keputusan implementasi

- Root layout Next.js App Router dengan metadata aplikasi.
- Token CSS semantik dan komponen dasar CSS tanpa dependency baru.
- Login memakai Better Auth username client yang sesuai dengan konfigurasi server.
- Admin layout memakai `verifySession()` dan `hasPermission()` dari DAL/RBAC.
- Dashboard memakai agregasi penduduk, KK, dan surat dengan filter `user.villageId` yang berasal dari sesi.
- Akun warga dialihkan ke area layanan mandiri; akun platform tidak menerima agregasi lintas desa.

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

- Nilai token visual adalah baseline awal, bukan token final yang telah diaudit terhadap seluruh screenshot.
- Implementasi pertama memakai CSS semantik tanpa Tailwind karena dependency dan lockfile belum diperbarui; tidak ada dependency baru yang diasumsikan tersedia.
- Sidebar hanya menampilkan Beranda yang sudah tersedia. Menu modul tidak diarahkan ke route handler/halaman yang belum memiliki UI.
- Dashboard belum menampilkan statistik keuangan, kesehatan, atau data sensitif.
- Belum ada migration atau deployment.
