import { z } from "zod";

export const PENGAJUAN_RESOURCE = "pengajuan-layanan";
export const STATUS_PENGAJUAN_LAYANAN = [
  "diajukan",
  "diverifikasi",
  "diproses",
  "selesai",
  "ditolak",
] as const;
export type StatusPengajuanLayanan = (typeof STATUS_PENGAJUAN_LAYANAN)[number];

export const TRANSISI_PENGAJUAN: Record<StatusPengajuanLayanan, readonly StatusPengajuanLayanan[]> =
  {
    diajukan: ["diverifikasi", "ditolak"],
    diverifikasi: ["diproses", "ditolak"],
    diproses: ["selesai", "ditolak"],
    selesai: [],
    ditolak: [],
  };

export function bolehTransisiPengajuan(dari: StatusPengajuanLayanan, ke: StatusPengajuanLayanan) {
  return TRANSISI_PENGAJUAN[dari].includes(ke);
}

export const statusPengajuanSchema = z
  .object({
    status: z.enum(STATUS_PENGAJUAN_LAYANAN),
    catatanPetugas: z.string().trim().max(4000).optional().default(""),
    alasanPenolakan: z.string().trim().max(2000).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.status === "ditolak" && !v.alasanPenolakan.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["alasanPenolakan"],
        message: "Alasan penolakan wajib diisi.",
      });
    }
  });

export const pengajuanInputSchema = z.object({
  layananId: z.coerce.number().int().positive(),
  keperluan: z.string().trim().min(10).max(4000),
  telepon: z.string().trim().min(8).max(30),
  email: z.string().trim().email().or(z.literal("")).optional().default(""),
});
