import { jabatanLabel } from "./kelompok";

/**
 * Daftar anggota kelompok yang boleh tampil di situs publik.
 *
 * Repository hanya mengirim kolom yang aman ditampilkan: **tidak ada NIK**
 * maupun data penduduk lain. Anggota hanya muncul bila operator menandai
 * `tampil_publik` pada keanggotaannya.
 */

/** Satu baris keanggotaan yang dipublikasikan. */
export interface AnggotaPublikRow {
  kelompokId: number;
  kelompokNama: string;
  kelompokTipe: string;
  kategoriNama: string | null;
  nama: string;
  position: number;
  memberNumber: string | null;
}

/** Anggota ringkas untuk tampilan publik. */
export interface AnggotaPublikRingkas {
  nama: string;
  jabatan: string;
  nomorAnggota: string | null;
}

/** Anggota yang sudah dikelompokkan per kelompok/lembaga. */
export interface KelompokAnggotaPublik {
  kelompokId: number;
  kelompokNama: string;
  kelompokTipe: string;
  kategoriNama: string | null;
  anggota: AnggotaPublikRingkas[];
}

interface Akumulasi {
  kelompokId: number;
  kelompokNama: string;
  kelompokTipe: string;
  kategoriNama: string | null;
  rows: AnggotaPublikRow[];
}

/**
 * Kelompokkan baris anggota per kelompok, urut nama kelompok lalu jabatan.
 *
 * Urutan jabatan mengikuti nilai numerik (ketua lebih dulu), lalu nama anggota
 * agar hasil cetak stabil.
 */
export function kelompokkanAnggotaPublik(
  rows: readonly AnggotaPublikRow[],
): KelompokAnggotaPublik[] {
  const peta = new Map<number, Akumulasi>();

  for (const row of rows) {
    let grup = peta.get(row.kelompokId);
    if (!grup) {
      grup = {
        kelompokId: row.kelompokId,
        kelompokNama: row.kelompokNama,
        kelompokTipe: row.kelompokTipe,
        kategoriNama: row.kategoriNama,
        rows: [],
      };
      peta.set(row.kelompokId, grup);
    }
    grup.rows.push(row);
  }

  return [...peta.values()]
    .map((grup) => ({
      kelompokId: grup.kelompokId,
      kelompokNama: grup.kelompokNama,
      kelompokTipe: grup.kelompokTipe,
      kategoriNama: grup.kategoriNama,
      anggota: [...grup.rows]
        .sort(
          (a, b) => a.position - b.position || a.nama.localeCompare(b.nama, "id") || a.nama.length,
        )
        .map((row) => ({
          nama: row.nama,
          jabatan: jabatanLabel(row.position),
          nomorAnggota: row.memberNumber,
        })),
    }))
    .sort(
      (a, b) => a.kelompokNama.localeCompare(b.kelompokNama, "id") || a.kelompokId - b.kelompokId,
    );
}
