import "server-only";

import {
  bacaMedia,
  hapusMedia,
  simpanUnggahanMedia,
} from "@/features/publik/infrastructure/media-storage";
import { requirePermission } from "@/lib/dal";
import { AppError, notFound, validationError } from "@/lib/errors";

import {
  PELANGGAN_RESOURCE,
  pelangganFormSchema,
  validasiDokumenKerjasama,
} from "../domain/pelanggan";
import {
  createPelanggan,
  deletePelanggan,
  findPelanggan,
  listPelanggan,
  updateStatusLangganan as repoUpdateStatusLangganan,
  updatePelanggan,
} from "../infrastructure/pelanggan-repository";

export async function daftarPelanggan(villageId: number, opts?: { q?: string }) {
  await requirePermission(PELANGGAN_RESOURCE, "read");
  return listPelanggan(villageId, opts);
}

export async function tambahPelanggan(villageId: number, input: unknown) {
  await requirePermission(PELANGGAN_RESOURCE, "update");
  const parsed = pelangganFormSchema.parse(input);
  const id = await createPelanggan({
    villageId,
    nama: parsed.nama,
    kontak: parsed.kontak ?? null,
    alamat: parsed.alamat ?? null,
    keterangan: parsed.keterangan ?? null,
    statusLangganan: parsed.statusLangganan ?? "menunggu",
    tanggalMulai: parsed.tanggalMulai ? new Date(parsed.tanggalMulai) : null,
    tanggalSelesai: parsed.tanggalSelesai ? new Date(parsed.tanggalSelesai) : null,
    noKerjasama: parsed.noKerjasama ?? null,
    keteranganLangganan: parsed.keteranganLangganan ?? null,
  });
  return { id };
}

export async function ubahPelanggan(villageId: number, id: number, input: unknown) {
  await requirePermission(PELANGGAN_RESOURCE, "update");
  const parsed = pelangganFormSchema.parse(input);
  await updatePelanggan(id, villageId, {
    nama: parsed.nama,
    kontak: parsed.kontak ?? null,
    alamat: parsed.alamat ?? null,
    keterangan: parsed.keterangan ?? null,
    statusLangganan: parsed.statusLangganan ?? "menunggu",
    tanggalMulai: parsed.tanggalMulai ? new Date(parsed.tanggalMulai) : null,
    tanggalSelesai: parsed.tanggalSelesai ? new Date(parsed.tanggalSelesai) : null,
    noKerjasama: parsed.noKerjasama ?? null,
    keteranganLangganan: parsed.keteranganLangganan ?? null,
  });
}

/** Berkas yang sudah dibaca dari `FormData` (isi, bukan jalur). */
export interface BerkasDokumenKerjasama {
  nama: string;
  mime: string | null;
  isi: Uint8Array;
}

/**
 * Simpan/ganti dokumen kerja sama pelanggan.
 *
 * Berkas lama dihapus setelah baris tersimpan supaya kegagalan I/O tidak
 * menghilangkan dokumen yang sebelumnya masih sah.
 */
export async function simpanDokumenKerjasama(
  villageId: number,
  id: number,
  berkas: BerkasDokumenKerjasama,
) {
  await requirePermission(PELANGGAN_RESOURCE, "update");

  const validasi = validasiDokumenKerjasama(berkas.mime, berkas.isi.byteLength);
  if (!validasi.ok) throw validationError(validasi.pesan);

  const lama = await findPelanggan(villageId, id);
  if (!lama) throw notFound("Pelanggan tidak ditemukan.");

  const hasil = await simpanUnggahanMedia(villageId, "umum", {
    nama: berkas.nama,
    mime: berkas.mime,
    ukuran: berkas.isi.byteLength,
    isi: berkas.isi,
  });

  await updatePelanggan(id, villageId, {
    dokumenKerjasama: hasil.jalur,
    dokumenNama: berkas.nama.slice(0, 255),
    dokumenMime: hasil.mime,
  });

  if (lama.dokumenKerjasama) await hapusMedia(lama.dokumenKerjasama);

  return { id, nama: berkas.nama.slice(0, 255) };
}

/** Ambil isi dokumen kerja sama untuk diunduh operator. */
export async function getDokumenKerjasama(villageId: number, id: number) {
  await requirePermission(PELANGGAN_RESOURCE, "read");

  const row = await findPelanggan(villageId, id);
  if (!row?.dokumenKerjasama) throw notFound("Dokumen kerja sama tidak ditemukan.");

  return { row, isi: await bacaMedia(row.dokumenKerjasama) };
}

export async function hapusPelanggan(villageId: number, id: number) {
  await requirePermission(PELANGGAN_RESOURCE, "delete");
  if (!id || id < 1) throw new AppError("NOT_FOUND", "ID tidak valid.");

  const row = await findPelanggan(villageId, id);
  await deletePelanggan(id, villageId);
  if (row?.dokumenKerjasama) await hapusMedia(row.dokumenKerjasama);
}

export async function ubahStatusLangganan(villageId: number, id: number, input: unknown) {
  await requirePermission(PELANGGAN_RESOURCE, "update");
  const parsed = pelangganFormSchema
    .pick({
      statusLangganan: true,
      tanggalMulai: true,
      tanggalSelesai: true,
      noKerjasama: true,
      keteranganLangganan: true,
    })
    .parse(input);

  await repoUpdateStatusLangganan(id, villageId, {
    statusLangganan: parsed.statusLangganan,
    tanggalMulai: parsed.tanggalMulai ? new Date(parsed.tanggalMulai) : null,
    tanggalSelesai: parsed.tanggalSelesai ? new Date(parsed.tanggalSelesai) : null,
    noKerjasama: parsed.noKerjasama ?? null,
    keteranganLangganan: parsed.keteranganLangganan ?? null,
  });
}
