import { z } from "zod";

/** Masa berlaku kode verifikasi kontak. */
export const MASA_BERLAKU_KODE_MS = 10 * 60 * 1000;
export const PANJANG_KODE = 6;

/** Normalkan nomor HP Indonesia ke format 62xxxxxxxxxx. */
export function normalisasiNomorHp(value: string): string {
  const digit = value.replace(/\D/g, "");
  if (digit.startsWith("0")) return `62${digit.slice(1)}`;
  if (digit.startsWith("62")) return digit;
  return digit;
}

/**
 * Target verifikasi: nomor HP (WhatsApp) atau email.
 *
 * Nomor HP dinormalkan ke format 62…, email dihuruf-kecilkan. Pemilihan kanal
 * dilakukan dari bentuk target agar operator/warga tidak perlu memilih manual.
 */
export const verifikasiKontakSchema = z.object({
  target: z
    .string()
    .trim()
    .min(5, "Isi nomor HP atau email.")
    .max(150, "Nomor HP/email maksimal 150 karakter.")
    .superRefine((value, ctx) => {
      if (value.includes("@")) {
        if (!z.email().safeParse(value).success) {
          ctx.addIssue({ code: "custom", message: "Format email tidak valid." });
        }
        return;
      }

      if (!/^62\d{8,13}$/.test(normalisasiNomorHp(value))) {
        ctx.addIssue({ code: "custom", message: "Format nomor HP tidak valid." });
      }
    })
    .transform((value) =>
      value.includes("@")
        ? { target: value.toLowerCase(), kanal: "email" as const }
        : { target: normalisasiNomorHp(value), kanal: "whatsapp" as const },
    ),
});

export const kodeVerifikasiSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${PANJANG_KODE}}$`), `Kode harus ${PANJANG_KODE} digit angka.`);

export interface StatusVerifikasiKontak {
  target: string | null;
  terverifikasi: boolean;
  kedaluwarsa: Date | null;
  kanal?: "whatsapp" | "email";
}
