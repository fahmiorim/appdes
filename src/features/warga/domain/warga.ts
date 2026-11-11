import { z } from "zod";

/** Panjang PIN warga (angka saja). */
export const PANJANG_PIN = 6;

/** PIN harus tepat 6 digit angka. */
export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "PIN harus 6 digit angka.");

/** Form ubah PIN warga; PIN lama & konfirmasi wajib cocok. */
export const ubahPinSchema = z
  .object({
    pinLama: pinSchema,
    pinBaru: pinSchema,
    konfirmasiPin: pinSchema,
  })
  .refine((value) => value.pinBaru === value.konfirmasiPin, {
    path: ["konfirmasiPin"],
    message: "Konfirmasi PIN tidak sama.",
  })
  .refine((value) => value.pinLama !== value.pinBaru, {
    path: ["pinBaru"],
    message: "PIN baru harus berbeda dari PIN lama.",
  });

export type UbahPinInput = z.infer<typeof ubahPinSchema>;

/** Kredensial yang ditampilkan sekali setelah akun dibuat/direset. */
export interface KredensialWarga {
  username: string;
  pin: string;
}

/** Akun warga yang ditautkan ke satu penduduk. */
export interface WargaAccountSummary {
  userId: string;
  username: string;
  active: boolean;
  mustChangePin: boolean;
}

/** Profil ringkas warga untuk halaman layanan mandiri. */
export interface WargaProfile {
  residentId: number;
  name: string;
  nationalId: string | null;
  gender: "male" | "female";
  birthPlace: string | null;
  birthDate: string | null;
  address: string | null;
  phone: string | null;
  familyNumber: string | null;
  regionLabel: string | null;
}
