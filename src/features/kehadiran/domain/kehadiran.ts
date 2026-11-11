import { z } from "zod";

export const KEHADIRAN_RESOURCE = "kehadiran";

export const kehadiranStatusSchema = z.enum(["hadir", "izin", "sakit", "alpa"]);
export type KehadiranStatus = z.infer<typeof kehadiranStatusSchema>;

export const kehadiranFormSchema = z.object({
  perangkatId: z.coerce.number().int().positive(),
  tanggal: z.string().date("Tanggal harus valid."),
  jamMasuk: z.string().optional().nullable(),
  jamKeluar: z.string().optional().nullable(),
  status: kehadiranStatusSchema.default("hadir"),
});

export type KehadiranFormInput = z.input<typeof kehadiranFormSchema>;
export type KehadiranFormValues = z.infer<typeof kehadiranFormSchema>;

export interface KehadiranDTO {
  id: number;
  villageId: number;
  perangkatId: number | null;
  perangkatNama: string;
  perangkatJabatan: string;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  status: KehadiranStatus;
}
