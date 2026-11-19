import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden, unauthenticated } from "@/lib/errors";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  daftarSemuaDomain: vi.fn(),
  daftarPenggunaPlatform: vi.fn(),
  ambilAuditPlatform: vi.fn(),
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
  usePathname: () => "/super-admin",
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

// Halaman memuat domain dan pengguna platform lewat use case terpisah; tanpa
// mock ini test akan menyentuh database sungguhan.
vi.mock("@/features/multi-desa/application/kelola-desa-use-cases", () => ({
  daftarSemuaDomain: state.daftarSemuaDomain,
}));

vi.mock("@/features/multi-desa/application/pengguna-platform-use-cases", () => ({
  daftarPenggunaPlatform: state.daftarPenggunaPlatform,
}));

vi.mock("@/features/multi-desa/application/audit-platform-use-cases", () => ({
  ambilAuditPlatform: state.ambilAuditPlatform,
}));

const desa = [
  {
    id: 1,
    name: "Desa Sukamaju",
    slug: "sukamaju",
    code: "1207012001",
    domain: "sukamaju.localhost",
    district: "Cibadak",
    active: true,
    kuotaMediaMb: 100,
    tema: "tegar",
    temaNama: "Tegar",
    temaVersi: "1.0.0",
    pengguna: 4,
    penduduk: 120,
    jenisSurat: 3,
    createdAt: new Date("2026-01-01"),
    nonaktifSejak: null,
    purgedAt: null,
    adaEksporBerlaku: false,
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

  it("tidak menampilkan baris perhatian yang hitungannya nol", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    state.daftarSemuaDomain.mockResolvedValue([
      { id: 1, villageId: 1, domain: "sukamaju.localhost", isPrimary: true },
    ]);
    state.daftarPenggunaPlatform.mockResolvedValue([]);
    state.ambilAuditPlatform.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pageCount: 1,
    });
    const { default: SuperAdminPage } = await import("./page");

    // Halaman adalah async server component; render pohon yang sudah resolve.
    const html = renderToStaticMarkup(await SuperAdminPage());

    expect(html).not.toContain("desa tanpa domain");
    expect(html).toContain("Tidak ada tindakan tertunda");
    expect(html).toContain("Tema paling populer");
    expect(html).toContain("Distribusi tenant per kecamatan");
    expect(html).toContain("Tegar");
    expect(html).toContain("Cibadak");
  });

  it("memuat ringkasan tenant, domain, dan pengguna platform setelah guard lolos", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    state.daftarSemuaDomain.mockResolvedValue([]);
    state.daftarPenggunaPlatform.mockResolvedValue([]);
    state.ambilAuditPlatform.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pageCount: 1,
    });
    const { default: SuperAdminPage } = await import("./page");

    await expect(SuperAdminPage()).resolves.toBeDefined();
    expect(state.forbidden).not.toHaveBeenCalled();
    expect(state.redirect).not.toHaveBeenCalled();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarSemuaDomain).toHaveBeenCalledOnce();
    expect(state.daftarPenggunaPlatform).toHaveBeenCalledOnce();
    expect(state.ambilAuditPlatform).toHaveBeenCalledOnce();
  });

  it("menjumlahkan pengguna desa dan akun platform pada KPI total pengguna", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(desa);
    state.daftarSemuaDomain.mockResolvedValue([
      { id: 1, villageId: 1, domain: "sukamaju.localhost", isPrimary: true },
    ]);
    state.daftarPenggunaPlatform.mockResolvedValue([
      { id: "platform-1", roleSlug: "super-admin" },
      { id: "platform-2", roleSlug: "super-admin" },
    ]);
    state.ambilAuditPlatform.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pageCount: 1,
    });
    const { default: SuperAdminPage } = await import("./page");

    const html = renderToStaticMarkup(await SuperAdminPage());

    expect(html).toContain("Total pengguna");
    expect(html).toContain("4 desa · 2 platform");
  });

  it("menautkan desa nonaktif dan siap purge ke daftar tenant yang sudah terfilter", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([
      desa[0],
      {
        ...desa[0],
        id: 2,
        name: "Desa Tertunda",
        active: false,
        nonaktifSejak: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        ...desa[0],
        id: 3,
        name: "Desa Siap Purge",
        active: false,
        nonaktifSejak: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      },
    ]);
    state.daftarSemuaDomain.mockResolvedValue([]);
    state.daftarPenggunaPlatform.mockResolvedValue([]);
    state.ambilAuditPlatform.mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pageCount: 1,
    });
    const { default: SuperAdminPage } = await import("./page");

    const html = renderToStaticMarkup(await SuperAdminPage());

    expect(html).toContain('href="/super-admin/tenant?status=nonaktif"');
    expect(html).toContain('href="/super-admin/tenant?status=siap-purge"');
  });
});
