import { beforeEach, describe, expect, it, vi } from "vitest";

import * as desaRepo from "@/features/desa/infrastructure/desa-repository";

import { getNamaDesaUseCase } from "./use-cases";

vi.mock("@/features/desa/infrastructure/desa-repository", () => ({
  getNamaDesa: vi.fn(),
  getIdentitasDesa: vi.fn(),
  updateIdentitasDesa: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(),
}));

describe("getNamaDesaUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("meneruskan villageId ke repository dan mengembalikan nama desa", async () => {
    vi.mocked(desaRepo.getNamaDesa).mockResolvedValue("Desa Contoh");

    await expect(getNamaDesaUseCase(7)).resolves.toBe("Desa Contoh");
    expect(desaRepo.getNamaDesa).toHaveBeenCalledWith(7);
  });

  it("mengembalikan null bila desa tidak ditemukan", async () => {
    vi.mocked(desaRepo.getNamaDesa).mockResolvedValue(null);

    await expect(getNamaDesaUseCase(99)).resolves.toBeNull();
  });
});
