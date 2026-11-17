import type { TemplateTenant } from "@/features/multi-desa/domain/template-tenant";

/**
 * Template fondasi tenant bawaan platform.
 *
 * Dipakai `provisionDesa` untuk membentuk role, modul, matriks akses, tema, dan
 * menu publik desa baru tanpa menyalin data desa lain. Berkas ini adalah data
 * produk yang direview lewat repository: ubah isinya bersama test di
 * `src/features/multi-desa/domain/template-tenant.test.ts`.
 *
 * Isi saat ini sengaja minimal karena katalog admin di aplikasi baru memuat
 * `/beranda`; halaman admin lain belum ada. Setelah menambah halaman admin,
 * tambahkan modulnya di sini (dan slug-nya pada matriks `akses`). Instalasi yang
 * sudah berjalan dapat mengekspor katalognya sendiri lalu mengganti isi berkas
 * ini dengan hasil ekspor yang sudah direview.
 *
 * Yang tidak boleh dimasukkan: katalog surat, buku bumindes, dan kategori
 * inventaris. Ketiganya data master milik desa, bukan fondasi tenant.
 */
export const TENANT_TEMPLATE = {
  versi: 1,
  sumber: {
    jenis: "bawaan",
    villageId: null,
    dibuatPada: "2026-11-17",
  },
  roles: [{ slug: "administrator", name: "Administrator", isSystem: true }],
  modules: [],
  akses: [],
  tema: {
    slug: "esensi",
    nama: "Esensi",
    versi: "1.0.0",
    opsi: null,
  },
  menuPublik: [],
} satisfies TemplateTenant;
