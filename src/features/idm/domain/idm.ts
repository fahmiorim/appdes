import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const idmFormSchema = z.object({
  tahun: z.coerce.number().int().positive("Tahun harus lebih dari 0."),
  kode: z.string().trim().min(1, "Kode wajib diisi.").max(20),
  nama: z.string().trim().min(1, "Nama indikator wajib diisi.").max(200),
  skor: z.coerce
    .number()
    .min(0, "Skor minimal 0.")
    .max(100, "Skor maksimal 100.")
    .nullable()
    .optional(),
  kategori: z.string().trim().max(50).nullable().optional(),
  keterangan: z.string().trim().max(1000).nullable().optional(),
  id: z.coerce.number().int().positive().optional(),
});

export type IdmFormInput = z.input<typeof idmFormSchema>;
export type IdmFormValues = z.infer<typeof idmFormSchema>;

export interface IdmIndikatorDTO {
  id: number;
  villageId: number;
  tahun: number;
  kode: string;
  nama: string;
  skor: number | null;
  kategori: string | null;
  keterangan: string | null;
}

export const IDM_RESOURCE = RESOURCES.idm;
export const SDGS_RESOURCE = RESOURCES.idmSdgs;

/** Dimensi IDM beserta kode resmi yang dipakai sebagai prefix indikator. */
export const IDM_DIMENSI = [
  { id: "iks", kode: "IKS", label: "Indeks Ketahanan Sosial", prefix: "I" },
  { id: "ike", kode: "IKE", label: "Indeks Ketahanan Ekonomi", prefix: "II" },
  { id: "ikl", kode: "IKL", label: "Indeks Ketahanan Lingkungan", prefix: "III" },
] as const;

export type IdmDimensiId = (typeof IDM_DIMENSI)[number]["id"];

/**
 * Tentukan dimensi dari kode indikator.
 *
 * Operator OpenSID menomori indikator sebagai `I.1`, `II.3`, dst., tetapi ada
 * juga yang menulis `IKS-01`. Keduanya diterima; kode lain (mis. indikator
 * tambahan) diabaikan dari rekap IDM agar skor tidak bias.
 * Juga menerima prefix kode dimensi lowercase (ike, ikl, iks) dengan separator
 * titik atau spasi.
 */
export function dimensiDariKode(kode: string): IdmDimensiId | null {
  const bersih = kode.trim().toUpperCase();
  if (!bersih) return null;

  // 1. Cek kode dimensi dengan dash: IKS-01, IKE-02, IKL-03
  const kodeDimensi = IDM_DIMENSI.find((dimensi) => bersih.startsWith(`${dimensi.kode}-`));
  if (kodeDimensi) return kodeDimensi.id;

  // 2. Ambil prefix sebelum separator (., spasi, /, -)
  const prefix = bersih.split(/[.\s/-]/)[0];

  // 3. Cek prefix romawi: I, II, III
  let dimensi = IDM_DIMENSI.find((item) => item.prefix === prefix);
  if (dimensi) return dimensi.id;

  // 4. Cek kode dimensi lowercase sebagai prefix: iks, ike, ikl
  const prefixLower = (prefix ?? "").toLowerCase();
  dimensi = IDM_DIMENSI.find((item) => item.kode.toLowerCase() === prefixLower);
  if (dimensi) return dimensi.id;

  return null;
}

/** Normalisasi skor indikator (0–100) menjadi 0–1. */
export function normalisasiSkor(skor: number | null | undefined): number | null {
  if (skor === null || skor === undefined || Number.isNaN(skor)) return null;
  const dibatasi = Math.min(100, Math.max(0, skor));
  return Number((dibatasi / 100).toFixed(4));
}

export const IDM_STATUS = [
  "Sangat Tertinggal",
  "Tertinggal",
  "Berkembang",
  "Maju",
  "Mandiri",
] as const;

export type IdmStatus = (typeof IDM_STATUS)[number];

/**
 * Klasifikasi status IDM dari skor 0–1.
 *
 * Ambang mengikuti Peraturan Menteri Desa (PDTT) yang dipakai OpenSID:
 * < 0,4909 sangat tertinggal; < 0,5989 tertinggal; < 0,7072 berkembang;
 * < 0,8155 maju; selebihnya mandiri.
 */
export function statusIdm(skor: number): IdmStatus {
  if (skor < 0.4909) return "Sangat Tertinggal";
  if (skor < 0.5989) return "Tertinggal";
  if (skor < 0.7072) return "Berkembang";
  if (skor < 0.8155) return "Maju";
  return "Mandiri";
}

export interface RekapDimensi {
  id: IdmDimensiId;
  kode: string;
  label: string;
  jumlahIndikator: number;
  skor: number | null;
}

export interface RekapIdm {
  tahun: number | null;
  dimensi: RekapDimensi[];
  /** Rata-rata ketiga dimensi; `null` bila belum ada indikator terisi. */
  skor: number | null;
  status: IdmStatus | null;
  jumlahIndikator: number;
}

/**
 * Hitung rekap IDM dari daftar indikator satu tahun.
 *
 * Skor IDM adalah rata-rata skor ketiga dimensi (bukan rata-rata seluruh
 * indikator) supaya dimensi dengan jumlah indikator lebih banyak tidak
 * mendominasi hasil, sesuai metode OpenSID.
 */
