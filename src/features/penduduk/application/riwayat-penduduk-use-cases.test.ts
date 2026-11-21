import { beforeEach, describe, expect, it, vi } from "vitest";

import { catatDatang } from "./riwayat-penduduk-use-cases";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(async () => ({ id: "user-1", villageId: 7 })),
  resolveVillageId: vi.fn(async () => 7),
  nationalIdExists: vi.fn(async () => false),
  validateReferences: vi.fn(async () => undefined),
  saveResidentAndMutation: vi.fn(async () => 42),
}));

vi.mock("@/lib/dal", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: mocks.resolveVillageId,
}));
vi.mock("@/features/penduduk/infrastructure/penduduk-repository", () => ({
  findPendudukById: vi.fn(),
  nationalIdExists: mocks.nationalIdExists,
  validatePendudukTenantReferences: mocks.validateReferences,
}));
vi.mock("@/features/penduduk/infrastructure/riwayat-penduduk-repository", () => ({
  getRiwayatByResident: vi.fn(),
  listRiwayatPenduduk: vi.fn(),
  listRiwayatPendudukExport: vi.fn(),
  simpanPendudukBaruDanMutasi: mocks.saveResidentAndMutation,
  ubahStatusPendudukDanMutasi: vi.fn(),
}));

describe("use case pencatatan penduduk masuk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ id: "user-1", villageId: 7 });
    mocks.resolveVillageId.mockResolvedValue(7);
    mocks.nationalIdExists.mockResolvedValue(false);
    mocks.validateReferences.mockResolvedValue(undefined);
    mocks.saveResidentAndMutation.mockResolvedValue(42);
  });

  it("menyimpan hubungan keluarga yang dipilih bersama penduduk baru", async () => {
    await catatDatang({
      eventDate: "2026-11-21",
      name: "Penduduk Masuk",
      nationalId: null,
      gender: "female",
      birthDate: null,
      birthPlace: "",
      familyId: 19,
      familyRelationId: 4,
      regionId: null,
      address: "Alamat desa",
      fromAddress: "Alamat asal",
      reason: "Pindah domisili",
      notes: "",
      referenceNo: "",
    });

    expect(mocks.saveResidentAndMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        familyId: 19,
        familyRelationId: 4,
      }),
      expect.objectContaining({ villageId: 7, type: "move_in" }),
    );
  });
});
