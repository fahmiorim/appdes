/**
 * Agregasi hasil survei untuk halaman publik.
 *
 * Fungsi di sini murni (tanpa I/O) dan **tidak pernah** menerima nama, NIK,
 * atau isi jawaban teks responden. Repository hanya mengirim hitungan agregat
 * dari basis data, sehingga data pribadi tidak pernah masuk ke lapisan tampilan.
 */

/** Soal yang ikut ditampilkan pada rekap publik. */
export interface SoalPublikRingkas {
  id: number;
  pertanyaan: string;
  tipe: string;
  pilihan: string[];
}

/** Hitungan satu pilihan jawaban (soal `choice`). */
export interface HitunganPilihan {
  soalId: number;
  label: string;
  jumlah: number;
}

/** Statistik soal angka (soal `number`). */
export interface StatistikAngka {
  soalId: number;
  dijawab: number;
  rataRata: number | null;
  terkecil: number | null;
  terbesar: number | null;
}

/** Jumlah jawaban terkumpul untuk soal isian (soal `text`). */
export interface JumlahJawaban {
  soalId: number;
  dijawab: number;
}

/** Hitungan mentah seluruh soal satu survei. */
export interface AgregatSurvei {
  pilihan: HitunganPilihan[];
  angka: StatistikAngka[];
  teks: JumlahJawaban[];
}

/** Rekap publik satu soal; tidak memuat jawaban mentah. */
export interface RekapSoalPublik {
  id: number;
  pertanyaan: string;
  tipe: string;
  pilihan: string[];
  dijawab: number;
  distribusi: { label: string; jumlah: number; persentase: number }[];
  rataRata: number | null;
  terkecil: number | null;
  terbesar: number | null;
}

/**
 * Susun rekap publik per soal dari hitungan agregat.
 *
 * - `choice`: hitung tiap pilihan (termasuk yang nol) dan persentasenya
 *   terhadap jumlah jawaban soal tersebut.
 * - `number`: rata-rata (dua desimal), nilai terkecil, dan terbesar.
 * - `text`: hanya jumlah jawaban; isi jawaban tidak pernah dikembalikan.
 */
export function susunRekapSurvei(
  soal: readonly SoalPublikRingkas[],
  agregat: AgregatSurvei,
): RekapSoalPublik[] {
  const pilihanMap = new Map<number, Map<string, number>>();
  for (const row of agregat.pilihan) {
    const hitung = pilihanMap.get(row.soalId) ?? new Map<string, number>();
    hitung.set(row.label, (hitung.get(row.label) ?? 0) + row.jumlah);
    pilihanMap.set(row.soalId, hitung);
  }

  const angkaMap = new Map(agregat.angka.map((row) => [row.soalId, row]));
  const teksMap = new Map(agregat.teks.map((row) => [row.soalId, row.dijawab]));

  return soal.map((item) => {
    const dasar = {
      id: item.id,
      pertanyaan: item.pertanyaan,
      tipe: item.tipe,
      pilihan: item.pilihan,
    };

    if (item.tipe === "choice") {
      const hitung = pilihanMap.get(item.id) ?? new Map<string, number>();
      // Hanya jawaban yang cocok dengan pilihan soal yang dihitung; nilai di
      // luar daftar (data lama/rusak) tidak boleh menggeser persentase.
      const dijawab = item.pilihan.reduce((total, label) => total + (hitung.get(label) ?? 0), 0);

      return {
        ...dasar,
        dijawab,
        distribusi: item.pilihan.map((label) => {
          const jumlah = hitung.get(label) ?? 0;
          return {
            label,
            jumlah,
            persentase: dijawab === 0 ? 0 : Math.round((jumlah / dijawab) * 1000) / 10,
          };
        }),
        rataRata: null,
        terkecil: null,
        terbesar: null,
      };
    }

    if (item.tipe === "number") {
      const statistik = angkaMap.get(item.id);
      return {
        ...dasar,
        dijawab: statistik?.dijawab ?? 0,
        distribusi: [],
        rataRata: statistik?.rataRata ?? null,
        terkecil: statistik?.terkecil ?? null,
        terbesar: statistik?.terbesar ?? null,
      };
    }

    return {
      ...dasar,
      dijawab: teksMap.get(item.id) ?? 0,
      distribusi: [],
      rataRata: null,
      terkecil: null,
      terbesar: null,
    };
  });
}

/** Tahun minimum/maksimum yang diterima sebagai filter periode. */
export const PERIODE_MIN = 1900;
export const PERIODE_MAKS = 2100;

/**
 * Baca parameter `periode` (tahun) dari URL.
 *
 * Nilai tidak valid diabaikan (kembali `null` = semua periode) alih-alih
 * membuat halaman gagal.
 */
export function parsePeriodeTahun(value: unknown): number | null {
  const teks = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  if (!/^\d{4}$/.test(teks.trim())) return null;

  const tahun = Number(teks.trim());
  if (tahun < PERIODE_MIN || tahun > PERIODE_MAKS) return null;
  return tahun;
}
