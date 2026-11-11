import { z } from "zod";

import { optionalIsoDate } from "@/lib/forms";

export const KODE_BUKU_MAX = 20;
export const NAMA_BUKU_MAX = 150;
export const URAIAN_BUKU_MAX = 500;
export const URAIAN_ITEM_MAX = 500;
export const KETERANGAN_ITEM_MAX = 2000;
export const NOMOR_URUT_MAX = 999_999;

/** Satu buku pada katalog buku administrasi desa. */
export interface BukuInti {
  kodeBuku: string;
  namaBuku: string;
  uraian: string;
  /**
   * Kode & nama bawaan lama. Dipakai untuk menata ulang desa yang sudah pernah
   * di-seed sebelum kategori buku dibakukan; item yang sudah ada tetap menempel
   * pada buku yang sama karena hanya kode/nama baris yang diubah.
   */
  kodeLama?: { kode: string; nama: string };
}

/**
 * Katalog buku administrasi desa yang wajib tersedia.
 *
 * Pengelompokan mengikuti kebiasaan administrasi desa: A = administrasi umum,
 * B = administrasi penduduk, E = administrasi lain (tanah). Buku keuangan dan
 * pembangunan ditangani modulnya sendiri.
 */
export const BUKU_INTI: readonly BukuInti[] = [
  {
    kodeBuku: "A1",
    namaBuku: "Buku Peraturan Desa",
    uraian: "Peraturan desa yang ditetapkan bersama BPD.",
  },
  {
    kodeBuku: "A2",
    namaBuku: "Buku Keputusan Kepala Desa",
    uraian: "Keputusan kepala desa beserta dasar dan pelaksanaannya.",
  },
  {
    kodeBuku: "A3",
    namaBuku: "Buku Inventaris dan Kekayaan Desa",
    uraian: "Daftar inventaris dan kekayaan milik desa.",
  },
  {
    kodeBuku: "A4",
    namaBuku: "Buku Aparat Pemerintah Desa",
    uraian: "Data perangkat desa dan pejabat yang menjabat.",
  },
  {
    kodeBuku: "A5",
    namaBuku: "Buku Tanah Kas Desa",
    uraian: "Tanah kas desa beserta letak, luas, dan penggunaannya.",
    kodeLama: { kode: "B1", nama: "Buku Tanah Kas Desa" },
  },
  {
    kodeBuku: "A6",
    namaBuku: "Buku Agenda",
    uraian: "Agenda surat dan kegiatan yang diterima desa.",
    kodeLama: { kode: "C1", nama: "Buku Agenda" },
  },
  {
    kodeBuku: "A7",
    namaBuku: "Buku Ekspedisi",
    uraian: "Surat yang dikirim desa beserta tujuan dan tanggalnya.",
    kodeLama: { kode: "C2", nama: "Buku Ekspedisi" },
  },
  {
    kodeBuku: "A8",
    namaBuku: "Buku Pemberian Tanda Tangan dan Cap Desa",
    uraian: "Catatan pemberian tanda tangan dan cap desa.",
    kodeLama: { kode: "D1", nama: "Buku Pemberian Tanda Tangan dan Cap Desa" },
  },
  {
    kodeBuku: "B1",
    namaBuku: "Buku Data Induk Penduduk",
    uraian: "Data induk penduduk desa per keluarga.",
  },
  {
    kodeBuku: "B2",
    namaBuku: "Buku KTP dan Kartu Keluarga",
    uraian: "Data kepemilikan KTP dan Kartu Keluarga penduduk.",
  },
  {
    kodeBuku: "B3",
    namaBuku: "Buku Data Mutasi Penduduk",
    uraian: "Penduduk yang lahir, mati, pindah, dan datang.",
  },
  {
    kodeBuku: "B4",
    namaBuku: "Buku Rekapitulasi Jumlah Penduduk",
    uraian: "Rekapitulasi jumlah penduduk per wilayah dan kategori.",
  },
  {
    kodeBuku: "B5",
    namaBuku: "Buku Penduduk Sementara",
    uraian: "Penduduk sementara atau tamu yang tinggal di desa.",
  },
  {
    kodeBuku: "E1",
    namaBuku: "Buku Tanah di Desa",
    uraian: "Daftar bidang tanah yang berada di wilayah desa.",
    kodeLama: { kode: "B2", nama: "Buku Tanah di Desa" },
  },
];

/** Penanda item ringkasan yang dibuat oleh sinkronisasi data penduduk. */
export const KETERANGAN_SINKRONISASI_PENDUDUK = "Ringkasan otomatis data penduduk";

/** Cari entri katalog berdasarkan kode buku. */
export function bukuIntiByKode(kodeBuku: string): BukuInti | null {
  return BUKU_INTI.find((buku) => buku.kodeBuku === kodeBuku) ?? null;
}

/**
 * Formulir item buku.
 *
 * `bukuId` ikut dikirim agar aksi tahu buku tujuan; untuk pengubahan, server
 * tetap memakai buku milik item yang tersimpan. Tanggal boleh kosong.
 */
export const itemBukuFormSchema = z.object({
  bukuId: z.coerce.number().int().min(1, "Buku tidak valid."),
  nomorUrut: z.coerce
    .number()
    .int("Nomor urut harus bilangan bulat.")
    .min(1, "Nomor urut minimal 1.")
    .max(NOMOR_URUT_MAX, `Nomor urut maksimal ${NOMOR_URUT_MAX}.`),
  tanggal: optionalIsoDate,
  uraian: z
    .string()
    .trim()
    .min(1, "Uraian wajib diisi.")
    .max(URAIAN_ITEM_MAX, `Uraian maksimal ${URAIAN_ITEM_MAX} karakter.`),
  keterangan: z
    .string()
    .trim()
    .max(KETERANGAN_ITEM_MAX, `Keterangan maksimal ${KETERANGAN_ITEM_MAX} karakter.`)
    .optional()
    .or(z.literal("")),
});

export type ItemBukuInput = z.infer<typeof itemBukuFormSchema>;

/** Baris buku untuk halaman daftar. */
export interface BukuAdministrasiRow {
  id: number;
  kodeBuku: string;
  namaBuku: string;
  uraian: string | null;
}

/** Baris item untuk tabel detail buku. */
export interface ItemBukuRow {
  id: number;
  bukuId: number;
  nomorUrut: number;
  tanggal: string | null;
  uraian: string;
  keterangan: string | null;
}

/**
 * Nomor urut berikutnya = nomor terbesar + 1.
 *
 * Dipakai untuk mengisi awal formulir; keunikan tetap diperiksa server (lihat
 * `nomorUrutTerpakai` di repository) agar dua operator yang menyimpan
 * bersamaan tidak menghasilkan nomor ganda.
 */
export function nomorUrutBerikutnya(items: readonly Pick<ItemBukuRow, "nomorUrut">[]): number {
  const tertinggi = items.reduce((max, item) => Math.max(max, item.nomorUrut), 0);
  return Math.min(tertinggi + 1, NOMOR_URUT_MAX);
}
