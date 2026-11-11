import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Menu navigasi situs publik. */

/** Setiap desa memiliki baris `menu_publik`. Form ini disinkronkan dengan
 * baris tersebut. Untuk instalasi baru bila belum ada menu, dipakai
 * `PUBLIC_NAV` bawaan.
 */
export const MENU_RESOURCE = RESOURCES.menuPublik;

/** Tipe tautan yang didukung menu publik. */
export const MENU_LINK_TIPE = ["internal", "external"] as const;
export type MenuLinkTipe = (typeof MENU_LINK_TIPE)[number];

/** Baris menu yang aman dikirim ke komponen klien. */
export interface MenuRow {
  id: number;
  nama: string;
  link: string;
  linkTipe: string;
  parentId: number | null;
  urut: number;
  aktif: boolean;
}

/** Skema form menu publik. */
export const menuPublikFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama menu wajib diisi.").max(50, "Maksimal 50 karakter."),
  link: z.string().trim().min(1, "Link wajib diisi.").max(500, "Maksimal 500 karakter."),
  linkTipe: z.enum(MENU_LINK_TIPE, { error: "Tipe link tidak dikenal." }).default("internal"),
  parentId: z.number().int().positive("Menu induk tidak valid.").nullish(),
  urut: z.coerce
    .number({ error: "Urutan harus angka." })
    .int("Urutan harus bilangan bulat.")
    .min(0, "Urutan minimal 0.")
    .default(0),
  aktif: z.boolean().default(true),
});

export type MenuPublikFormInput = z.infer<typeof menuPublikFormSchema>;

/**
 * Periksa apakah `parentId` boleh dipakai.
 *
 * Menu publik hanya mendukung satu tingkat induk. Menolak induk yang tidak ada,
 * menu itu sendiri, dan induk yang sudah punya induk lain (mencegah siklus).
 */
export function cekParentMenu(
  rows: Pick<MenuRow, "id" | "parentId">[],
  parentId: number | null | undefined,
  id?: number,
): string | null {
  if (parentId == null) return null;
  if (id !== undefined && parentId === id) {
    return "Menu tidak boleh menjadi induk dirinya sendiri.";
  }

  const induk = rows.find((row) => row.id === parentId);
  if (!induk) return "Menu induk tidak ditemukan.";
  if (induk.parentId !== null) return "Menu induk harus menu tingkat pertama.";

  return null;
}
