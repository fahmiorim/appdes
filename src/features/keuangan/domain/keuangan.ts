import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const KEUANGAN_RESOURCE = RESOURCES.keuangan;

/** Resource RBAC modul laporan keuangan (harus sama dengan `modules.slug`). */
export const LAPORAN_KEUANGAN_RESOURCE = RESOURCES.laporanKeuangan;

// --- Akun level-1 (chart of accounts) --------------------------------------

/**
 * Akun level-1 beserta perannya di laporan APBDes.
 *
 * `reportable` menandai akun yang ikut dihitung pada ringkasan RP APBDes;
 * akun `PENDAPATAN`/`BELANJA`/`PEMBIAYAAN` masuk, sedangkan aset, kewajiban,
 * ekuitas, dan non-anggaran tidak.
 */
export const KEUANGAN_AKUN = [
  { kode: "1", nama: "ASET", reportable: false },
  { kode: "2", nama: "KEWAJIBAN", reportable: false },
  { kode: "3", nama: "EKUITAS", reportable: false },
  { kode: "4", nama: "PENDAPATAN", reportable: true },
  { kode: "5", nama: "BELANJA", reportable: true },
  { kode: "6", nama: "PEMBIAYAAN", reportable: true },
  { kode: "7", nama: "NON ANGGARAN", reportable: false },
] as const;

export type KeuanganAkunKode = (typeof KEUANGAN_AKUN)[number]["kode"];

/** Kode akun yang dikecualikan dari ringkasan APBDes. */
export const EXCLUDED_AKUN: readonly string[] = KEUANGAN_AKUN.filter(
  (item) => !item.reportable,
).map((item) => item.kode);

/**
 * Level rekening mengikuti **panjang string kode** — persis seperti sistem
 * rujukan (`length(template_uuid)`), bukan jumlah segmen.
 *
 * | Panjang | Level    | Contoh      |
 * | ------- | -------- | ----------- |
 * | 1       | akun     | `4`, `5`    |
 * | 3       | bidang   | `5.1`       |
 * | 5       | kegiatan | `5.1.1`     |
 * | 8       | rincian  | `5.1.1.01`  |
 * | 11      | sub      | `5.1.1.01.01` |
 *
 * Konsistensi dengan rujukan penting karena daftar input (`length <= 5`),
 * agregasi (`length 5`/`8`/`11`), dan laporan RP APBDes (`length 1`) semuanya
 * bertumpu pada konvensi ini.
 */
export const KODE_LENGTH = {
  akun: 1,
  bidang: 3,
  kegiatan: 5,
  rincian: 8,
  sub: 11,
} as const;

/** Panjang string kode rekening (tanpa spasi). `0` untuk kode kosong. */
export function kodeLength(uuid: string): number {
  return uuid.trim().length;
}

/** Kedalaman (level) kode, dinyatakan sebagai panjang string. */
export function kodeLevel(uuid: string): number {
  return kodeLength(uuid);
}

/** Kedalaman berdasarkan jumlah segmen (untuk indentasi visual UI). */
export function kodeDepth(uuid: string): number {
  const trimmed = uuid.trim();
  if (trimmed === "") return 0;
  return trimmed.split(".").length;
}

