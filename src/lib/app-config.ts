/**
 * Konfigurasi aplikasi yang aman dipakai di **client maupun server**.
 *
 * Berisi nama dan deskripsi aplikasi. Nilai yang berasal dari environment harus
 * ditulis sebagai properti statis (`process.env.X`) agar Next.js dapat
 * men-inline-nya saat build, dan hanya boleh berisi hal yang aman terekspos ke
 * browser (berawalan `NEXT_PUBLIC_`).
 *
 * Nilai khusus server (rahasia, DSN database) ada di `@/lib/env` — modul itu
 * memvalidasi seluruh environment saat di-import dan **tidak boleh** diimpor
 * dari komponen client.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Sistem Informasi Desa";

/** Deskripsi singkat aplikasi (dipakai metadata & halaman masuk). */
export const APP_DESCRIPTION = "Sistem informasi dan administrasi pemerintahan desa.";
