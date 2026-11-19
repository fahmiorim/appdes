import { renderToStaticMarkup } from "react-dom/server";
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
  useRouter: () => ({ replace: vi.fn() }),
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

const desaDasar = {
  slug: "desa",
  code: "1207012001",
  domain: "desa.localhost",
  district: "Cibadak",
  kuotaMediaMb: null,
  tema: "tegar",
  temaNama: "Tegar",
  temaVersi: "1.0.0",
  pengguna: 1,
  penduduk: 10,
  jenisSurat: 0,
  createdAt: new Date("2026-01-01"),
};

const desaAktif = {
  ...desaDasar,
  id: 1,
  name: "Desa Aktif",
  active: true,
  nonaktifSejak: null,
  purgedAt: null,
  adaEksporBerlaku: false,
};

const desaSiapPurge = {
  ...desaDasar,
  id: 2,
  name: "Desa Siap Purge",
  active: false,
  nonaktifSejak: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  purgedAt: null,
  adaEksporBerlaku: true,
};

describe("SuperAdminTenantPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengguna yang bukan pengelola platform", async () => {
    state.requireSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh mengelola desa."),
    );
    const { default: Page } = await import("./page");

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;403",
    );
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
        district: "Cibadak",
        active: true,
        kuotaMediaMb: null,
        tema: "tegar",
        temaNama: "Tegar",
        temaVersi: "1.0.0",
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

    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));

    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarSemuaDomain).toHaveBeenCalledOnce();
    expect(html).toContain("Kecamatan");
    expect(html).toContain("Kuota media");
    expect(html).toContain("Tegar");
    expect(html).toContain("v1.0.0");
    expect(html).toContain("Total tenant");
    expect(html).toContain("Total pengguna desa");
    expect(html).toContain("Total penduduk");
    expect(html).toContain("Domain terdaftar");
  });

  it("memfilter daftar sesuai status pada query param", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([desaAktif, desaSiapPurge]);
    state.daftarSemuaDomain.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ status: "siap-purge" }) }),
    );

    expect(html).toContain("Menampilkan 1 dari 2 desa");
  });

  it("membagi daftar tenant menjadi sepuluh baris per halaman", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        ...desaAktif,
        id: index + 1,
        name: `Desa Ke-${index + 1}`,
        slug: `desa-${index + 1}`,
        domain: `desa-${index + 1}.localhost`,
      })),
    );
    state.daftarSemuaDomain.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("Menampilkan 1–10 dari 11 desa");
    expect(html).toContain("Halaman 1 dari 2");
    expect(html).toContain("Desa Ke-10");
    expect(html).not.toContain("Desa Ke-11");
  });

  it("menampilkan semua desa saat status tidak dikenal", async () => {
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([desaAktif, desaSiapPurge]);
    state.daftarSemuaDomain.mockResolvedValue([]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ status: "arsip" }) }),
    );

    expect(html).toContain("Menampilkan 2 dari 2 desa");
  });
});
