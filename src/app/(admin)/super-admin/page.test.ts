import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden, unauthenticated } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  redirect: vi.fn((tujuan: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${tujuan};307;`,
    });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: state.redirect }));

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
    vi.clearAllMocks();
  });

  it("mengalihkan Admin Desa ke beranda tanpa memuat data tenant", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      forbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/beranda");
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("mengalihkan pengguna tanpa sesi ke halaman masuk", async () => {
    state.requireSuperAdmin.mockRejectedValue(unauthenticated());
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/masuk");
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("memuat data tenant setelah guard super admin lolos", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).resolves.toBeDefined();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
  });
});
