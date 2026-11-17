import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import * as rbac from "@/features/rbac/infrastructure/rbac-repository";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";

import { buatDesaBaru, isSuperAdminUser, requireSuperAdmin } from "./provisioning-use-cases";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/rbac/infrastructure/rbac-repository", () => ({ getRoleById: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/multi-desa/infrastructure/provisioning-repository", () => ({
  listDesaSuperAdmin: vi.fn(),
  provisionDesa: vi.fn(),
}));

/** Akun staf desa; `villageId` non-null adalah penanda akun terikat desa. */
function pengguna(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u-1",
    name: "Uji",
    username: "uji",
    email: "uji@contoh.id",
    image: null,
    villageId: 7,
    roleId: 1,
    residentId: null,
    mustChangePin: false,
    permissions: { isSuperadmin: false, levelByResource: new Map() },
    ...overrides,
  };
}

describe("isSuperAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak administrator desa walau izin superadmin aktif", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue({
      id: 1,
      villageId: 7,
      name: "Administrator",
      slug: "administrator",
      isSystem: true,
    } as never);

    const administrator = pengguna({
      permissions: { isSuperadmin: true, levelByResource: new Map() },
    });

    await expect(isSuperAdminUser(administrator)).resolves.toBe(false);
  });

  it("menolak role super-admin yang terikat desa", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue({
      id: 2,
      villageId: 7,
      name: "Super Admin",
      slug: "super-admin",
      isSystem: true,
    } as never);

    await expect(isSuperAdminUser(pengguna({ roleId: 2 }))).resolves.toBe(false);
  });

  it("menerima pengelola platform tanpa desa", async () => {
    vi.mocked(rbac.getRoleById).mockResolvedValue({
      id: 3,
      villageId: 1,
      name: "Super Admin",
      slug: "super-admin",
      isSystem: true,
    } as never);

    const platform = pengguna({
      id: "u-platform",
      villageId: null,
      roleId: 3,
      permissions: { isSuperadmin: false, levelByResource: new Map() },
    });

    await expect(isSuperAdminUser(platform)).resolves.toBe(true);
  });

  it("menolak akun tanpa role", async () => {
    await expect(isSuperAdminUser(pengguna({ roleId: null }))).resolves.toBe(false);
    expect(rbac.getRoleById).not.toHaveBeenCalled();
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak administrator desa", async () => {
    vi.mocked(dal.requireUser).mockResolvedValue(
      pengguna({ permissions: { isSuperadmin: true, levelByResource: new Map() } }),
    );

    await expect(requireSuperAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("meloloskan pengelola platform", async () => {
    const platform = pengguna({ villageId: null, roleId: 3 });
    vi.mocked(dal.requireUser).mockResolvedValue(platform);
    vi.mocked(rbac.getRoleById).mockResolvedValue({ slug: "super-admin" } as never);

    await expect(requireSuperAdmin()).resolves.toBe(platform);
  });
});

const desaBaru = {
  name: "Desa Sukamaju",
  code: "1207012001",
  domain: "sukamaju.contoh.id",
  adminName: "Admin Desa",
  adminUsername: "admin.sukamaju",
  adminEmail: "admin@sukamaju.contoh.id",
  adminPassword: "sandi-uji-panjang",
};

describe("buatDesaBaru", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const repo = await import("@/features/multi-desa/infrastructure/provisioning-repository");
    const audit = await import("@/features/audit/application/audit-use-cases");
    vi.mocked(repo.provisionDesa).mockReset();
    vi.mocked(audit.recordAuditEvent).mockReset();
  });

  it("menolak pembuatan desa oleh administrator desa", async () => {
    vi.mocked(dal.requireUser).mockResolvedValue(pengguna());
    const repo = await import("@/features/multi-desa/infrastructure/provisioning-repository");

    await expect(buatDesaBaru(desaBaru)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.provisionDesa).not.toHaveBeenCalled();
  });

  it("membuat desa dan mencatat audit desa.create", async () => {
    const platform = pengguna({ id: "u-platform", villageId: null, roleId: 3 });
    vi.mocked(dal.requireUser).mockResolvedValue(platform);
    vi.mocked(rbac.getRoleById).mockResolvedValue({ slug: "super-admin" } as never);
    const repo = await import("@/features/multi-desa/infrastructure/provisioning-repository");
    const audit = await import("@/features/audit/application/audit-use-cases");
    vi.mocked(repo.provisionDesa).mockResolvedValue({ id: 9 });

    await expect(buatDesaBaru(desaBaru)).resolves.toEqual({ id: 9 });
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 9,
        actorId: "u-platform",
        event: AUDIT_EVENTS.desaCreate,
        resourceId: "9",
      }),
    );
  });
});
