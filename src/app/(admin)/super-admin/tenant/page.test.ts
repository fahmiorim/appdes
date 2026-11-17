import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  daftarSemuaDomain: vi.fn(),
  forbidden: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;403",
    });
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  forbidden: state.forbidden,
  usePathname: () => "/super-admin/tenant",
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

vi.mock("@/features/multi-desa/application/kelola-desa-use-cases", () => ({
  daftarSemuaDomain: state.daftarSemuaDomain,
}));

// Server Action diimpor halaman dari folder route; mock agar test tidak
// memuat next/cache dan use case yang menyentuh database.
vi.mock("../actions", () => ({
  buatDesaAction: vi.fn(),
  eksporDataAction: vi.fn(),
  hapusDomainAction: vi.fn(),
  jadikanUtamaAction: vi.fn(),
  purgeAction: vi.fn(),
  resetAdminAction: vi.fn(),
  tambahDomainAction: vi.fn(),
  ubahKuotaAction: vi.fn(),
  ubahStatusAction: vi.fn(),
}));

describe("SuperAdminTenantPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengguna yang bukan pengelola platform", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: Page } = await import("./page");

    await expect(Page()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
    expect(state.daftarSemuaDomain).not.toHaveBeenCalled();
  });

  it("memuat daftar tenant dan domain setelah guard lolos", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([
      {
        id: 1,
        name: "Desa Sukamaju",
        slug: "sukamaju",
        code: "1207012001",
        domain: "sukamaju.localhost",
        active: true,
        kuotaMediaMb: null,
        tema: null,
        pengguna: 1,
        penduduk: 10,
        jenisSurat: 0,
        createdAt: new Date("2026-01-01"),
        nonaktifSejak: null,
        purgedAt: null,
        adaEksporBerlaku: false,
      },
    ]);
    state.daftarSemuaDomain.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    await expect(Page()).resolves.toBeDefined();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarSemuaDomain).toHaveBeenCalledOnce();
  });
});
