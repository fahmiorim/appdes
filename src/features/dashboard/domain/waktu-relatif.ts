/**
 * Waktu relatif berbahasa Indonesia untuk feed beranda.
 *
 * Nilai relatif hanya dipakai untuk rentang pendek. Setelah sepekan, tanggal
 * absolut lebih berguna daripada "9 hari lalu". Fungsi murni agar dapat diuji
 * dengan waktu acuan tetap.
 */

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function waktuRelatif(tanggal: Date, sekarang: Date = new Date()): string {
  const selisihDetik = Math.floor((sekarang.getTime() - tanggal.getTime()) / 1000);

  if (selisihDetik < 60) return "baru saja";

  const menit = Math.floor(selisihDetik / 60);
  if (menit < 60) return `${menit} menit lalu`;

  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;

  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;

  return FORMAT_TANGGAL.format(tanggal);
}
