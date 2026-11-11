import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk modul wilayah (harus sama dengan `modules.slug`). */
export const WILAYAH_RESOURCE = RESOURCES.wilayah;

/** Skema validasi input wilayah (dipakai di server action). */
export const wilayahFormSchema = z.object({
  dusun: z.string().trim().min(1, "Nama dusun wajib diisi.").max(100, "Maksimal 100 karakter."),
  rw: z.string().trim().max(10, "Maksimal 10 karakter."),
  rt: z.string().trim().max(10, "Maksimal 10 karakter."),
  urut: z.coerce
    .number({ error: "Urutan harus berupa angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Minimal 0.")
    .max(9999, "Maksimal 9999."),
});

export type WilayahFormInput = z.infer<typeof wilayahFormSchema>;

/** Bentuk data wilayah yang dikirim ke UI (tanpa kolom internal). */
export interface WilayahDTO {
  id: number;
  dusun: string;
  rw: string;
  rt: string;
  urut: number;
}

/** Label ringkas wilayah, mis. "Dusun Sukamaju · RT 02 / RW 01". */
export function formatWilayahLabel(wilayah: Pick<WilayahDTO, "dusun" | "rw" | "rt">): string {
  const parts: string[] = [];

  if (wilayah.dusun) parts.push(`Dusun ${wilayah.dusun}`);
  if (wilayah.rt) parts.push(`RT ${wilayah.rt}`);
  if (wilayah.rw) parts.push(`RW ${wilayah.rw}`);

  return parts.length > 0 ? parts.join(" · ") : "Wilayah tanpa nama";
}
