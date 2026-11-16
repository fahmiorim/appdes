import "server-only";

import { headers } from "next/headers";

import { ubahPinSchema, type UbahPinInput } from "@/features/warga/domain/warga";
import { clearMustChangePin } from "@/features/warga/infrastructure/warga-repository";
import { auth } from "@/lib/auth";
import { requireWarga } from "@/lib/dal";
import { AppError, validationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Jumlah percobaan membersihkan penanda PIN sementara. */
const PERCOBAAN_BERSIHKAN_STATUS = 3;
/** Jeda dasar antar percobaan (dikalikan nomor percobaan). */
const JEDA_PERCOBAAN_MS = 50;

/**
 * Pesan ketika PIN sudah berganti tetapi penanda PIN sementara gagal disimpan.
 *
 * Warga perlu tahu bahwa PIN lamanya sudah tidak berlaku, agar percobaan
 * berikutnya memakai PIN baru sebagai "PIN lama" dan tidak berulang kali
 * ditolak dengan pesan "PIN lama tidak sesuai".
 */
export const PESAN_PIN_BERGANTI_STATUS_GAGAL =
  "PIN baru Anda sudah tersimpan, tetapi status PIN sementara belum diperbarui. Masukkan PIN baru tersebut sebagai PIN lama, lalu simpan PIN baru lainnya. Jika tetap gagal, hubungi administrator desa.";

/**
 * Bersihkan `mustChangePin` setelah PIN terverifikasi berhasil diganti.
 *
 * Penggantian PIN dan pembersihan penanda berada di dua operasi tulis terpisah
 * (hash password dikelola better-auth), sehingga langkah kedua bisa gagal
 * setelah langkah pertama sukses. Retry singkat menangani gangguan sesaat;
 * kegagalan tetap dilaporkan dengan pesan yang menyebutkan PIN sudah berganti,
 * bukan pesan "PIN lama tidak sesuai" yang menyesatkan.
 */
async function bersihkanStatusPinSementara(userId: string): Promise<void> {
  let galatTerakhir: unknown;

  for (let percobaan = 1; percobaan <= PERCOBAAN_BERSIHKAN_STATUS; percobaan += 1) {
    try {
      await clearMustChangePin(userId);
      return;
    } catch (error) {
      galatTerakhir = error;
      logger.warn("Gagal membersihkan penanda PIN sementara; mencoba lagi.", {
        error,
        userId,
        percobaan,
      });

      if (percobaan < PERCOBAAN_BERSIHKAN_STATUS) {
        await new Promise((selesai) => setTimeout(selesai, JEDA_PERCOBAAN_MS * percobaan));
      }
    }
  }

  logger.error("PIN berhasil diubah tetapi penanda PIN sementara gagal dibersihkan.", {
    error: galatTerakhir,
    userId,
  });

  throw new AppError("INTERNAL", PESAN_PIN_BERGANTI_STATUS_GAGAL, { cause: galatTerakhir });
}

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

  await bersihkanStatusPinSementara(user.id);
}
