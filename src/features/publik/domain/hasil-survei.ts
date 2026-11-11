/**
 * Rekap hasil pendataan survei untuk situs publik.
 *
 * Fungsi di berkas ini murni (tanpa I/O) dan **tidak** memuat data pribadi:
 * hanya agregat per pertanyaan (distribusi pilihan, rata-rata angka, dan jumlah
 * jawaban teks). Nama/NIK responden tidak pernah ikut dihitung di sini agar
 * halaman publik tidak membocorkan identitas.
 */

export interface SoalHasilSurvei {
  id: number;
  pertanyaan: string;
  tipe: string;
  pilihan: readonly string[];
}

export interface JawabanHasilSurvei {
  soalId: number;
  jawaban: string | null;
}

export interface DistribusiHasilSurvei {
  label: string;
  jumlah: number;
  /** Persentase terhadap total jawaban soal ini, satu angka desimal. */
  persen: number;
}

export interface HasilSoalSurvei {
  soalId: number;
  pertanyaan: string;
  tipe: string;
  jumlahJawaban: number;
  /** Terisi untuk soal pilihan; selalu berisi seluruh pilihan yang dikenal. */
  distribusi: DistribusiHasilSurvei[];
  /** Terisi untuk soal angka yang punya jawaban valid. */
  rataRata: number | null;
}

function bulatkanPersen(jumlah: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((jumlah / total) * 1000) / 10;
}

function distribusiPilihan(
  pilihan: readonly string[],
  nilai: readonly string[],
): DistribusiHasilSurvei[] {
  const hitung = new Map<string, number>();
  for (const item of nilai) {
    hitung.set(item, (hitung.get(item) ?? 0) + 1);
  }

  // Pilihan resmi tampil lebih dulu (termasuk yang belum dipilih); jawaban di
  // luar daftar tetap dihitung agar rekap tidak menyembunyikan data.
  const urutan = [...pilihan, ...[...hitung.keys()].filter((label) => !pilihan.includes(label))];

  return urutan.map((label) => ({
    label,
    jumlah: hitung.get(label) ?? 0,
    persen: bulatkanPersen(hitung.get(label) ?? 0, nilai.length),
  }));
}

function rataRataAngka(nilai: readonly string[]): number | null {
  const angka = nilai
    .map((item) => Number(item.replace(",", ".")))
    .filter((item) => Number.isFinite(item));

  if (angka.length === 0) return null;
  const total = angka.reduce((jumlah, item) => jumlah + item, 0);
  return Math.round((total / angka.length) * 100) / 100;
}

/**
 * Susun hasil agregat per soal.
 *
 * Urutan hasil mengikuti urutan soal. Jawaban kosong/spasi diabaikan sehingga
 * pertanyaan yang belum dijawab menampilkan `0` jawaban, bukan distribusi palsu.
 */
export function rekapHasilSurvei(
  soal: readonly SoalHasilSurvei[],
  jawaban: readonly JawabanHasilSurvei[],
): HasilSoalSurvei[] {
  const perSoal = new Map<number, string[]>();
  for (const item of jawaban) {
    const nilai = item.jawaban?.trim();
    if (!nilai) continue;
    const daftar = perSoal.get(item.soalId) ?? [];
    daftar.push(nilai);
    perSoal.set(item.soalId, daftar);
  }

  return soal.map((item) => {
    const nilai = perSoal.get(item.id) ?? [];

    // Soal angka hanya menghitung jawaban yang benar-benar numerik; teks yang
    // tidak bisa dibaca sebagai angka tidak boleh menggeser rata-rata.
    if (item.tipe === "number") {
      const angka = nilai.filter((value) => Number.isFinite(Number(value.replace(",", "."))));
      return {
        soalId: item.id,
        pertanyaan: item.pertanyaan,
        tipe: item.tipe,
        jumlahJawaban: angka.length,
        distribusi: [],
        rataRata: rataRataAngka(angka),
      };
    }

    return {
      soalId: item.id,
      pertanyaan: item.pertanyaan,
      tipe: item.tipe,
      jumlahJawaban: nilai.length,
      distribusi: item.tipe === "choice" ? distribusiPilihan(item.pilihan, nilai) : [],
      rataRata: null,
    };
  });
}

/**
 * Label periode untuk judul rekap. `null` berarti seluruh tahun.
 */
export function labelPeriodeSurvei(tahun: number | null): string {
  return tahun === null ? "seluruh periode" : `tahun ${tahun}`;
}
