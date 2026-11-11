import { z } from "zod";

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";

export const KIA_RESOURCE = "kesehatan" as const;

export const STATUS_KEHAMILAN = [
  { value: 1, label: "Normal" },
  { value: 2, label: "Risiko Tinggi" },
  { value: 3, label: "Kekurangan Energi Kronis" },
] as const;

export const STATUS_GIZI_ANAK = [
  { value: 1, label: "Sehat/Normal" },
  { value: 2, label: "Gizi Kurang" },
  { value: 3, label: "Gizi Buruk" },
  { value: 4, label: "Stunting" },
] as const;

export const STATUS_TIKAR_ANAK = [
  { value: 1, label: "Tidak Diukur" },
  { value: 2, label: "Merah" },
  { value: 3, label: "Kuning" },
  { value: 4, label: "Hijau" },
] as const;

export const posyanduSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  nama: z.string().min(1).max(100),
  alamat: z.string().max(200).optional().or(z.literal("")),
  namaKetua: z.string().max(100).optional().or(z.literal("")),
  namaBidan: z.string().max(100).optional().or(z.literal("")),
});

export type PosyanduInput = z.infer<typeof posyanduSchema>;
export type Posyandu = PosyanduInput & { id: number };

export const kiaSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  noKia: z.string().min(1).max(30),
  ibuId: z.number().int().positive(),
  anakId: z.number().int().positive().optional().nullable(),
  hariPerkiraanLahir: z.string().optional().or(z.literal("")),
});

export type KiaInput = z.infer<typeof kiaSchema>;
export type KiaRow = {
  id: number;
  villageId: number;
  noKia: string;
  ibuId: number;
  anakId: number | null;
  hariPerkiraanLahir: string | null;
  ibuName?: string | null;
  anakName?: string | null;
  posyanduId?: number;
};

export const ibuHamilSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  posyanduId: z.number().int().positive(),
  kiaId: z.number().int().positive(),
  statusKehamilan: z.coerce.number().int().min(1).max(3).optional().nullable(),
  usiaKehamilan: z.coerce.number().int().min(0).max(42).optional().nullable(),
  tanggalMelahirkan: z.string().optional().or(z.literal("")),
  pemeriksaanKehamilan: z.coerce.boolean().optional(),
  konsumsiPilFe: z.coerce.boolean().optional(),
  butirPilFe: z.coerce.number().int().min(0).optional().nullable(),
  pemeriksaanNifas: z.coerce.boolean().optional(),
  konselingGizi: z.coerce.boolean().optional(),
  kunjunganRumah: z.coerce.boolean().optional(),
  aksesAirBersih: z.coerce.boolean().optional(),
  kepemilikanJamban: z.coerce.boolean().optional(),
  jaminanKesehatan: z.coerce.boolean().optional(),
});

export type IbuHamilInput = z.infer<typeof ibuHamilSchema>;
export interface IbuHamilRow {
  id: number;
  posyanduId: number;
  kiaId: number;
  statusKehamilan: number | null;
  usiaKehamilan: number | null;
  tanggalMelahirkan: string | null;
  pemeriksaanKehamilan: boolean;
  konsumsiPilFe: boolean;
  butirPilFe: number | null;
  pemeriksaanNifas: boolean;
  konselingGizi: boolean;
  kunjunganRumah: boolean;
  aksesAirBersih: boolean;
  kepemilikanJamban: boolean;
  jaminanKesehatan: boolean;
}

export const bulananAnakSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  posyanduId: z.number().int().positive(),
  kiaId: z.number().int().positive(),
  statusGizi: z.coerce.number().int().min(1).max(4),
  umurBulan: z.coerce.number().int().min(0).max(60),
  statusTikar: z.coerce.number().int().min(1).max(4),
  pemberianImunisasiDasar: z.coerce.boolean().optional(),
  pemberianImunisasiCampak: z.coerce.boolean().optional().nullable(),
  pengukuranBeratBadan: z.coerce.boolean().optional(),
  beratBadan: z.coerce.number().optional().nullable(),
  pengukuranTinggiBadan: z.coerce.boolean().optional(),
  tinggiBadan: z.coerce.number().optional().nullable(),
  konselingGiziAyah: z.coerce.boolean().optional(),
  konselingGiziIbu: z.coerce.boolean().optional(),
  kunjunganRumah: z.coerce.boolean().optional(),
  airBersih: z.coerce.boolean().optional(),
  kepemilikanJamban: z.coerce.boolean().optional(),
  aktaLahir: z.coerce.boolean().optional(),
  jaminanKesehatan: z.coerce.boolean().optional(),
  pengasuhanPaud: z.coerce.boolean().optional(),
});

