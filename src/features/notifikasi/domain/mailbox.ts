import { z } from "zod";

/** Skema validasi balasan email masuk. */
export const balasPesanSchema = z.object({
  id: z.coerce.number().int().positive(),
  isi: z.string().trim().min(1, "Isi balasan wajib diisi.").max(5000),
});

/** Skema payload email masuk dari webhook; villageId ditentukan dari Host. */
export const pesanEmailMasukSchema = z.object({
  token: z.string().min(1).max(255),
  alamat: z.string().trim().email().max(255),
  subjek: z.string().trim().max(255).optional(),
  isi: z.string().trim().min(1).max(20000),
  tanggal: z.string().datetime().optional(),
});

/** Normalisasi header email untuk konsistensi pencarian dan balasan. */
export function normalisasiEmail(value: string): string {
  return value.trim().toLowerCase();
}

export type BalasPesanInput = z.infer<typeof balasPesanSchema>;
export type PesanEmailMasukInput = z.infer<typeof pesanEmailMasukSchema>;
