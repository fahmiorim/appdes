import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const SINERGI_RESOURCE = RESOURCES.sinergi;

/**
 * Validasi formulir program sinergi lintas pihak.
 *
 * `tahun` boleh kosong (program berjalan tanpa batas tahun anggaran), dan
 * `tanggalSelesai` tidak boleh mendahului `tanggalMulai` bila keduanya diisi.
 */
export const sinergiSchema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(1, "Nama program wajib diisi.")
      .max(200, "Nama maksimal 200 karakter."),
    mitra: z.string().trim().max(200, "Mitra maksimal 200 karakter.").optional().nullable(),
    tahun: z.coerce
      .number()
      .int("Tahun harus bilangan bulat.")
      .min(2000, "Tahun minimal 2000.")
      .max(2100, "Tahun maksimal 2100.")
      .nullable()
      .optional(),
    tanggalMulai: z.string().trim().max(20).optional().nullable(),
    tanggalSelesai: z.string().trim().max(20).optional().nullable(),
    keterangan: z
      .string()
      .trim()
      .max(2000, "Keterangan maksimal 2000 karakter.")
      .optional()
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.tanggalMulai && value.tanggalSelesai && value.tanggalSelesai < value.tanggalMulai) {
      ctx.addIssue({
        code: "custom",
        path: ["tanggalSelesai"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      });
    }
  });

export type SinergiInput = z.infer<typeof sinergiSchema>;

export interface SinergiDTO {
  id: number;
  villageId: number;
  nama: string;
  mitra: string | null;
  tahun: number | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  keterangan: string | null;
}

export const SINERGI_CSV_HEADERS = [
  "Nama Program",
  "Mitra",
  "Tahun",
  "Tanggal Mulai",
  "Tanggal Selesai",
  "Keterangan",
] as const;

/** Bungkus satu sel CSV; tanda kutip di dalam nilai di-escape menjadi `""`. */
function selCsv(nilai: string | number | null | undefined): string {
  const teks = nilai === null || nilai === undefined ? "" : String(nilai);
  return `"${teks.replaceAll('"', '""')}"`;
}

/**
 * Susun CSV rekap program sinergi untuk unduhan operator.
 *
 * Data dikutip seluruhnya agar nama program/mitra yang mengandung koma, kutip,
 * atau baris baru tetap terbaca benar oleh pengolah tabel.
 */
export function buatCsvSinergi(rows: readonly SinergiDTO[]): string {
  const baris = [SINERGI_CSV_HEADERS.map(selCsv).join(",")];

  for (const row of rows) {
    baris.push(
      [row.nama, row.mitra, row.tahun, row.tanggalMulai, row.tanggalSelesai, row.keterangan]
        .map(selCsv)
        .join(","),
    );
  }

  return `${baris.join("\r\n")}\r\n`;
}

/** Rentang pelaksanaan program untuk ditampilkan di tabel. */
export function formatPeriodeSinergi(
  row: Pick<SinergiDTO, "tanggalMulai" | "tanggalSelesai">,
): string {
  const mulai = row.tanggalMulai?.trim();
  const selesai = row.tanggalSelesai?.trim();

  if (!mulai && !selesai) return "-";
  if (mulai && selesai) return `${mulai} – ${selesai}`;
  return mulai || selesai || "-";
}