export type BulananAnakInput = z.infer<typeof bulananAnakSchema>;
export interface BulananAnakRow {
  id: number;
  posyanduId: number;
  kiaId: number;
  statusGizi: number;
  umurBulan: number;
  statusTikar: number;
  pemberianImunisasiDasar: boolean;
  pemberianImunisasiCampak: boolean | null;
  pengukuranBeratBadan: boolean;
  beratBadan: number | null;
  pengukuranTinggiBadan: boolean;
  tinggiBadan: number | null;
  konselingGiziAyah: boolean;
  konselingGiziIbu: boolean;
  kunjunganRumah: boolean;
  airBersih: boolean;
  kepemilikanJamban: boolean;
  aktaLahir: boolean;
  jaminanKesehatan: boolean;
  pengasuhanPaud: boolean;
}

// --- Rekapitulasi skorcard KIA ---

/** Menghitung rekapitulasi skorcard KIA: total, stunting, dan persentase konversi. */
export function hitungSkorcardKia(
  rows: readonly { statusGizi: number; statusTikar: number; posyanduId?: number }[],
): { total: number; stunting: number; konversi: number } {
  const total = rows.length;
  const stunting = rows.filter((row) => row.statusGizi === 4 || row.statusTikar === 4).length;
  const konversi = total === 0 ? 0 : Math.round((stunting / total) * 10000) / 100;
  return { total, stunting, konversi };
}

/** CSV KIA: header + baris data + baris jumlah. */
export function buildKiaCsv(input: {
  namaDesa: string | null;
  judulPemilihan: string;
  tanggalPemilihan: string;
  rows: readonly {
    statusGizi: number;
    statusTikar: number;
    posyanduId?: number;
    posyanduName?: string;
    ibuName: string | null;
    konversi: string;
  }[];
  total: number;
  stunting: number;
  konversiPersentase: number;
}): string {
  const header = [
    ["Rekapitulasi KIA"],
    [input.namaDesa ?? "-"],
    [input.judulPemilihan],
    [`Tanggal Pemilihan: ${input.tanggalPemilihan}`],
    [],
    ["No", "No KIA", "Ibu", "Status Gizi", "Status Tikar", "Persentase"],
  ] as const;

  const rowsArray = input.rows.map((r, i) => [
    String(i + 1),
    r.posyanduId ? String(r.posyanduId) : "-",
    r.ibuName ?? "-",
    STATUS_GIZI_ANAK.find((s) => s.value === r.statusGizi)?.label ?? "-",
    STATUS_TIKAR_ANAK.find((s) => s.value === r.statusTikar)?.label ?? "-",
    r.konversi,
  ]);

  const total = [
    "",
    "JUMLAH",
    "",
    String(input.total),
    String(input.stunting),
    "-",
    `${input.konversiPersentase}%`,
  ];

  return `\uFEFF${toCsv([...header, ...rowsArray, total])}`;
}

export function kiaRekapFilename(namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";
  return `rekap-kia-${slug}.csv`;
}
// --- Skorcard Konvergensi Desa ---

export interface SkorcardKonvergensiIbuHamil {
  capaianKonvergensi: Record<string, { Y: number; persen: number }> | null;
  tingkatKonvergensiDesa: {
    jumlah_diterima: number;
    jumlah_seharusnya: number;
    persen: number;
  } | null;
}

export interface SkorcardKonvergensiAnak {
  capaianKonvergensi: Record<string, { Y: number; persen: number }> | null;
  tingkatKonvergensiDesa: {
    jumlah_diterima: number;
    jumlah_seharusnya: number;
    persen: number;
  } | null;
}

export interface SkorcardKonvergensiResult {
  jumlahTotalRt: number;
  ibuHamilTotal: number;
  jumlahKekRisti: number;
  bulananAnakTotal: number;
  jumlahGiziBukanNormal: number;
  tikar: { H: number; K: number; M: number };
  ibuHamil: SkorcardKonvergensiIbuHamil;
  bulananAnak: SkorcardKonvergensiAnak;
}

/**
 * Menghitung rekapitulasi skorcard konvergensi desa dari data ibu hamil dan anak.
 * Mengikuti pola OpenSID: Tabel 1 (sasaran), Tabel 2 (tikar pertumbuhan),
 * Tabel 3 (kele玲apan konvergensi), Tabel 4 (tingkat konvergensi desa).
 */
