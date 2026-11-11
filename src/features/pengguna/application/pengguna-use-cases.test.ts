import { beforeEach, describe, expect, it, vi } from "vitest";

import * as desa from "@/features/desa/application/resolve-village";
import * as penggunaRepo from "@/features/pengguna/infrastructure/pengguna-repository";
import * as rbac from "@/features/rbac/infrastructure/rbac-repository";
import * as dal from "@/lib/dal";

import { createPenggunaData, listPenggunaWithMeta, updatePenggunaData } from "./pengguna-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({ resolveVillageId: vi.fn() }));
vi.mock("@/features/pengguna/infrastructure/pengguna-repository", () => ({
  createPengguna: vi.fn(),
  deletePengguna: vi.fn(),
  findPenggunaByEmail: vi.fn(),
  findPenggunaByUsername: vi.fn(),
  getPenggunaById: vi.fn(),
  listPengguna: vi.fn(),
  updatePengguna: vi.fn(),
}));
vi.mock("@/features/rbac/infrastructure/rbac-repository", () => ({
  getRoleById: vi.fn(),
  listRoles: vi.fn(),
}));

const admin = { id: "u-admin", villageId: 7 } as never;

function role(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    villageId: 7,
    slug: "operator",
    name: "Operator",
    isSystem: true,
    ...overrides,
  };
}

const createInput = {
  name: "Staf Desa",
  username: "staf",
  email: null,
  roleId: 9,
  active: true,
  password: "rahasia123",
};

describe("createPenggunaData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue(admin);
    vi.mocked(desa.resolveVillageId).mockResolvedValue(7);
    vi.mocked(penggunaRepo.findPenggunaByUsername).mockResolvedValue(null);
    vi.mocked(penggunaRepo.findPenggunaByEmail).mockResolvedValue(null);
    vi.mocked(penggunaRepo.createPengguna).mockResolvedValue({ id: "u-baru" } as never);
  });

  it("menolak role milik desa lain", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue(role({ id: 99, villageId: 8 }) as never);

    await expect(createPenggunaData({ ...createInput, roleId: 99 })).rejects.toThrow(
      "tidak tersedia untuk desa ini",
    );
    expect(penggunaRepo.createPengguna).not.toHaveBeenCalled();
  });

  it("menolak role platform walau tercatat milik desa ini", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue(role({ slug: "super-admin" }) as never);

    await expect(createPenggunaData(createInput)).rejects.toThrow("tidak tersedia untuk desa ini");
    expect(penggunaRepo.createPengguna).not.toHaveBeenCalled();
  });

  it("menolak role global tanpa desa", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue(role({ villageId: null }) as never);

    await expect(createPenggunaData(createInput)).rejects.toThrow("tidak tersedia untuk desa ini");
  });

  it("menerima role milik desa sendiri", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue(role() as never);

    await expect(createPenggunaData(createInput)).resolves.toEqual({ id: "u-baru" });
    expect(penggunaRepo.createPengguna).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 9 }),
    );
  });
});

describe("updatePenggunaData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue(admin);
    vi.mocked(desa.resolveVillageId).mockResolvedValue(7);
    vi.mocked(penggunaRepo.getPenggunaById).mockResolvedValue({
      id: "u-2",
      villageId: 7,
      roleId: 9,
      email: "staf@desa.local",
    } as never);
    vi.mocked(penggunaRepo.findPenggunaByUsername).mockResolvedValue(null);
    vi.mocked(penggunaRepo.findPenggunaByEmail).mockResolvedValue(null);
  });

  it("menolak penggantian ke role desa lain", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue(role({ id: 100, villageId: 8 }) as never);

    await expect(
      updatePenggunaData("u-2", {
        name: "Staf Desa",
        username: "staf",
        email: null,
        roleId: 100,
        active: true,
        password: null,
      }),
    ).rejects.toThrow("tidak tersedia untuk desa ini");
    expect(penggunaRepo.updatePengguna).not.toHaveBeenCalled();
  });
});

describe("listPenggunaWithMeta", () => {
  it("hanya menawarkan role milik desa dan menyembunyikan role platform", async () => {
    vi.mocked(dal.requirePermission).mockResolvedValue(admin);
    vi.mocked(desa.resolveVillageId).mockResolvedValue(7);
    vi.mocked(penggunaRepo.listPengguna).mockResolvedValue([]);
    vi.mocked(rbac.listRoles).mockResolvedValue([
      role({ id: 1, name: "Administrator", slug: "administrator" }),
      role({ id: 2, name: "Super Admin", slug: "super-admin" }),
      role({ id: 3, name: "Role Global", slug: "global", villageId: null }),
      role({ id: 4, name: "Operator", slug: "operator" }),
    ] as never);

    const hasil = await listPenggunaWithMeta();

    expect(hasil.roles).toEqual([
      { value: "1", label: "Administrator" },
      { value: "4", label: "Operator" },
    ]);
  });
});
