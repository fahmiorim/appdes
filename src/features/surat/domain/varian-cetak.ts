/**
 * Varian tata letak halaman cetak surat.
 *
 * Diletakkan di domain (bukan di modul `"use client"`) karena dipakai Server
 * Component untuk memvalidasi `?varian=` sekaligus Client Component untuk
 * menampilkan pilihan. Nilai yang diekspor modul client menjadi client
 * reference, sehingga tidak dapat dipakai sebagai array di server.
 */
export const VARIAN_CETAK = [
  { value: "default", label: "Default (Potrait)" },
  { value: "landscape", label: "Landscape" },
  { value: "compact", label: "Compact (margin kecil)" },
] as const;

export type VarianCetak = (typeof VARIAN_CETAK)[number]["value"];

/** Varian yang valid dari nilai query, atau null bila tidak dikenal. */
export function parseVarianCetak(nilai: string | string[] | undefined): VarianCetak | null {
  if (typeof nilai !== "string") return null;
  return VARIAN_CETAK.find((item) => item.value === nilai)?.value ?? null;
}
