import { z } from "zod";

import { NO_SELECTION } from "@/lib/forms";

export const MODUL_RESOURCE = "modul" as const;

export const modulFormSchema = z.object({
  name: z.string().trim().min(1, "Nama modul wajib diisi.").max(100, "Maksimal 100 karakter."),
  slug: z.string().trim().min(1, "Slug wajib diisi.").max(100, "Maksimal 100 karakter."),
  parentId: z.string().optional().default(NO_SELECTION),
  url: z.string().trim().optional().or(z.literal("")),
  icon: z.string().trim().optional().or(z.literal("")),
  isGroup: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export type ModulFormInput = z.infer<typeof modulFormSchema>;

export interface ModulDTO {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  url: string | null;
  icon: string | null;
  isGroup: boolean;
  isActive: boolean;
  sortOrder: number | null;
  isHidden: boolean;
}

export interface ModulOption {
  value: string;
  label: string;
}

/**
 * Pilihan induk modul untuk form: hanya modul tingkat atas (tanpa induk).
 * `excludeId` mengecualikan modul itu sendiri supaya tidak menjadi induk dirinya
 * (mencegah siklus induk-anak).
 */
export function parentModulOptions(moduls: readonly ModulDTO[], excludeId?: number): ModulOption[] {
  return moduls
    .filter((m) => m.parentId === null && m.id !== excludeId)
    .map((m) => ({ value: String(m.id), label: m.name }));
}
