import { z } from "zod";

import { optionalIsoDate } from "@/lib/forms";

export const SEKRETARIAT_NAMA_MAX = 150;
export const SEKRETARIAT_NOMOR_MAX = 100;
export const SEKRETARIAT_TENTANG_MAX = 500;
export const SEKRETARIAT_PERIHAL_MAX = 500;
export const SEKRETARIAT_KETERANGAN_MAX = 2000;

export const peraturanFormSchema = z.object({
  jenis: z.enum(["peraturan_desa", "keputusan_kades"]).default("peraturan_desa"),
  nomor: z.string().trim().min(1, "Nomor wajib diisi.").max(SEKRETARIAT_NOMOR_MAX),
  tahun: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  tentang: z.string().trim().min(1, "Tentang wajib diisi.").max(SEKRETARIAT_TENTANG_MAX),
  tanggalDitetapkan: optionalIsoDate,
  tanggalDiundangkan: optionalIsoDate,
  keterangan: z.string().trim().max(SEKRETARIAT_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type PeraturanInput = z.infer<typeof peraturanFormSchema>;

export const aparatFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(SEKRETARIAT_NAMA_MAX),
  nip: z.string().trim().max(30).optional().or(z.literal("")),
  jabatan: z.string().trim().min(1, "Jabatan wajib diisi.").max(150),
  tempatLahir: z.string().trim().max(100).optional().or(z.literal("")),
  tanggalLahir: optionalIsoDate,
  pendidikan: z.string().trim().max(100).optional().or(z.literal("")),
  nomorSkPengangkatan: z.string().trim().max(100).optional().or(z.literal("")),
  tanggalPengangkatan: optionalIsoDate,
  nomorSkPemberhentian: z.string().trim().max(100).optional().or(z.literal("")),
  tanggalPemberhentian: optionalIsoDate,
  keterangan: z.string().trim().max(SEKRETARIAT_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type AparatInput = z.infer<typeof aparatFormSchema>;

export const agendaFormSchema = z.object({
  jenis: z.enum(["masuk", "keluar"]).default("masuk"),
  tanggal: optionalIsoDate.refine((val) => Boolean(val), { message: "Tanggal wajib diisi." }),
  nomorSurat: z.string().trim().max(150).optional().or(z.literal("")),
  asalTujuan: z.string().trim().max(255).optional().or(z.literal("")),
  perihal: z.string().trim().min(1, "Perihal wajib diisi.").max(SEKRETARIAT_PERIHAL_MAX),
  keterangan: z.string().trim().max(SEKRETARIAT_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type AgendaInput = z.infer<typeof agendaFormSchema>;
