/**
 * Menu navigasi situs publik.
 *
 * `susunMenu` mengubah baris `menu_publik` menjadi menu bertingkat. Menu datar
 * bawaan dikelompokkan ke beberapa menu induk agar header tidak penuh tautan;
 * menu yang sudah punya `parentId` dipertahankan sebagai pohon. Bila desa belum
 * punya menu di basis data, dipakai `PUBLIC_NAV` bawaan agar navigasi tetap
 * tampil pada instalasi baru.
 */

export interface PublicNavItem {
  href: string;
  label: string;
  children?: PublicNavItem[];
}

/**
 * Menu bawaan: tujuh menu teratas, dengan tautan lain di dalam dropdown.
 *
 * Urutan ini sengaja mengikuti cara warga mencari informasi (profil, kabar,
 * uang desa, potensi, partisipasi) alih-alih daftar halaman yang datar.
 */
export const PUBLIC_NAV: PublicNavItem[] = [
  { href: "/", label: "Beranda" },
  {
    href: "/desa/profil",
    label: "Profil",
    children: [
      { href: "/desa/profil", label: "Profil Desa" },
      { href: "/desa/pemerintahan", label: "Pemerintahan" },
      { href: "/desa/kelompok", label: "Kelompok & Lembaga" },
      { href: "/desa/peta", label: "Peta Desa" },
    ],
  },
  {
    href: "/layanan-mandiri",
    label: "Layanan",
    children: [
      { href: "/layanan-mandiri", label: "Layanan Mandiri" },
      { href: "/desa/surat", label: "Jenis Surat" },
      { href: "/desa/kesehatan/kia", label: "KIA & Posyandu" },
      { href: "/desa/bantuan", label: "Bansos" },
      { href: "/desa/anjungan", label: "Anjungan" },
      { href: "/desa/verifikasi-surat", label: "Verifikasi Surat" },
    ],
  },
  {
    href: "/desa/berita",
    label: "Informasi",
    children: [
      { href: "/desa/berita", label: "Berita" },
      { href: "/desa/agenda", label: "Agenda" },
      { href: "/desa/galeri", label: "Galeri" },
      { href: "/desa/dokumen", label: "Informasi Publik" },
      { href: "/desa/suplemen", label: "Suplemen" },
    ],
  },
  {
    href: "/desa/apbdes",
    label: "Transparansi",
    children: [
      { href: "/desa/apbdes", label: "APBDes" },
      { href: "/desa/statistik", label: "Statistik" },
      { href: "/desa/pembangunan", label: "Pembangunan" },
      { href: "/desa/inventaris", label: "Inventaris" },
      { href: "/desa/status-des", label: "Status Desa" },
      { href: "/desa/idm-sdgs", label: "IDM & SDGs" },
    ],
  },
  {
    href: "/desa/lapak",
    label: "Warga",
    children: [
      { href: "/desa/lapak", label: "Lapak Desa" },
      { href: "/desa/sinergi-program", label: "Sinergi Program" },
      { href: "/desa/dpt", label: "DPT" },
      { href: "/desa/pemilihan", label: "Pemilihan" },
      { href: "/jajak-pendapat", label: "Jajak Pendapat" },
      { href: "/desa/pengaduan", label: "Pengaduan" },
    ],
  },
  { href: "/desa/kontak", label: "Kontak" },
];

export interface MenuRowInput {
  id: number;
  nama: string;
  link: string;
  parentId: number | null;
}

/** Tautan seed lama; dipakai hanya untuk mengenali menu bawaan yang belum disesuaikan. */
const TAUTAN_SEED_LAMA = new Set([
  "/",
  "/desa/profil",
  "/desa/pemerintahan",
  "/desa/berita",
  "/desa/galeri",
  "/desa/statistik",
  "/desa/apbdes",
  "/desa/dokumen",
  "/desa/lapak",
  "/desa/pemilihan",
  "/desa/kontak",
]);

/**
 * Susun menu navigasi dari baris `menu_publik` (bila ada), dengan fallback ke
 * menu statis bawaan. Menu datar hasil seed lama dipetakan ke grup bawaan
 * berdasarkan tautannya, sehingga header tetap ringkas tanpa migrasi data.
 */
