import { z } from "zod";

import { optionalDigits } from "@/lib/forms";

/** Jenis pertanyaan yang didukung builder survei. */
export const TIPE_SOAL = ["text", "number", "choice"] as const;
export type TipeSoal = (typeof TIPE_SOAL)[number];

export const TIPE_SOAL_LABELS: Record<TipeSoal, string> = {
  text: "Isian",
  number: "Angka",
  choice: "Pilihan Ganda",
};

export const JUDUL_MAX = 200;
export const DESKRIPSI_MAX = 2000;
export const PERTANYAAN_MAX = 500;
export const PILIHAN_MIN = 2;
export const PILIHAN_MAX = 10;
export const NAMA_RESPONDEN_MAX = 150;
export const SASARAN_MAX = 200;
export const BOBOT_MIN = 1;
export const BOBOT_MAX = 100;

/** Tipe dari DB bisa berupa teks bebas; nilai tak dikenal jatuh ke `text`. */
export function normalizeTipeSoal(value: string | null | undefined): TipeSoal {
  return (TIPE_SOAL as readonly string[]).includes(value ?? "") ? (value as TipeSoal) : "text";
}

/**
 * Baca daftar pilihan soal.
 *
 * Disimpan sebagai JSON array; data rusak/lama menghasilkan daftar kosong
 * (soal tetap tampil sebagai isian biasa, bukan membuat halaman gagal).
 */
export function parsePilihanSoal(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item !== "")
      .slice(0, PILIHAN_MAX);
  } catch {
    return [];
  }
}

/** Ubah isian textarea (satu pilihan per baris) menjadi daftar unik. */
export function parsePilihanForm(raw: string): string[] {
  const hasil: string[] = [];
  for (const baris of raw.split(/\r?\n/)) {
    const nilai = baris.trim();
    if (nilai === "" || hasil.includes(nilai)) continue;
    hasil.push(nilai);
  }
  return hasil;
}

/** Serialisasi pilihan untuk kolom `survey_soal.pilihan`. */
export function serializePilihan(pilihan: readonly string[]): string | null {
  return pilihan.length === 0 ? null : JSON.stringify(pilihan);
}

/** Baca peta pilihan → skor 0–5 dari kolom `survey_soal.skor_pilihan`. */
export function parseSkorPilihanSoal(raw: string | null | undefined): Record<string, number> {
  if (!raw || raw.trim() === "") return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const hasil: Record<string, number> = {};
    for (const [label, nilai] of Object.entries(parsed)) {
      if (typeof nilai === "number" && Number.isFinite(nilai)) {
        hasil[label] = Math.min(5, Math.max(0, nilai));
      }
    }
    return hasil;
  } catch {
    return {};
  }
}

/**
 * Baca isian skor (satu baris `Pilihan=skor`) berdasarkan daftar pilihan soal.
 * Baris untuk pilihan yang tidak ada diabaikan; kosong berarti tanpa skor.
 */
export function parseSkorPilihanForm(
  raw: string,
  pilihan: readonly string[],
): Record<string, number> {
  const hasil: Record<string, number> = {};

  for (const baris of raw.split(/\r?\n/)) {
    const [label, nilai] = baris.split("=");
    const nama = label?.trim() ?? "";
    if (!nama || !pilihan.includes(nama)) continue;

    const angka = Number(nilai?.trim());
    if (!Number.isFinite(angka)) continue;
    hasil[nama] = Math.min(5, Math.max(0, angka));
  }

  return hasil;
}

/** Serialisasi peta skor pilihan untuk kolom `survey_soal.skor_pilihan`. */
export function serializeSkorPilihan(peta: Readonly<Record<string, number>>): string | null {
  return Object.keys(peta).length === 0 ? null : JSON.stringify(peta);
}

/** Isian teks skor untuk formulir, satu baris per pilihan. */
export function formatSkorPilihanForm(
  pilihan: readonly string[],
  peta: Readonly<Record<string, number>>,
): string {
  return pilihan.map((label) => `${label}=${peta[label] ?? 0}`).join("\n");
}

