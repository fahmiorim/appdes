/**
 * Kebijakan retensi dan lifecycle tenant (Fase 2).
 *
 * Kebijakan yang disetujui:
 * - Desa dinonaktifkan → data disimpan selama **masa tenggang 90 hari**.
 * - Sebelum purge, data tenant **wajib diekspor**; ekspor berlaku 30 hari.
 * - Purge hanya boleh setelah masa tenggang habis dan ekspor tersedia.
 * - Setelah purge, `villages` tetap ada sebagai tombstone (slug/domain tidak
 *   boleh dipakai ulang), ringkasan agregat disimpan, dan audit log dipertahankan
 *   24 bulan.
 *
 * Fungsi di sini murni (tanpa I/O) agar aturan retensi dapat diuji tanpa
 * database, dan dipakai baik oleh use case maupun konsol.
 */

const SEHARI_MS = 24 * 60 * 60 * 1000;

/** Masa tenggang data desa nonaktif sebelum boleh di-purge. */
export const MASA_TENGGANG_HARI = 90;

/** Retensi audit log, termasuk audit desa yang sudah di-purge. */
export const RETENSI_AUDIT_BULAN = 24;

/** Masa berlaku berkas ekspor; setelah itu boleh dibersihkan. */
export const UMUR_EKSPOR_HARI = 30;

export interface RetensiDesa {
  active: boolean;
  /** Diisi saat desa dinonaktifkan; `null` untuk desa yang belum pernah nonaktif. */
  nonaktifSejak: Date | null;
  /** Diisi saat purge selesai; mencegah purge kedua. */
  purgedAt: Date | null;
}

export type StatusRetensi = "aktif" | "masa-tenggang" | "siap-purge" | "sudah-purge";

/** Tanggal paling awal data desa boleh di-purge. */
export function tanggalBatasPurge(nonaktifSejak: Date): Date {
  return new Date(nonaktifSejak.getTime() + MASA_TENGGANG_HARI * SEHARI_MS);
}

/** Sisa hari sebelum purge diizinkan; `null` bila desa aktif/sudah di-purge. */
export function hariMenujuPurge(desa: RetensiDesa, sekarang: Date = new Date()): number | null {
  if (desa.active || desa.purgedAt !== null || desa.nonaktifSejak === null) return null;

  const sisa = tanggalBatasPurge(desa.nonaktifSejak).getTime() - sekarang.getTime();
  return Math.max(0, Math.ceil(sisa / SEHARI_MS));
}

/** Status lifecycle yang ditampilkan di konsol. */
export function statusRetensi(desa: RetensiDesa, sekarang: Date = new Date()): StatusRetensi {
  if (desa.purgedAt !== null) return "sudah-purge";
  if (desa.active) return "aktif";
  if (desa.nonaktifSejak === null) return "masa-tenggang";

  return (hariMenujuPurge(desa, sekarang) ?? 0) === 0 ? "siap-purge" : "masa-tenggang";
}

/** Batas akhir berlakunya berkas ekspor. */
export function kedaluwarsaEkspor(dibuatPada: Date): Date {
  return new Date(dibuatPada.getTime() + UMUR_EKSPOR_HARI * SEHARI_MS);
}

/**
 * Alasan purge ditolak, atau `null` bila semua syarat terpenuhi.
 *
 * Dipakai use case server-side. Pesan sengaja menjelaskan langkah yang harus
 * dilakukan operator, bukan hanya "tidak boleh".
 */
export function alasanTidakBolehPurge(
  desa: RetensiDesa,
  opsi: { adaEksporBerlaku: boolean; sekarang?: Date },
): string | null {
  const sekarang = opsi.sekarang ?? new Date();

  if (desa.purgedAt !== null) return "Data desa ini sudah di-purge.";
  if (desa.active) return "Nonaktifkan desa dan tunggu masa tenggang 90 hari sebelum purge.";

  if (desa.nonaktifSejak === null) {
    return "Desa ini tidak memiliki penanda waktu nonaktif. Aktifkan lalu nonaktifkan kembali agar masa tenggang tercatat.";
  }

  const sisa = hariMenujuPurge(desa, sekarang) ?? 0;
  if (sisa > 0) {
    return `Masa tenggang belum selesai: ${sisa} hari lagi sebelum data boleh di-purge.`;
  }

  if (!opsi.adaEksporBerlaku) {
    return `Ekspor data wajib dibuat lebih dulu dan masih berlaku (maksimal ${UMUR_EKSPOR_HARI} hari).`;
  }

  return null;
}

/** Desa yang sudah di-purge tidak boleh diekspor lagi. */
export function bolehDiekspor(desa: RetensiDesa): boolean {
  return desa.purgedAt === null;
}
