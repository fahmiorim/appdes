import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Penyimpanan berkas laporan APBDes di disk lokal.
 *
 * Aplikasi desa berjalan di server tunggal, jadi berkas disimpan di bawah
 * `storage/keuangan-laporan/<villageId>/`. Jalur yang dicatat di basis data
 * **selalu relatif** terhadap akar penyimpanan, sehingga folder dapat
 * dipindahkan (atau diarahkan ke volume lain) tanpa mengubah data.
 *
 * Nama berkas di disk dibuat acak-karena-waktu + slug judul agar tidak pernah
 * bentrok sekaligus tetap mudah dikenali operator.
 */

const AKAR_PENYIMPANAN = path.join(process.cwd(), "storage", "keuangan-laporan");

export function akarPenyimpananLaporan(): string {
  return AKAR_PENYIMPANAN;
}

/**
 * Susun jalur relatif untuk berkas laporan baru.
 *
 * @param villageId pemilik berkas (kunci tenant)
 * @param tahun tahun anggaran laporan
 * @param namaAman nama berkas yang sudah dibersihkan (lihat `berkasLaporanAman`)
 */
export function jalurRelatifLaporan(villageId: number, tahun: number, namaAman: string): string {
  return path.posix.join(String(villageId), String(tahun), `${Date.now()}-${namaAman}`);
}

/** Pastikan direktori induk ada. */
async function pastikanDirektori(absolut: string): Promise<void> {
  await mkdir(path.dirname(absolut), { recursive: true });
}

/**
 * Ubah jalur relatif menjadi jalur absolut, sambil menolak percobaan keluar
 * dari akar penyimpanan (path traversal).
 */
export function jalurAbsolutLaporan(relatif: string): string {
  const absolut = path.resolve(AKAR_PENYIMPANAN, relatif);
  const akar = path.resolve(AKAR_PENYIMPANAN);
  if (absolut !== akar && !absolut.startsWith(akar + path.sep)) {
    throw new Error("Jalur berkas laporan di luar penyimpanan.");
  }
  return absolut;
}

/** Simpan isi berkas laporan; mengembalikan jalur relatif yang tercatat di DB. */
export async function simpanBerkasLaporan(relatif: string, isi: Uint8Array): Promise<void> {
  const absolut = jalurAbsolutLaporan(relatif);
  await pastikanDirektori(absolut);
  await writeFile(absolut, isi);
}

/** Baca isi berkas laporan. */
export async function bacaBerkasLaporan(relatif: string): Promise<Buffer> {
  return readFile(jalurAbsolutLaporan(relatif));
}

/** Hapus berkas laporan; diamkan bila berkas sudah tidak ada. */
export async function hapusBerkasLaporan(relatif: string): Promise<void> {
  try {
    await unlink(jalurAbsolutLaporan(relatif));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