export function buildSkorcardKonvergensi(
  ibuHamilRows: readonly IbuHamilRow[],
  bulananAnakRows: readonly BulananAnakRow[],
): SkorcardKonvergensiResult {
  const ibuHamilTotal = ibuHamilRows.length;
  const bulananAnakTotal = bulananAnakRows.length;
  const jumlahKekRisti = ibuHamilRows.filter((r) => r.statusKehamilan === 3).length;
  const jumlahGiziBukanNormal = bulananAnakRows.filter(
    (r) => r.statusGizi === 2 || r.statusGizi === 3 || r.statusGizi === 4,
  ).length;

  // Tabel 2: Tikar pertumbuhan
  const tikar = { H: 0, K: 0, M: 0 };
  for (const row of bulananAnakRows) {
    if (row.statusTikar === 4) tikar.H++;
    else if (row.statusTikar === 3) tikar.K++;
    else if (row.statusTikar === 2) tikar.M++;
  }

  // Tabel 3: Capaian konvergensi Ibu Hamil (8 indikator)
  const ibuIndicators = [
    "periksa_kehamilan",
    "pil_fe",
    "pemeriksaan_nifas",
    "konseling_gizi",
    "kunjungan_rumah",
    "akses_air_bersih",
    "kepemilikan_jamban",
    "jaminan_kesehatan",
  ] as const;

  const ibuIndicatorsMap: Record<string, keyof IbuHamilRow> = {
    periksa_kehamilan: "pemeriksaanKehamilan",
    pil_fe: "konsumsiPilFe",
    pemeriksaan_nifas: "pemeriksaanNifas",
    konseling_gizi: "konselingGizi",
    kunjungan_rumah: "kunjunganRumah",
    akses_air_bersih: "aksesAirBersih",
    kepemilikan_jamban: "kepemilikanJamban",
    jaminan_kesehatan: "jaminanKesehatan",
  };
  const ibuCapaian: Record<string, { Y: number; persen: number }> = {};
  for (const key of ibuIndicators) {
    const col = ibuIndicatorsMap[key];
    if (!col) continue;
    const y = ibuHamilRows.filter((r) => r[col] === true).length;
    ibuCapaian[key] = {
      Y: y,
      persen: ibuHamilTotal === 0 ? 0 : Math.round((y / ibuHamilTotal) * 10000) / 100,
    };
  }

  // Tabel 3: Capaian konvergensi Anak (10 indikator)
  const anakIndicators = [
    "imunisasi",
    "pengukuran_berat_badan",
    "pengukuran_tinggi_badan",
    "konseling_gizi",
    "kunjungan_rumah",
    "air_bersih",
    "jamban_sehat",
    "akta_lahir",
    "jaminan_kesehatan",
    "pengasuhan_paud",
  ] as const;

  const anakCapaian: Record<string, { Y: number; persen: number }> = {};
  const indicatorsMap: Record<string, keyof BulananAnakRow> = {
    imunisasi: "pemberianImunisasiDasar",
    pengukuran_berat_badan: "pengukuranBeratBadan",
    pengukuran_tinggi_badan: "pengukuranTinggiBadan",
    konseling_gizi: "konselingGiziIbu",
    kunjungan_rumah: "kunjunganRumah",
    air_bersih: "airBersih",
    jamban_sehat: "kepemilikanJamban",
    akta_lahir: "aktaLahir",
    jaminan_kesehatan: "jaminanKesehatan",
    pengasuhan_paud: "pengasuhanPaud",
  };

  for (const key of anakIndicators) {
    const col = indicatorsMap[key];
    const y = bulananAnakRows.filter((r) => r[col as keyof BulananAnakRow] === true).length;
    anakCapaian[key] = {
      Y: y,
      persen: bulananAnakTotal === 0 ? 0 : Math.round((y / bulananAnakTotal) * 10000) / 100,
    };
  }

  // Tingkat konvergensi desa
  const ibuTingkatKonvergensi = hitungTingkatKonvergensi(
    ibuHamilTotal,
    ibuIndicators,
    ibuHamilRows as unknown as Record<string, unknown>[],
    ibuIndicatorsMap,
  );
  const anakTingkatKonvergensi = hitungTingkatKonvergensi(
    bulananAnakTotal,
    anakIndicators,
    bulananAnakRows as unknown as Record<string, unknown>[],
    indicatorsMap,
  );

  return {
    jumlahTotalRt: ibuHamilTotal + bulananAnakTotal,
    ibuHamilTotal,
    jumlahKekRisti,
    bulananAnakTotal,
    jumlahGiziBukanNormal,
    tikar,
    ibuHamil: { capaianKonvergensi: ibuCapaian, tingkatKonvergensiDesa: ibuTingkatKonvergensi },
    bulananAnak: {
      capaianKonvergensi: anakCapaian,
      tingkatKonvergensiDesa: anakTingkatKonvergensi,
    },
  };
}

function hitungTingkatKonvergensi(
  total: number,
  indicators: readonly string[],
  rows: readonly Record<string, unknown>[],
  indicatorsMap?: Record<string, string>,
): { jumlah_diterima: number; jumlah_seharusnya: number; persen: number } | null {
  if (total === 0) return null;
  let jumlahDiterima = 0;
  let jumlahSeharusnya = 0;
  for (const key of indicators) {
    jumlahSeharusnya += total;
    const col = indicatorsMap?.[key];
    if (col) jumlahDiterima += rows.filter((r) => r[col] === true).length;
  }
  const persen =
    jumlahSeharusnya === 0 ? 0 : Math.round((jumlahDiterima / jumlahSeharusnya) * 10000) / 100;
  return { jumlah_diterima: jumlahDiterima, jumlah_seharusnya: jumlahSeharusnya, persen };
}