export function susunMenu(menu: MenuRowInput[]): PublicNavItem[] {
  if (menu.length === 0) return PUBLIC_NAV;

  if (menu.some((item) => item.parentId !== null)) {
    const pohon = susunPohon(menu);
    return pohon.length > 0 ? pohon : PUBLIC_NAV;
  }

  // Menu datar pilihan admin tetap dihormati. Hanya daftar bawaan yang panjang
  // yang dikelompokkan agar header tidak berdesakan.
  const hrefDikenal = new Set(
    PUBLIC_NAV.flatMap((item) => [item.href, ...(item.children ?? []).map((anak) => anak.href)]),
  );
  // Instalasi lama belum punya tautan Layanan/Anjungan/Bansos di basis data.
  // Bila menunya persis seed lama (tidak disesuaikan admin), pakai navigasi
  // bawaan baru agar halaman tersebut tetap terjangkau tanpa migrasi data.
  const seedLama =
    menu.length === TAUTAN_SEED_LAMA.size && menu.every((item) => TAUTAN_SEED_LAMA.has(item.link));
  if (seedLama) return PUBLIC_NAV;

  const menuBawaan = menu.length > 7 && menu.every((item) => hrefDikenal.has(item.link));
  if (menuBawaan) return kelompokkanMenuDatar(menu);

  return menu.map((item) => ({ href: item.link, label: item.nama }));
}

/** Bangun pohon `parentId` dengan batas kedalaman empat tingkat seperti OpenSID. */
function susunPohon(menu: MenuRowInput[]): PublicNavItem[] {
  const anakDari = new Map<number | null, MenuRowInput[]>();
  for (const item of menu) {
    const daftar = anakDari.get(item.parentId) ?? [];
    daftar.push(item);
    anakDari.set(item.parentId, daftar);
  }

  const sudahDipakai = new Set<number>();

  const buat = (parentId: number | null, tingkat: number): PublicNavItem[] => {
    if (tingkat > 3) return [];
    return (anakDari.get(parentId) ?? [])
      .filter((item) => !sudahDipakai.has(item.id))
      .map((item) => {
        sudahDipakai.add(item.id);
        const children = buat(item.id, tingkat + 1);
        return {
          href: item.link,
          label: item.nama,
          ...(children.length > 0 ? { children } : {}),
        };
      });
  };

  const hasil = buat(null, 0);

  // Baris dengan induk yang hilang tetap ditampilkan, jangan sampai tautannya lenyap.
  for (const item of menu) {
    if (!sudahDipakai.has(item.id)) {
      hasil.push({ href: item.link, label: item.nama });
    }
  }

  return hasil;
}

/** Petakan baris datar (seed lama) ke grup bawaan tanpa membuang tautan asing. */
function kelompokkanMenuDatar(menu: MenuRowInput[]): PublicNavItem[] {
  const tersisa = new Map(menu.map((item) => [item.link, item]));

  const ambil = (href: string) => {
    const baris = tersisa.get(href);
    if (!baris) return null;
    tersisa.delete(href);
    return { href: baris.link, label: baris.nama };
  };

  const hasil: PublicNavItem[] = [];
  for (const grup of PUBLIC_NAV) {
    if (!grup.children) {
      const item = ambil(grup.href);
      if (item) hasil.push(item);
      continue;
    }

    const children = grup.children
      .map((anak) => ambil(anak.href))
      .filter((anak): anak is PublicNavItem => anak !== null);
    if (children.length > 0) {
      hasil.push({ href: grup.href, label: grup.label, children });
    }
  }

  const sisa = [...tersisa.values()];
  const [pertama] = sisa;
  if (pertama && sisa.length === 1) {
    hasil.push({ href: pertama.link, label: pertama.nama });
  } else if (pertama) {
    hasil.push({
      href: pertama.link,
      label: "Lainnya",
      children: sisa.map((item) => ({ href: item.link, label: item.nama })),
    });
  }

  return hasil.length > 0 ? hasil : PUBLIC_NAV;
}