/** Tanggal opsional berformat `YYYY-MM-DD`. */
const tanggalOpsional = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Format tanggal tidak valid.");

/** Formulir survei (tambah/ubah), termasuk sasaran dan periode pengisian. */
export const surveyFormSchema = z
  .object({
    judul: z.string().trim().min(1, "Judul wajib diisi.").max(JUDUL_MAX),
    deskripsi: z
      .string()
      .trim()
      .max(DESKRIPSI_MAX, `Deskripsi maksimal ${DESKRIPSI_MAX} karakter.`)
      .optional()
      .or(z.literal("")),
    sasaran: z.string().trim().max(SASARAN_MAX).optional().or(z.literal("")),
    mulai: tanggalOpsional,
    selesai: tanggalOpsional,
    aktif: z.preprocess(
      (value) => value === "1" || value === "on" || value === "true" || value === true,
      z.boolean(),
    ),
  })
  .refine((value) => !value.mulai || !value.selesai || value.mulai <= value.selesai, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    path: ["selesai"],
  });

export type SurveyInput = z.infer<typeof surveyFormSchema>;

/** Formulir pertanyaan; pilihan wajib 2–10 untuk tipe `choice`. */
export const soalFormSchema = z
  .object({
    surveyId: z.coerce.number().int().min(1, "Survei tidak valid."),
    pertanyaan: z.string().trim().min(1, "Pertanyaan wajib diisi.").max(PERTANYAAN_MAX),
    tipe: z.enum(TIPE_SOAL),
    pilihan: z.string().trim().max(4000).optional().or(z.literal("")),
    bobot: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? 1 : value),
      z.coerce.number().int().min(BOBOT_MIN).max(BOBOT_MAX),
    ),
    skorPilihan: z.string().trim().max(4000).optional().or(z.literal("")),
    indikatorId: z.preprocess(
      (value) =>
        value === "" || value === "0" || value === null || value === undefined ? null : value,
      z.coerce.number().int().positive().nullable(),
    ),
    urutan: z.coerce.number().int().min(0).max(9999),
  })
  .superRefine((value, ctx) => {
    if (value.tipe !== "choice") return;

    const pilihan = parsePilihanForm(value.pilihan ?? "");
    if (pilihan.length < PILIHAN_MIN) {
      ctx.addIssue({
        code: "custom",
        path: ["pilihan"],
        message: `Isi minimal ${PILIHAN_MIN} pilihan, satu per baris.`,
      });
    }
    if (pilihan.length > PILIHAN_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["pilihan"],
        message: `Maksimal ${PILIHAN_MAX} pilihan.`,
      });
    }
  });

export type SoalInput = z.infer<typeof soalFormSchema>;

/** Formulir responden; NIK opsional tetapi harus 16 angka bila diisi. */
export const respondenFormSchema = z.object({
  surveyId: z.coerce.number().int().min(1, "Survei tidak valid."),
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(NAMA_RESPONDEN_MAX),
  nik: optionalDigits(16),
});

export type RespondenInput = z.infer<typeof respondenFormSchema>;

/** Baris survei untuk daftar admin. */
export interface SurveyRow {
  id: number;
  judul: string;
  deskripsi: string | null;
  sasaran: string | null;
  mulai: string | null;
  selesai: string | null;
  aktif: boolean;
  jumlahSoal: number;
  jumlahResponden: number;
  createdAt: Date | null;
}

/** Satu soal beserta pilihan yang sudah di-parse. */
export interface SoalRow {
  id: number;
  surveyId: number;
  pertanyaan: string;
  tipe: TipeSoal;
  pilihan: string[];
  bobot: number;
  /** Peta pilihan → skor 0–5 (kosong untuk soal isian/angka). */
  skorPilihan: Record<string, number>;
  indikatorId: number | null;
  urutan: number;
}

/** Responden beserta jumlah jawaban yang tersimpan. */
export interface RespondenRow {
  id: number;
  nama: string | null;
  nik: string | null;
  createdAt: Date | null;
  jumlahJawaban: number;
}

/** Jawaban mentah satu survei (untuk rekap). */
export interface JawabanRow {
  respondenId: number;
  soalId: number;
  jawaban: string;
}

