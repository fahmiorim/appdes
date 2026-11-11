import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Widget blok samping beranda/laman. */
export const WIDGET_RESOURCE = RESOURCES.widget;

/** Jenis widget yang didukung skema basis data. */
export const WIDGET_JENIS_LABELS: Record<number, string> = {
  1: "Teks bebas",
  2: "Galeri",
  3: "Statistik penduduk",
  4: "Media sosial",
  5: "Dokumen",
  6: "Menu",
};

/** Baris widget yang aman dikirim ke komponen klien. */
export interface WidgetRow {
  id: number;
  judul: string | null;
  isi: string | null;
  jenis: number;
  pengaturan: string | null;
  urut: number;
  aktif: boolean;
}

/** Pengaturan widget disimpan sebagai JSON; tolak JSON yang rusak. */
export function pengaturanWidgetValid(value: string | null | undefined): boolean {
  if (!value || value.trim() === "") return true;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export const widgetFormSchema = z
  .object({
    judul: z.string().trim().max(100, "Maksimal 100 karakter.").optional().default(""),
    isi: z.string().max(20_000, "Isi widget terlalu panjang.").optional().default(""),
    jenis: z.coerce
      .number({ error: "Jenis widget harus angka." })
      .int("Jenis widget tidak valid.")
      .min(1, "Jenis widget tidak valid.")
      .max(6, "Jenis widget tidak valid.")
      .default(1),
    pengaturan: z.string().trim().max(4_000, "Pengaturan terlalu panjang.").optional().default(""),
    urut: z.coerce
      .number({ error: "Urutan harus angka." })
      .int("Urutan harus bilangan bulat.")
      .min(0, "Urutan minimal 0.")
      .default(0),
    aktif: z.boolean().default(true),
  })
  .refine((data) => pengaturanWidgetValid(data.pengaturan), {
    path: ["pengaturan"],
    message: "Pengaturan harus berupa JSON yang valid.",
  });

export type WidgetFormInput = z.infer<typeof widgetFormSchema>;
