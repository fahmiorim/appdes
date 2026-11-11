/**
 * Parameter ekspor rekap kehadiran.
 *
 * Sebelumnya route mengubah string mentah dengan `Number()`, sehingga
 * `?tahun=abc` menjadi `NaN` dan filter tanggal diam-diam dilewati (seluruh
 * riwayat ikut terekspor). Parsing dipisah ke domain agar bisa diuji tanpa
 * database maupun sesi.
 */

const TAHUN_MIN = 1900;
const TAHUN_MAKS = 2100;

export interface ParameterRekapKehadiran {
  tahun: number;
  bulan?: number;
}

export type HasilParameterRekapKehadiran =
  { ok: true; parameter: ParameterRekapKehadiran } | { ok: false; pesan: string };

function bilanganBulat(mentah: string): number | null {
  if (!/^\d+$/.test(mentah)) return null;
  const nilai = Number(mentah);
  return Number.isSafeInteger(nilai) ? nilai : null;
}

/**
 * Baca `tahun`/`bulan` dari query string.
 *
 * `tahun` kosong memakai tahun berjalan; nilai yang diberikan tetapi tidak
 * valid menghasilkan pesan galat, bukan fallback diam-diam.
 */
export function bacaParameterRekapKehadiran(
  tahunMentah: string | null,
  bulanMentah: string | null,
  tahunSekarang: number = new Date().getFullYear(),
): HasilParameterRekapKehadiran {
  let tahun = tahunSekarang;

  if (tahunMentah !== null) {
    const nilai = bilanganBulat(tahunMentah);
    if (nilai === null || tahunMentah.length !== 4 || nilai < TAHUN_MIN || nilai > TAHUN_MAKS) {
      return { ok: false, pesan: "Parameter tahun tidak valid (1900–2100)." };
    }
    tahun = nilai;
  }

  if (bulanMentah === null) {
    return { ok: true, parameter: { tahun } };
  }

  const bulan = bilanganBulat(bulanMentah);
  if (bulan === null || bulanMentah.length > 2 || bulan < 1 || bulan > 12) {
    return { ok: false, pesan: "Parameter bulan tidak valid (1–12)." };
  }

  return { ok: true, parameter: { tahun, bulan } };
}
