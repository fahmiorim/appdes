import { z } from "zod";

import { conflict } from "@/lib/errors";

export const INVENTARIS_KATEGORI = [
  "tanah",
  "gedung_bangunan",
  "jalan_irigasi_jaringan",
  "peralatan_mesin",
  "aset_lainnya",
  "konstruksi_dalam_pengerjaan",
] as const;
export type InventarisKategoriGolongan = (typeof INVENTARIS_KATEGORI)[number];

export const INVENTARIS_ASAL = [
  "pembelian",
  "hibah",
  "bantuan_pemerintah",
  "sumbangan",
  "lainnya",
] as const;
export type InventarisAsal = (typeof INVENTARIS_ASAL)[number];

export const INVENTARIS_KONDISI = ["baik", "rusak_ringan", "rusak_berat"] as const;
export type InventarisKondisi = (typeof INVENTARIS_KONDISI)[number];

export const MUTASI_JENIS = ["pindah", "rusak", "hapus", "perbaikan"] as const;
export type MutasiJenis = (typeof MUTASI_JENIS)[number];

export const MUTASI_STATUS = ["diajukan", "disetujui", "ditolak"] as const;
export type MutasiStatus = (typeof MUTASI_STATUS)[number];

export const MUTASI_STATUS_LABELS: Record<MutasiStatus, string> = {
  diajukan: "Menunggu Persetujuan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

/** Tahap verifikasi mutasi, berurutan dari operator sampai kepala desa. */
export const MUTASI_STEPS = ["operator", "sekdes", "kades"] as const;
export type MutasiStep = (typeof MUTASI_STEPS)[number];

export const MUTASI_STEP_LABELS: Readonly<Record<MutasiStep, string>> = {
  operator: "Operator",
  sekdes: "Sekretaris Desa",
  kades: "Kepala Desa",
};

/** Slug role yang berwenang menjalankan tiap tahap. */
export const MUTASI_STEP_ROLE_SLUGS: Readonly<Record<MutasiStep, readonly string[]>> = {
  operator: ["operator"],
  sekdes: ["sekretaris-desa"],
  kades: ["kepala-desa"],
};

interface MutasiVerificationSnapshot {
  status: MutasiStatus;
  verifikasiOleh: string | null;
  verifikasiSekdes: string | null;
  verifikasiKades: string | null;
}

/** Tahap berikutnya, atau `null` bila mutasi sudah selesai/ditolak. */
export function nextMutasiStep(mutasi: MutasiVerificationSnapshot): MutasiStep | null {
  if (mutasi.status !== "diajukan") return null;
  if (!mutasi.verifikasiOleh) return "operator";
  if (!mutasi.verifikasiSekdes) return "sekdes";
  if (!mutasi.verifikasiKades) return "kades";
  return null;
}

/** Nilai `logVerifikasi` sebelum sebuah tahap disetujui. */
export function mutasiLogBeforeStep(step: MutasiStep): string {
  switch (step) {
    case "operator":
      return "diajukan";
    case "sekdes":
      return "operator";
    case "kades":
      return "sekdes";
  }
}

/** Validasi peran: super admin boleh semua tahap. */
export function roleCanApproveMutasiStep(
  step: MutasiStep,
  roleSlug: string | null,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin) return true;
  return roleSlug !== null && MUTASI_STEP_ROLE_SLUGS[step].includes(roleSlug);
}

export const INVENTARIS_KATEGORI_LABELS: Record<InventarisKategoriGolongan, string> = {
  tanah: "Tanah",
  gedung_bangunan: "Gedung & Bangunan",
  jalan_irigasi_jaringan: "Jalan, Irigasi & Jaringan",
  peralatan_mesin: "Peralatan & Mesin",
  aset_lainnya: "Aset Tetap Lainnya",
  konstruksi_dalam_pengerjaan: "Konstruksi Dalam Pengerjaan",
};

export const INVENTARIS_KONDISI_LABELS: Record<InventarisKondisi, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
};

export const MUTASI_JENIS_LABELS: Record<MutasiJenis, string> = {
  pindah: "Pindah Lokasi",
  rusak: "Rusak",
  hapus: "Hapus",
  perbaikan: "Perbaikan",
};

