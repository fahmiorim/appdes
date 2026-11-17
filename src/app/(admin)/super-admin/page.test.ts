import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden, unauthenticated } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  daftarSemuaDomain: vi.fn(),
  redirect: vi.fn((tujuan: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${tujuan};307;`,
    });
  }),
  forbidden: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;403",
    });
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: state.redirect,
  forbidden: state.forbidden,
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

// Halaman memuat domain lewat use case terpisah; tanpa mock ini test akan
// menyentuh database sungguhan.
vi.mock("@/features/multi-desa/application/kelola-desa-use-cases", () => ({
  daftarSemuaDomain: state.daftarSemuaDomain,
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

  it("menampilkan halaman 403 tanpa memuat data tenant untuk Admin Desa", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(state.forbidden).toHaveBeenCalledOnce();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("mengalihkan pengguna tanpa sesi ke halaman masuk", async () => {
    state.requireSuperAdmin.mockRejectedValue(unauthenticated());
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/masuk");
    expect(state.forbidden).not.toHaveBeenCalled();
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("memuat data tenant setelah guard super admin lolos", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    state.daftarSemuaDomain.mockResolvedValue([]);
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).resolves.toBeDefined();
    expect(state.forbidden).not.toHaveBeenCalled();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarSemuaDomain).toHaveBeenCalledOnce();
  });
});
