import { z } from "zod";
export const PENGAJUAN_RESOURCE="pengajuan-layanan";
export const STATUS_PENGAJUAN_LAYANAN=["diajukan","diverifikasi","diproses","selesai","ditolak"] as const;
export const statusPengajuanSchema=z.object({
 status:z.enum(STATUS_PENGAJUAN_LAYANAN),
 catatanPetugas:z.string().trim().max(4000).optional().default(""),
 alasanPenolakan:z.string().trim().max(2000).optional().default(""),
}).superRefine((v,ctx)=>{
 if(v.status==="ditolak"&&!v.alasanPenolakan.trim())ctx.addIssue({code:"custom",path:["alasanPenolakan"],message:"Alasan penolakan wajib diisi."});
});
export const pengajuanInputSchema=z.object({
 layananId:z.coerce.number().int().positive(),
 namaPemohon:z.string().trim().min(3).max(150),
 nik:z.string().trim().regex(/^$|^\\d{16}$/,"NIK harus 16 digit."),
 telepon:z.string().trim().max(30),
 email:z.string().trim().email().or(z.literal("")),
 alamat:z.string().trim().max(2000),
 keperluan:z.string().trim().min(10).max(4000),
});
export type StatusPengajuanLayanan=typeof STATUS_PENGAJUAN_LAYANAN[number];
