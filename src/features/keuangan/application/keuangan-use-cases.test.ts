import { beforeEach, describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import * as keuanganRepo from "@/features/keuangan/infrastructure/keuangan-repository";
import * as dal from "@/lib/dal";

import { getLaporanKeuangan, getLaporanRealisasiResmi, listKeuangan } from "./keuangan-use-cases";

vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(),
}));

vi.mock("@/features/keuangan/infrastructure/keuangan-repository", () => ({
  listKeuanganTahun: vi.fn(),
  listKeuanganTahunTersedia: vi.fn(),
  listKeuanganTriwulan: vi.fn(),
  listTemplate: vi.fn(),
  saveKeuanganNilai: vi.fn(),
  saveKeuanganTriwulan: vi.fn(),
}));

describe("keuangan use-cases: resource izin baca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({} as never);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValue(1);
    vi.mocked(keuanganRepo.listKeuanganTahunTersedia).mockResolvedValue([2026]);
    vi.mocked(keuanganRepo.listKeuanganTahun).mockResolvedValue([]);
  });

  it("APBDes memakai resource keuangan", async () => {
    await listKeuangan(2026);

    expect(dal.requirePermission).toHaveBeenCalledWith("keuangan", "read");
  });

  it("laporan RP APBDes memakai resource laporan-keuangan", async () => {
    await getLaporanKeuangan(2026);

    expect(dal.requirePermission).toHaveBeenCalledWith("laporan-keuangan", "read");
  });

  it("rincian realisasi resmi memakai resource laporan-keuangan", async () => {
    await getLaporanRealisasiResmi(2026);

    expect(dal.requirePermission).toHaveBeenCalledWith("laporan-keuangan", "read");
  });
});
