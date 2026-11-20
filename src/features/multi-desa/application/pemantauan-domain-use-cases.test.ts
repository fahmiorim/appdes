import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  listSemuaDomain: vi.fn(),
  getDomainPlatform: vi.fn(),
  listHasilSsl: vi.fn(),
  simpanHasilSsl: vi.fn(),
  listHasilDns: vi.fn(),
  simpanHasilDns: vi.fn(),
  periksaSslDomain: vi.fn(),
  periksaDnsDomain: vi.fn(),
}));

vi.mock("./provisioning-use-cases", () => ({
  requireSuperAdmin: state.requireSuperAdmin,
}));

vi.mock("@/features/multi-desa/infrastructure/kelola-desa-repository", () => ({
  listSemuaDomain: state.listSemuaDomain,
  getDomainPlatform: state.getDomainPlatform,
}));

vi.mock("@/features/multi-desa/infrastructure/domain-ssl-repository", () => ({
  listHasilSsl: state.listHasilSsl,
  simpanHasilSsl: state.simpanHasilSsl,
}));

vi.mock("@/features/multi-desa/infrastructure/domain-dns-repository", () => ({
  listHasilDns: state.listHasilDns,
  simpanHasilDns: state.simpanHasilDns,
}));

vi.mock("@/features/multi-desa/infrastructure/pemeriksa-ssl", () => ({
  periksaSslDomain: state.periksaSslDomain,
}));

vi.mock("@/features/multi-desa/infrastructure/pemeriksa-dns", () => ({
  periksaDnsDomain: state.periksaDnsDomain,
}));

const domain = [
  { id: 1, villageId: 1, domain: "satu.example.id", isPrimary: true, createdAt: new Date() },
  { id: 2, villageId: 2, domain: "dua.example.id", isPrimary: true, createdAt: new Date() },
];

describe("pemantauan domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.requireSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.listSemuaDomain.mockResolvedValue(domain);
    state.listHasilSsl.mockResolvedValue([]);
    state.listHasilDns.mockResolvedValue([]);
  });

  it("menolak pembacaan cache bila bukan pengelola platform", async () => {
    state.requireSuperAdmin.mockRejectedValue(new Error("Akses ditolak."));
    const { daftarPemeriksaanDomain } = await import("./pemantauan-domain-use-cases");

    await expect(daftarPemeriksaanDomain()).rejects.toThrow("Akses ditolak.");
    expect(state.listHasilSsl).not.toHaveBeenCalled();
    expect(state.listHasilDns).not.toHaveBeenCalled();
  });

  it("menolak pemeriksaan satu domain sebelum membaca cache saat bukan platform", async () => {
    state.requireSuperAdmin.mockRejectedValue(new Error("Akses ditolak."));
    const { periksaDnsSatuDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaDnsSatuDomain(1)).rejects.toThrow("Akses ditolak.");
    expect(state.getDomainPlatform).not.toHaveBeenCalled();
    expect(state.periksaDnsDomain).not.toHaveBeenCalled();
  });

  it("menolak id domain yang tidak terdaftar tanpa memindai host dari klien", async () => {
    state.getDomainPlatform.mockResolvedValue(null);
    const { periksaSslSatuDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaSslSatuDomain(99)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.periksaSslDomain).not.toHaveBeenCalled();
    expect(state.simpanHasilSsl).not.toHaveBeenCalled();
  });

  it("memeriksa DNS satu domain terdaftar dan menyimpan hasil dengan id database", async () => {
    state.getDomainPlatform.mockResolvedValue({
      id: 7,
      villageId: 2,
      domain: "sukamaju.example.id",
      isPrimary: false,
      createdAt: new Date("2026-11-20"),
    });
    state.periksaDnsDomain.mockResolvedValue({
      status: "normal",
      addresses: ["103.10.20.30"],
      error: null,
      checkedAt: new Date("2026-11-20"),
    });
    const { periksaDnsSatuDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaDnsSatuDomain(7)).resolves.toMatchObject({ status: "normal" });
    expect(state.periksaDnsDomain).toHaveBeenCalledWith("sukamaju.example.id");
    expect(state.simpanHasilDns).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ addresses: ["103.10.20.30"] }),
    );
  });

  it("memeriksa SSL satu domain terdaftar dan menyimpan hasilnya", async () => {
    state.getDomainPlatform.mockResolvedValue({
      id: 8,
      villageId: 2,
      domain: "sukamaju.example.id",
      isPrimary: true,
      createdAt: new Date("2026-11-20"),
    });
    state.periksaSslDomain.mockResolvedValue({
      status: "aktif",
      validFrom: new Date("2026-10-01"),
      validTo: new Date("2027-01-01"),
      issuer: "Contoh CA",
      error: null,
      checkedAt: new Date("2026-11-20"),
    });
    const { periksaSslSatuDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaSslSatuDomain(8)).resolves.toMatchObject({ status: "aktif" });
    expect(state.periksaSslDomain).toHaveBeenCalledWith("sukamaju.example.id");
    expect(state.simpanHasilSsl).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ issuer: "Contoh CA" }),
    );
  });

  it("memeriksa SSL seluruh domain yang terdaftar dan menyimpan hasilnya", async () => {
    state.periksaSslDomain
      .mockResolvedValueOnce({
        status: "aktif",
        validFrom: new Date("2026-10-01"),
        validTo: new Date("2027-01-01"),
        issuer: "Contoh CA",
        error: null,
        checkedAt: new Date("2026-11-20"),
      })
      .mockResolvedValueOnce({
        status: "bermasalah",
        validFrom: null,
        validTo: null,
        issuer: null,
        error: "Sertifikat tidak dapat diverifikasi.",
        checkedAt: new Date("2026-11-20"),
      });
    const { periksaSslSemuaDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaSslSemuaDomain()).resolves.toEqual({
      diperiksa: 2,
      aktif: 1,
      segeraExpired: 0,
      bermasalah: 1,
    });

    expect(state.periksaSslDomain).toHaveBeenNthCalledWith(1, "satu.example.id");
    expect(state.periksaSslDomain).toHaveBeenNthCalledWith(2, "dua.example.id");
    expect(state.simpanHasilSsl).toHaveBeenCalledTimes(2);
    expect(state.simpanHasilSsl).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ status: "aktif" }),
    );
    expect(state.simpanHasilSsl).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ status: "bermasalah" }),
    );
  });

  it("memeriksa DNS seluruh domain dan menyimpan alamat hasil resolusi", async () => {
    state.periksaDnsDomain
      .mockResolvedValueOnce({
        status: "normal",
        addresses: ["103.10.20.30"],
        error: null,
        checkedAt: new Date("2026-11-20"),
      })
      .mockResolvedValueOnce({
        status: "bermasalah",
        addresses: [],
        error: "Domain tidak dapat diresolusi.",
        checkedAt: new Date("2026-11-20"),
      });
    const { periksaDnsSemuaDomain } = await import("./pemantauan-domain-use-cases");

    await expect(periksaDnsSemuaDomain()).resolves.toEqual({
      diperiksa: 2,
      normal: 1,
      bermasalah: 1,
    });

    expect(state.simpanHasilDns).toHaveBeenCalledTimes(2);
    expect(state.simpanHasilDns).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ addresses: ["103.10.20.30"] }),
    );
  });
});
