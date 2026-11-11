import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Resource RBAC agenda desa (juga dipakai buku agenda surat). */
export const AGENDA_RESOURCE = RESOURCES.agenda;

/** Baris agenda kegiatan untuk halaman admin. */
export interface AgendaRow {
  id: number;
  judul: string;
  mulai: string;
  selesai: string | null;
  lokasi: string | null;
  deskripsi: string | null;
  tayang: boolean;
}

/** Agenda kegiatan yang aman tampil di situs publik. */
export interface AgendaPublikRow {
  id: number;
  judul: string;
  mulai: string;
  selesai: string | null;
  lokasi: string | null;
  deskripsi: string | null;
}

/**
 * Skema formulir agenda kegiatan.
 *
 * `tayang` bernilai `false` bila checkbox tidak dikirim: agenda baru tidak
 * langsung tampil di situs publik tanpa persetujuan eksplisit pengelola.
 */
export const agendaFormSchema = z
  .object({
    judul: z.string().trim().min(1, "Judul wajib diisi.").max(200, "Maksimal 200 karakter."),
    mulai: z.iso.date("Tanggal mulai tidak valid."),
    selesai: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(z.union([z.iso.date("Tanggal selesai tidak valid."), z.null()]))
      .optional()
      .default(null),
    lokasi: z.string().trim().max(200, "Maksimal 200 karakter.").optional().default(""),
    deskripsi: z.string().trim().max(2000, "Maksimal 2000 karakter.").optional().default(""),
    tayang: z.boolean().default(false),
  })
  .refine((data) => data.selesai === null || data.selesai >= data.mulai, {
    message: "Tanggal selesai tidak boleh mendahului tanggal mulai.",
    path: ["selesai"],
  });

export type AgendaFormInput = z.infer<typeof agendaFormSchema>;

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Ubah `YYYY-MM-DD` menjadi "20 November 2026" tanpa bergantung zona waktu. */
export function agendaTanggalPanjang(tanggal: string): string {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  if (!tahun || !bulan || !hari) return tanggal;
  return `${hari} ${NAMA_BULAN[bulan - 1] ?? ""} ${tahun}`.replace(/\s+/g, " ").trim();
}

/**
 * Label rentang tanggal agenda.
 *
 * Satu tanggal, rentang dalam bulan yang sama, atau rentang lintas bulan/bulan
 * yang ditulis lengkap agar tidak menimbulkan salah tafsir.
 */
export function agendaLabelTanggal(mulai: string, selesai: string | null): string {
  if (!selesai || selesai === mulai) return agendaTanggalPanjang(mulai);

  const [tahunAwal = 0, bulanAwal = 0, hariAwal = 0] = mulai.split("-").map(Number);
  const [tahunAkhir = 0, bulanAkhir = 0, hariAkhir = 0] = selesai.split("-").map(Number);

  if (!bulanAwal || !bulanAkhir) return agendaTanggalPanjang(mulai);

  if (tahunAwal === tahunAkhir && bulanAwal === bulanAkhir) {
    return `${hariAwal}–${hariAkhir} ${NAMA_BULAN[bulanAwal - 1] ?? ""} ${tahunAwal}`.trim();
  }

  return `${agendaTanggalPanjang(mulai)} – ${agendaTanggalPanjang(selesai)}`;
}
