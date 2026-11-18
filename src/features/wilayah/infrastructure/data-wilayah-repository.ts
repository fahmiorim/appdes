import "server-only";

import desaJson from "../data/desa.json";
import kabupatenJson from "../data/kabupaten.json";
import kecamatanJson from "../data/kecamatan.json";
import provinsiJson from "../data/provinsi.json";
import {
  keWilayah,
  type BarisWilayah,
  type TingkatWilayah,
  type Wilayah,
} from "../domain/data-wilayah";

/**
 * Pemuatan dataset wilayah Kepmendagri.
 *
 * Berkas JSON dibundel ke sisi server saja: klien hanya menerima potongan
 * kecil lewat `/api/wilayah`, sehingga daftar 83 ribu desa tidak masuk bundle
 * browser. Data dimuat sekali per proses dan dipakai ulang.
 */

const PROVINSI = provinsiJson as unknown as readonly BarisWilayah[];
const KABUPATEN = kabupatenJson as unknown as Readonly<Record<string, readonly BarisWilayah[]>>;
const KECAMATAN = kecamatanJson as unknown as Readonly<Record<string, readonly BarisWilayah[]>>;
const DESA = desaJson as unknown as Readonly<Record<string, readonly BarisWilayah[]>>;

/** Daftar wilayah pada satu tingkat, dibatasi kode induknya. */
export function daftarWilayah(tingkat: TingkatWilayah, induk: string | null): Wilayah[] {
  if (tingkat === "provinsi") return keWilayah(PROVINSI);

  if (induk === null) return [];

  if (tingkat === "kabupaten") return keWilayah(KABUPATEN[induk]);
  if (tingkat === "kecamatan") return keWilayah(KECAMATAN[induk]);
  return keWilayah(DESA[induk]);
}
