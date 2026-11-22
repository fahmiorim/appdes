import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  createReportTemplate,
  createSavedReport,
  deleteReportTemplate,
  deleteSavedReport,
  getDashboardLaporan as fetchDashboardLaporan,
  getLaporanDesa as fetchLaporanDesa,
  getRekapAnalisis as fetchRekapAnalisis,
  getStatistikDesa as fetchStatistikDesa,
  getSavedReport as getSavedReportFromRepository,
  listReportTemplates,
  listSavedReports,
  updateReportTemplate,
  updateSavedReport,
  type JenisLaporan,
  type KategoriStatistik,
} from "@/features/laporan-statistik/infrastructure/laporan-statistik-repository";
import { requirePermission } from "@/lib/dal";

async function village(permission: "read" | "update" | "delete" = "read") {
  const user = await requirePermission("laporan-statistik", permission);
  return { user, villageId: await resolveVillageId(user) };
}

export type { JenisLaporan, KategoriStatistik };

export async function getDashboardLaporan(tahun?: number) {
  const { villageId } = await village();
  return fetchDashboardLaporan(villageId, tahun);
}
export async function getLaporanDesa(jenis: JenisLaporan, tahun?: number) {
  const { villageId } = await village();
  return fetchLaporanDesa(villageId, jenis, tahun);
}
export async function getStatistikDesa(kategori: KategoriStatistik) {
  const { villageId } = await village();
  return fetchStatistikDesa(villageId, kategori);
}
export async function getRekapAnalisis(tahun?: number) {
  const { villageId } = await village();
  return fetchRekapAnalisis(villageId, tahun);
}
export async function loadSavedReports() {
  const { villageId } = await village();
  return listSavedReports(villageId);
}
export async function saveReport(input: {
  judul: string;
  jenis: JenisLaporan;
  tahun: number;
  deskripsi: string | null;
}) {
  const { user, villageId } = await village("update");
  const report = await fetchLaporanDesa(villageId, input.jenis, input.tahun);
  await createSavedReport({
    ...input,
    villageId,
    kolom: report.columns,
    baris: report.rows,
    dibuatOleh: user.id,
  });
}
export async function renameSavedReport(
  id: number,
  changes: { judul: string; deskripsi?: string | null },
) {
  const { villageId } = await village("update");
  return updateSavedReport(villageId, id, changes);
}
export async function removeSavedReport(id: number) {
  const { villageId } = await village("delete");
  return deleteSavedReport(villageId, id);
}
export async function getSavedReport(id: number) {
  const { villageId } = await village();
  return getSavedReportFromRepository(villageId, id);
}
export async function loadReportTemplates() {
  const { villageId } = await village();
  return listReportTemplates(villageId);
}
export async function saveReportTemplate(input: {
  judul: string;
  jenis: JenisLaporan;
  deskripsi: string | null;
}) {
  const { user, villageId } = await village("update");
  await createReportTemplate({ ...input, villageId, createdBy: user.id });
}
export async function renameReportTemplate(
  id: number,
  changes: { judul: string; deskripsi?: string | null },
) {
  const { villageId } = await village("update");
  return updateReportTemplate(villageId, id, changes);
}
export async function removeReportTemplate(id: number) {
  const { villageId } = await village("delete");
  return deleteReportTemplate(villageId, id);
}
