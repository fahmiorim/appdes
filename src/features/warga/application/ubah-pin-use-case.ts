import "server-only";

import { headers } from "next/headers";

import { ubahPinSchema, type UbahPinInput } from "@/features/warga/domain/warga";
import { clearMustChangePin } from "@/features/warga/infrastructure/warga-repository";
import { auth } from "@/lib/auth";
import { requireWarga } from "@/lib/dal";
import { validationError } from "@/lib/errors";

/**
 * Ganti PIN warga yang sedang login.
 *
 * PIN lama diverifikasi oleh better-auth (bukan dibandingkan manual), lalu
 * `mustChangePin` dibersihkan agar layanan mandiri dapat dipakai. Sesi perangkat
 * lain dicabut agar PIN lama tidak tetap berlaku di tempat lain.
 *
 * Kegagalan autentikasi dipetakan ke `validationError` dengan pesan seragam,
 * sehingga route handler tidak perlu mengetahui detail provider.
 */
export async function ubahPinWarga(input: UbahPinInput): Promise<void> {
  const user = await requireWarga();
  const parsed = ubahPinSchema.parse(input);

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.pinLama,
        newPassword: parsed.pinBaru,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    throw validationError("PIN lama tidak sesuai. Pastikan PIN yang Anda masukkan benar.", {
      pinLama: ["PIN lama tidak sesuai."],
    });
  }

  await clearMustChangePin(user.id);
}
