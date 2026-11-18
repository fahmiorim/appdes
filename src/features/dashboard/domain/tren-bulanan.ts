/**
 * Penyusunan deret tren bulanan untuk dashboard.
 *
 * Query database hanya mengembalikan bulan yang memiliki data. Grafik tetap
 * harus menampilkan seluruh bulan dalam jendela waktu (termasuk bulan bernilai
 * nol), sehingga pengisian dan pengurutan dilakukan di sini sebagai fungsi
 * murni yang dapat diuji tanpa database.
 */

export interface BarisTrenBulanan {
  /** Kunci bulan berformat `YYYY-MM`. */
  bulan: string;
  total: number;
}

export interface TitikTrenBulanan {
  bulan: string;
  /** Label pendek berbahasa Indonesia, mis. `Jul`. */
  label: string;
  total: number;
}

const NAMA_BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

function duaDigit(nilai: number): string {
  return String(nilai).padStart(2, "0");
}

/** Kunci bulan `YYYY-MM` dari tanggal, memakai komponen waktu lokal. */
export function kunciBulan(tanggal: Date): string {
  return `${tanggal.getFullYear()}-${duaDigit(tanggal.getMonth() + 1)}`;
}

/**
 * Susun deret `jumlahBulan` terakhir (tertua → terbaru) dari baris agregat.
 *
 * Baris di luar jendela waktu diabaikan, dan baris dengan kunci bulan yang sama
 * dijumlahkan agar hasil query yang terduplikasi tidak menggandakan nilai.
 */
export function susunTrenBulanan(
  baris: readonly BarisTrenBulanan[],
  akhir: Date,
  jumlahBulan = 6,
): TitikTrenBulanan[] {
  const jumlah = Math.max(1, Math.trunc(jumlahBulan));
  const totalPerBulan = new Map<string, number>();

  for (const item of baris) {
    totalPerBulan.set(item.bulan, (totalPerBulan.get(item.bulan) ?? 0) + item.total);
  }

  const hasil: TitikTrenBulanan[] = [];
  for (let mundur = jumlah - 1; mundur >= 0; mundur -= 1) {
    const tanggal = new Date(akhir.getFullYear(), akhir.getMonth() - mundur, 1);
    const bulan = kunciBulan(tanggal);
    hasil.push({
      bulan,
      label: NAMA_BULAN_PENDEK[tanggal.getMonth()] ?? "",
      total: totalPerBulan.get(bulan) ?? 0,
    });
  }

  return hasil;
}
