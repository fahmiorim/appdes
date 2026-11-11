import "server-only";

import {
  getJenisSuratKiosk,
  listJenisSuratKiosk,
  listPermohonanKiosk,
  simpanPermohonanSurat,
  type AjukanSuratInput,
} from "@/features/layanan-mandiri/application/ajukan-surat";
import { cariPendudukHidupByNikData } from "@/features/penduduk/application/use-cases";
import { env } from "@/lib/env";
import { AppError, notFound, validationError } from "@/lib/errors";

import {
  bacaTokenGuest,
  buatTokenGuest,
  kioskGuestSchema,
  type KioskGuestSession,
} from "../domain/kiosk-guest";

/** Bidang perangkat kiosk yang dipakai alur guest. */
export type PerangkatKiosk = {
  nama: string;
  keyboard: number | null;
  orientasiLayar: number | null;
  permohonanSuratTanpaAkun: number | null;
};

/** Perangkat harus terdaftar, aktif, dan mengizinkan permohonan tanpa akun. */
function pastikanPermohonanTanpaAkun(perangkat: PerangkatKiosk | null) {
  if (!perangkat || perangkat.permohonanSuratTanpaAkun !== 1) {
    throw notFound("Layanan permohonan surat tidak tersedia pada perangkat ini.");
  }
  return perangkat;
}

/**
 * Verifikasi NIK + tanggal lahir tanpa akun, mengikuti `PendudukGuestController`
 * OpenSID, lalu menerbitkan token sesi guest bertanda tangan.
 */
export async function bukaSesiGuestKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
  input: unknown,
): Promise<{ token: string; nama: string }> {
  pastikanPermohonanTanpaAkun(perangkat);

  const hasil = kioskGuestSchema.safeParse(input);
  if (!hasil.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of hasil.error.issues) {
      const field = String(issue.path[0] ?? "nik");
      errors[field] = [...(errors[field] ?? []), issue.message];
    }
    throw validationError("Lengkapi NIK dan tanggal lahir.", errors);
  }

  const penduduk = await cariPendudukHidupByNikData(villageId, hasil.data.nik);
  if (!penduduk || penduduk.tanggalLahir !== hasil.data.tanggalLahir) {
    throw validationError("NIK atau tanggal lahir tidak cocok dengan data penduduk desa.", {
      nik: ["NIK atau tanggal lahir tidak cocok dengan data penduduk desa."],
    });
  }

  const token = buatTokenGuest(
    { residentId: penduduk.id, villageId, nama: penduduk.nama },
    env.BETTER_AUTH_SECRET,
  );
  return { token, nama: penduduk.nama };
}

/**
 * Sesi guest yang masih berlaku untuk perangkat dan desa ini.
 *
 * Perangkat yang sudah dinonaktifkan atau kehilangan izin permohonan tanpa akun
 * otomatis tidak memiliki sesi.
 */
export async function bacaSesiGuestKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
  token: string | null | undefined,
): Promise<KioskGuestSession | null> {
  if (!perangkat || perangkat.permohonanSuratTanpaAkun !== 1) return null;
  const sesi = bacaTokenGuest(token, env.BETTER_AUTH_SECRET);
  if (!sesi || sesi.villageId !== villageId) return null;
  return sesi;
}

/** Jenis surat aktif untuk layar kiosk; `notFound` bila perangkat tidak berhak. */
export async function daftarJenisSuratKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
) {
  pastikanPermohonanTanpaAkun(perangkat);
  return listJenisSuratKiosk(villageId);
}

export async function getJenisSuratKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
  letterTypeId: number,
) {
  pastikanPermohonanTanpaAkun(perangkat);
  return getJenisSuratKiosk(villageId, letterTypeId);
}

export async function daftarPermohonanKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
  sesi: KioskGuestSession | null,
) {
  pastikanPermohonanTanpaAkun(perangkat);
  if (!sesi) return [];
  return listPermohonanKiosk(villageId, sesi.residentId);
}

/** Ajukan surat atas nama penduduk pada sesi guest kiosk. */
export async function ajukanSuratKioskData(
  villageId: number,
  perangkat: PerangkatKiosk | null,
  sesi: KioskGuestSession | null,
  input: AjukanSuratInput,
): Promise<{ id: number; noAntrian: string }> {
  pastikanPermohonanTanpaAkun(perangkat);
  if (!sesi || sesi.villageId !== villageId) {
    throw new AppError("UNAUTHENTICATED", "Sesi kiosk berakhir. Silakan verifikasi ulang.");
  }

  return simpanPermohonanSurat(villageId, sesi.residentId, input);
}
