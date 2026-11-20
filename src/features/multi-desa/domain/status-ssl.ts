/**
 * Aturan status sertifikat TLS untuk domain tenant.
 *
 * Modul ini murni agar batas "segera kedaluwarsa" dapat diuji tanpa jaringan.
 * Sumber data adalah hasil handshake TLS nyata; status tidak pernah diisi dari
 * data contoh.
 */

export const BATAS_SEGERA_KEDALUWARSA_HARI = 30;

export type StatusSsl = "aktif" | "segera-expired" | "bermasalah" | "belum-diperiksa";

export const LABEL_STATUS_SSL: Readonly<Record<StatusSsl, string>> = {
  aktif: "Aktif",
  "segera-expired": "Segera expired",
  bermasalah: "Bermasalah",
  "belum-diperiksa": "Belum diperiksa",
};

export interface DataSsl {
  status: StatusSsl;
  validFrom: Date | null;
  validTo: Date | null;
  issuer: string | null;
  error: string | null;
  checkedAt: Date | null;
}

export const SSL_BELUM_DIPERIKSA: DataSsl = {
  status: "belum-diperiksa",
  validFrom: null,
  validTo: null,
  issuer: null,
  error: null,
  checkedAt: null,
};

const SATU_HARI_MS = 24 * 60 * 60 * 1000;

/** Hari menuju kedaluwarsa; negatif berarti sudah lewat. */
export function hariMenujuKedaluwarsaSsl(
  validTo: Date | null,
  sekarang = new Date(),
): number | null {
  if (!validTo || Number.isNaN(validTo.getTime())) return null;
  return Math.ceil((validTo.getTime() - sekarang.getTime()) / SATU_HARI_MS);
}

/**
 * Klasifikasikan hasil pemeriksaan TLS.
 *
 * `authorized` wajib berasal dari verifikasi sertifikat Node (bukan ditebak).
 * Sertifikat yang gagal diverifikasi selalu bermasalah, termasuk saat tanggal
 * kedaluwarsa belum dapat dibaca.
 */
export function klasifikasiSsl(input: {
  authorized: boolean;
  validTo: Date | null;
  sekarang?: Date;
  error?: string | null;
}): StatusSsl {
  if (input.error) return "bermasalah";
  if (!input.authorized) return "bermasalah";
  if (!input.validTo || Number.isNaN(input.validTo.getTime())) return "bermasalah";

  const sekarang = input.sekarang ?? new Date();
  if (input.validTo.getTime() <= sekarang.getTime()) return "bermasalah";

  const hari = hariMenujuKedaluwarsaSsl(input.validTo, sekarang);
  if (hari !== null && hari <= BATAS_SEGERA_KEDALUWARSA_HARI) return "segera-expired";
  return "aktif";
}
