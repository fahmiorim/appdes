import { z } from "zod";

export const PESAN_WARGA_RESOURCE = "pesan-warga";

/** Batas panjang satu pesan agar percakapan tetap terbaca. */
export const PANJANG_MAKS_PESAN = 2000;

/** Satu pesan warga/operator; spasi di tepi dibuang. */
export const pesanWargaSchema = z.object({
  isi: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong.")
    .max(PANJANG_MAKS_PESAN, `Pesan maksimal ${PANJANG_MAKS_PESAN} karakter.`),
});

export type PesanWargaInput = z.infer<typeof pesanWargaSchema>;

export const PENGIRIM_PESAN = ["warga", "operator"] as const;
export type PengirimPesan = (typeof PENGIRIM_PESAN)[number];

/** Nilai `pengirim` dari DB; nilai asing dianggap pesan warga. */
export function pengirimPesan(value: string): PengirimPesan {
  return value === "operator" ? "operator" : "warga";
}

export function labelPengirimPesan(pengirim: PengirimPesan): string {
  return pengirim === "operator" ? "Operator Desa" : "Warga";
}

export interface PesanWargaDTO {
  id: number;
  pengirim: PengirimPesan;
  isi: string;
  createdAt: Date | null;
}

/** Penduduk pemilik percakapan (header halaman admin). */
export interface PendudukPercakapan {
  residentId: number;
  nama: string;
  nik: string | null;
}

/** Baris pesan untuk menyusun daftar percakapan; urut terbaru lebih dulu. */
export interface PesanPercakapanRow {
  residentId: number;
  nama: string;
  nik: string | null;
  pengirim: PengirimPesan;
  isi: string;
  createdAt: Date | null;
  dibacaOperatorPada: Date | null;
}

export interface PercakapanWargaDTO {
  residentId: number;
  nama: string;
  nik: string | null;
  pesanTerakhir: string;
  pengirimTerakhir: PengirimPesan;
  terakhirPada: Date | null;
  belumDibaca: number;
}

/**
 * Susun daftar percakapan dari baris pesan yang **sudah** terurut terbaru
 * lebih dulu. Satu entri per warga: pesan terakhir + jumlah pesan warga yang
 * belum dibaca operator.
 */
export function susunPercakapan(rows: readonly PesanPercakapanRow[]): PercakapanWargaDTO[] {
  const peta = new Map<number, PercakapanWargaDTO>();

  for (const row of rows) {
    const belumDibaca = row.pengirim === "warga" && !row.dibacaOperatorPada ? 1 : 0;
    const ada = peta.get(row.residentId);

    if (!ada) {
      peta.set(row.residentId, {
        residentId: row.residentId,
        nama: row.nama,
        nik: row.nik,
        pesanTerakhir: row.isi,
        pengirimTerakhir: row.pengirim,
        terakhirPada: row.createdAt,
        belumDibaca,
      });
      continue;
    }

    ada.belumDibaca += belumDibaca;
  }

  return [...peta.values()];
}
