import { beforeEach, describe, expect, it, vi } from "vitest";

import * as repo from "@/features/rbac/infrastructure/rbac-repository";

import { saveRolePermissions } from "./grup-use-cases";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({ resolveVillageId: vi.fn() }));
vi.mock("@/features/rbac/infrastructure/rbac-repository", () => ({
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  findRoleById: vi.fn(),
  getRoleById: vi.fn(),
  listLevelsByRole: vi.fn(),
  listModules: vi.fn(),
  listRoles: vi.fn(),
  setRolePermissions: vi.fn(),
  updateRole: vi.fn(),
}));

const dal = await import("@/lib/dal");
const desa = await import("@/features/desa/application/resolve-village");

const izinBaca = { moduleId: 1, read: true, write: false, manage: false };

describe("saveRolePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "u-1", villageId: 7 } as never);
    vi.mocked(desa.resolveVillageId).mockResolvedValue(7);
  });

  it("menolak perubahan izin pada grup sistem", async () => {
    vi.mocked(repo.getRoleById).mockResolvedValue({
      id: 1,
      name: "Administrator",
      isSystem: true,
      villageId: 7,
    } as never);

    await expect(saveRolePermissions(1, [izinBaca])).rejects.toThrow(
      "Izin grup sistem tidak dapat diubah.",
    );

    expect(repo.setRolePermissions).not.toHaveBeenCalled();
    expect(repo.listModules).not.toHaveBeenCalled();
  });

  it("tetap menyimpan izin untuk grup non-sistem milik desa sendiri", async () => {
    vi.mocked(repo.getRoleById).mockResolvedValue({
      id: 2,
      name: "Operator",
      isSystem: false,
      villageId: 7,
    } as never);
    vi.mocked(repo.listModules).mockResolvedValue([{ id: 1 }] as never);

    await saveRolePermissions(2, [izinBaca]);

    expect(repo.setRolePermissions).toHaveBeenCalledWith(2, [{ moduleId: 1, access: "read" }]);
  });

  it("menolak grup desa lain sebelum mengubah izin", async () => {
    vi.mocked(repo.getRoleById).mockResolvedValue({
      id: 3,
      name: "Operator Desa Lain",
      isSystem: false,
      villageId: 9,
    } as never);

    await expect(saveRolePermissions(3, [izinBaca])).rejects.toThrow("tidak ditemukan");
    expect(repo.setRolePermissions).not.toHaveBeenCalled();
  });
});
