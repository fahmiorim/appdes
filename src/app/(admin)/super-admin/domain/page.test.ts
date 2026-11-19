import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pastikanSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  daftarSemuaDomain: vi.fn(),
  daftarPemeriksaanDomain: vi.fn(),
  periksaSslMassalAction: vi.fn(),
  periksaDnsMassalAction: vi.fn(),
  tambahDomainAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../guard", () => ({
  pastikanSuperAdmin: state.pastikanSuperAdmin,
}));

vi.mock("../actions", () => ({
  periksaSslMassalAction: state.periksaSslMassalAction,
  periksaDnsMassalAction: state.periksaDnsMassalAction,
  tambahDomainAction: state.tambahDomainAction,
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

vi.mock("@/features/multi-desa/application/kelola-desa-use-cases", () => ({
  daftarSemuaDomain: state.daftarSemuaDomain,
}));

vi.mock("@/features/multi-desa/application/pemantauan-domain-use-cases", () => ({
  daftarPemeriksaanDomain: state.daftarPemeriksaanDomain,
}));

const desaDasar = {
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
};

const domainDasar = {
  id: 1,
  villageId: 1,
  domain: "sukamaju.localhost",
  isPrimary: true,
  createdAt: new Date("2026-01-02"),
};

const sslDasar = {
  domainId: 1,
  status: "aktif" as const,
  validFrom: new Date("2026-10-14"),
  validTo: new Date("2027-01-12"),
  issuer: "Let's Encrypt",
  error: null,
  checkedAt: new Date("2026-11-20"),
};

const dnsDasar = {
  domainId: 1,
  status: "normal" as const,
  addresses: ["103.10.20.30"],
  error: null,
  checkedAt: new Date("2026-11-20"),
};

describe("SuperAdminDomainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.daftarPemeriksaanDomain.mockResolvedValue({ ssl: [], dns: [] });
  });

  it("menolak pengguna yang bukan pengelola platform", async () => {
    state.pastikanSuperAdmin.mockRejectedValue(
      Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), {
        digest: "NEXT_HTTP_ERROR_FALLBACK;403",
      }),
    );
    const { default: Page } = await import("./page");

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;403",
    );
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
    expect(state.daftarSemuaDomain).not.toHaveBeenCalled();
    expect(state.daftarPemeriksaanDomain).not.toHaveBeenCalled();
  });

  it("menampilkan KPI, tombol pemeriksaan, dan status DNS/SSL dari cache nyata", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([
      desaDasar,
      { ...desaDasar, id: 2, name: "Desa Cibadak", slug: "cibadak" },
    ]);
    state.daftarSemuaDomain.mockResolvedValue([
      domainDasar,
      {
        id: 2,
        villageId: 1,
        domain: "sukamaju.go.id",
        isPrimary: false,
        createdAt: new Date("2026-02-03"),
      },
    ]);
    state.daftarPemeriksaanDomain.mockResolvedValue({
      ssl: [
        sslDasar,
        {
          ...sslDasar,
          domainId: 2,
          status: "segera-expired",
          validTo: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        },
      ],
      dns: [
        dnsDasar,
        { ...dnsDasar, domainId: 2, status: "bermasalah", addresses: [], error: "NXDOMAIN" },
      ],
    });
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));

    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarSemuaDomain).toHaveBeenCalledOnce();
    expect(state.daftarPemeriksaanDomain).toHaveBeenCalledOnce();
    expect(html).toContain("Daftar Domain");
    expect(html).toContain("Cek SSL massal");
    expect(html).toContain("Cek DNS massal");
    expect(html).toContain("Tambah Domain");
    expect(html).toContain("Total domain");
    expect(html).toContain("DNS normal");
    expect(html).toContain("DNS bermasalah");
    expect(html).toContain("SSL aktif");
    expect(html).toContain("SSL segera expired");
    expect(html).toContain("SSL bermasalah");
    expect(html).toContain("desa berdomain");
    expect(html).toContain("desa belum punya domain");
    expect(html).toContain("tenant-table tenant-table-list domain-table");
    expect(html).toContain("Status DNS");
    expect(html).toContain("Status SSL");
    expect(html).toContain("Masa Berlaku SSL");
    expect(html).toContain("Domain Utama");
    expect(html).toContain("Desa Sukamaju");
    expect(html).toContain("sukamaju.localhost");
    expect(html).toContain("sukamaju.go.id");
    expect(html).toContain("Subdomain");
    expect(html).toContain("Custom");
    expect(html).toContain("Normal");
    expect(html).toContain("Segera expired");
    expect(html).toContain("Kelola Desa Sukamaju");
  });

  it("menandai domain yang belum diperiksa tanpa menganggapnya aktif", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([desaDasar]);
    state.daftarSemuaDomain.mockResolvedValue([domainDasar]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("Belum diperiksa");
    expect(html).not.toContain("Let&#x27;s Encrypt");
  });

  it("memfilter domain dari query pencarian top bar", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([
      desaDasar,
      { ...desaDasar, id: 2, name: "Desa Cibadak", slug: "cibadak" },
    ]);
    state.daftarSemuaDomain.mockResolvedValue([
      domainDasar,
      { ...domainDasar, id: 2, villageId: 2, domain: "cibadak.localhost", isPrimary: false },
    ]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(
      await Page({ searchParams: Promise.resolve({ q: "cibadak" }) }),
    );

    expect(html).toContain("Menampilkan 1 dari 2 domain");
    expect(html).toContain("cibadak.localhost");
    expect(html).not.toContain("sukamaju.localhost");
  });

  it("membagi daftar domain menjadi sepuluh baris per halaman", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([desaDasar]);
    state.daftarSemuaDomain.mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        ...domainDasar,
        id: index + 1,
        domain: `desa-${String(index + 1).padStart(2, "0")}.localhost`,
      })),
    );
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("Menampilkan 1–10 dari 11 domain");
    expect(html).toContain("Halaman 1 dari 2");
    expect(html).toContain("desa-10.localhost");
    expect(html).not.toContain("desa-11.localhost");
  });
});
