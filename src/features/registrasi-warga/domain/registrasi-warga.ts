import { z } from "zod";

export const pengajuanRegistrasiWargaSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka."),
  nama: z.string().trim().min(3, "Nama minimal 3 karakter.").max(100),
  noHp: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("")
    .refine((value) => value === "" || /^[0-9+(). -]{8,20}$/.test(value), "Nomor HP tidak valid."),
});

export type PengajuanRegistrasiWargaInput = z.infer<typeof pengajuanRegistrasiWargaSchema>;

export interface RegistrasiWargaDTO {
  id: number;
  nik: string;
  nama: string;
  noHp: string | null;
  status: string;
  catatan: string | null;
  createdAt: Date;
}
