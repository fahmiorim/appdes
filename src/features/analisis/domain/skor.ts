import { SKALA_MAKS } from "./konstanta";

/** Satu soal yang ikut perhitungan skor. */
export interface SoalSkor {
  id: number;
  tipe: string;
  bobot: number;
  skorPilihan: Record<string, number>;
  indikatorId: number | null;
}

export interface SkorResponden {
  respondenId: number;
  nama: string | null;
  skor: number;
  klasifikasi: string;
}

export const KLASIFIKASI_SKOR = [
  { min: 80, label: "Sangat Baik" },
  { min: 60, label: "Baik" },
  { min: 40, label: "Cukup" },
  { min: 0, label: "Kurang" },
] as const;

/** Nilai 0–5 dari satu jawaban; `null` bila jawaban kosong/tidak bisa dinilai. */
export function nilaiJawaban(soal: SoalSkor, jawaban: string | undefined): number | null {
  const bersih = (jawaban ?? "").trim();
  if (bersih === "") return null;

  if (soal.tipe === "choice") {
    const nilai = soal.skorPilihan[bersih];
    return typeof nilai === "number" && Number.isFinite(nilai) ? clamp(nilai) : null;
  }

  if (soal.tipe === "number") {
    const angka = Number(bersih);
    if (!Number.isFinite(angka)) return null;
    return clamp(angka);
  }

  return null;
}

function clamp(value: number): number {
  return Math.min(SKALA_MAKS, Math.max(0, value));
}

/** Skor 0–100 satu responden berdasarkan bobot soal. */
export function hitungSkor(
  soal: readonly SoalSkor[],
  jawaban: ReadonlyMap<number, string>,
): number {
  let total = 0;
  let maksimum = 0;

  for (const item of soal) {
    const bobot = Math.max(1, item.bobot);
    maksimum += SKALA_MAKS * bobot;
    const nilai = nilaiJawaban(item, jawaban.get(item.id));
    if (nilai !== null) total += nilai * bobot;
  }

  if (maksimum === 0) return 0;
  return Math.round((total / maksimum) * 1000) / 10;
}

export function klasifikasiSkor(skor: number): string {
  return KLASIFIKASI_SKOR.find((item) => skor >= item.min)?.label ?? "Kurang";
}

/** Skor responden + klasifikasi. */
export function hitungSkorResponden(
  soal: readonly SoalSkor[],
  input: { respondenId: number; nama: string | null; jawaban: ReadonlyMap<number, string> },
): SkorResponden {
  const skor = hitungSkor(soal, input.jawaban);
  return {
    respondenId: input.respondenId,
    nama: input.nama,
    skor,
    klasifikasi: klasifikasiSkor(skor),
  };
}

export interface RekapIndikatorSkor {
  indikatorId: number | null;
  rataRata: number;
  jumlahResponden: number;
}

export interface RekapKategoriSkor {
  /** Nama kategori, atau `null` untuk indikator tanpa kategori. */
  kategori: string | null;
  rataRata: number;
  jumlahIndikator: number;
}

/**
 * Rata-rata skor per kategori indikator.
 *
 * Nilai dihitung dari rata-rata tiap indikator agar indikator dengan bobot
 * berbeda tidak mendominasi hanya karena jumlah soalnya lebih banyak.
 */
export function rekapPerKategori(
  perIndikator: readonly (RekapIndikatorSkor & { kategori: string | null })[],
): RekapKategoriSkor[] {
  const grup = new Map<string | null, number[]>();
  for (const item of perIndikator) {
    const list = grup.get(item.kategori) ?? [];
    list.push(item.rataRata);
    grup.set(item.kategori, list);
  }

  return [...grup.entries()]
    .map(([kategori, nilai]) => ({
      kategori,
      rataRata:
        nilai.length === 0
          ? 0
          : Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10) / 10,
      jumlahIndikator: nilai.length,
    }))
    .sort((a, b) => (a.kategori ?? "~").localeCompare(b.kategori ?? "~", "id"));
}

/** Rata-rata skor per indikator (soal tanpa indikator masuk `null`). */
export function rekapPerIndikator(
  soal: readonly SoalSkor[],
  responden: readonly { respondenId: number; jawaban: ReadonlyMap<number, string> }[],
): RekapIndikatorSkor[] {
  const grup = new Map<number | null, SoalSkor[]>();
  for (const item of soal) {
    const list = grup.get(item.indikatorId) ?? [];
    list.push(item);
    grup.set(item.indikatorId, list);
  }

  return [...grup.entries()].map(([indikatorId, daftarSoal]) => {
    const skor = responden.map((item) => hitungSkor(daftarSoal, item.jawaban));
    const rataRata =
      skor.length === 0 ? 0 : Math.round((skor.reduce((a, b) => a + b, 0) / skor.length) * 10) / 10;
    return { indikatorId, rataRata, jumlahResponden: skor.length };
  });
}
