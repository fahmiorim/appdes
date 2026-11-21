import "server-only";

import { randomUUID } from "node:crypto";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { getWargaProfile } from "@/features/warga/infrastructure/warga-repository";
import { requirePermission, requireWargaAktif } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

import {
  PENGAJUAN_RESOURCE,
  pengajuanInputSchema,
  statusPengajuanSchema,
} from "../domain/pengajuan";
import {
  buatBerkasHasilPengajuan,
  buatPengajuanLayanan,
  getBerkasPengajuan,
  getPengajuanLayanan,
  getRingkasanStatusPengajuan,
  listBerkasPengajuan,
  listLayananAktif,
  listPengajuanLayanan,
  listRiwayatPengajuan,
  updateStatusPengajuan,
} from "../infrastructure/pengajuan-repository";

export async function getLayananPublikWargaData() {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const [profil, layanan] = await Promise.all([
    getWargaProfile(villageId, user.residentId),
    listLayananAktif(villageId),
  ]);
  if (!profil) throw notFound("Data penduduk tidak ditemukan pada desa ini.");
  return {
    profil,
    layanan,
    kontakEmail: user.email.endsWith(".warga.desa.local") ? "" : user.email,
  };
}

export async function ajukanLayananWargaData(raw: unknown, unggahan: BerkasUnggahan[]) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const parsed = pengajuanInputSchema.safeParse(raw);
  if (!parsed.success)
    throw validationError(parsed.error.issues[0]?.message ?? "Data pengajuan tidak valid.");
  const profil = await getWargaProfile(villageId, user.residentId);
  if (!profil) throw notFound("Data penduduk tidak ditemukan pada desa ini.");
  const layanan = (await listLayananAktif(villageId)).find(
    (item) => item.id === parsed.data.layananId,
  );
  if (!layanan) throw notFound("Layanan tidak ditemukan atau sedang tidak aktif.");
  const requiredDocs = (layanan.persyaratan ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (requiredDocs.length > 20)
    throw validationError(
      "Konfigurasi persyaratan layanan melebihi 20 dokumen. Hubungi operator desa.",
    );
  if (unggahan.length !== requiredDocs.length)
    throw validationError("Unggah seluruh dokumen persyaratan yang diminta.");
  const savedFiles: Array<{
    namaPersyaratan: string;
    jalur: string;
    namaAsli: string;
    ukuran: number;
  }> = [];
  try {
    for (let i = 0; i < requiredDocs.length; i += 1) {
      const file = unggahan[i];
      if (!file || file.mime?.toLowerCase() !== "application/pdf" || file.ukuran > 20 * 1024 * 1024)
        throw validationError("Setiap persyaratan wajib berupa PDF maksimal 20 MB.");
      const jalur = await simpanBerkasMedia(
        villageId,
        { ...file, nama: `${i + 1}-${file.nama}` },
        "permohonan",
        "berkas_" + i,
      );
      savedFiles.push({
        namaPersyaratan: (requiredDocs[i] ?? "").slice(0, 180),
        jalur,
        namaAsli: file.nama.slice(0, 255),
        ukuran: file.ukuran,
      });
    }
  } catch (error) {
    for (const file of savedFiles) await hapusMedia(file.jalur);
    throw error;
  }
  const lampiran: string | null = null;
  const nomorTiket =
    "PL-" +
    new Date().toISOString().slice(0, 10).replaceAll("-", "") +
    "-" +
    randomUUID().slice(0, 8).toUpperCase();
  try {
    const id = await buatPengajuanLayanan({
      villageId,
      layananId: parsed.data.layananId,
      residentId: user.residentId,
      nomorTiket,
      namaPemohon: profil.name,
      nik: profil.nationalId,
      telepon: parsed.data.telepon,
      email: parsed.data.email || null,
      alamat: profil.address,
      keperluan: parsed.data.keperluan,
      lampiran,
      berkas: savedFiles,
    });
    return { id, nomorTiket };
  } catch (error) {
    for (const file of savedFiles) await hapusMedia(file.jalur);
    throw error;
  }
}

export async function getPengajuanPageData(status?: string, cari = "", page = 1) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [data, statusSummary] = await Promise.all([
    listPengajuanLayanan(villageId, status, cari, page, 10),
    getRingkasanStatusPengajuan(villageId),
  ]);
  return {
    ...data,
    statusSummary,
    canUpdate: hasPermission(user.permissions, PENGAJUAN_RESOURCE, "update"),
  };
}

export async function getPengajuanExportData(status?: string, cari = "") {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listPengajuanLayanan(villageId, status, cari, 1, 5000);
}

export async function getPengajuanDetailData(id: number) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getPengajuanLayanan(villageId, id);
  if (!row) throw notFound("Pengajuan tidak ditemukan.");
  const riwayat = await listRiwayatPengajuan(villageId, id);
  return { ...row, riwayat };
}

