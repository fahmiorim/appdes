import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  pastikanSuperAdmin: vi.fn(),
  ambilDetailDomainPlatform: vi.fn(),
  ambilAuditPlatform: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  }),
  aksiDns: vi.fn(),
  aksiSsl: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: state.notFound,
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../../guard", () => ({
  pastikanSuperAdmin: state.pastikanSuperAdmin,
}));

vi.mock("../../actions", () => ({
  periksaDnsDomainAction: state.aksiDns,
  periksaSslDomainAction: state.aksiSsl,
}));

vi.mock("@/features/multi-desa/application/pemantauan-domain-use-cases", () => ({
  ambilDetailDomainPlatform: state.ambilDetailDomainPlatform,
}));

vi.mock("@/features/multi-desa/application/audit-platform-use-cases", () => ({
  ambilAuditPlatform: state.ambilAuditPlatform,
}));

const dataDasar = {
  domain: {
    id: 7,
    villageId: 3,
    domain: "tanjung-gading.example.id",
    isPrimary: true,
    createdAt: new Date("2026-01-12T04:00:00Z"),
  },
  desa: {
    id: 3,
    name: "Desa Tanjung Gading",
    slug: "tanjung-gading",
    code: "1207012001",
    logo: null,
    district: "Sei Suka",
    regency: "Batu Bara",
    province: "Sumatera Utara",
    active: true,
    createdAt: new Date("2026-01-10T04:00:00Z"),
    updatedAt: new Date("2026-11-18T04:00:00Z"),
  },
  aliases: [
    {
      id: 7,
      villageId: 3,
      domain: "tanjung-gading.example.id",
      isPrimary: true,
      createdAt: new Date("2026-01-12T04:00:00Z"),
    },
    {
      id: 8,
      villageId: 3,
      domain: "tanjung-gading.go.id",
      isPrimary: false,
      createdAt: new Date("2026-02-03T04:00:00Z"),
    },
  ],
  dns: {
    status: "normal" as const,
    addresses: ["103.135.221.40"],
    error: null,
    checkedAt: new Date("2026-11-18T04:00:00Z"),
  },
  ssl: {
    status: "aktif" as const,
    validFrom: new Date("2026-10-14T04:00:00Z"),
    validTo: new Date("2027-01-12T04:00:00Z"),
    issuer: "Let's Encrypt",
    error: null,
    checkedAt: new Date("2026-11-18T04:00:00Z"),
  },
};

const auditDasar = {
  rows: [
    {
      id: 1,
      event: "desa.domain",
      actorName: "Super Admin",
      resource: "village_domains",
      resourceId: "7",
      details: JSON.stringify({ aksi: "tambah", domain: "tanjung-gading.example.id" }),
      createdAt: new Date("2026-11-18T09:47:00Z"),
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  pageCount: 1,
};

describe("SuperAdminDetailDomainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.ambilDetailDomainPlatform.mockResolvedValue(dataDasar);
    state.ambilAuditPlatform.mockResolvedValue(auditDasar);
  });

  it("menolak pengguna yang bukan pengelola platform sebelum membaca domain", async () => {
    state.pastikanSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh melihat detail domain."),
    );
    const { default: Page } = await import("./page");

    await expect(
      Page({
        params: Promise.resolve({ domainId: "7" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.ambilDetailDomainPlatform).not.toHaveBeenCalled();
    expect(state.ambilAuditPlatform).not.toHaveBeenCalled();
  });

  it("menampilkan overview dari data domain, DNS, SSL, dan audit nyata", async () => {
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ domainId: "7" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(state.ambilDetailDomainPlatform).toHaveBeenCalledWith(7);
    expect(state.ambilAuditPlatform).toHaveBeenCalledWith({ desa: "3" });
    expect(html).toContain("Detail Domain — Desa Tanjung Gading");
    expect(html).toContain("Sei Suka, Batu Bara");
    expect(html).toContain("tanjung-gading.example.id");
    expect(html).toContain("Status Domain");
    expect(html).toContain("Pratinjau Website");
    expect(html).toContain("DNS Records");
    expect(html).toContain("103.135.221.40");
    expect(html).toContain("Status SSL");
    expect(html).toContain("Let&#x27;s Encrypt");
    expect(html).toContain("Riwayat Perubahan Terbaru");
    expect(html).toContain("Super Admin");
    expect(html).toContain("Cek DNS");
    expect(html).toContain("Cek SSL");
    expect(html).toContain("Buka Website");
  });

  it.each([
    ["dns", "TTL, CNAME, TXT, MX, dan record lain belum diambil"],
    ["ssl", "Aplikasi tidak mematikan verifikasi TLS"],
    ["redirect", "Domain &amp; Alias (2)"],
    ["verifikasi", "Verifikasi kepemilikan domain belum diimplementasikan"],
    ["riwayat", "1 peristiwa tenant terbaru"],
  ])("menampilkan tab %s tanpa data contoh", async (tab, teks) => {
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ domainId: "7" }),
        searchParams: Promise.resolve({ tab }),
      }),
    );

    expect(html).toContain(teks);
    if (tab === "redirect") expect(html).toContain("tanjung-gading.go.id");
  });

  it("memakai halaman 404 bila domain tidak ditemukan atau id tidak valid", async () => {
    state.ambilDetailDomainPlatform.mockResolvedValue(null);
    const { default: Page } = await import("./page");

    await expect(
      Page({
        params: Promise.resolve({ domainId: "999" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(state.ambilAuditPlatform).not.toHaveBeenCalled();

    await expect(
      Page({
        params: Promise.resolve({ domainId: "bukan-id" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(state.ambilDetailDomainPlatform).toHaveBeenCalledOnce();
  });
});
