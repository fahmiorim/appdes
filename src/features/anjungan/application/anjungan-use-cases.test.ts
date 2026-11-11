import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/anjungan-repository";
import { cariPerangkatKiosk, tambahAnjungan, ubahAnjungan } from "./anjungan-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

vi.mock("../infrastructure/anjungan-repository", () => ({
  createAnjungan: vi.fn(),
  deleteAnjungan: vi.fn(),
  listAnjungan: vi.fn(async () => []),
  updateAnjungan: vi.fn(),
}));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("tambahAnjungan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.createAnjungan).mockResolvedValue(12);
  });

  it("membuat UUID otomatis bila field dikirim kosong", async () => {
    const hasil = await tambahAnjungan(7, { nama: "Anjungan Surat", uuid: "" });

    expect(dal.requirePermission).toHaveBeenCalledWith("anjungan", "update");
    expect(repo.createAnjungan).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        nama: "Anjungan Surat",
        uuid: expect.stringMatching(UUID_V4),
      }),
    );
    expect(hasil).toEqual({ id: 12 });
  });

  it("tidak menyimpan bila UUID yang diisi tidak valid", async () => {
    await expect(tambahAnjungan(7, { nama: "Anjungan Surat", uuid: "bukan-uuid" })).rejects.toThrow(
      "UUID tidak valid",
    );

    expect(repo.createAnjungan).not.toHaveBeenCalled();
  });
});

describe("cariPerangkatKiosk", () => {
  const UUID_TERDAFTAR = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.listAnjungan).mockResolvedValue([
      { id: 3, uuid: UUID_TERDAFTAR, nama: "Anjungan Lobi" } as never,
    ]);
  });

  it("mengembalikan perangkat bila UUID terdaftar untuk desa", async () => {
    const hasil = await cariPerangkatKiosk(7, UUID_TERDAFTAR);

    expect(repo.listAnjungan).toHaveBeenCalledWith(7, true);
    expect(hasil?.id).toBe(3);
  });

  it("mengembalikan null untuk UUID kosong atau tidak valid tanpa menyentuh database", async () => {
    expect(await cariPerangkatKiosk(7, undefined)).toBeNull();
    expect(await cariPerangkatKiosk(7, "bukan-uuid")).toBeNull();
    expect(repo.listAnjungan).not.toHaveBeenCalled();
  });

  it("mengembalikan null bila UUID tidak terdaftar", async () => {
    expect(await cariPerangkatKiosk(7, "6ba7b810-9dad-41d1-80b4-00c04fd430c8")).toBeNull();
  });
});

describe("ubahAnjungan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengisi UUID baru bila data lama tidak punya UUID", async () => {
    await ubahAnjungan(7, 3, { nama: "Anjungan Surat", uuid: "" });

    expect(dal.requirePermission).toHaveBeenCalledWith("anjungan", "update");
    expect(repo.updateAnjungan).toHaveBeenCalledWith(
      3,
      7,
      expect.objectContaining({
        nama: "Anjungan Surat",
        uuid: expect.stringMatching(UUID_V4),
      }),
    );
  });
});