export function hitungRekapIdm(rows: readonly IdmIndikatorDTO[]): RekapIdm {
  const terisi = rows.filter((row) => dimensiDariKode(row.kode) !== null);
  const tahun = terisi[0]?.tahun ?? rows[0]?.tahun ?? null;

  const dimensi = IDM_DIMENSI.map((item) => {
    const nilai = terisi
      .filter((row) => dimensiDariKode(row.kode) === item.id)
      .map((row) => normalisasiSkor(row.skor))
      .filter((skor): skor is number => skor !== null);

    const skor =
      nilai.length > 0
        ? Number((nilai.reduce((total, skor) => total + skor, 0) / nilai.length).toFixed(4))
        : null;

    return {
      id: item.id,
      kode: item.kode,
      label: item.label,
      jumlahIndikator: nilai.length,
      skor,
    } satisfies RekapDimensi;
  });

  const skorDimensi = dimensi
    .map((item) => item.skor)
    .filter((skor): skor is number => skor !== null);

  const skor =
    skorDimensi.length > 0
      ? Number(
          (skorDimensi.reduce((total, nilai) => total + nilai, 0) / skorDimensi.length).toFixed(4),
        )
      : null;

  return {
    tahun,
    dimensi,
    skor,
    status: skor === null ? null : statusIdm(skor),
    jumlahIndikator: dimensi.reduce((sum, d) => sum + d.jumlahIndikator, 0),
  };
}

/** 18 tujuan SDGs Desa sesuai katalog OpenSID. */
export const SDGS_GOALS = [
  { nomor: 1, nama: "Desa Tanpa Kemiskinan" },
  { nomor: 2, nama: "Desa Tanpa Kelaparan" },
  { nomor: 3, nama: "Desa Sehat dan Sejahtera" },
  { nomor: 4, nama: "Pendidikan Desa Berkualitas" },
  { nomor: 5, nama: "Keterlibatan Perempuan Desa" },
  { nomor: 6, nama: "Desa Layak Air Bersih dan Sanitasi" },
  { nomor: 7, nama: "Desa Berenergi Bersih dan Terbarukan" },
  { nomor: 8, nama: "Pertumbuhan Ekonomi Desa Merata" },
  { nomor: 9, nama: "Infrastruktur dan Inovasi Desa Sesuai Kebutuhan" },
  { nomor: 10, nama: "Desa Tanpa Kesenjangan" },
  { nomor: 11, nama: "Kawasan Permukiman Desa Aman dan Nyaman" },
  { nomor: 12, nama: "Konsumsi dan Produksi Desa Sadar Lingkungan" },
  { nomor: 13, nama: "Desa Tanggap Perubahan Iklim" },
  { nomor: 14, nama: "Desa Peduli Lingkungan Laut" },
  { nomor: 15, nama: "Desa Peduli Lingkungan Darat" },
  { nomor: 16, nama: "Desa Damai Berkeadilan" },
  { nomor: 17, nama: "Kemitraan untuk Pembangunan Desa" },
  { nomor: 18, nama: "Kelembagaan Desa Dinamis dan Budaya Desa Adaptif" },
] as const;

export const sdgsFormSchema = z.object({
  tahun: z.coerce.number().int().positive(),
  goal: z.coerce
    .number()
    .int()
    .min(1, "Tujuan SDGs minimal 1.")
    .max(18, "Tujuan SDGs maksimal 18."),
  skor: z.coerce
    .number()
    .int("Skor harus bilangan bulat.")
    .min(0, "Skor minimal 0.")
    .max(100, "Skor maksimal 100."),
  keterangan: z.string().trim().max(2000).nullable().optional(),
});

export type SdgsFormInput = z.input<typeof sdgsFormSchema>;
export type SdgsFormValues = z.infer<typeof sdgsFormSchema>;

export interface SdgsDTO {
  id: number;
  villageId: number;
  tahun: number;
  goal: number;
  skor: number;
  keterangan: string | null;
}

export interface RekapSdgs {
  skor: number | null;
  predikat: string | null;
  jumlahTerisi: number;
}

/**
 * Predikat capaian SDGs Desa.
 * >= 0,85 Sangat Baik; >= 0,6 Baik; >= 0,4 Cukup; sisanya Kurang.
 */
export function predikatSdgs(skor: number): string {
  if (skor >= 0.85) return "Sangat Baik";
  if (skor >= 0.6) return "Baik";
  if (skor >= 0.4) return "Cukup";
  return "Kurang";
}

export function hitungRekapSdgs(rows: readonly SdgsDTO[]): RekapSdgs {
  const terisi = rows.filter((row) => row.skor !== null && row.skor !== undefined);
  const jumlahTerisi = terisi.length;

  if (jumlahTerisi === 0) {
    return { skor: null, predikat: null, jumlahTerisi: 0 };
  }

  const skor = terisi.reduce((sum, row) => sum + normalisasiSkor(row.skor)!, 0) / jumlahTerisi;

  return {
    skor: Number(skor.toFixed(4)),
    predikat: predikatSdgs(skor),
    jumlahTerisi,
  };
}

export function namaGoalSdgs(goal: number): string {
  const found = SDGS_GOALS.find((g) => g.nomor === goal);
  return found?.nama ?? `Tujuan ${goal}`;
}

export function formatSkor(skor: number | null): string {
  if (skor === null) return "—";
  // Gunakan pembulatan yang benar untuk menghindari floating-point error
  const dibulatkan = Math.round(skor * 1000) / 1000;
  return dibulatkan.toFixed(3).replace(".", ",");
}
