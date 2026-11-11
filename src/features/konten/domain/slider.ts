import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slider gambar sorotan beranda. */
export const SLIDER_RESOURCE = RESOURCES.slider;

/** Baris slider yang aman dikirim ke komponen klien. */
export interface SliderRow {
  id: number;
  gambar: string;
  judul: string | null;
  keterangan: string | null;
  tautan: string | null;
  urut: number;
  aktif: boolean;
}

export const sliderFormSchema = z.object({
  gambar: z
    .string()
    .trim()
    .min(1, "Gambar wajib diisi.")
    .max(255, "Path/URL gambar maksimal 255 karakter."),
  judul: z.string().trim().max(150, "Maksimal 150 karakter.").optional().default(""),
  keterangan: z.string().trim().max(500, "Maksimal 500 karakter.").optional().default(""),
  tautan: z.string().trim().max(255, "Tautan maksimal 255 karakter.").optional().default(""),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .default(0),
  aktif: z.boolean().default(true),
});

export type SliderFormInput = z.infer<typeof sliderFormSchema>;
