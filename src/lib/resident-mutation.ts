/**
 * Konstanta tipe mutasi penduduk.
 *
 * Modul murni ini dipakai bersama oleh skema database dan domain penduduk agar
 * domain tidak perlu mengimpor `@/db` (batas lapisan antar-domain).
 */
export const RESIDENT_MUTATION_TYPES = ["birth", "death", "move_out", "move_in", "change"] as const;

export type ResidentMutationType = (typeof RESIDENT_MUTATION_TYPES)[number];

export const RESIDENT_MUTATION_TYPE_LABELS: Record<ResidentMutationType, string> = {
  birth: "Kelahiran",
  death: "Kematian",
  move_out: "Pindah Keluar",
  move_in: "Pindah Masuk/Datang",
  change: "Perubahan Data",
};
