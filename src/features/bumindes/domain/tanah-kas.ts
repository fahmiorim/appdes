import { z } from "zod";

import { optionalIsoDate } from "@/lib/forms";

export const TANAH_KAS_NOMOR_PERSIL_MAX = 50;
export const TANAH_KAS_URAIAN_MAX = 500;
export const TANAH_KAS_KETERANGAN_MAX = 2000;

export const tanahKasFormSchema = z.object({
  nomorPersil: z
    .string()
    .trim()
    .min(1, "Nomor persil wajib diisi.")
    .max(
      TANAH_KAS_NOMOR_PERSIL_MAX,
      `Nomor persil maksimal ${TANAH_KAS_NOMOR_PERSIL_MAX} karakter.`,
    ),
  asal: z.string().trim().max(255).optional().or(z.literal("")),
  luas: z.coerce.number().min(0, "Luas minimal 0.").optional().or(z.literal("")),
  lokasi: z.string().trim().max(255).optional().or(z.literal("")),
  status: z.string().trim().max(150).optional().or(z.literal("")),
  nilai: z.coerce.number().min(0, "Nilai minimal 0.").optional().or(z.literal("")),
  keterangan: z.string().trim().max(TANAH_KAS_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type TanahKasInput = z.infer<typeof tanahKasFormSchema>;

export const tanahKasMutasiFormSchema = z.object({
  tanahKasId: z.coerce.number().int().min(1, "Persil tidak valid."),
  tanggal: optionalIsoDate.refine((val) => Boolean(val), { message: "Tanggal wajib diisi." }),
  jenis: z.string().trim().min(1, "Jenis mutasi wajib diisi.").max(50),
  uraian: z.string().trim().min(1, "Uraian wajib diisi.").max(TANAH_KAS_URAIAN_MAX),
  luasPerubahan: z.coerce.number().optional().or(z.literal("")),
  nilaiPerubahan: z.coerce.number().optional().or(z.literal("")),
  keterangan: z.string().trim().max(TANAH_KAS_KETERANGAN_MAX).optional().or(z.literal("")),
});

export type TanahKasMutasiInput = z.infer<typeof tanahKasMutasiFormSchema>;
