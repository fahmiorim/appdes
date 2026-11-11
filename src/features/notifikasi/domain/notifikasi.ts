import { z } from "zod";

export const KANAL_NOTIFIKASI = ["email", "whatsapp"] as const;
export const STATUS_NOTIFIKASI = ["semua", "sukses", "gagal", "dilewati"] as const;

export type KanalNotifikasiFilter = (typeof KANAL_NOTIFIKASI)[number];
export type StatusNotifikasiFilter = (typeof STATUS_NOTIFIKASI)[number];

export interface FilterNotifikasi {
  kanal: KanalNotifikasiFilter | null;
  status: StatusNotifikasiFilter;
}

/** Baca filter dari query string; nilai asing jatuh ke "semua". */
export function parseFilterNotifikasi(params: {
  kanal?: string | string[];
  status?: string | string[];
}): FilterNotifikasi {
  const kanal = typeof params.kanal === "string" ? params.kanal : "";
  const status = typeof params.status === "string" ? params.status : "";

  return {
    kanal: (KANAL_NOTIFIKASI as readonly string[]).includes(kanal)
      ? (kanal as KanalNotifikasiFilter)
      : null,
    status: (STATUS_NOTIFIKASI as readonly string[]).includes(status)
      ? (status as StatusNotifikasiFilter)
      : "semua",
  };
}

export const broadcastSchema = z.object({
  kanal: z.enum(KANAL_NOTIFIKASI),
  target: z
    .string()
    .trim()
    .min(5, "Target minimal 5 karakter.")
    .max(255, "Target maksimal 255 karakter."),
  subjek: z.string().trim().max(200, "Subjek maksimal 200 karakter.").optional(),
  pesan: z
    .string()
    .trim()
    .min(5, "Pesan minimal 5 karakter.")
    .max(1000, "Pesan maksimal 1000 karakter."),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;
