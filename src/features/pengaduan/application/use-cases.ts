import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  formatNomorTiket,
  identitasCocok,
  lacakPengaduanSchema,
  normalisasiNomorTiket,
  normalizeKategori,
  pengaduanFormSchema,
  prefiksNomorTiket,
  samarkanNama,
  type LacakPengaduanInput,
  type PengaduanInput,
  type PengaduanLacak,
  type PengaduanPublikRow,
  type StatusPengaduan,
  type TanggapanInput,
} from "@/features/pengaduan/domain/pengaduan";
import {
  countTiketPadaTanggal,
  deletePengaduan,
  denganKunciNomorTiket,
  getPengaduan,
  getPengaduanByTiket,
  insertPengaduan,
  listPengaduan,
  listPengaduanPublik,
  setPublikPengaduan,
  updateTanggapanPengaduan,
} from "@/features/pengaduan/infrastructure/pengaduan-repository";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import {
  bacaMedia,
  hapusMedia,
  simpanUnggahanMedia,
} from "@/features/publik/infrastructure/media-storage";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { notFound } from "@/lib/errors";

import { notifyStatusChange, notifyStatusChangeWhatsApp } from "./notification";

/**
 * Use case pengaduan untuk panel admin.
 *
 * Izin diperiksa di sini (bukan di Server Action) agar aturan yang sama berlaku
 * baik saat dipanggil dari halaman maupun langsung.
 */

export interface FilterPengaduanData {
  status?: StatusPengaduan;
  kategori?: string;
  cari?: string;
}

/** Isi lampiran pengaduan untuk petugas ber-izin; jalur sudah diverifikasi route. */
export async function bacaLampiranPengaduan(relatif: string): Promise<Buffer> {
  await requirePermission(RESOURCES.pengaduan, "read");
  return bacaMedia(relatif);
}

/** Daftar pengaduan desa sesuai filter (terbaru lebih dulu). */
export async function listPengaduanData(filter: FilterPengaduanData = {}) {
  const user = await requirePermission(RESOURCES.pengaduan, "read");
  const villageId = await resolveVillageId(user);
  return listPengaduan(villageId, filter);
}

/** Detail satu pengaduan; `null` bila bukan milik desa sesi. */
export async function getPengaduanDetailData(id: number) {
  const user = await requirePermission(RESOURCES.pengaduan, "read");
  const villageId = await resolveVillageId(user);
  return getPengaduan(villageId, id);
}

export type StatusEmailNotification = "not-needed" | "sent" | "skipped" | "failed";

/** Simpan status & tanggapan petugas; hasil email tidak membatalkan penyimpanan. */
export async function tanggapiPengaduanData(
  id: number,
  input: TanggapanInput,
): Promise<{
  id: number;
  notification: StatusEmailNotification;
  whatsappNotification: StatusEmailNotification;
}> {
  const user = await requirePermission(RESOURCES.pengaduan, "update");
  const villageId = await resolveVillageId(user);

  const pengaduan = await getPengaduan(villageId, id);
  if (!pengaduan) throw notFound("Pengaduan tidak ditemukan.");

  await updateTanggapanPengaduan(villageId, id, {
    status: input.status,
    tanggapan: input.tanggapan,
    publik: input.publik,
    petugasId: user.id,
    ditanggapiPada: new Date(),
  });

  let notification: StatusEmailNotification = "not-needed";
  let whatsappNotification: StatusEmailNotification = "not-needed";
  if (input.status !== pengaduan.status) {
    if (pengaduan.email) {
      const result = await notifyStatusChange(
        pengaduan.nomorTiket,
        pengaduan.email,
        input.status,
        pengaduan.status,
      );
      notification = result.success ? "sent" : result.skipped ? "skipped" : "failed";
    }
    if (pengaduan.telepon) {
      try {
        const result = await notifyStatusChangeWhatsApp(
          pengaduan.nomorTiket,
          pengaduan.telepon,
          input.status,
          pengaduan.status,
        );
        whatsappNotification = result.success ? "sent" : result.skipped ? "skipped" : "failed";
      } catch {
        // Perubahan status sudah tersimpan; gangguan provider tidak membatalkan aksi petugas.
        whatsappNotification = "failed";
      }
    }
  }

  return { id, notification, whatsappNotification };
}

