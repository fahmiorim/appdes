import { z } from "zod";

export const ANJUNGAN_RESOURCE = "anjungan";

export const anjunganFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(200),
  deskripsi: z.string().trim().optional().nullable(),
  aktif: z.coerce.number().int().min(0).max(1).default(1),
  urutan: z.coerce.number().int().default(0),
  // Kiosk device fields
  uuid: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.string().uuid("UUID tidak valid.").nullable().optional()),
  ipAddress: z.string().max(45).optional().nullable(),
  macAddress: z.string().max(17).optional().nullable(),
  ipAddressPortPrinter: z.string().max(100).optional().nullable(),
  keyboard: z.coerce.number().int().min(0).max(1).default(1),
  orientasiLayar: z.coerce.number().int().min(0).max(1).default(1),
  permohonanSuratTanpaAkun: z.coerce.number().int().min(0).max(1).default(0),
  status: z.enum(["aktif", "nonaktif", "perbaikan"]).default("aktif"),
});

export type AnjunganFormInput = z.input<typeof anjunganFormSchema>;
export type AnjunganFormValues = z.infer<typeof anjunganFormSchema>;

export interface AnjunganDTO {
  id: number;
  villageId: number;
  nama: string;
  deskripsi: string | null;
  aktif: number;
  urutan: number;
  // Kiosk device fields
  uuid: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  ipAddressPortPrinter: string | null;
  keyboard: number | null;
  orientasiLayar: number | null;
  permohonanSuratTanpaAkun: number | null;
  status: string | null;
}
