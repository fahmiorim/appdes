import { beforeEach, describe, expect, it, vi } from "vitest";

import { getKonfigurasiPlatform, getTemplateTenantPlatform } from "./platform-info-use-cases";

vi.mock("./provisioning-use-cases", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/features/multi-desa/infrastructure/template-tenant-repository", () => ({
  muatTemplateTenant: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "https://appdes.contoh.id",
    DESA_BASE_DOMAIN: "desa.contoh.id",
    TRUST_PROXY: true,
    RESEND_API_KEY: "kunci-uji",
    RESEND_FROM: "noreply@contoh.id",
    TTE_API: "https://tte.contoh.id",
    TTE_ALLOWED_HOSTS: "tte.contoh.id, signer.contoh.id ,",
  },
}));

describe("getKonfigurasiPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pembacaan konfigurasi oleh non-platform", async () => {
    const guard = await import("./provisioning-use-cases");
    vi.mocked(guard.requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Hanya super admin yang boleh mengelola desa."), {
        code: "FORBIDDEN",
      }),
    );

    await expect(getKonfigurasiPlatform()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("memetakan konfigurasi non-rahasia beserta kebijakan retensi", async () => {
    const guard = await import("./provisioning-use-cases");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);

    const hasil = await getKonfigurasiPlatform();

    expect(hasil).toEqual({
      appUrl: "https://appdes.contoh.id",
      baseDomain: "desa.contoh.id",
      trustProxy: true,
      emailAktif: true,
      tteAktif: true,
      tteAllowedHosts: ["tte.contoh.id", "signer.contoh.id"],
      retensi: { masaTenggangHari: 90, umurEksporHari: 30, retensiAuditBulan: 24 },
    });
    expect(JSON.stringify(hasil)).not.toContain("kunci-uji");
  });
});

describe("getTemplateTenantPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pembacaan template oleh non-platform", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/multi-desa/infrastructure/template-tenant-repository");
    vi.mocked(guard.requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Hanya super admin yang boleh mengelola desa."), {
        code: "FORBIDDEN",
      }),
    );

    await expect(getTemplateTenantPlatform()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.muatTemplateTenant).not.toHaveBeenCalled();
  });

  it("mengembalikan template setelah guard lolos", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/multi-desa/infrastructure/template-tenant-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.muatTemplateTenant).mockReturnValue({
      versi: 1,
      sumber: { jenis: "bawaan", villageId: null, dibuatPada: "2026-11-17" },
      roles: [{ slug: "administrator", name: "Administrator", isSystem: true }],
      modules: [],
      akses: [],
      tema: null,
      menuPublik: [],
    });

    await expect(getTemplateTenantPlatform()).resolves.toMatchObject({ versi: 1 });
  });
});
