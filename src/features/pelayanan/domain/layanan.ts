import { z } from "zod";

export const LAYANAN_RESOURCE = "layanan-publik";
export const layananSchema = z.object({
  nama: z.string().trim().min(3).max(180),
  kategori: z.string().trim().min(2).max(60),
  deskripsi: z.string().trim().max(4000).optional().default(""),
  persyaratan: z.string().trim().max(4000).optional().default(""),
  estimasiHari: z.coerce.number().int().min(0).max(365),
  biaya: z.coerce.number().int().min(0).max(100000000),
  metode: z.string().trim().min(2).max(80),
  aktif: z.boolean(),
});
export type LayananInput = z.infer<typeof layananSchema>;
