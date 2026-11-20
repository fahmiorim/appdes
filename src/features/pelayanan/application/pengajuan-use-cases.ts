import "server-only";
import { randomUUID } from "node:crypto";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getWargaProfile } from "@/features/warga/infrastructure/warga-repository";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission, requireWargaAktif } from "@/lib/dal";
import { forbidden, notFound, validationError } from "@/lib/errors";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { PENGAJUAN_RESOURCE, pengajuanInputSchema, statusPengajuanSchema } from "../domain/pengajuan";
import { buatPengajuanLayanan, getPengajuanLayanan, listLayananAktif, listPengajuanLayanan, listRiwayatPengajuan, updateStatusPengajuan } from "../infrastructure/pengajuan-repository";

export async function getLayananPublikWargaData() {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const [profil, layanan] = await Promise.all([getWargaProfile(villageId, user.residentId), listLayananAktif(villageId)]);
  if (!profil) throw notFound("Data penduduk tidak ditemukan pada desa ini.");
  return { profil, layanan, kontakEmail: user.email.endsWith(".warga.desa.local") ? "" : user.email };
}

export async function ajukanLayananWargaData(raw: unknown, unggahan: BerkasUnggahan | null) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const parsed = pengajuanInputSchema.safeParse(raw);
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Data pengajuan tidak valid.");
  if (!unggahan || unggahan.ukuran === 0) throw validationError("Lampiran PDF wajib diunggah.");
  if (unggahan.mime?.toLowerCase() !== "application/pdf" || unggahan.ukuran > 20 * 1024 * 1024) {
    throw validationError("Lampiran hanya menerima PDF dengan ukuran maksimal 20 MB.");
  }
  const profil = await getWargaProfile(villageId, user.residentId);
  if (!profil) throw notFound("Data penduduk tidak ditemukan pada desa ini.");
  let lampiran: string | null = null;
  lampiran = await simpanBerkasMedia(villageId, unggahan, "permohonan", "lampiran");
  const nomorTiket = "PL-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + randomUUID().slice(0, 8).toUpperCase();
  try {
    const id = await buatPengajuanLayanan({
      villageId, layananId: parsed.data.layananId, residentId: user.residentId, nomorTiket,
      namaPemohon: profil.name, nik: profil.nationalId, telepon: parsed.data.telepon,
      email: parsed.data.email || null, alamat: profil.address, keperluan: parsed.data.keperluan,
      lampiran,
    });
    return { id, nomorTiket };
  } catch (error) {
    if (lampiran) await hapusMedia(lampiran);
    throw error;
  }
}

export async function getPengajuanPageData(status?: string) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const data = await listPengajuanLayanan(villageId, status);
  return { ...data, canUpdate: hasPermission(user.permissions, PENGAJUAN_RESOURCE, "update") };
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
  if (!parsed.success) throw validationError(parsed.error.issues[0]?.message ?? "Status pengajuan tidak valid.");
  if (!await getPengajuanLayanan(villageId, id)) throw notFound("Pengajuan tidak ditemukan.");
  const perubahan = await updateStatusPengajuan(villageId, id, user.id, parsed.data);
  const detail = await getPengajuanLayanan(villageId, id);
  if (detail?.request.residentId) {
    const { findWargaEmailByResident } = await import("@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository");
    const { kirimNotifikasiWarga } = await import("@/features/notifikasi/application/kirim-notifikasi");
    const emailAkun = await findWargaEmailByResident(villageId, detail.request.residentId);
    const email = emailAkun?.endsWith(".warga.desa.local") ? null : emailAkun;
    await kirimNotifikasiWarga({
      villageId, residentId: detail.request.residentId, jenis: "pengajuan-layanan.status",
      subjek: "Pembaruan status pengajuan " + detail.request.nomorTiket,
      pesan: "Status pengajuan " + detail.request.nomorTiket + " berubah menjadi " + perubahan.statusBaru + ". " + (parsed.data.catatanPetugas || parsed.data.alasanPenolakan || ""),
      email, telepon: detail.request.telepon,
    });
  }
}

export async function bacaLampiranPengajuanAdminData(id: number) {
  const user = await requirePermission(PENGAJUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail?.request.lampiran || !detail.request.lampiran.startsWith(villageId + "/permohonan/")) throw notFound("Lampiran tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(detail.request.lampiran);
  if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) throw notFound("Lampiran PDF tidak valid.");
  return bytes;
}

export async function bacaLampiranPengajuanWargaData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail || detail.request.residentId !== user.residentId || !detail.request.lampiran || !detail.request.lampiran.startsWith(villageId + "/permohonan/")) throw notFound("Lampiran tidak ditemukan.");
  const { bacaMedia } = await import("@/features/publik/infrastructure/media-storage");
  const bytes = await bacaMedia(detail.request.lampiran);
  if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) throw notFound("Lampiran PDF tidak valid.");
  return bytes;
}
