import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

/** Slug resource RBAC untuk pusat umpan balik. */
export const UMPAN_BALIK_RESOURCE = RESOURCES.umpanBalik;

export const UMPAN_BALIK_STATUS = ["baru", "dibaca", "ditindaklanjuti"] as const;
export type UmpanBalikStatus = (typeof UMPAN_BALIK_STATUS)[number];

export const UMPAN_BALIK_STATUS_LABELS: Readonly<Record<UmpanBalikStatus, string>> = {
  baru: "Baru",
  dibaca: "Dibaca",
  ditindaklanjuti: "Ditindaklanjuti",
};

/** Label status, atau nilai aslinya bila tak dikenal (data lama). */
export function labelStatusUmpanBalik(status: string): string {
  return UMPAN_BALIK_STATUS_LABELS[status as UmpanBalikStatus] ?? status;
}

export function isUmpanBalikStatus(value: string): value is UmpanBalikStatus {
  return (UMPAN_BALIK_STATUS as readonly string[]).includes(value);
}

/**
 * Isi formulir publik.
 *
 * Nama dan kontak opsional agar warga dapat mengirim anonim. Pesan dibatasi
 * 10–2000 karakter agar tidak kosong dan tidak membanjiri basis data.
 */
export const umpanBalikSchema = z.object({
  nama: z.string().trim().max(100, "Nama maksimal 100 karakter.").default(""),
  kontak: z.string().trim().max(150, "Kontak maksimal 150 karakter.").default(""),
  pesan: z
    .string()
    .trim()
    .min(10, "Pesan minimal 10 karakter.")
    .max(2000, "Pesan maksimal 2000 karakter."),
});

export type UmpanBalikInput = z.infer<typeof umpanBalikSchema>;

/** Ubah status dari panel admin. */
export const ubahStatusUmpanBalikSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(UMPAN_BALIK_STATUS),
});

export type UbahStatusUmpanBalikInput = z.infer<typeof ubahStatusUmpanBalikSchema>;
