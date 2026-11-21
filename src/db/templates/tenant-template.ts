import type { TemplateTenant } from "@/features/multi-desa/domain/template-tenant";

/**
 * Template fondasi tenant bawaan platform.
 *
 * Dipakai `provisionDesa` untuk membentuk role, modul, matriks akses, tema, dan
 * menu publik desa baru tanpa menyalin data desa lain. Berkas ini adalah data
 * produk yang direview lewat repository: ubah isinya bersama test di
 * `src/features/multi-desa/domain/template-tenant.test.ts`.
 *
 * Aturan isi:
 * - Modul hanya disemai bila halamannya benar-benar ada dan path-nya terdaftar
 *   di `RUTE_ADMIN_TERSEDIA`; kalau tidak, sidebar menampilkan label "Segera"
 *   atau tautan mati. Tambah modul bersamaan dengan halamannya.
 * - Slug modul sama dengan slug pada `src/features/rbac/domain/resources.ts`,
 *   karena itulah kunci yang diperiksa `hasPermission`.
 * - `manage` (termasuk hapus) hanya untuk role `administrator`; role lain
 *   mengikuti least privilege.
 * - Menu publik berisi tautan yang sudah memiliki halaman di `src/app/`.
 *
 * Yang tidak boleh dimasukkan: katalog surat, buku bumindes, dan kategori
 * inventaris. Ketiganya data master milik desa, bukan fondasi tenant.
 */
export const TENANT_TEMPLATE = {
  versi: 1,
  sumber: {
    jenis: "bawaan",
    villageId: null,
    dibuatPada: "2026-11-18",
  },
  roles: [
    { slug: "administrator", name: "Administrator", isSystem: true },
    { slug: "sekretaris", name: "Sekretaris Desa", isSystem: false },
    { slug: "operator", name: "Operator", isSystem: false },
    { slug: "kepala-desa", name: "Kepala Desa", isSystem: false },
  ],
  modules: [
    {
      slug: "beranda",
      name: "Beranda",
      url: "/beranda",
      icon: "⌂",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
      parentSlug: null,
    },
    {
      slug: "penduduk",
      name: "Data Penduduk",
      url: "/penduduk",
      icon: "▤",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 3,
      parentSlug: null,
    },
    {
      slug: "website-desa",
      name: "Website Desa",
      url: null,
      icon: "◎",
      isGroup: true,
      isHidden: false,
      isActive: true,
      sortOrder: 4,
      parentSlug: null,
    },
    {
      slug: "website-dashboard",
      name: "Dashboard Website",
      url: "/website",
      icon: "▦",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
      parentSlug: "website-desa",
    },
    {
      slug: "website-pengaturan",
      name: "Pengaturan Website",
      url: "/website/pengaturan",
      icon: "⚙",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 2,
      parentSlug: "website-desa",
    },
    {
      slug: "website-halaman",
      name: "Halaman & Navigasi",
      url: "/website/halaman",
      icon: "☷",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 3,
      parentSlug: "website-desa",
    },
    {
      slug: "website-konten",
      name: "Konten & Publikasi",
      url: "/website/konten",
      icon: "▤",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 4,
      parentSlug: "website-desa",
    },
    {
      slug: "website-dokumen",
      name: "Dokumen Publik",
      url: "/website/dokumen",
      icon: "▧",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 5,
      parentSlug: "website-desa",
    },
    {
      slug: "pengaturan",
      name: "Pengaturan",
      url: null,
      icon: "⚙",
      isGroup: true,
      isHidden: false,
      isActive: true,
      sortOrder: 2,
      parentSlug: null,
    },
    {
      slug: "pengguna",
      name: "Pengguna & Hak Akses",
      url: "/pengaturan/pengguna",
      icon: "",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 1,
      parentSlug: "pengaturan",
    },
    {
      slug: "grup-akses",
      name: "Grup Akses",
      url: "/pengaturan/grup-akses",
      icon: "",
      isGroup: false,
      isHidden: false,
      isActive: true,
      sortOrder: 2,
      parentSlug: "pengaturan",
    },
  ],
  akses: [
    { roleSlug: "administrator", moduleSlug: "beranda", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "penduduk", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-desa", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-dashboard", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-pengaturan", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-halaman", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-konten", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "website-dokumen", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "pengaturan", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "pengguna", access: "manage" },
    { roleSlug: "administrator", moduleSlug: "grup-akses", access: "manage" },
    { roleSlug: "sekretaris", moduleSlug: "beranda", access: "read" },
    { roleSlug: "sekretaris", moduleSlug: "penduduk", access: "read" },
    { roleSlug: "operator", moduleSlug: "beranda", access: "read" },
    { roleSlug: "operator", moduleSlug: "penduduk", access: "read" },
    { roleSlug: "kepala-desa", moduleSlug: "beranda", access: "read" },
    { roleSlug: "kepala-desa", moduleSlug: "penduduk", access: "read" },
  ],
  tema: {
    slug: "esensi",
    nama: "Esensi",
    versi: "1.0.0",
    opsi: null,
  },
  menuPublik: [
    { nama: "Beranda", link: "/", linkTipe: "internal", aktif: true, urut: 1 },
    { nama: "Profil Desa", link: "/profil", linkTipe: "internal", aktif: true, urut: 2 },
    { nama: "Pemerintahan", link: "/pemerintahan", linkTipe: "internal", aktif: true, urut: 3 },
    { nama: "Layanan", link: "/layanan", linkTipe: "internal", aktif: true, urut: 4 },
    { nama: "Berita", link: "/berita", linkTipe: "internal", aktif: true, urut: 5 },
    { nama: "Agenda", link: "/agenda", linkTipe: "internal", aktif: true, urut: 6 },
    { nama: "Statistik", link: "/statistik", linkTipe: "internal", aktif: true, urut: 7 },
    { nama: "Kontak", link: "/kontak", linkTipe: "internal", aktif: true, urut: 8 },
  ],
} satisfies TemplateTenant;
