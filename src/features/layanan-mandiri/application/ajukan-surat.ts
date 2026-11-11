import "server-only";

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
  getSuratUntukWarga,
  listPermohonanWarga,
  listSuratUntukWarga,
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

/**
 * Jenis surat aktif untuk anjungan kiosk.
 *
 * Tanpa sesi warga; lapisan anjungan yang memastikan perangkat terdaftar dan
 * mengizinkan permohonan tanpa akun sebelum memanggil fungsi ini.
 */
export async function listJenisSuratKiosk(villageId: number) {
  return listSuratUntukWarga(villageId);
}

/** Satu jenis surat aktif untuk anjungan kiosk; `null` bila tidak tersedia. */
export async function getJenisSuratKiosk(villageId: number, letterTypeId: number) {
  return getSuratUntukWarga(villageId, letterTypeId);
}

/** Riwayat permohonan satu penduduk pada sesi guest kiosk. */
export async function listPermohonanKiosk(villageId: number, residentId: number) {
  return listPermohonanWarga(villageId, residentId);
}

export interface AjukanSuratInput {
  letterTypeId: number;
  isian: Readonly<Record<string, string>>;
  noHpAktif: string;
  keterangan: string;
  /** Berkas per id syarat. */
  berkas: ReadonlyMap<number, BerkasUnggahan>;
}

/**
 * Simpan permohonan surat atas nama satu penduduk.
 *
 * Dipakai bersama oleh warga yang login dan anjungan kiosk; `residentId` dan
 * `villageId` berasal dari sesi/perangkat, bukan input klien. Syarat diambil
 * dari master jenis surat, divalidasi lengkap, lalu disimpan di media privat.
 */
export async function simpanPermohonanSurat(
  villageId: number,
  residentId: number,
  input: AjukanSuratInput,
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

  if (input.noHpAktif.trim().length > 30) {
    throw validationError("Nomor HP maksimal 30 karakter.", {
      noHpAktif: ["Nomor HP maksimal 30 karakter."],
    });
  }

  if (input.keterangan.trim().length > 500) {
    throw validationError("Keterangan maksimal 500 karakter.", {
      keterangan: ["Keterangan maksimal 500 karakter."],
    });
  }

  // Wajib mengunggah semua syarat yang tercantum pada jenis surat. Batas
  // MIME/ukuran mengikuti pengaturan lampiran terpusat kategori "permohonan"
  // sehingga operator dapat menyesuaikannya tanpa mengubah kode.
  const pengaturanBerkas = await getMediaSettings(villageId, "permohonan");

  for (const syarat of jenis.syarat) {
    const berkas = input.berkas.get(syarat.id);
    if (!berkas || berkas.ukuran === 0) {
      throw validationError(`Berkas syarat "${syarat.nama}" wajib diunggah.`, {
        [`syarat.${syarat.id}`]: [`Berkas syarat "${syarat.nama}" wajib diunggah.`],
      });
    }

    const pesan = validasiMediaDenganPengaturan(pengaturanBerkas, berkas.mime, berkas.ukuran);
    if (pesan) {
      throw validationError(`Berkas syarat "${syarat.nama}" tidak valid: ${pesan}`, {
        [`syarat.${syarat.id}`]: [pesan],
      });
    }
  }

  const berkasTersimpan: BerkasSyarat[] = [];
  for (const syarat of jenis.syarat) {
    const berkas = input.berkas.get(syarat.id);
    if (!berkas) continue;

    const jalur = await simpanBerkasMedia(villageId, berkas, "permohonan", `syarat.${syarat.id}`);

    berkasTersimpan.push({
      id: syarat.id,
      nama: syarat.nama,
      berkas: jalur,
      mime: berkas.mime ?? "application/octet-stream",
      namaAsli: berkas.nama.slice(0, 200),
    });
  }

  const noAntrian = `AN-${Date.now()}`;
  const id = await buatPermohonan({
    villageId,
    residentId,
    letterTypeId: jenis.id,
    isianForm: JSON.stringify(values),
    noHpAktif: input.noHpAktif.trim(),
    keterangan: input.keterangan.trim(),
    syarat: serializeBerkasSyarat(berkasTersimpan),
    noAntrian,
  });

  if (!id) throw new Error("Gagal menyimpan permohonan.");
  return { id, noAntrian };
}
