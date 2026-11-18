import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarPenggunaPlatform: vi.fn(),
  forbidden: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;403",
    });
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  forbidden: state.forbidden,
  usePathname: () => "/super-admin/pengguna",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
}));

vi.mock("@/features/multi-desa/application/pengguna-platform-use-cases", () => ({
  daftarPenggunaPlatform: state.daftarPenggunaPlatform,
}));

// Server Action diimpor halaman dari folder route; mock agar test tidak
// memuat next/cache dan use case yang menyentuh database.
vi.mock("./actions", () => ({
  buatPenggunaAction: vi.fn(),
  cabutSesiPenggunaAction: vi.fn(),
  resetSandiPenggunaAction: vi.fn(),
  ubahStatusPenggunaAction: vi.fn(),
}));

const pengguna = {
  id: "platform-1",
  name: "Pengelola Platform",
  email: "pengelola@contoh.id",
  username: "pengelola",
  roleName: "Super Admin",
  roleSlug: "super-admin",
  active: true,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  sesiAktif: 1,
};

describe("SuperAdminPenggunaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengguna yang bukan pengelola platform", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: Page } = await import("./page");

    await expect(Page()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(state.daftarPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("menempatkan penambahan pengguna platform di dialog, bukan form yang menetap", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarPenggunaPlatform.mockResolvedValue([pengguna]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Tambah pengguna platform");
    expect(html).toContain('class="platform-dialog"');
    expect(html).toContain("Sandi awal");
    expect(html).not.toContain("platform-create");
  });

  it("mengarahkan penambahan akun pertama ke tombol di kepala kartu", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarPenggunaPlatform.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Belum ada akun platform. Tambahkan pengguna pertama lewat tombol");
  });
});
