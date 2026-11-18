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

vi.mock("@/app/(auth)/masuk/login-form", () => ({
  LoginForm: () => null,
}));

const searchParams = Promise.resolve({});

describe("LoginPage — pemisahan host platform dan host desa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.host = "sukamaju.flexidesa.test";
    state.platformHosts = ["flexidesa.test"];
  });

  it("mengalihkan /masuk host platform ke login administrator tanpa memuat sesi", async () => {
    state.host = "flexidesa.test:3000";
    const { default: LoginPage } = await import("./page");

    await expect(LoginPage({ searchParams })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/super-admin-login");
    expect(state.getCurrentUser).not.toHaveBeenCalled();
  });

  it("tetap menampilkan login biasa pada host desa", async () => {
    state.getCurrentUser.mockResolvedValue(null);
    const { default: LoginPage } = await import("./page");

    await expect(LoginPage({ searchParams })).resolves.toBeDefined();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.getCurrentUser).toHaveBeenCalledOnce();
  });

  it("host yang mirip domain platform tetapi bukan host platform tetap login desa", async () => {
    state.host = "kwalagunung.desa.id";
    state.getCurrentUser.mockResolvedValue(null);
    const { default: LoginPage } = await import("./page");

    await expect(LoginPage({ searchParams })).resolves.toBeDefined();
    expect(state.redirect).not.toHaveBeenCalled();
  });

  it("tetap menampilkan login desa saat PLATFORM_HOSTS tidak diisi", async () => {
    state.host = "127.0.0.1:3000";
    state.platformHosts = [];
    state.getCurrentUser.mockResolvedValue(null);
    const { default: LoginPage } = await import("./page");

    await expect(LoginPage({ searchParams })).resolves.toBeDefined();
    expect(state.redirect).not.toHaveBeenCalled();
  });

  it("mengalihkan warga yang sudah masuk ke layanan mandiri pada host desa", async () => {
    state.getCurrentUser.mockResolvedValue({ id: "u1", residentId: 7 });
    const { default: LoginPage } = await import("./page");

    await expect(LoginPage({ searchParams })).rejects.toThrow("NEXT_REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/layanan-mandiri");
  });
});
