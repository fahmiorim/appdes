import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  host: "sukamaju.flexidesa.test",
  platformHosts: ["flexidesa.test"] as string[],
  redirect: vi.fn((tujuan: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${tujuan};307;`,
    });
  }),
  getCurrentUser: vi.fn(),
  isSuperAdminUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));

vi.mock("next/navigation", () => ({
  redirect: state.redirect,
}));

vi.mock("@/lib/dal", () => ({
  getCurrentUser: state.getCurrentUser,
}));

vi.mock("@/features/desa/application/platform-host", () => ({
  get hostPlatformEksplisit() {
    return state.platformHosts;
  },
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  isSuperAdminUser: state.isSuperAdminUser,
}));

vi.mock("@/app/(auth)/masuk/login-form", () => ({
  LoginForm: () => null,
}));

const searchParams = Promise.resolve({});

describe("AdminLoginPage — login khusus staf desa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.host = "sukamaju.flexidesa.test";
    state.platformHosts = ["flexidesa.test"];
    state.isSuperAdminUser.mockResolvedValue(false);
  });

  it("mengalihkan host platform ke login Super Admin tanpa memuat sesi", async () => {
    state.host = "flexidesa.test:3000";
    const { default: AdminLoginPage } = await import("./page");

    await expect(AdminLoginPage({ searchParams })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/super-admin-login");
    expect(state.getCurrentUser).not.toHaveBeenCalled();
  });

  it("menampilkan form login Admin Desa pada host desa tanpa sesi", async () => {
    state.getCurrentUser.mockResolvedValue(null);
    const { default: AdminLoginPage } = await import("./page");

    await expect(AdminLoginPage({ searchParams })).resolves.toBeDefined();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.getCurrentUser).toHaveBeenCalledOnce();
  });

  it("mengalihkan warga yang sudah masuk ke layanan mandiri", async () => {
    state.getCurrentUser.mockResolvedValue({ id: "u1", residentId: 7, villageId: 1 });
    const { default: AdminLoginPage } = await import("./page");

    await expect(AdminLoginPage({ searchParams })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/layanan-mandiri");
  });

  it("melanjutkan staf desa ke next path yang aman", async () => {
    state.getCurrentUser.mockResolvedValue({ id: "u2", residentId: null, villageId: 1 });
    const { default: AdminLoginPage } = await import("./page");

    await expect(
      AdminLoginPage({ searchParams: Promise.resolve({ next: "/penduduk?page=2" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/penduduk?page=2");
    expect(state.isSuperAdminUser).not.toHaveBeenCalled();
  });

  it("mengalihkan pengelola platform ke konsol platform", async () => {
    state.getCurrentUser.mockResolvedValue({ id: "u3", residentId: null, villageId: null });
    state.isSuperAdminUser.mockResolvedValue(true);
    const { default: AdminLoginPage } = await import("./page");

    await expect(AdminLoginPage({ searchParams })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/super-admin");
  });
});
