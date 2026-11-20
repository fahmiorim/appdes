import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  listSemuaDomain: vi.fn(),
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
