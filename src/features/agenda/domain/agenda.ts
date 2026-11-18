import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Resource RBAC agenda desa (juga dipakai buku agenda surat). */
export const AGENDA_RESOURCE = RESOURCES.agenda;

/** Status editorial kegiatan; bukan status surat. */
export const AGENDA_STATUS = ["rencana", "berlangsung", "selesai"] as const;
export type AgendaStatus = (typeof AGENDA_STATUS)[number];

export const AGENDA_STATUS_LABELS: Readonly<Record<AgendaStatus, string>> = {
  rencana: "Rencana",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
};

/** Kategori bawaan bila pengelola tidak mengisi kategori. */
export const AGENDA_KATEGORI_DEFAULT = "umum";

/** Baris agenda kegiatan untuk halaman admin. */
export interface AgendaRow {
  id: number;
  judul: string;
  mulai: string;
  selesai: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  kategori: string;
  status: AgendaStatus;
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
  jamMulai: string | null;
  jamSelesai: string | null;
  kategori: string;
  status: AgendaStatus;
  lokasi: string | null;
  deskripsi: string | null;
}

/**
 * Jam `HH:MM`. Detik dari MySQL (`HH:MM:SS`) diterima saat edit, lalu
 * dinormalisasi ke `HH:MM` agar nilai formulir dan database konsisten.
 */
const jamSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(
    z.union([
      z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Jam harus berformat HH:MM."),
      z.null(),
    ]),
  )
  .transform((value) => value?.slice(0, 5) ?? null)
  .optional()
  .default(null);

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
    jamMulai: jamSchema,
    jamSelesai: jamSchema,
    kategori: z
      .string()
      .trim()
      .max(50, "Maksimal 50 karakter.")
      .optional()
      .default("")
      .transform((value) => (value === "" ? AGENDA_KATEGORI_DEFAULT : value)),
    status: z.enum(AGENDA_STATUS, { error: "Status agenda tidak valid." }).default("rencana"),
    deskripsi: z.string().trim().max(2000, "Maksimal 2000 karakter.").optional().default(""),
    tayang: z.boolean().default(false),
  })
  .refine((data) => data.selesai === null || data.selesai >= data.mulai, {
    message: "Tanggal selesai tidak boleh mendahului tanggal mulai.",
    path: ["selesai"],
  })
  .superRefine((data, ctx) => {
    if (data.jamSelesai !== null && data.jamMulai === null) {
      ctx.addIssue({
        code: "custom",
        path: ["jamMulai"],
        message: "Isi jam mulai sebelum jam selesai.",
      });
      return;
    }

    const tanggalAkhir = data.selesai ?? data.mulai;
    if (
      data.jamMulai !== null &&
      data.jamSelesai !== null &&
      tanggalAkhir === data.mulai &&
      data.jamSelesai < data.jamMulai
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["jamSelesai"],
        message: "Jam selesai tidak boleh mendahului jam mulai.",
      });
    }
  });

export type AgendaFormInput = z.infer<typeof agendaFormSchema>;

export interface BulanAgenda {
  tahun: number;
  bulan: number;
}

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

/** Geser satu bulan kalender, termasuk pergantian tahun. */
export function geserBulanAgenda(bulan: BulanAgenda, delta: number): BulanAgenda {
  const indeks = bulan.tahun * 12 + (bulan.bulan - 1) + delta;
  const tahun = Math.floor(indeks / 12);
  return { tahun, bulan: indeks - tahun * 12 + 1 };
}

/**
 * Rentang tanggal setengah-terbuka `[mulai, selesai)` untuk satu bulan.
 *
 * `selesai` adalah tanggal 1 bulan berikutnya sehingga baris pada hari
 * terakhir bulan tetap ikut tanpa perlu menghitung jumlah hari.
 */
export function rentangBulanAgenda(
  tahun: number,
  bulan: number,
): { mulai: string; selesai: string } {
  const tanggal = (nilaiTahun: number, nilaiBulan: number) =>
    `${nilaiTahun}-${String(nilaiBulan).padStart(2, "0")}-01`;
  const berikut = geserBulanAgenda({ tahun, bulan }, 1);
  return { mulai: tanggal(tahun, bulan), selesai: tanggal(berikut.tahun, berikut.bulan) };
}

/** Bulan kalender valid dan berada dalam rentang tahun yang dilayani. */
export function bulanAgendaDalamRentang(
  bulan: BulanAgenda,
  tahunMin: number,
  tahunMaks: number,
): boolean {
  return (
    Number.isInteger(bulan.bulan) &&
    bulan.bulan >= 1 &&
    bulan.bulan <= 12 &&
    Number.isInteger(bulan.tahun) &&
    bulan.tahun >= tahunMin &&
    bulan.tahun <= tahunMaks
  );
}

/** Label jam kegiatan, mis. "09.00–12.00"; `null` bila jam belum diisi. */
export function agendaJamLabel(jamMulai: string | null, jamSelesai: string | null): string | null {
  if (!jamMulai) return null;

  const rapikan = (jam: string) => jam.slice(0, 5).replace(":", ".");
  const awal = rapikan(jamMulai);

  if (!jamSelesai || jamSelesai === jamMulai) return awal;
  return `${awal}–${rapikan(jamSelesai)}`;
}

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
