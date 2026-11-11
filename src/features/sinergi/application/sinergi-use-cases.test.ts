import { beforeEach, describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import * as repo from "../infrastructure/sinergi-repository";
import { tambahSinergi } from "./sinergi-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(),
}));

vi.mock("../infrastructure/sinergi-repository", () => ({
  createSinergi: vi.fn(),
  deleteSinergi: vi.fn(),
  listSinergi: vi.fn(),
  updateSinergi: vi.fn(),
}));

describe("sinergi-use-cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak penulisan tanpa sesi sebelum menyentuh database", async () => {
    vi.mocked(dal.requirePermission).mockRejectedValueOnce(new AppError("UNAUTHENTICATED"));

    await expect(tambahSinergi({ nama: "Program Desa" })).rejects.toThrow(
      "Sesi Anda telah berakhir",
    );

    expect(dal.requirePermission).toHaveBeenCalledWith("sinergi", "update");
    expect(repo.createSinergi).not.toHaveBeenCalled();
  });

  it("menyimpan program pada desa milik sesi", async () => {
    vi.mocked(dal.requirePermission).mockResolvedValueOnce({} as CurrentUser);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValueOnce(3);
    vi.mocked(repo.createSinergi).mockResolvedValueOnce(11);

    const hasil = await tambahSinergi({ nama: "Program Desa", mitra: "Koperasi" });

    expect(hasil).toEqual({ id: 11 });
    expect(repo.createSinergi).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 3, nama: "Program Desa", mitra: "Koperasi" }),
    );
  });
});
