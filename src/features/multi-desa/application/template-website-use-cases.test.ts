import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buatTemplateWebsiteBaru,
  distribusikanVersiTemplateWebsite,
  ubahTemplateWebsiteData,
} from "./template-website-use-cases";

vi.mock("./provisioning-use-cases", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/multi-desa/infrastructure/template-website-repository", () => ({
  listTemplateWebsite: vi.fn(),
  getTemplateWebsite: vi.fn(),
  listVersiTemplateWebsite: vi.fn(),
  listPenggunaanTemplateWebsite: vi.fn(),
  slugTemplateDipakai: vi.fn(),
  buatTemplateWebsite: vi.fn(),
  ubahTemplateWebsite: vi.fn(),
  setStatusTemplateWebsite: vi.fn(),
  distribusikanVersiTemplate: vi.fn(),
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
  id: 3,
  slug: "esensi",
  name: "Esensi",
  category: "umum",
  description: "Template bawaan platform untuk portal desa.",
  version: "2.0.0",
  status: "published" as const,
  tokens: token,
  tags: ["umum"],
  createdAt: new Date("2026-11-20T00:00:00Z"),
  updatedAt: new Date("2026-11-20T00:00:00Z"),
  jumlahTenant: 2,
  jumlahTertinggal: 1,
};

async function modul() {
  const guard = await import("./provisioning-use-cases");
  const repo = await import("@/features/multi-desa/infrastructure/template-website-repository");
  const audit = await import("@/features/audit/application/audit-use-cases");
  return { guard, repo, audit };
}

describe("template website — guard dan validasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pembuatan template oleh non-platform sebelum menyentuh repository", async () => {
    const { guard, repo } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Akses ditolak"), { code: "FORBIDDEN" }),
    );

    await expect(
      buatTemplateWebsiteBaru({
        name: "Template Baru",
        slug: "template-baru",
        category: "umum",
        description: "Deskripsi template yang cukup panjang untuk validasi.",
        version: "1.0.0",
        tags: ["umum"],
        tokens: token,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(repo.slugTemplateDipakai).not.toHaveBeenCalled();
    expect(repo.buatTemplateWebsite).not.toHaveBeenCalled();
  });

  it("menolak slug yang sudah dipakai tanpa menulis audit", async () => {
    const { guard, repo, audit } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(repo.slugTemplateDipakai).mockResolvedValue(true);

    await expect(
      buatTemplateWebsiteBaru({
        name: "Template Baru",
        slug: "esensi",
        category: "umum",
        description: "Deskripsi template yang cukup panjang untuk validasi.",
        version: "1.0.0",
        tags: ["umum"],
        tokens: token,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(repo.buatTemplateWebsite).not.toHaveBeenCalled();
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("menolak nomor versi yang tidak naik", async () => {
    const { guard, repo } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(repo.getTemplateWebsite).mockResolvedValue(template);

    await expect(
      ubahTemplateWebsiteData({
        id: 3,
        name: "Esensi",
        category: "umum",
        description: "Deskripsi template yang cukup panjang untuk validasi.",
        version: "1.9.9",
        tags: ["umum"],
        tokens: token,
        changelog: "Turun versi",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(repo.ubahTemplateWebsite).not.toHaveBeenCalled();
  });
});

describe("distribusi versi template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hanya mengirim pembaruan ke tenant yang benar-benar memakai template", async () => {
    const { guard, repo, audit } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(repo.getTemplateWebsite).mockResolvedValue(template);
    vi.mocked(repo.listPenggunaanTemplateWebsite).mockResolvedValue([
      {
        villageId: 1,
        namaDesa: "Desa Satu",
        domain: "satu.test",
        themeSlug: "esensi",
        themeNama: "Esensi",
        versi: "1.0.0",
        diperbaruiPada: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    vi.mocked(repo.distribusikanVersiTemplate).mockResolvedValue(1);

    await distribusikanVersiTemplateWebsite({
      id: 3,
      villageIds: ["1", "999"],
    });

    expect(repo.distribusikanVersiTemplate).toHaveBeenCalledWith(template, [1]);
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { slug: "esensi", version: "2.0.0", jumlahTenant: 1 },
      }),
    );
  });

  it("menolak bila semua id desa berasal dari tenant lain", async () => {
    const { guard, repo } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(repo.getTemplateWebsite).mockResolvedValue(template);
    vi.mocked(repo.listPenggunaanTemplateWebsite).mockResolvedValue([]);

    await expect(
      distribusikanVersiTemplateWebsite({ id: 3, villageIds: ["999"] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(repo.distribusikanVersiTemplate).not.toHaveBeenCalled();
  });

  it("menolak distribusi template yang belum terbit", async () => {
    const { guard, repo } = await modul();
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(repo.getTemplateWebsite).mockResolvedValue({ ...template, status: "draft" });

    await expect(
      distribusikanVersiTemplateWebsite({ id: 3, villageIds: ["1"] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(repo.listPenggunaanTemplateWebsite).not.toHaveBeenCalled();
  });
});