export const inventarisKategoriFormSchema = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi").max(20),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150),
  golongan: z.enum(INVENTARIS_KATEGORI),
  keterangan: z.string().trim().max(500).optional().or(z.literal("")),
});

export type InventarisKategoriInput = z.infer<typeof inventarisKategoriFormSchema>;

export const inventarisFormSchema = z.object({
  kategoriId: z.coerce.number().int().min(1).optional().or(z.literal("")),
  nomorInventaris: z.string().trim().max(50).optional().or(z.literal("")),
  namaBarang: z.string().trim().min(1, "Nama barang wajib diisi").max(200),
  kodeBarang: z.string().trim().max(50).optional().or(z.literal("")),
  merk: z.string().trim().max(100).optional().or(z.literal("")),
  tipe: z.string().trim().max(100).optional().or(z.literal("")),
  spesifikasi: z.string().trim().max(2000).optional().or(z.literal("")),
  jumlah: z.coerce.number().min(0.01).max(999999).default(1),
  satuan: z.string().trim().max(20).default("buah"),
  hargaSatuan: z.coerce.number().min(0).max(999999999999).optional(),
  tahunPembelian: z.coerce.number().int().min(1900).max(2100).optional(),
  tanggalPembelian: z.iso.date().optional().or(z.literal("")),
  asal: z.enum(INVENTARIS_ASAL).optional(),
  donatur: z.string().trim().max(150).optional().or(z.literal("")),
  kondisi: z.enum(INVENTARIS_KONDISI).default("baik"),
  lokasi: z.string().trim().max(150).optional().or(z.literal("")),
  keterangan: z.string().trim().max(500).optional().or(z.literal("")),
});

export type InventarisInput = z.infer<typeof inventarisFormSchema>;

export const inventarisMutasiFormSchema = z.object({
  inventarisId: z.coerce.number().int().min(1),
  jenis: z.enum(MUTASI_JENIS),
  tanggalMutasi: z.iso.date(),
  lokasiBaru: z.string().trim().max(150).optional().or(z.literal("")),
  kondisiBaru: z.enum(INVENTARIS_KONDISI).optional(),
  jumlahMutasi: z.coerce.number().min(0.01).max(999999).default(1),
  alasan: z.string().trim().min(1, "Alasan wajib diisi").max(500),
  keterangan: z.string().trim().max(500).optional().or(z.literal("")),
});

export type InventarisMutasiInput = z.infer<typeof inventarisMutasiFormSchema>;

/** Baris daftar inventaris yang ditampilkan di halaman admin. */
export interface InventarisRow {
  id: number;
  kategoriId: number | null;
  nomorInventaris: string | null;
  namaBarang: string;
  kodeBarang: string | null;
  merk: string | null;
  tipe: string | null;
  spesifikasi: string | null;
  jumlah: string;
  satuan: string | null;
  hargaSatuan: string | null;
  nilaiAkhir: string | null;
  tahunPembelian: number | null;
  tanggalPembelian: string | null;
  asal: InventarisAsal | null;
  donatur: string | null;
  kondisi: InventarisKondisi;
  lokasi: string | null;
  keterangan: string | null;
}

/** Kategori inventaris untuk pilihan formulir dan halaman kategori. */
export interface InventarisKategoriRow {
  id: number;
  kode: string;
  nama: string;
  golongan: InventarisKategoriGolongan;
  keterangan: string | null;
}

/** Baris daftar mutasi yang ditampilkan di halaman admin. */
export interface MutasiRow {
  id: number;
  inventarisId: number;
  jenis: MutasiJenis;
  status: MutasiStatus;
  tanggalMutasi: string;
  lokasiBaru: string | null;
  kondisiBaru: InventarisKondisi | null;
  jumlahMutasi: string | null;
  alasan: string | null;
  namaBarang: string | null;
  nomorInventaris: string | null;
  diajukanOleh: string | null;
  verifikasiOleh: string | null;
  verifikasiSekdes: string | null;
  verifikasiKades: string | null;
  logVerifikasi: string | null;
  catatanVerifikasi: string | null;
  catatanPenolakan: string | null;
  disetujuiOleh: string | null;
  tanggalPersetujuan: Date | null;
}

