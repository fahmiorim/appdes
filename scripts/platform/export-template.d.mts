/**
 * Tipe untuk fungsi murni `export-template.mjs` yang diuji unit.
 *
 * Skrip CLI-nya sengaja tetap `.mjs` (bukan TypeScript) agar dapat dijalankan
 * langsung dengan Node tanpa build tambahan. Deklarasi ini menjaga test dan
 * pemanggil TypeScript tetap memakai kontrak yang sama dengan implementasinya.
 */

export interface OpsiEksporTemplate {
  village: string | null;
  out: string | null;
  force: boolean;
  json: boolean;
  help: boolean;
}

export interface BarisRole {
  slug: string;
  name: string;
  is_system: number | boolean;
}

export interface BarisModul {
  id: number;
  slug: string;
  name: string;
  url: string | null;
  icon: string | null;
  is_group: number | boolean;
  is_hidden: number | boolean;
  is_active: number | boolean;
  sort_order: number | null;
  parent_id: number | null;
}

export interface BarisAkses {
  role_slug: string;
  module_slug: string;
  access: string;
}

export interface BarisTema {
  slug: string;
  nama: string;
  versi: string;
  opsi: string | null;
}

export interface BarisMenuPublik {
  nama: string;
  link: string;
  link_tipe: string;
  aktif: number | boolean;
  urut: number | null;
  parent_id: number | null;
}

export interface MasukanTemplate {
  desa: { id: number; slug: string | null; name: string | null };
  roles: BarisRole[];
  modules: BarisModul[];
  akses: BarisAkses[];
  tema: BarisTema | null;
  menuPublik: BarisMenuPublik[];
  tanggal?: Date;
}

export interface TemplateEkspor {
  versi: 1;
  sumber: { jenis: "ekspor"; villageId: number; dibuatPada: string };
  roles: Array<{ slug: string; name: string; isSystem: boolean }>;
  modules: Array<{
    slug: string;
    name: string;
    url: string | null;
    icon: string | null;
    isGroup: boolean;
    isHidden: boolean;
    isActive: boolean;
    sortOrder: number;
    parentSlug: string | null;
  }>;
  akses: Array<{ roleSlug: string; moduleSlug: string; access: string }>;
  tema: { slug: string; nama: string; versi: string; opsi: string | null } | null;
  menuPublik: Array<{
    nama: string;
    link: string;
    linkTipe: "internal" | "eksternal";
    aktif: boolean;
    urut: number;
  }>;
}

export interface RingkasanEksporTemplate {
  desa: { id: number; slug: string | null; name: string | null };
  roles: number;
  modules: number;
  akses: number;
  menuPublik: number;
  menuAnakDiabaikan: number;
  tema: string | null;
}

export function parseArgumen(argv: string[]): OpsiEksporTemplate;

export function susunTemplate(masukan: MasukanTemplate): {
  template: TemplateEkspor;
  ringkasan: RingkasanEksporTemplate;
};
