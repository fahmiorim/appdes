import { z } from "zod";

export const ARSIP_RESOURCE = "arsip";

export const arsipFormSchema = z.object({
  kategori: z.string().trim().max(100).optional().nullable(),
  judul: z.string().trim().min(1, "Judul wajib diisi").max(200),
  berkas: z.string().trim().max(255).optional().nullable(),
  keterangan: z.string().trim().optional().nullable(),
});

export type ArsipFormInput = z.input<typeof arsipFormSchema>;
export type ArsipFormValues = z.infer<typeof arsipFormSchema>;

export interface ArsipDTO {
  id: number;
  villageId: number;
  kategori: string | null;
  judul: string;
  berkas: string | null;
  keterangan: string | null;
}
