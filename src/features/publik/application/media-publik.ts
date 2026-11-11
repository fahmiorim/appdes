import "server-only";

import { bacaMedia } from "../infrastructure/media-storage";

/**
 * Baca berkas media publik.
 *
 * `bacaMedia` sudah memvalidasi jalur agar tidak keluar dari akar penyimpanan;
 * route hanya perlu memeriksa kategori dan kepemilikan desa.
 */
export async function bacaBerkasMediaPublik(relatif: string): Promise<Buffer> {
  return bacaMedia(relatif);
}
