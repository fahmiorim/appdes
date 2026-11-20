import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pastikanSuperAdmin: vi.fn(),
  daftarTemplateWebsite: vi.fn(),
  ambilTemplateWebsite: vi.fn(),
}));

vi.mock("../../guard", () => ({ pastikanSuperAdmin: state.pastikanSuperAdmin }));
vi.mock("@/features/multi-desa/application/template-website-use-cases", () => ({
  daftarTemplateWebsite: state.daftarTemplateWebsite,
  ambilTemplateWebsite: state.ambilTemplateWebsite,
}));

const template = {
  id: 7,
  slug: "esensi",
  name: "Esensi",
  category: "umum",
  description: "Tema bawaan platform untuk website desa.",
  version: "1.0.0",
  status: "published" as const,
  tokens: {
    primary: "#2563eb",
    secondary: "#1e40af",
    accent: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    fontHeading: "serif" as const,
    radius: "sedang" as const,
    style: "terang" as const,
  },
  tags: ["umum"],
  createdAt: new Date("2026-11-20T00:00:00Z"),
  updatedAt: new Date("2026-11-20T00:00:00Z"),
  jumlahTenant: 1,
  jumlahTertinggal: 0,
};

describe("SuperAdminPenggunaanTemplatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-user" });
    state.daftarTemplateWebsite.mockResolvedValue([template]);
    state.ambilTemplateWebsite.mockResolvedValue({
      template,
      versi: [],
      penggunaan: [
        {
          villageId: 42,
          namaDesa: "Desa Satu",
          domain: "satu.example.test",
          themeSlug: "esensi",
          themeNama: "Esensi",
          versi: "1.0.0",
          diperbaruiPada: new Date("2026-11-20T00:00:00Z"),
        },
      ],
    });
  });

  it("mengarahkan tautan desa ke halaman tenant dengan query pencarian nama", async () => {
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ template: "7" }) }),
    );

    expect(html).toContain('href="/super-admin/tenant?q=Desa%20Satu"');
    expect(html).not.toContain("/super-admin/desa/42");
  });
});
