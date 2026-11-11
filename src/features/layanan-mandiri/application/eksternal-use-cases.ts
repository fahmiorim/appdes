import "server-only";

import { z } from "zod";

import {
  getMediaSettings,
  validasiMediaDenganPengaturan,
} from "@/features/kebijakan-berkas/domain/pengaturan-berkas";
import {
  serializeBerkasSyarat,
  type BerkasSyarat,
} from "@/features/layanan-mandiri/domain/layanan-mandiri";
import {
  buatPermohonan,
  findPendudukByNik,
  getSuratUntukWarga,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import {
  buildIsianValues,
  isianErrorsToFieldErrors,
  parseIsianFields,
  validateIsianValues,
} from "@/features/surat/domain/isian";
import { notFound, validationError } from "@/lib/errors";

/** Badan permintaan API eksternal untuk mengajukan surat. */
export const suratEksternalSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus 16 digit."),
  letterTypeId: z.coerce.number().int().positive("Jenis surat tidak valid."),
  isian: z.record(z.string(), z.string()).optional().default({}),
  noHpAktif: z.string().trim().max(30, "Nomor HP maksimal 30 karakter.").optional().default(""),
  keterangan: z
    .string()
    .trim()
    .max(500, "Keterangan maksimal 500 karakter.")
    .optional()
    .default(""),
});

export type SuratEksternalInput = z.infer<typeof suratEksternalSchema>;

/**
 * Ajukan permohonan surat atas nama warga lewat API mitra.
 *
 * Tidak memakai sesi: desa berasal dari API key (yang sudah di-scope ke desa).
 * Berkas syarat dikirim sebagai multipart dengan nama field `syarat.<id>` dan
 * divalidasi memakai pengaturan lampiran kategori `permohonan` yang sama
 * dengan form warga.
 */
export async function ajukanSuratEksternalData(
  villageId: number,
  input: SuratEksternalInput,
  berkas: ReadonlyMap<number, BerkasUnggahan> = new Map(),
): Promise<{ id: number; noAntrian: string }> {
  const jenis = await getSuratUntukWarga(villageId, input.letterTypeId);
  if (!jenis) throw notFound("Jenis surat tidak ditemukan atau sedang tidak aktif.");

  const fields = parseIsianFields(jenis.formIsian);
  const values = buildIsianValues(fields, input.isian);
  const errors = validateIsianValues(fields, values);
  if (Object.keys(errors).length > 0) {
    throw validationError(
      "Lengkapi isian surat yang wajib diisi.",
      isianErrorsToFieldErrors(errors),
    );
  }

  // Periksa NIK lebih dulu agar berkas tidak tersimpan untuk pemohon yang tidak ada.
  const penduduk = await findPendudukByNik(villageId, input.nik);
  if (!penduduk) throw notFound("Penduduk dengan NIK tersebut tidak ditemukan.");

  const pengaturan = await getMediaSettings(villageId, "permohonan");

  for (const syarat of jenis.syarat) {
    const item = berkas.get(syarat.id);
    if (!item || item.ukuran === 0) {
      throw validationError(`Berkas syarat "${syarat.nama}" wajib diunggah.`, {
        [`syarat.${syarat.id}`]: [`Berkas syarat "${syarat.nama}" wajib diunggah.`],
      });
    }

    const pesan = validasiMediaDenganPengaturan(pengaturan, item.mime, item.ukuran);
    if (pesan) {
      throw validationError(`Berkas syarat "${syarat.nama}" tidak valid: ${pesan}`, {
        [`syarat.${syarat.id}`]: [pesan],
      });
    }
  }

  const tersimpan: BerkasSyarat[] = [];
  for (const syarat of jenis.syarat) {
    const item = berkas.get(syarat.id);
    if (!item) continue;

    const jalur = await simpanBerkasMedia(villageId, item, "permohonan", `syarat.${syarat.id}`);
    tersimpan.push({
      id: syarat.id,
      nama: syarat.nama,
      berkas: jalur,
      mime: item.mime ?? "application/octet-stream",
      namaAsli: item.nama.slice(0, 200),
    });
  }

  const noAntrian = `AN-${Date.now()}`;
  const id = await buatPermohonan({
    villageId,
    residentId: penduduk.id,
    letterTypeId: jenis.id,
    isianForm: JSON.stringify(values),
    noHpAktif: input.noHpAktif,
    keterangan: input.keterangan,
    syarat: tersimpan.length > 0 ? serializeBerkasSyarat(tersimpan) : undefined,
    noAntrian,
  });

  if (!id) throw new Error("Gagal menyimpan permohonan.");
  return { id, noAntrian };
}