/** Pilihan barang untuk formulir pengajuan mutasi. */
export interface InventarisOption {
  id: number;
  namaBarang: string;
  nomorInventaris: string | null;
  jumlah: string;
  satuan: string | null;
}

export interface MutasiAssetSnapshot {
  jumlah: string;
  hargaSatuan: string | null;
  nilaiAkhir: string | null;
  kondisi: InventarisKondisi;
  lokasi: string | null;
  isDeleted: boolean;
}

export interface MutasiDetailSnapshot {
  jenis: MutasiJenis;
  lokasiBaru: string | null;
  kondisiBaru: InventarisKondisi | null;
  jumlahMutasi: string | null;
}

export interface InventarisAssetPatch {
  jumlah?: string;
  nilaiAkhir?: string | null;
  kondisi?: InventarisKondisi;
  lokasi?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

const TOLERANSI_JUMLAH = 0.0001;

function angkaDesimal(value: string | null | undefined): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function nilaiAkhirBaru(hargaSatuan: string | null, jumlah: number): string | null {
  if (hargaSatuan === null) return null;
  return (angkaDesimal(hargaSatuan) * jumlah).toFixed(2);
}

/**
 * Hitung perubahan data aset saat mutasi disetujui tahap akhir.
 *
 * Aturan:
 * - `pindah`, `rusak`, dan `perbaikan` mengubah seluruh barang, sehingga
 *   jumlah mutasi harus sama dengan jumlah aset.
 * - `hapus` boleh sebagian; bila sisa nol, barang di-soft-delete.
 * - Perubahan hanya dikembalikan sebagai patch; pemanggil menerapkannya di
 *   dalam transaksi bersama persetujuan tahap akhir.
 */
export function hitungPerubahanAset(
  aset: MutasiAssetSnapshot,
  mutasi: MutasiDetailSnapshot,
): InventarisAssetPatch {
  if (aset.isDeleted) throw conflict("Barang inventaris sudah dihapus.");

  const jumlahAset = angkaDesimal(aset.jumlah);
  const jumlahMutasi = angkaDesimal(mutasi.jumlahMutasi);
  if (jumlahMutasi <= 0) throw conflict("Jumlah mutasi harus lebih dari nol.");
  if (jumlahMutasi > jumlahAset + TOLERANSI_JUMLAH) {
    throw conflict("Jumlah mutasi melebihi jumlah aset yang tersedia.");
  }

  if (mutasi.jenis === "hapus") {
    const sisa = Math.max(0, jumlahAset - jumlahMutasi);
    if (sisa <= TOLERANSI_JUMLAH) {
      return {
        jumlah: "0.00",
        nilaiAkhir: "0.00",
        isDeleted: true,
        deletedAt: new Date(),
      };
    }

    return {
      jumlah: sisa.toFixed(2),
      nilaiAkhir: nilaiAkhirBaru(aset.hargaSatuan, sisa),
    };
  }

  if (Math.abs(jumlahMutasi - jumlahAset) > TOLERANSI_JUMLAH) {
    throw conflict(
      "Mutasi pindah, rusak, dan perbaikan harus mencakup seluruh jumlah aset. Gunakan jenis hapus untuk mutasi sebagian.",
    );
  }

  if (mutasi.jenis === "pindah") {
    const lokasiBaru = mutasi.lokasiBaru?.trim();
    if (!lokasiBaru) throw conflict("Lokasi baru wajib diisi untuk mutasi pindah.");
    return { lokasi: lokasiBaru };
  }

  if (mutasi.jenis === "rusak") {
    if (!mutasi.kondisiBaru || mutasi.kondisiBaru === "baik") {
      throw conflict("Kondisi baru harus rusak ringan atau rusak berat untuk mutasi rusak.");
    }
    return { kondisi: mutasi.kondisiBaru };
  }

  const kondisiBaru = mutasi.kondisiBaru ?? "baik";
  return { kondisi: kondisiBaru };
}