/** Induk langsung sebuah kode (`4.1.1.01` → `4.1.1`); `null` untuk akun. */
export function parentKode(uuid: string): string | null {
  const trimmed = uuid.trim();
  const parts = trimmed.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

/** Apakah kode ini akun level-1 (mis. `4`, `5`)? */
export function isAkunLevel1(uuid: string): boolean {
  return kodeLength(uuid) === KODE_LENGTH.akun;
}

/**
 * Apakah baris ini boleh diubah langsung lewat form.
 *
 * Sistem rujukan hanya menampilkan/mengizinkan input pada `length <= 5`
 * (akun & kegiatan); level di bawahnya diagregasi otomatis dari anaknya.
 */
export function isInputRow(uuid: string): boolean {
  const length = kodeLength(uuid);
  return length > 0 && length <= KODE_LENGTH.kegiatan;
}

/** Apakah kode ini termasuk akun yang dikecualikan dari APBDes? */
export function isExcludedAkun(uuid: string): boolean {
  return EXCLUDED_AKUN.includes(uuid.trim().split(".")[0] ?? "");
}

// --- Uang ------------------------------------------------------------------

/** Jumlahkan daftar nilai uang (string desimal) dengan aman. */
export function sumMoney(values: readonly string[]): string {
  const total = values.reduce((acc, value) => acc + toMinor(value), 0n);
  return formatMoney(total);
}

/** Ubah uang (string desimal) menjadi bilangan bulat sen (×100) untuk penjumlahan. */
export function toMinor(value: string): bigint {
  const trimmed = value.trim();
  if (trimmed === "") return 0n;

  const negative = trimmed.startsWith("-");
  const digits = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", fraction = ""] = digits.split(".");
  const sen = (fraction + "00").slice(0, 2);
  const minor = BigInt(whole || "0") * 100n + BigInt(sen || "0");

  return negative ? -minor : minor;
}

/** Format sen (bilangan bulat) kembali menjadi string desimal 2 angka. */
export function formatMoney(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const sen = abs % 100n;
  const text = `${whole}.${String(sen).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

/** Persentase realisasi terhadap anggaran (0 bila anggaran 0). */
export function realisasiPersen(anggaran: string, realisasi: string): number {
  const pagu = toMinor(anggaran);
  if (pagu === 0n) return 0;
  return Number((toMinor(realisasi) * 10000n) / pagu) / 100;
}

// --- Ringkasan RP APBDes ---------------------------------------------------

export interface KeuanganBarisDTO {
  templateUuid: string;
  uraian: string;
  level: number;
  anggaran: string;
  realisasi: string;
}

export interface RpApbdRingkas {
  pendapatan: string;
  belanja: string;
  pembiayaan: string;
  surplus: string;
}

/**
 * Hitung ringkasan RP APBDes dari baris-baris akun level-1.
 *
 * Pembiayaan dihitung **netto** (penerimaan − pengeluaran); nilai negatif
 * berarti pembiayaan netto negatif (pengeluaran lebih besar).
 */
export function ringkasRpApbd(rows: readonly KeuanganBarisDTO[]): RpApbdRingkas {
  const akun = (kode: string) => rows.find((row) => row.templateUuid === kode);

  const pendapatan = akun("4")?.anggaran ?? "0.00";
  const belanja = akun("5")?.anggaran ?? "0.00";
  const pembiayaan = akun("6")?.anggaran ?? "0.00";

  const surplus = formatMoney(toMinor(pendapatan) - toMinor(belanja) + toMinor(pembiayaan));

  return { pendapatan, belanja, pembiayaan, surplus };
}

// --- Laporan RP APBDes -----------------------------------------------------

/** Baris laporan: satu akun (dengan realisasi, selisih, dan %). */
export interface RpApbdBaris {
  kode: string;
  uraian: string;
  anggaran: string;
  realisasi: string;
  /** Anggaran − realisasi (sisa pagu; negatif berarti realisasi melebihi pagu). */
  selisih: string;
  /** Realisasi ÷ anggaran × 100 (0 bila pagu 0). */
  persen: number;
}

/**
 * Susun baris laporan RP APBDes untuk akun terpilih.
 *
 * Mengikuti `lap_rp_abpd()` pada sistem rujukan: nilai diambil dari baris
 * akun (yang sudah teragregasi dari anaknya) lalu dikemas bersama realisasi,
 * selisih, dan persentase realisasi.
 */
export function laporanRpApbd(
  rows: readonly KeuanganBarisDTO[],
  akunKode: readonly string[],
): RpApbdBaris[] {
  const byKode = new Map(rows.map((row) => [row.templateUuid, row]));

  return akunKode.map((kode) => {
    const row = byKode.get(kode);
    const anggaran = row?.anggaran ?? "0.00";
    const realisasi = row?.realisasi ?? "0.00";

    return {
      kode,
      uraian: row?.uraian ?? kode,
      anggaran,
      realisasi,
      selisih: formatMoney(toMinor(anggaran) - toMinor(realisasi)),
      persen: realisasiPersen(anggaran, realisasi),
    };
  });
}

/** Total baris laporan (anggaran, realisasi, selisih). */
export interface RpApbdTotal {
  anggaran: string;
  realisasi: string;
  selisih: string;
}

export function totalLaporan(baris: readonly RpApbdBaris[]): RpApbdTotal {
  const anggaran = sumMoney(baris.map((item) => item.anggaran));
  const realisasi = sumMoney(baris.map((item) => item.realisasi));
  return {
    anggaran,
    realisasi,
    selisih: formatMoney(toMinor(anggaran) - toMinor(realisasi)),
  };
}

/** Akun yang tampil pada laporan RP APBDes (Pendapatan, Belanja, Pembiayaan). */
export const AKUN_LAPORAN: readonly string[] = KEUANGAN_AKUN.filter((item) => item.reportable).map(
  (item) => item.kode,
);

// --- Realisasi per bidang --------------------------------------------------

/**
 * Bidang belanja = anak langsung akun `5` (kode `5.1`–`5.5`, `length = 3`).
 *
 * Sesuai `rincian_realisasi_bidang_manual` pada sistem rujukan, yang memecah
 * realisasi belanja menurut bidang.
 */
export function listBidangBelanja(rows: readonly KeuanganBarisDTO[]): KeuanganBarisDTO[] {
  return rows
    .filter((row) => {
      const kode = row.templateUuid;
      return kodeLength(kode) === KODE_LENGTH.bidang && kode.startsWith("5.");
    })
    .sort((a, b) => a.templateUuid.localeCompare(b.templateUuid));
}

// --- Grafik ----------------------------------------------------------------

export interface GrafikBatangan {
  label: string;
  kode: string;
  anggaran: number;
  realisasi: number;
}

/**
 * Seri grafik batang (anggaran vs realisasi) untuk kumpulan baris.
 *
 * Nilai dikembalikan dalam **rupiah utuh** (bukan sen) agar langsung siap
 * digambar oleh komponen grafik berbasis SVG.
 */
export function seriGrafik(baris: readonly RpApbdBaris[]): GrafikBatangan[] {
  return baris.map((item) => ({
    label: item.uraian,
    kode: item.kode,
    anggaran: Number(toMinor(item.anggaran) / 100n),
    realisasi: Number(toMinor(item.realisasi) / 100n),
  }));
}

// --- Skema formulir --------------------------------------------------------

export const keuanganTahunSchema = z
  .string()
  .trim()
  .refine((value) => /^\d{4}$/.test(value), "Tahun harus 4 angka.")
  .refine((value) => Number(value) >= 2000 && Number(value) <= 2100, "Tahun di luar rentang wajar.")
  .transform((value) => Number(value));

export const keuanganBarisFormSchema = z.object({
  templateUuid: z.string().trim().min(1, "Rekening wajib dipilih.").max(20),
  anggaran: z.coerce
    .number()
    .min(0, "Anggaran tidak boleh negatif.")
    .max(1_000_000_000_000, "Anggaran terlalu besar.")
    .optional()
    .default(0),
  realisasi: z.coerce
    .number()
    .min(0, "Realisasi tidak boleh negatif.")
    .max(1_000_000_000_000, "Realisasi terlalu besar.")
    .optional()
    .default(0),
});

export type KeuanganBarisInput = z.infer<typeof keuanganBarisFormSchema>;

/** Bilangan rupiah → string desimal 2 angka (aman untuk perhitungan). */
export function numberToMoney(value: number): string {
  return formatMoney(BigInt(Math.round(value * 100)));
}

export function formatRupiah(value: string): string {
  const minor = toMinor(value);
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = (abs / 100n).toLocaleString("id-ID");
  return `${negative ? "-" : ""}Rp ${whole}`;
}
