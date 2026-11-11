import type { PerangkatAdmin } from "./perangkat";

/**
 * Bagan Struktur Organisasi dan Tata Kerja (SOTK) desa.
 *
 * Skema perangkat tidak menyimpan relasi atasan langsung (meniru kebutuhan
 * OpenSID yang juga menurunkan bagan dari jabatan), sehingga bagan disusun dari
 * nama jabatan: Kepala Desa di puncak, Sekretaris/Carik di bawahnya, dan
 * perangkat lain sebagai staf terurut. Fungsi murni agar mudah diuji.
 */

export interface SotkNode {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  penandaTangan: boolean;
  urut: number;
}

export interface SotkBagan {
  kepala: SotkNode | null;
  sekretaris: SotkNode | null;
  staf: SotkNode[];
  totalAktif: number;
}

/** Nama lengkap dengan gelar, tanpa spasi ganda. */
export function namaLengkapPerangkat(perangkat: PerangkatAdmin): string {
  return [perangkat.gelarDepan, perangkat.nama, perangkat.gelarBelakang]
    .map((bagian) => (bagian ?? "").trim())
    .filter((bagian) => bagian !== "")
    .join(" ")
    .replace(/\s+/g, " ");
}

function isKepalaDesa(jabatan: string | null): boolean {
  const nama = (jabatan ?? "").toLowerCase();
  return nama.includes("kepala desa") || nama === "kepala";
}

function isSekretaris(jabatan: string | null): boolean {
  const nama = (jabatan ?? "").toLowerCase();
  return nama.includes("sekretaris") || nama.includes("carik");
}

function toNode(perangkat: PerangkatAdmin): SotkNode {
  return {
    id: perangkat.id,
    nama: namaLengkapPerangkat(perangkat),
    jabatan: perangkat.jabatan,
    nip: perangkat.nip,
    penandaTangan: perangkat.penandaTangan,
    urut: perangkat.urut,
  };
}

/** Urutkan perangkat aktif menurut urutan tampil lalu nama. */
function bandingPerangkat(a: PerangkatAdmin, b: PerangkatAdmin): number {
  return a.urut - b.urut || a.nama.localeCompare(b.nama, "id") || a.id - b.id;
}

/** Susun bagan SOTK dari daftar perangkat desa (hanya berstatus aktif). */
export function susunBaganSotk(perangkat: readonly PerangkatAdmin[]): SotkBagan {
  const aktif = perangkat.filter((item) => item.status !== "nonaktif").sort(bandingPerangkat);

  let kepala: SotkNode | null = null;
  let sekretaris: SotkNode | null = null;
  const staf: SotkNode[] = [];

  for (const item of aktif) {
    const node = toNode(item);
    if (kepala === null && isKepalaDesa(item.jabatan)) {
      kepala = node;
    } else if (sekretaris === null && isSekretaris(item.jabatan)) {
      sekretaris = node;
    } else {
      staf.push(node);
    }
  }

  return { kepala, sekretaris, staf, totalAktif: aktif.length };
}
