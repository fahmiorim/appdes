import "server-only";

import { validationError } from "@/lib/errors";

import { validasiMedia, type BerkasUnggahan } from "../domain/media";
import { simpanUnggahanMedia, type KategoriMedia } from "../infrastructure/media-storage";

/**
 * Validasi lalu simpan satu berkas unggahan ke penyimpanan media desa.
 *
 * Dipakai use case konten (berita, galeri) agar aturan MIME/ukuran dan
 * penetapan ekstensi hanya ada di satu tempat. Pemanggil bertanggung jawab
 * memeriksa izin dan memastikan `villageId` berasal dari sesi.
 *
 * @returns jalur relatif yang harus dicatat di basis data
 * @throws AppError VALIDATION bila MIME/ukuran tidak sah
 */
export async function simpanBerkasMedia(
  villageId: number,
  berkas: BerkasUnggahan,
  kategori: KategoriMedia,
  namaField: string,
): Promise<string> {
  const validasi = validasiMedia(berkas.mime, berkas.ukuran);
  if (!validasi.ok) {
    throw validationError(validasi.pesan, { [namaField]: [validasi.pesan] });
  }

  const hasil = await simpanUnggahanMedia(villageId, kategori, {
    nama: berkas.nama,
    mime: berkas.mime,
    ukuran: berkas.ukuran,
    isi: berkas.isi,
  });

  return hasil.jalur;
}
