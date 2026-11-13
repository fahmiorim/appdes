import { beforeEach, describe, expect, it, vi } from "vitest";

import * as repository from "@/features/rbac/infrastructure/rbac-repository";

import { computeEffectivePermissions } from "./authorization";

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T>(fn: T): T => fn }));
vi.mock("@/features/rbac/infrastructure/rbac-repository", () => ({
  findRoleById: vi.fn(),
  listLevelsByRole: vi.fn(),
  listModules: vi.fn(),
}));

const role = (overrides: Partial<repository.RoleRecord>): repository.RoleRecord => ({
  id: 1,
  villageId: 7,
  slug: "operator",
  name: "Operator",
  isSystem: false,
  ...overrides,
});

const EMPTY = { isSuperadmin: false, levelByResource: new Map() };

describe("computeEffectivePermissions kepemilikan tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repository.listModules).mockResolvedValue([]);
    vi.mocked(repository.listLevelsByRole).mockResolvedValue(new Map());
  });

  it("memuat izin role desa dengan villageId sesi", async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(role({ villageId: 7 }));

    const result = await computeEffectivePermissions(1, 7);

    expect(result.isSuperadmin).toBe(false);
    expect(repository.findRoleById).toHaveBeenCalledWith(1, 7);
    expect(repository.listModules).toHaveBeenCalledWith(7);
    expect(repository.listLevelsByRole).toHaveBeenCalledWith(1, 7);
  });

  it("tidak memuat izin saat role tidak ditemukan pada desa sesi", async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(null);

    const result = await computeEffectivePermissions(1, 7);

    expect(result).toEqual(EMPTY);
    expect(repository.listModules).not.toHaveBeenCalled();
    expect(repository.listLevelsByRole).not.toHaveBeenCalled();
  });

  it("tidak menjadikan role administrator desa sebagai superadmin", async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(
      role({ slug: "administrator", isSystem: true, villageId: 7 }),
    );

    const result = await computeEffectivePermissions(1, 7);

    expect(result.isSuperadmin).toBe(false);
    expect(repository.listModules).toHaveBeenCalledWith(7);
  });

  it("hanya mengakui superadmin platform dengan villageId null", async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(
      role({ slug: "administrator", isSystem: true, villageId: null }),
    );

    const result = await computeEffectivePermissions(1, null);

    expect(result.isSuperadmin).toBe(true);
    expect(repository.listModules).not.toHaveBeenCalled();
  });
});