export async function ubahStatusPengajuanData(id: number, raw: unknown) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = statusPengajuanSchema.safeParse(raw);
  if (!parsed.success)
    throw validationError(parsed.error.issues[0]?.message ?? "Status pengajuan tidak valid.");
  if (!(await getPengajuanLayanan(villageId, id))) throw notFound("Pengajuan tidak ditemukan.");
  const perubahan = await updateStatusPengajuan(villageId, id, user.id, parsed.data);
  const detail = await getPengajuanLayanan(villageId, id);
  if (detail?.request.residentId) {
    const { findWargaEmailByResident } =
      await import("@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository");
    const { kirimNotifikasiWarga } =
      await import("@/features/notifikasi/application/kirim-notifikasi");
    const emailAkun = await findWargaEmailByResident(villageId, detail.request.residentId);
    const email = emailAkun?.endsWith(".warga.desa.local") ? null : emailAkun;
    try {
      await kirimNotifikasiWarga({
        villageId,
        residentId: detail.request.residentId,
        jenis: "pengajuan-layanan.status",
        subjek: "Pembaruan status pengajuan " + detail.request.nomorTiket,
        pesan:
          "Status pengajuan " +
          detail.request.nomorTiket +
          " berubah menjadi " +
          perubahan.statusBaru +
          ". " +
          (parsed.data.catatanPetugas || parsed.data.alasanPenolakan || ""),
        email,
        telepon: detail.request.telepon,
      });
    } catch (error) {
      // Status dan riwayat sudah tersimpan; kegagalan notifikasi tidak membatalkan perubahan.
      console.error("Notifikasi perubahan status pengajuan gagal dikirim.", {
        pengajuanId: id,
        villageId,
        error,
      });
    }
  }
}

export async function bacaLampiranPengajuanAdminData(id: number) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail?.request.lampiran || !detail.request.lampiran.startsWith(villageId + "/permohonan/"))
    throw notFound("Lampiran tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(detail.request.lampiran);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Lampiran PDF tidak valid.");
  return bytes;
}

export async function bacaLampiranPengajuanWargaData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (
    !detail ||
    detail.request.residentId !== user.residentId ||
    !detail.request.lampiran ||
    !detail.request.lampiran.startsWith(villageId + "/permohonan/")
  )
    throw notFound("Lampiran tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(detail.request.lampiran);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Lampiran PDF tidak valid.");
  return bytes;
}

export async function listBerkasPengajuanAdminData(id: number) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  if (!(await getPengajuanLayanan(villageId, id))) throw notFound("Pengajuan tidak ditemukan.");
  return listBerkasPengajuan(villageId, id);
}
export async function bacaBerkasPengajuanAdminData(id: number, berkasId: number) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getBerkasPengajuan(villageId, id, berkasId);
  if (!row || !row.jalur.startsWith(villageId + "/permohonan/"))
    throw notFound("Berkas tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(row.jalur);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Berkas PDF tidak valid.");
  return { bytes, namaAsli: row.namaAsli };
}
export async function listBerkasPengajuanWargaData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail || detail.request.residentId !== user.residentId)
    throw notFound("Pengajuan tidak ditemukan.");
  return listBerkasPengajuan(villageId, id);
}
export async function bacaBerkasPengajuanWargaData(id: number, berkasId: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  const row = await getBerkasPengajuan(villageId, id, berkasId);
  if (
    !detail ||
    detail.request.residentId !== user.residentId ||
    !row ||
    !row.jalur.startsWith(villageId + "/permohonan/")
  )
    throw notFound("Berkas tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(row.jalur);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Berkas PDF tidak valid.");
  return { bytes, namaAsli: row.namaAsli };
}

export async function unggahHasilPengajuanAdminData(id: number, unggahan: BerkasUnggahan[]) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  if (!unggahan.length || unggahan.length > 10)
    throw validationError("Unggah 1 sampai 10 dokumen hasil.");
  const saved: Array<{ namaPersyaratan: string; jalur: string; namaAsli: string; ukuran: number }> =
    [];
  try {
    for (const file of unggahan) {
      if (
        file.mime?.toLowerCase() !== "application/pdf" ||
        file.ukuran <= 0 ||
        file.ukuran > 20 * 1024 * 1024 ||
        file.isi[0] !== 0x25 ||
        file.isi[1] !== 0x50 ||
        file.isi[2] !== 0x44 ||
        file.isi[3] !== 0x46 ||
        file.isi[4] !== 0x2d
      ) {
        throw validationError("Dokumen hasil wajib PDF valid maksimal 20 MB per file.");
      }
      const jalur = await simpanBerkasMedia(
        villageId,
        { ...file, nama: "hasil-" + file.nama },
        "permohonan",
        "hasil",
      );
      saved.push({
        namaPersyaratan: "Hasil pelayanan",
        jalur,
        namaAsli: file.nama.slice(0, 255),
        ukuran: file.ukuran,
      });
    }
    await buatBerkasHasilPengajuan(villageId, id, saved);
  } catch (error) {
    for (const file of saved) await hapusMedia(file.jalur);
    throw error;
  }
}

export async function listHasilPengajuanWargaData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail || detail.request.residentId !== user.residentId)
    throw notFound("Pengajuan tidak ditemukan.");
  if (detail.request.status !== "selesai") return [];
  return listBerkasPengajuan(villageId, id, "hasil");
}

export async function bacaHasilPengajuanWargaData(id: number, berkasId: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  const row = await getBerkasPengajuan(villageId, id, berkasId);
  if (
    !detail ||
    detail.request.residentId !== user.residentId ||
    detail.request.status !== "selesai" ||
    !row ||
    row.jenis !== "hasil" ||
    !row.jalur.startsWith(villageId + "/permohonan/")
  )
    throw notFound("Dokumen hasil belum tersedia.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(row.jalur);
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  )
    throw notFound("Dokumen PDF tidak valid.");
  return { bytes, namaAsli: row.namaAsli };
}