/**
 * Validasi jawaban terhadap daftar soal.
 *
 * Mengembalikan peta `soalId → pesan galat`; peta kosong berarti lengkap.
 * Kunci memakai id soal agar sejajar dengan nama field formulir.
 */
export function validasiJawaban(
  soal: readonly Pick<SoalRow, "id" | "tipe" | "pilihan">[],
  jawaban: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const item of soal) {
    const nilai = (jawaban[String(item.id)] ?? "").trim();

    if (nilai === "") {
      errors[String(item.id)] = "Jawaban wajib diisi.";
      continue;
    }

    if (item.tipe === "number" && !Number.isFinite(Number(nilai))) {
      errors[String(item.id)] = "Jawaban harus berupa angka.";
      continue;
    }

    if (item.tipe === "choice" && !item.pilihan.includes(nilai)) {
      errors[String(item.id)] = "Pilih salah satu pilihan yang tersedia.";
    }
  }

  return errors;
}

export interface RekapDistribusi {
  label: string;
  jumlah: number;
  /** Persentase terhadap responden yang menjawab soal ini (0–100). */
  persentase: number;
}

/** Ringkasan satu soal untuk halaman rekap. */
export interface RekapSoal {
  soalId: number;
  pertanyaan: string;
  tipe: TipeSoal;
  dijawab: number;
  distribusi: RekapDistribusi[];
  rataRata: number | null;
  terkecil: number | null;
  terbesar: number | null;
  jawabanTeks: string[];
}

/** Batas contoh jawaban teks yang ditampilkan di rekap. */
export const REKAP_TEKS_MAKS = 20;

/**
 * Hitung rekap satu soal dari jawaban mentah.
 *
 * - `choice`: hitung tiap pilihan (termasuk yang nol) dan persentasenya.
 * - `number`: rata-rata, nilai terkecil, dan terbesar.
 * - `text`: tampilkan contoh jawaban (maks. `REKAP_TEKS_MAKS`).
 */
export function rekapSoal(
  soal: Pick<SoalRow, "id" | "pertanyaan" | "tipe" | "pilihan">,
  jawaban: readonly string[],
): RekapSoal {
  const bersih = jawaban.map((item) => item.trim()).filter((item) => item !== "");
  const dijawab = bersih.length;

  if (soal.tipe === "choice") {
    const hitung = new Map<string, number>(soal.pilihan.map((pilihan) => [pilihan, 0]));
    for (const item of bersih) {
      if (hitung.has(item)) hitung.set(item, (hitung.get(item) ?? 0) + 1);
    }

    return {
      soalId: soal.id,
      pertanyaan: soal.pertanyaan,
      tipe: soal.tipe,
      dijawab,
      distribusi: soal.pilihan.map((pilihan) => {
        const jumlah = hitung.get(pilihan) ?? 0;
        return {
          label: pilihan,
          jumlah,
          persentase: dijawab === 0 ? 0 : Math.round((jumlah / dijawab) * 1000) / 10,
        };
      }),
      rataRata: null,
      terkecil: null,
      terbesar: null,
      jawabanTeks: [],
    };
  }

  if (soal.tipe === "number") {
    const angka = bersih.map(Number).filter((item) => Number.isFinite(item));
    const total = angka.reduce((sum, item) => sum + item, 0);

    return {
      soalId: soal.id,
      pertanyaan: soal.pertanyaan,
      tipe: soal.tipe,
      dijawab,
      distribusi: [],
      rataRata: angka.length === 0 ? null : Math.round((total / angka.length) * 100) / 100,
      terkecil: angka.length === 0 ? null : Math.min(...angka),
      terbesar: angka.length === 0 ? null : Math.max(...angka),
      jawabanTeks: [],
    };
  }

  return {
    soalId: soal.id,
    pertanyaan: soal.pertanyaan,
    tipe: soal.tipe,
    dijawab,
    distribusi: [],
    rataRata: null,
    terkecil: null,
    terbesar: null,
    jawabanTeks: bersih.slice(0, REKAP_TEKS_MAKS),
  };
}
