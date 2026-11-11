/**
 * Berkas impor klasifikasi surat (kode lama OpenSID).
 *
 * Kode dinormalisasi ke huruf besar dan unik per berkas; baris duplikat
 * dilaporkan agar operator dapat memperbaiki sumbernya sebelum mengimpor.
 */

import type { KolomImpor } from "@/lib/spreadsheet";

export type KunciImporKlasifikasi = "kode" | "nama" | "keterangan";

export const KOLOM_IMPOR_KLASIFIKASI: readonly KolomImpor<KunciImporKlasifikasi>[] = [
  { kunci: "kode", label: "Kode", alias: ["code", "kode klasifikasi"], wajib: true },
  { kunci: "nama", label: "Nama", alias: ["name", "uraian", "nama klasifikasi"], wajib: true },
  { kunci: "keterangan", label: "Keterangan", alias: ["description", "catatan"] },
];

export interface BarisKlasifikasiImpor {
  kode: string;
  nama: string;
  keterangan: string | null;
}

export interface HasilPersiapanKlasifikasi {
  rows: BarisKlasifikasiImpor[];
  galat: { baris: number; pesan: string }[];
}

function normalisasiKode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Validasi & normalisasi baris mentah sebelum menyentuh basis data.
 *
 * `nomorBaris` mengikuti nomor data pada berkas (1 = baris pertama di bawah
 * header) agar pesan galat mudah dicocokkan.
 */
export function siapkanBarisKlasifikasi(
  rows: readonly { nomorBaris: number; kode: string; nama: string; keterangan?: string }[],
): HasilPersiapanKlasifikasi {
  const hasil: BarisKlasifikasiImpor[] = [];
  const galat: { baris: number; pesan: string }[] = [];
  const terlihat = new Map<string, number>();

  for (const row of rows) {
    const kode = normalisasiKode(row.kode);
    const nama = row.nama.trim();

    if (kode === "") {
      galat.push({ baris: row.nomorBaris, pesan: "Kode wajib diisi." });
      continue;
    }
    if (kode.length > 20) {
      galat.push({ baris: row.nomorBaris, pesan: "Kode maksimal 20 karakter." });
      continue;
    }
    if (nama === "") {
      galat.push({ baris: row.nomorBaris, pesan: "Nama wajib diisi." });
      continue;
    }
    if (nama.length > 150) {
      galat.push({ baris: row.nomorBaris, pesan: "Nama maksimal 150 karakter." });
      continue;
    }
    if (terlihat.has(kode)) {
      galat.push({
        baris: row.nomorBaris,
        pesan: `Kode ${kode} duplikat dengan baris ${terlihat.get(kode)}.`,
      });
      continue;
    }

    const keterangan = (row.keterangan ?? "").trim();
    terlihat.set(kode, row.nomorBaris);
    hasil.push({
      kode,
      nama,
      keterangan: keterangan === "" ? null : keterangan.slice(0, 500),
    });
  }

  return { rows: hasil, galat };
}

/** Template CSV dua kolom wajib + contoh satu baris. */
export function templateImporKlasifikasi(): string {
  return `\uFEFFKode,Nama,Keterangan\r\nSK,Surat Keterangan,\r\nSU,Surat Undangan,\r\n`;
}
