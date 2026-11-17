import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

vi.mock("@/features/multi-desa/presentation/tenant-table", () => ({
  TenantTable: () => null,
}));

vi.mock("@/components/ui/card", () => ({
  Card: () => null,
}));

const desa = [
  {
    id: 1,
    name: "Desa Sukamaju",
    code: "SKM",
    domain: "sukamaju.localhost",
    active: true,
    kuotaMediaMb: 100,
    tema: null,
    pengguna: 4,
    penduduk: 120,
    jenisSurat: 3,
    createdAt: new Date("2026-01-01"),
  },
];

describe("SuperAdminPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("menolak pengguna non-super-admin sebelum memuat data tenant", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      forbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("memuat data tenant setelah guard super admin lolos", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).resolves.toBeDefined();
    expect(state.requireSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
  });
});