/** Tandai pengaduan boleh tampil di halaman publik. */
export async function setPublikPengaduanData(id: number, publik: boolean): Promise<{ id: number }> {
  const user = await requirePermission(RESOURCES.pengaduan, "update");
  const villageId = await resolveVillageId(user);

  const updated = await setPublikPengaduan(villageId, id, publik);
  if (!updated) throw notFound("Pengaduan tidak ditemukan.");

  // Publikasi bukan perubahan status, jadi tidak dikirim notifikasi email
  // "status berubah" (yang status lamanya sama dengan status barunya).
  return { id };
}

/** Hapus pengaduan beserta lampirannya. */
export async function hapusPengaduanData(id: number): Promise<void> {
  const user = await requirePermission(RESOURCES.pengaduan, "delete");
  const villageId = await resolveVillageId(user);

  const pengaduan = await getPengaduan(villageId, id);
  if (!pengaduan) throw notFound("Pengaduan tidak ditemukan.");

  await deletePengaduan(villageId, id);
  if (pengaduan.lampiran) {
    // Media yang gagal dihapus tidak boleh menggagalkan penghapusan data.
    await hapusMedia(pengaduan.lampiran).catch(() => undefined);
  }
}

/**
 * Pengaduan untuk halaman publik.
 *
 * Identitas pelapor disamarkan dan hanya pengaduan bertanda `publik` yang
 * dikembalikan. `villageId` berasal dari host permintaan, bukan sesi.
 */
export async function listPengaduanPublikData(villageId: number): Promise<PengaduanPublikRow[]> {
  const rows = await listPengaduanPublik(villageId);

  return rows.map((row) => ({
    ...row,
    kategori: normalizeKategori(row.kategori),
    namaPelapor: samarkanNama(row.namaPelapor),
  }));
}

/**
 * Kirim pengaduan publik. Nomor tiket dibuat server dan diserialisasi per
 * tenant/tanggal agar dua kiriman bersamaan tidak menghasilkan nomor sama.
 */
export async function kirimPengaduanData(
  villageId: number,
  raw: unknown,
  lampiran: string | null = null,
): Promise<{ id: number; nomorTiket: string }> {
  const parsed = pengaduanFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Data pengaduan tidak valid.");
  }

  const input: PengaduanInput = parsed.data;
  const sekarang = new Date();
  const prefiks = prefiksNomorTiket(sekarang);

  return denganKunciNomorTiket(villageId, prefiks, async () => {
    const urutan = (await countTiketPadaTanggal(villageId, prefiks)) + 1;
    const nomorTiket = formatNomorTiket(sekarang, urutan);
    const id = await insertPengaduan(villageId, {
      nomorTiket,
      kategori: input.kategori,
      judul: input.judul,
      isi: input.isi,
      namaPelapor: input.namaPelapor,
      nik: input.nik ?? null,
      telepon: input.telepon,
      email: input.email,
      alamat: input.alamat,
      lampiran,
    });
    return { id, nomorTiket };
  });
}

/**
 * Kirim pengaduan beserta lampiran opsional.
 *
 * Berkas divalidasi dan disimpan lebih dulu (magic bytes, ukuran, kuota desa);
 * bila penyimpanan pengaduan gagal, lampiran yang sudah tertulis dibersihkan
 * agar tidak menjadi sampah media.
 */
export async function kirimPengaduanDenganLampiranData(
  villageId: number,
  raw: unknown,
  unggahan: BerkasUnggahan | null,
): Promise<{ id: number; nomorTiket: string }> {
  let lampiran: string | null = null;
  if (unggahan) {
    const saved = await simpanUnggahanMedia(villageId, "pengaduan", unggahan);
    lampiran = saved.jalur;
  }

  try {
    return await kirimPengaduanData(villageId, raw, lampiran);
  } catch (error) {
    if (lampiran) await hapusMedia(lampiran).catch(() => undefined);
    throw error;
  }
}

/**
 * Lacak tiket dengan verifikasi satu identitas yang dikirim saat pelaporan.
 * Mengembalikan null untuk tiket tidak ditemukan maupun identitas tidak cocok.
 */
export async function lacakPengaduanData(
  villageId: number,
  raw: unknown,
): Promise<PengaduanLacak | null> {
  const parsed = lacakPengaduanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Data pelacakan tidak valid.");
  }

  const input: LacakPengaduanInput = parsed.data;
  const row = await getPengaduanByTiket(villageId, normalisasiNomorTiket(input.nomorTiket));
  if (!row || !identitasCocok(row, input.identitas)) return null;

  return {
    nomorTiket: row.nomorTiket,
    kategori: row.kategori,
    judul: row.judul,
    isi: row.isi,
    status: row.status,
    tanggapan: row.tanggapan,
    ditanggapiPada: row.ditanggapiPada,
    createdAt: row.createdAt,
  };
}
