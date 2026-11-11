import { selCsv } from "@/lib/spreadsheet";

import { jabatanLabel, kelompokTipeLabel, type KelompokTipe } from "./kelompok";

/**
 * Laporan daftar anggota kelompok & lembaga.
 *
 * Berbeda dari tabel kelompok (yang hanya menampilkan jumlah anggota), laporan
 * ini merinci setiap anggota beserta jabatan dan nomor keanggotaannya. Fungsi di
 * sini murni sehingga dapat diuji tanpa database; ekspor CSV memakai helper
 * bersama `selCsv` agar tanda kutip/pemisah aman.
 */

/** Satu baris laporan: keanggotaan + identitas kelompok. */
export interface AnggotaLaporanRow {
  kelompokId: number;
  kelompokNama: string;
  kelompokTipe: string;
  kategoriNama: string | null;
  nama: string;
  nationalId: string | null;
  position: number;
  memberNumber: string | null;
  decreeNumber: string | null;
}

/** Anggota satu kelompok yang sudah dikelompokkan untuk tampilan cetak. */
export interface KelompokLaporan {
  kelompokId: number;
  kelompokNama: string;
  kelompokTipe: string;
  kategoriNama: string | null;
  anggota: AnggotaLaporanRow[];
}

/** Urutkan anggota: jabatan (ketua dulu), lalu nama. */
function bandingAnggota(a: AnggotaLaporanRow, b: AnggotaLaporanRow): number {
  return (
    a.position - b.position || a.nama.localeCompare(b.nama, "id") || a.kelompokId - b.kelompokId
  );
}

/** Kelompokkan baris anggota menurut kelompoknya, terurut nama kelompok. */
export function kelompokkanAnggota(rows: readonly AnggotaLaporanRow[]): KelompokLaporan[] {
  const peta = new Map<number, KelompokLaporan>();

  for (const row of rows) {
    let kelompok = peta.get(row.kelompokId);
    if (!kelompok) {
      kelompok = {
        kelompokId: row.kelompokId,
        kelompokNama: row.kelompokNama,
        kelompokTipe: row.kelompokTipe,
        kategoriNama: row.kategoriNama,
        anggota: [],
      };
      peta.set(row.kelompokId, kelompok);
    }
    kelompok.anggota.push(row);
  }

  return [...peta.values()]
    .map((kelompok) => ({ ...kelompok, anggota: [...kelompok.anggota].sort(bandingAnggota) }))
    .sort(
      (a, b) => a.kelompokNama.localeCompare(b.kelompokNama, "id") || a.kelompokId - b.kelompokId,
    );
}

/** Judul laporan berdasarkan filter tipe (kosong = semua). */
export function judulLaporanAnggota(tipe: string): string {
  if (tipe === "kelompok") return "Laporan Anggota Kelompok Masyarakat";
  if (tipe === "lembaga") return "Laporan Anggota Lembaga Desa";
  return "Laporan Anggota Kelompok & Lembaga";
}

/** Nama berkas CSV; slug tipe dipakai bila fiter diisi. */
export function namaBerkasLaporanAnggota(tipe: KelompokTipe | ""): string {
  return tipe === "" ? "laporan-anggota-kelompok.csv" : `laporan-anggota-${tipe}.csv`;
}

/** CSV laporan anggota (satu baris per anggota, header berbahasa Indonesia). */
export function buildLaporanAnggotaCsv(rows: readonly AnggotaLaporanRow[]): string {
  const header = [
    "Kelompok",
    "Tipe",
    "Kategori",
    "Nama Anggota",
    "NIK",
    "Jabatan",
    "No. Anggota",
    "No. SK",
  ];

  const data = kelompokkanAnggota(rows).flatMap((kelompok) =>
    kelompok.anggota.map((anggota) =>
      [
        kelompok.kelompokNama,
        kelompokTipeLabel(kelompok.kelompokTipe),
        kelompok.kategoriNama ?? "",
        anggota.nama,
        anggota.nationalId ?? "",
        jabatanLabel(anggota.position),
        anggota.memberNumber ?? "",
        anggota.decreeNumber ?? "",
      ]
        .map((nilai) => selCsv(nilai))
        .join(","),
    ),
  );

  return `\uFEFF${[header.map((nilai) => selCsv(nilai)).join(","), ...data].join("\r\n")}\r\n`;
}
