import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  pastikanSuperAdmin: vi.fn(),
  daftarTemplateWebsite: vi.fn(),
}));

vi.mock("../guard", () => ({ pastikanSuperAdmin: state.pastikanSuperAdmin }));
vi.mock("@/features/multi-desa/application/template-website-use-cases", () => ({
  daftarTemplateWebsite: state.daftarTemplateWebsite,
}));

const token = {
  primary: "#2563eb",
  secondary: "#1e40af",
  accent: "#f59e0b",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  fontHeading: "serif",
  radius: "sedang",
  style: "terang",
} as const;

const template = {
  id: 1,
  slug: "esensi",
  name: "Esensi",
  category: "umum",
  description: "Tema bawaan platform untuk portal desa baru.",
  version: "1.0.0",
  status: "published" as const,
  tokens: token,
  tags: ["umum"],
  createdAt: new Date("2026-11-20T00:00:00Z"),
  updatedAt: new Date("2026-11-20T00:00:00Z"),
  jumlahTenant: 4,
  jumlahTertinggal: 1,
};

describe("SuperAdminTemplatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengguna yang bukan pengelola platform", async () => {
    state.pastikanSuperAdmin.mockRejectedValue(forbidden("Hanya super admin."));
    const { default: Page } = await import("./page");

    await expect(Page()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.daftarTemplateWebsite).not.toHaveBeenCalled();
  });

  it("menampilkan katalog kosong tanpa mengarang data", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "user-1" });
    state.daftarTemplateWebsite.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Belum ada template");
    expect(html).toContain("Tambah template");
  });

  it("menampilkan template dan jumlah penggunaan dari data", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "user-1" });
    state.daftarTemplateWebsite.mockResolvedValue([template]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page());

    expect(html).toContain("Esensi");
    expect(html).toContain("1 perlu pembaruan");
    expect(html).toContain("Menampilkan 1 dari 1 template");
  });
});
