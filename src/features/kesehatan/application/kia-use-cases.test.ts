import { beforeEach, describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import * as repo from "@/features/kesehatan/infrastructure/kesehatan-repository";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import { hapusKia, tambahKia } from "./kia-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(),
}));

vi.mock("@/features/kesehatan/infrastructure/kesehatan-repository", () => ({
  createBulananAnak: vi.fn(),
  createIbuHamil: vi.fn(),
  createKia: vi.fn(),
  createPosyandu: vi.fn(),
  deleteBulananAnak: vi.fn(),
  deleteIbuHamil: vi.fn(),
  deleteKia: vi.fn(),
  deletePosyandu: vi.fn(),
  listBulananAnak: vi.fn(),
  listIbuHamil: vi.fn(),
  listKia: vi.fn(),
  listPosyandu: vi.fn(),
  updateBulananAnak: vi.fn(),
  updateIbuHamil: vi.fn(),
  updateKia: vi.fn(),
  updatePosyandu: vi.fn(),
}));

vi.mock("@/features/penduduk/infrastructure/penduduk-repository", () => ({
  listPendudukOptions: vi.fn(),
}));

describe("kia-use-cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak penulisan KIA tanpa sesi sebelum menyentuh database", async () => {
    vi.mocked(dal.requirePermission).mockRejectedValueOnce(new AppError("UNAUTHENTICATED"));

    await expect(tambahKia({ noKia: "KIA-1", ibuId: 2 })).rejects.toThrow(
      "Sesi Anda telah berakhir",
    );

    expect(dal.requirePermission).toHaveBeenCalledWith("kesehatan", "update");
    expect(repo.createKia).not.toHaveBeenCalled();
  });

  it("mengambil villageId dari sesi, bukan dari input pemanggil", async () => {
    vi.mocked(dal.requirePermission).mockResolvedValueOnce({} as CurrentUser);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValueOnce(7);
    vi.mocked(repo.createKia).mockResolvedValueOnce(9);

    const id = await tambahKia({ noKia: "KIA-1", ibuId: 2 });

    expect(id).toBe(9);
    expect(repo.createKia).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 7, noKia: "KIA-1", ibuId: 2 }),
    );
  });

  it("menolak id tidak valid tanpa memeriksa sesi", async () => {
    await expect(hapusKia(0)).rejects.toThrow("ID tidak valid");

    expect(dal.requirePermission).not.toHaveBeenCalled();
    expect(repo.deleteKia).not.toHaveBeenCalled();
  });
});
