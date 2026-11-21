import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requireWargaAktif } from "@/lib/dal";
import { notFound } from "@/lib/errors";

import {
  getPengajuanLayanan,
  listPengajuanLayananWarga,
  listRiwayatPengajuan,
} from "../infrastructure/pengajuan-repository";

export async function getPengajuanWargaDetailData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const row = await getPengajuanLayanan(villageId, id);
  if (!row || row.request.residentId !== user.residentId)
    throw notFound("Pengajuan tidak ditemukan.");
  const riwayat = await listRiwayatPengajuan(villageId, id);
  return { ...row, riwayat };
}

export async function listPengajuanLayananWargaData() {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  return listPengajuanLayananWarga(villageId, user.residentId);
}

export async function listBerkasPengajuanWargaDetailData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const detail = await getPengajuanLayanan(villageId, id);
  if (!detail || detail.request.residentId !== user.residentId)
    throw notFound("Pengajuan tidak ditemukan.");
  const { listBerkasPengajuan } = await import("../infrastructure/pengajuan-repository");
  return listBerkasPengajuan(villageId, id, "persyaratan");
}
