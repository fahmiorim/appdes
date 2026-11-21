import { beforeEach, describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import * as repository from "@/features/laporan-statistik/infrastructure/laporan-statistik-repository";
import * as dal from "@/lib/dal";

import {
  getSavedReport,
  removeSavedReport,
  renameSavedReport,
} from "./laporan-statistik-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({ resolveVillageId: vi.fn() }));
vi.mock("@/features/laporan-statistik/infrastructure/laporan-statistik-repository", () => ({
  createReportTemplate: vi.fn(),
  createSavedReport: vi.fn(),
  deleteReportTemplate: vi.fn(),
  deleteSavedReport: vi.fn(),
  getDashboardLaporan: vi.fn(),
  getLaporanDesa: vi.fn(),
  getRekapAnalisis: vi.fn(),
  getStatistikDesa: vi.fn(),
  getSavedReport: vi.fn(),
  listReportTemplates: vi.fn(),
  listSavedReports: vi.fn(),
  updateReportTemplate: vi.fn(),
  updateSavedReport: vi.fn(),
}));

describe("laporan statistik use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "user-1", villageId: 17 } as never);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValue(17);
  });

  it("memeriksa izin baca dan mengambil snapshot dengan tenant dari sesi", async () => {
    await getSavedReport(41);

    expect(dal.requirePermission).toHaveBeenCalledWith("laporan-statistik", "read");
    expect(resolveVillage.resolveVillageId).toHaveBeenCalledWith({ id: "user-1", villageId: 17 });
    expect(repository.getSavedReport).toHaveBeenCalledWith(17, 41);
  });

  it("membatasi perubahan nama ke tenant dari sesi dan izin update", async () => {
    await renameSavedReport(41, { judul: "Laporan baru" });

    expect(dal.requirePermission).toHaveBeenCalledWith("laporan-statistik", "update");
    expect(repository.updateSavedReport).toHaveBeenCalledWith(17, 41, { judul: "Laporan baru" });
  });

  it("membatasi penghapusan ke tenant dari sesi dan izin delete", async () => {
    await removeSavedReport(41);

    expect(dal.requirePermission).toHaveBeenCalledWith("laporan-statistik", "delete");
    expect(repository.deleteSavedReport).toHaveBeenCalledWith(17, 41);
  });

  it("tidak memanggil repository jika permission ditolak", async () => {
    vi.mocked(dal.requirePermission).mockRejectedValue(new Error("forbidden"));

    await expect(getSavedReport(41)).rejects.toThrow("forbidden");
    expect(repository.getSavedReport).not.toHaveBeenCalled();
  });
});
