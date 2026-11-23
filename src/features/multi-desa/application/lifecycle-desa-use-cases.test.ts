import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import type { DesaRetensiRow } from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import * as rbac from "@/features/rbac/infrastructure/rbac-repository";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";

import { eksporDataDesa, purgeDesa, statusLifecycleDesa } from "./lifecycle-desa-use-cases";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/rbac/infrastructure/rbac-repository", () => ({ getRoleById: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/multi-desa/infrastructure/lifecycle-tenant-repository", () => ({
  getDesaRetensi: vi.fn(),
  eksporBerlakuTerbaru: vi.fn(),
  eksporDataTenant: vi.fn(),
  purgeTenant: vi.fn(),
  bersihkanEksporKedaluwarsa: vi.fn(),
}));

const SEHARI = 24 * 60 * 60 * 1000;

function pengguna(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u-platform",
    name: "Uji",
    username: "uji",
    email: "uji@contoh.id",
    image: null,
    villageId: null,
    roleId: 3,
    residentId: null,
    mustChangePin: false,
    passwordExpired: false,
    mustEnrollTwoFactor: false,
    permissions: { isSuperadmin: false, levelByResource: new Map(), actionByResource: new Map() },
    ...overrides,
  };
}

function desa(overrides: Partial<DesaRetensiRow> = {}): DesaRetensiRow {
  return {
    id: 9,
    name: "Desa Uji",
    slug: "desa-uji",
    domain: "desa-uji.test",
    active: false,
    nonaktifSejak: new Date(Date.now() - 120 * SEHARI),
    purgedAt: null,
    ...overrides,
  };
}

async function modulRepo() {
  return import("@/features/multi-desa/infrastructure/lifecycle-tenant-repository");
}

async function modulAudit() {
  return import("@/features/audit/application/audit-use-cases");
}

describe("lifecycle desa", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(dal.requireUser).mockResolvedValue(pengguna());
    vi.mocked(rbac.getRoleById).mockResolvedValue({ slug: "super-admin" } as never);
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockReset();
    vi.mocked(repo.eksporBerlakuTerbaru).mockReset();
    vi.mocked(repo.eksporDataTenant).mockReset();
    vi.mocked(repo.purgeTenant).mockReset();
  });

  it("menolak administrator desa", async () => {
    vi.mocked(dal.requireUser).mockResolvedValue(
      pengguna({
        villageId: 7,
        permissions: {
          isSuperadmin: true,
          levelByResource: new Map(),
          actionByResource: new Map(),
        },
      }),
    );
    const repo = await modulRepo();

    await expect(purgeDesa({ villageId: 9, konfirmasi: "desa-uji" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(repo.getDesaRetensi).not.toHaveBeenCalled();
    expect(repo.purgeTenant).not.toHaveBeenCalled();
  });

  it("menolak purge desa yang masih aktif", async () => {
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa({ active: true, nonaktifSejak: null }));
    vi.mocked(repo.eksporBerlakuTerbaru).mockResolvedValue({
      id: 1,
      berkas: "x",
      dibuatPada: new Date(),
    });

    await expect(purgeDesa({ villageId: 9, konfirmasi: "desa-uji" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/Nonaktifkan desa/),
    });
    expect(repo.purgeTenant).not.toHaveBeenCalled();
  });

  it("menolak purge tanpa ekspor yang berlaku", async () => {
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa());
    vi.mocked(repo.eksporBerlakuTerbaru).mockResolvedValue(null);

    await expect(purgeDesa({ villageId: 9, konfirmasi: "desa-uji" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/Ekspor data wajib/),
    });
    expect(repo.purgeTenant).not.toHaveBeenCalled();
  });

  it("menolak konfirmasi slug yang tidak cocok", async () => {
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa());
    vi.mocked(repo.eksporBerlakuTerbaru).mockResolvedValue({
      id: 1,
      berkas: "x",
      dibuatPada: new Date(),
    });

    await expect(purgeDesa({ villageId: 9, konfirmasi: "desa-lain" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/Konfirmasi tidak cocok/),
    });
    expect(repo.purgeTenant).not.toHaveBeenCalled();
  });

  it("menjalankan purge dan mencatat audit tanpa data pribadi", async () => {
    const repo = await modulRepo();
    const audit = await modulAudit();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa());
    vi.mocked(repo.eksporBerlakuTerbaru).mockResolvedValue({
      id: 1,
      berkas: "x",
      dibuatPada: new Date(),
    });
    vi.mocked(repo.purgeTenant).mockResolvedValue({
      villageId: 9,
      jumlahBarisDihapus: 42,
      tabelDiproses: 7,
      mediaDihapus: true,
    });

    await expect(purgeDesa({ villageId: 9, konfirmasi: "desa-uji" })).resolves.toEqual({
      jumlahBarisDihapus: 42,
      tabelDiproses: 7,
      mediaDihapus: true,
    });
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 9,
        event: AUDIT_EVENTS.desaPurge,
        details: expect.objectContaining({ slug: "desa-uji", jumlahBarisDihapus: 42 }),
      }),
    );
  });

  it("menolak ekspor desa yang sudah di-purge", async () => {
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa({ purgedAt: new Date() }));

    await expect(eksporDataDesa(9)).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/sudah di-purge/),
    });
    expect(repo.eksporDataTenant).not.toHaveBeenCalled();
  });

  it("melaporkan status retensi beserta ketersediaan ekspor", async () => {
    const repo = await modulRepo();
    vi.mocked(repo.getDesaRetensi).mockResolvedValue(desa({ nonaktifSejak: new Date() }));
    vi.mocked(repo.eksporBerlakuTerbaru).mockResolvedValue(null);

    const status = await statusLifecycleDesa(9);

    expect(status.status).toBe("masa-tenggang");
    expect(status.adaEksporBerlaku).toBe(false);
    expect(status.hariMenujuPurge).toBeGreaterThan(0);
  });
});
