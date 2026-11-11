import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Cookie sesi guest kiosk; HttpOnly, dibatasi jalur `/desa/anjungan`. */
export const KIOSK_GUEST_COOKIE = "kiosk_guest";
/** Sesi guest berumur pendek karena dipakai bergantian di layar kiosk. */
export const KIOSK_GUEST_TTL_MS = 30 * 60 * 1000;

/**
 * Verifikasi identitas tanpa akun, mengikuti `PendudukGuestController` OpenSID:
 * NIK (padanan `tag_id_card`) dan tanggal lahir.
 */
export const kioskGuestSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus 16 angka."),
  tanggalLahir: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal lahir wajib diisi."),
});

export type KioskGuestInput = z.infer<typeof kioskGuestSchema>;

export interface KioskGuestSession {
  residentId: number;
  villageId: number;
  nama: string;
  /** Waktu kedaluwarsa (epoch milidetik). */
  exp: number;
}

const kioskGuestSessionSchema = z.object({
  residentId: z.number().int().positive(),
  villageId: z.number().int().positive(),
  nama: z.string().min(1).max(100),
  exp: z.number().int().positive(),
});

function tandaTangan(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Membuat token sesi guest yang ditandatangani HMAC-SHA256. */
export function buatTokenGuest(
  data: Omit<KioskGuestSession, "exp"> & { exp?: number },
  secret: string,
  sekarang = Date.now(),
): string {
  const sesi: KioskGuestSession = {
    residentId: data.residentId,
    villageId: data.villageId,
    nama: data.nama,
    exp: data.exp ?? sekarang + KIOSK_GUEST_TTL_MS,
  };
  const isi = Buffer.from(JSON.stringify(sesi)).toString("base64url");
  return `${isi}.${tandaTangan(isi, secret)}`;
}

/**
 * Membaca token sesi guest. `null` bila tanda tangan tidak cocok, isi tidak
 * valid, atau sudah kedaluwarsa.
 */
export function bacaTokenGuest(
  token: string | null | undefined,
  secret: string,
  sekarang = Date.now(),
): KioskGuestSession | null {
  if (!token) return null;
  const [isi, tanda] = token.split(".");
  if (!isi || !tanda) return null;

  const diharapkan = tandaTangan(isi, secret);
  const a = Buffer.from(tanda);
  const b = Buffer.from(diharapkan);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let terurai: unknown;
  try {
    terurai = JSON.parse(Buffer.from(isi, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const hasil = kioskGuestSessionSchema.safeParse(terurai);
  if (!hasil.success) return null;
  if (hasil.data.exp <= sekarang) return null;
  return hasil.data;
}
