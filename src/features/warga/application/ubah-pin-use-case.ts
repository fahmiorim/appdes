import "server-only";

import { isAPIError } from "better-auth/api";
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
 * Petakan kegagalan `changePassword` better-auth.
 *
 * Hanya `INVALID_PASSWORD` yang berarti PIN lama salah. Kegagalan lain
 * (sesi tidak segar, akun tanpa kredensial, rate limit, gangguan database)
 * tidak boleh disamarkan menjadi "PIN lama tidak sesuai", karena pengguna
 * akan mengulang percobaan yang tidak mungkin berhasil dan penyebab aslinya
 * hilang dari diagnosa.
 */
function lemparKesalahanGantiPin(error: unknown): never {
  const kode = isAPIError(error) ? (error.body as { code?: unknown } | undefined)?.code : undefined;

  if (isAPIError(error) && error.statusCode === 429) {
    throw new AppError("RATE_LIMITED", undefined, { cause: error });
  }

  switch (kode) {
    case "INVALID_PASSWORD":
      throw validationError(
        "PIN lama tidak sesuai. Pastikan PIN yang Anda masukkan benar.",
        { pinLama: ["PIN lama tidak sesuai."] },
        error,
      );
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      throw validationError(
        "PIN baru tidak memenuhi ketentuan panjang PIN.",
        {
          pinBaru: ["PIN baru tidak memenuhi ketentuan panjang PIN."],
        },
        error,
      );
    case "SESSION_NOT_FRESH":
      throw new AppError(
        "UNAUTHENTICATED",
        "Sesi Anda sudah terlalu lama untuk mengubah PIN. Silakan masuk kembali, lalu ubah PIN.",
        { cause: error },
      );
    case "SESSION_EXPIRED":
      throw new AppError("UNAUTHENTICATED", undefined, { cause: error });
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      throw new AppError(
        "CONFLICT",
        "Akun ini tidak memiliki PIN yang dapat diubah. Hubungi administrator desa.",
        { cause: error },
      );
    default:
      logger.error("Ganti PIN gagal karena kesalahan yang tidak terduga.", {
        error,
        kode: typeof kode === "string" ? kode : null,
      });
      throw new AppError("INTERNAL", undefined, { cause: error });
  }
}

/**
 * Ganti PIN warga yang sedang login.
 *
 * PIN lama diverifikasi oleh better-auth (bukan dibandingkan manual), lalu
 * `mustChangePin` dibersihkan agar layanan mandiri dapat dipakai. Sesi perangkat
 * lain dicabut agar PIN lama tidak tetap berlaku di tempat lain.
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
  } catch (error) {
    lemparKesalahanGantiPin(error);
  }

  await bersihkanStatusPinSementara(user.id);
}
