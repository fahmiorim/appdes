/**
 * Mode penomoran surat layanan (parity OpenSID).
 *
 * Nilai disimpan pada `villages.penomoran_surat` agar dapat diubah operator
 * lewat Pengaturan > Identitas Desa.
 */
export const PENOMORAN_SURAT_MODES = [1, 2, 3, 4] as const;

export type PenomoranSuratMode = (typeof PENOMORAN_SURAT_MODES)[number];

export const PENOMORAN_SURAT_LABELS: Readonly<Record<PenomoranSuratMode, string>> = {
  1: "1 — Semua surat layanan (nomor global per tahun)",
  2: "2 — Per jenis surat",
  3: "3 — Gabungan surat layanan + agenda masuk/keluar",
  4: "4 — Per klasifikasi surat",
};

/** Nilai mode default: per jenis surat (perilaku lama). */
export const DEFAULT_PENOMORAN_SURAT: PenomoranSuratMode = 2;

/** Normalisasi nilai dari basis data/form; nilai tidak dikenal → mode 2. */
export function normalizePenomoranMode(
  value: number | string | null | undefined,
): PenomoranSuratMode {
  const parsed = Number(value);
  return (PENOMORAN_SURAT_MODES as readonly number[]).includes(parsed)
    ? (parsed as PenomoranSuratMode)
    : DEFAULT_PENOMORAN_SURAT;
}
