import { z } from "zod";

import { optionalIsoDate } from "@/lib/forms";

export const PEMBANGUNAN_NAMA_MAX = 255;
export const PEMBANGUNAN_URAIAN_MAX = 5000;
export const PEMBANGUNAN_KETERANGAN_MAX = 2000;

export const pembangunanFormSchema = z.object({
  tahun: z.coerce.number().int().min(1900).max(2100),
  namaKegiatan: z.string().trim().min(1, "Nama kegiatan wajib diisi.").max(PEMBANGUNAN_NAMA_MAX),
  lokasi: z.string().trim().max(255).optional().or(z.literal("")),
  volume: z.string().trim().max(100).optional().or(z.literal("")),
  sumberDana: z.string().trim().max(150).optional().or(z.literal("")),
  biaya: z.coerce.number().min(0).optional().or(z.literal("")),
  pelaksana: z.string().trim().max(150).optional().or(z.literal("")),
  status: z.enum(["rencana", "berlangsung", "selesai", "berhenti"]).default("rencana"),
  tanggalMulai: optionalIsoDate,
  tanggalSelesai: optionalIsoDate,
  hasil: z.string().trim().max(PEMBANGUNAN_URAIAN_MAX).optional().or(z.literal("")),
  keterangan: z.string().trim().max(PEMBANGUNAN_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type PembangunanInput = z.infer<typeof pembangunanFormSchema>;

export const kaderFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi.").max(150),
  jabatan: z.string().trim().max(150).optional().or(z.literal("")),
  bidang: z.string().trim().max(150).optional().or(z.literal("")),
  alamat: z.string().trim().max(255).optional().or(z.literal("")),
  noHp: z.string().trim().max(30).optional().or(z.literal("")),
  keterangan: z.string().trim().max(PEMBANGUNAN_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type KaderInput = z.infer<typeof kaderFormSchema>;
