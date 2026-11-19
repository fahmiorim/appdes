/**
 * Tren pendaftaran tenant untuk dashboard platform.
 *
 * Angka dihitung dari `createdAt` tenant yang sudah diotorisasi dan dimuat
 * halaman; modul ini tidak menyentuh database dan tidak memakai deret contoh.
 * `total` bersifat kumulatif sampai akhir bulan tersebut, sehingga tenant lama
 * tetap terhitung walau di luar jendela tampilan.
 */

export interface TitikTrenTenant {
  /** Kunci stabil `YYYY-MM`. */
  readonly kunci: string;
  /** Label sumbu, mis. `Jun`. */
  readonly label: string;
  /** Judul lengkap, mis. `Jun 2026`. */
  readonly judul: string;
  /** Tenant baru pada bulan tersebut. */
  readonly jumlah: number;
  /** Tenant kumulatif sampai akhir bulan tersebut. */
  readonly total: number;
}

const NAMA_BULAN = [
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

const BATAS_BULAN = 24;

function kunciBulan(tanggal: Date): string {
  return `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, "0")}`;
}

export function hitungTrenTenant(
  rows: readonly { createdAt: Date }[],
  sekarang: Date,
  jumlahBulan = 6,
): TitikTrenTenant[] {
  const bulan = Math.min(Math.max(Math.trunc(jumlahBulan) || 1, 1), BATAS_BULAN);
  const titik: TitikTrenTenant[] = [];

  for (let mundur = bulan - 1; mundur >= 0; mundur -= 1) {
    const awal = new Date(sekarang.getFullYear(), sekarang.getMonth() - mundur, 1);
    const akhir = new Date(awal.getFullYear(), awal.getMonth() + 1, 1);

    titik.push({
      kunci: kunciBulan(awal),
      label: NAMA_BULAN[awal.getMonth()]!,
      judul: `${NAMA_BULAN[awal.getMonth()]} ${awal.getFullYear()}`,
      jumlah: rows.filter((row) => row.createdAt >= awal && row.createdAt < akhir).length,
      total: rows.filter((row) => row.createdAt < akhir).length,
    });
  }

  return titik;
}
